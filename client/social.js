const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search);
const game=params.get('game')==='tabu'?'tabu':'dibuixa';
const screens=[...document.querySelectorAll('.screen')];
let socket=null,myId=null,roomCode=null,creatorId=null,players=[],currentRound=null,currentRole=null,timerHandle=null,timerStartAt=0,timerSeconds=60,canvas=null,ctx=null,drawing=false,lastPoint=null,pendingSegments=[],flushScheduled=false,drawColor='#111111',drawSize=5;

function show(id){screens.forEach(screen=>screen.classList.toggle('active',screen.id===id));window.scrollTo({top:0,behavior:'instant'})}
function notify(text){const t=$('toast');t.textContent=text;t.classList.add('show');clearTimeout(notify.timer);notify.timer=setTimeout(()=>t.classList.remove('show'),1900)}
function send(type,payload={}){if(!socket||socket.readyState!==WebSocket.OPEN){notify('No hi ha connexió');return false}socket.send(JSON.stringify({type,...payload}));return true}
function playerName(){return $('playerName').value.trim()||'Jugador'}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))}
function seenKey(){return 'musicBattleDrawSeenV2'}
function loadSeen(){try{return JSON.parse(localStorage.getItem(seenKey())||'[]').slice(-900)}catch{return[]}}
function rememberSeen(word){if(!word)return;let values=loadSeen().filter(v=>v!==word);values.push(word);localStorage.setItem(seenKey(),JSON.stringify(values.slice(-900)))}
function saveSession(){if(myId&&roomCode){sessionStorage.setItem('socialPlayerId',myId);sessionStorage.setItem('socialRoomCode',roomCode)}}
function clearSession(){sessionStorage.removeItem('socialPlayerId');sessionStorage.removeItem('socialRoomCode')}

function setupGame(){
  const tabu=game==='tabu';document.title=`${tabu?'Tabú Duo':'Dibuixa i endevina'} · Music Battle`;
  $('gameTitle').textContent=tabu?'Tabú Duo':'Dibuixa i endevina';$('setupTitle').textContent=$('gameTitle').textContent;$('heroIcon').textContent=tabu?'!':'✎';
  $('setupText').textContent=tabu?'Dona pistes sense dir les paraules prohibides. El teu amic té 1 minut per encertar.':'Un dibuixa. L’altre té 1 minut per endevinar. Paraules diferents durant molt, molt temps.';
  $('playerName').value=localStorage.getItem('musicBattleName')||'';
  $('createRoom').onclick=()=>{localStorage.setItem('musicBattleName',playerName());send('social_create',{game,playerName:playerName(),seenWords:game==='dibuixa'?loadSeen():[]})};
  $('joinRoom').onclick=()=>{const code=$('roomCodeInput').value.trim().toUpperCase();if(code.length!==5)return notify('Escriu el codi de 5 caràcters');localStorage.setItem('musicBattleName',playerName());send('social_join',{roomCode:code,playerName:playerName(),seenWords:game==='dibuixa'?loadSeen():[]})};
  $('roomCodeInput').oninput=e=>e.target.value=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,5);
  $('copyCode').onclick=()=>navigator.clipboard?.writeText(roomCode||'').then(()=>notify('Codi copiat')).catch(()=>notify(roomCode||''));
  $('startGame').onclick=()=>send('social_start');$('leaveRoom').onclick=leave;$('quitGame').onclick=()=>{if(confirm('Vols sortir de la partida?'))leave()};$('playAgain').onclick=()=>{show('roomScreen');send('social_start')};
}
function leave(){send('social_leave');clearSession();location.href='index.html'}

function connect(){
  const url=`${location.protocol==='https:'?'wss':'ws'}://${location.host}`;socket=new WebSocket(url);
  socket.onopen=()=>{$('connection').textContent='Connectat';const id=sessionStorage.getItem('socialPlayerId'),code=sessionStorage.getItem('socialRoomCode');if(id&&code)send('social_resume',{playerId:id,roomCode:code})};
  socket.onclose=()=>{$('connection').textContent='Reconnectant…';clearTimeout(connect.timer);connect.timer=setTimeout(connect,800)};
  socket.onmessage=event=>handle(JSON.parse(event.data));
}

function handle(data){
  switch(data.type){
    case'connected':if(!myId)myId=data.playerId;break;
    case'social_created':case'social_joined':roomCode=data.roomCode;saveSession();show('roomScreen');break;
    case'social_resumed':myId=data.playerId;roomCode=data.roomCode;saveSession();break;
    case'social_resume_failed':clearSession();break;
    case'social_state':renderRoom(data);break;
    case'social_round':renderRound(data);break;
    case'social_waiting_clue':if(game==='tabu'&&currentRole==='guesser')setWaitingClue();break;
    case'social_timer_start':startTimer(data.startAt,data.seconds);break;
    case'social_tabu_clue':receiveClue(data);break;
    case'social_tabu_clue_sent':receiveClue(data,true);break;
    case'social_tabu_invalid':notify(data.message);break;
    case'social_draw_event':paintSegments(data.segments||[]);break;
    case'social_draw_clear':clearCanvas();break;
    case'social_guess_event':addGuess(data);break;
    case'social_round_end':roundEnd(data);break;
    case'social_results':renderResults(data);break;
    case'social_player_left':notify('El teu amic ha sortit');break;
    case'social_left':clearSession();break;
    case'social_error':notify(data.message);break;
  }
}

function renderRoom(data){
  roomCode=data.roomCode;creatorId=data.creatorId;players=data.players||[];$('copyCode').textContent=roomCode;$('players').innerHTML=players.map(p=>`<div class="player-row"><b>${escapeHtml(p.name)}${p.id===myId?' · tu':''}</b><small>${p.connected?'Connectat':'Reconnectant…'}</small></div>`).join('');
  const isCreator=myId===creatorId,ready=players.length===2;$('startGame').hidden=!isCreator;$('startGame').disabled=!ready;$('startGame').textContent=ready?'Començar partida':'Falta el segon jugador';
  if(data.phase==='lobby')show('roomScreen');updateScore(players);
}
function updateScore(values){players=values||players;const mine=players.find(p=>p.id===myId),other=players.find(p=>p.id!==myId);$('scoreLabel').textContent=`${mine?.score||0} - ${other?.score||0}`}

function renderRound(data){
  currentRound=data.round;currentRole=data.role;updateScore(data.players||players);$('roundLabel').textContent=`RONDA ${data.round}/${data.totalRounds}`;$('roleLabel').textContent=data.role==='actor'?(game==='tabu'?'Tu dones les pistes':'Tu dibuixes'):'Tu endevines';$('timer').textContent='1:00';$('timer').classList.remove('danger');stopTimer();show('playScreen');
  if(game==='dibuixa')renderDraw(data);else renderTabu(data);
  requestAnimationFrame(()=>send('social_round_ready'));
  if(data.phase==='playing'&&data.startAt)startTimer(data.startAt,data.seconds||60);
}

function playCard(inner){$('gameMount').innerHTML=`<section class="card play-card">${inner}</section>`}
function renderDraw(data){
  const actor=data.role==='actor';playCard(`${actor?`<div class="role-banner"><span class="role-dot"></span><b>Dibuixa: <span>${escapeHtml(data.word||'')}</span></b></div>`:`<div class="role-banner"><span class="role-dot"></span><b>Endevina el dibuix · ${data.wordLength||'?'} lletres</b></div>`}<div class="canvas-wrap"><canvas id="drawCanvas"></canvas></div>${actor?`<div class="tools"><button class="tool selected" data-color="#111111" style="background:#111111" aria-label="Negre"></button><button class="tool" data-color="#245cff" style="background:#245cff" aria-label="Blau"></button><button class="tool" data-color="#e83e5b" style="background:#e83e5b" aria-label="Vermell"></button><button class="tool" data-color="#18a966" style="background:#18a966" aria-label="Verd"></button><button class="tool" data-color="#ffffff" style="background:#ffffff" aria-label="Goma"></button><button id="clearDraw" class="tool-clear">Netejar</button></div>`:`<form id="guessForm" class="guess-box"><input id="guessInput" autocomplete="off" placeholder="Què és?"><button>Provar</button></form><div id="guessLog" class="guess-log"></div>`}`);
  setupCanvas(actor);if(!actor)setupGuessForm();
}
function setupCanvas(actor){
  canvas=$('drawCanvas');ctx=canvas.getContext('2d');resizeCanvas();window.addEventListener('resize',resizeCanvas,{once:true});if(!actor)return;
  canvas.onpointerdown=e=>{drawing=true;canvas.setPointerCapture(e.pointerId);lastPoint=point(e)};canvas.onpointermove=e=>{if(!drawing||!lastPoint)return;const next=point(e),segment={x1:lastPoint.x,y1:lastPoint.y,x2:next.x,y2:next.y,size:drawSize,color:drawColor};paintSegments([segment]);pendingSegments.push(segment);lastPoint=next;scheduleFlush()};canvas.onpointerup=canvas.onpointercancel=()=>{drawing=false;lastPoint=null;flushDraw()};
  document.querySelectorAll('.tool[data-color]').forEach(btn=>btn.onclick=()=>{document.querySelectorAll('.tool[data-color]').forEach(x=>x.classList.toggle('selected',x===btn));drawColor=btn.dataset.color;drawSize=drawColor==='#ffffff'?18:5});$('clearDraw').onclick=()=>{clearCanvas();send('social_draw_clear')};
}
function resizeCanvas(){if(!canvas)return;const rect=canvas.getBoundingClientRect(),ratio=Math.max(1,Math.min(2,devicePixelRatio||1));canvas.width=Math.round(rect.width*ratio);canvas.height=Math.round(rect.height*ratio);ctx=canvas.getContext('2d');ctx.setTransform(ratio,0,0,ratio,0,0);ctx.lineCap='round';ctx.lineJoin='round'}
function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height}}
function paintSegments(segments){if(!canvas||!ctx)return;const r=canvas.getBoundingClientRect();for(const s of segments){ctx.beginPath();ctx.strokeStyle=s.color||'#111111';ctx.lineWidth=s.size||5;ctx.moveTo(s.x1*r.width,s.y1*r.height);ctx.lineTo(s.x2*r.width,s.y2*r.height);ctx.stroke()}}
function clearCanvas(){if(!canvas||!ctx)return;const r=canvas.getBoundingClientRect();ctx.clearRect(0,0,r.width,r.height)}
function scheduleFlush(){if(flushScheduled)return;flushScheduled=true;requestAnimationFrame(()=>{flushScheduled=false;flushDraw()})}
function flushDraw(){if(!pendingSegments.length)return;const batch=pendingSegments.splice(0,24);send('social_draw',{segments:batch});if(pendingSegments.length)scheduleFlush()}

function renderTabu(data){
  const actor=data.role==='actor';if(actor){playCard(`<div class="role-banner"><span class="role-dot"></span><b>Dona pistes. El minut començarà quan enviïs la primera.</b></div><div class="tabu-word">${escapeHtml(data.word||'')}</div><div class="forbidden-title">NO POTS DIR</div><div class="forbidden">${(data.forbidden||[]).map(v=>`<span>${escapeHtml(v)}</span>`).join('')}</div><form id="clueForm" class="clue-compose"><input id="clueInput" maxlength="180" autocomplete="off" placeholder="Escriu una pista…"><button>Enviar pista</button></form><div id="clues" class="clues">${(data.clues||[]).map(v=>`<div class="clue">${escapeHtml(v)}</div>`).join('')}</div>`);setupClueForm()}else{playCard(`<div class="role-banner"><span class="role-dot"></span><b>Endevina la paraula</b></div><div id="waitingClue" class="waiting">Esperant que el teu amic enviï la primera pista…</div><div id="clues" class="clues">${(data.clues||[]).map(v=>`<div class="clue">${escapeHtml(v)}</div>`).join('')}</div><form id="guessForm" class="guess-box"><input id="guessInput" autocomplete="off" placeholder="La teva resposta…"><button>Provar</button></form><div id="guessLog" class="guess-log"></div>`);setupGuessForm();if((data.clues||[]).length)$('waitingClue').hidden=true}
}
function setupClueForm(){const form=$('clueForm'),input=$('clueInput');form.onsubmit=e=>{e.preventDefault();const clue=input.value.trim();if(!clue)return;send('social_tabu_clue',{clue});input.value='';input.focus()};setTimeout(()=>input.focus(),80)}
function setWaitingClue(){const el=$('waitingClue');if(el)el.hidden=false}
function receiveClue(data,own=false){const list=$('clues');if(list)list.innerHTML=(data.clues||[]).map(v=>`<div class="clue">${escapeHtml(v)}</div>`).join('');const wait=$('waitingClue');if(wait)wait.hidden=true;if(!own)notify('Pista rebuda')}

function setupGuessForm(){const form=$('guessForm'),input=$('guessInput');if(!form||!input)return;form.onsubmit=e=>{e.preventDefault();const guess=input.value.trim();if(!guess)return;send('social_guess',{guess});input.value='';input.focus()};setTimeout(()=>input.focus(),80)}
function addGuess(data){const log=$('guessLog');if(!log)return;const div=document.createElement('div');div.className=`guess-chip ${data.correct?'correct':''}`;div.textContent=`${data.name}: ${data.guess}${data.correct?' ✓':''}`;log.prepend(div)}

function startTimer(startAt,seconds=60){timerStartAt=Number(startAt)||Date.now();timerSeconds=Number(seconds)||60;stopTimer();const tick=()=>{const remaining=Math.max(0,Math.ceil((timerStartAt+timerSeconds*1000-Date.now())/1000));$('timer').textContent=`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`;$('timer').classList.toggle('danger',remaining<=10);if(remaining<=0)stopTimer()};tick();timerHandle=setInterval(tick,100)}
function stopTimer(){if(timerHandle){clearInterval(timerHandle);timerHandle=null}}
function roundEnd(data){stopTimer();rememberSeen(game==='dibuixa'?data.answer:null);updateScore(data.players||players);const notice=$('roundNotice');notice.hidden=false;notice.innerHTML=`${escapeHtml(data.message||'Ronda acabada')}<small>Era: ${escapeHtml(data.answer||'')}</small>`;setTimeout(()=>{notice.hidden=true},1500)}
function renderResults(data){stopTimer();show('resultsScreen');$('winnerText').textContent=data.winnerText||'Partida acabada';const sorted=[...(data.players||[])].sort((a,b)=>b.score-a.score);$('ranking').innerHTML=sorted.map((p,i)=>`<div class="rank ${i===0?'winner':''}"><span>${i+1}. <b>${escapeHtml(p.name)}</b></span><strong>${p.score} punts</strong></div>`).join('')}

setupGame();connect();
