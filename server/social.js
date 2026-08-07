const rooms=new Map();
const GAMES=new Set(['dibuixa','tabu']);
const ROUND_SECONDS=60;
const TOTAL_ROUNDS=8;
const DRAW_SIMPLE=`abella
àguila
ànec
aranya
balena
burro
cabra
camell
cangur
cargol
castor
cavall
cérvol
cigne
cocodril
conill
corb
dofí
drac
elefant
eriçó
escarabat
escorpí
esquirol
estruç
foca
formiga
gall
gallina
gat
girafa
goril·la
gos
guepard
hipopòtam
hàmster
iguana
jaguar
koala
llebre
lleó
llop
lloro
llúdriga
medusa
mico
mosca
mosquit
oca
orangutan
ornitorrinc
ós
ós polar
ovella
panda
pantera
papallona
paó
peix
pelicà
pingüí
pollet
pop
porc
rinoceront
ratolí
salamandra
serp
tauró
tigre
tortuga
vaca
vespa
zebra
alpaca
antílop
bisó
búfal
camaleó
capibara
cigonya
gamba
llagosta
llagostí
llamà
manta ratlla
marmota
mussol
orca
peresós
piraña
ratpenat
senglar
suricata
tucà
xai
poma
pera
plàtan
taronja
mandarina
llimona
maduixa
móra
síndria
meló
préssec
albercoc
cirera
raïm
kiwi
pinya
mango
coco
figa
alvocat
pastanaga
patata
ceba
all
pebrot
tomàquet
enciam
cogombre
carbassó
carbassa
albergínia
bolet
pèsol
mongeta
blat de moro
bròquil
coliflor
espinac
oliva
pa
croissant
dònut
magdalena
galeta
pastís
xocolata
caramel
piruleta
gelat
hamburguesa
pizza
entrepà
croqueta
truita
ou ferrat
formatge
pernil
botifarra
pollastre
arròs
paella
macarrons
espaguetis
lasanya
sopa
amanida
patates fregides
crispetes
cereals
iogurt
llet
cafè
suc
aigua
refresc
batut
mel
melmelada
sal
sucre
farina
mantega
avió
helicòpter
cotxe
camió
moto
bicicleta
patinet
patins
monopatí
autobús
taxi
ambulància
camió de bombers
cotxe de policia
tractor
excavadora
grua
tren
tramvia
metro
vaixell
veler
barca
canoa
caiac
submarí
coet
nau espacial
globus aerostàtic
telefèric
caravana
moto d'aigua
casa
castell
palau
cabana
tenda de campanya
iglú
gratacel
far
molí
pont
túnel
carretera
rotonda
semàfor
pas de vianants
estació de tren
aeroport
port
escola
hospital
farmàcia
supermercat
fleca
restaurant
cinema
teatre
museu
biblioteca
església
estadi
piscina
parc
parc infantil
zoo
circ
platja
illa
muntanya
volcà
cova
bosc
desert
riu
llac
cascada
mar
oceà
font
jardí
hort
camp de futbol
pista de bàsquet
hotel
ascensor
escala
balcó
terrassa
porta
finestra
teulada
xemeneia
sol
lluna
estrella
planeta
satèl·lit
núvol
arc de Sant Martí
pluja
neu
calamarsa
llamp
tro
vent
tornado
huracà
onada
iceberg
foc
flama
fum
ombra
arbre
palmera
pi
roure
cactus
flor
rosa
gira-sol
tulipa
fulla
branca
tronc
herba
pedra
roca
sorra
petxina
corall
llit
sofà
cadira
taula
armari
prestatgeria
escriptori
làmpada
mirall
rellotge
televisor
ràdio
ordinador
portàtil
tauleta
mòbil
auriculars
altaveu
càmera
comandament a distància
teclat
ratolí d'ordinador
impressora
ventilador
nevera
forn
microones
torradora
batedora
cafetera
rentadora
rentaplats
aspiradora
planxa
escombra
fregona
cubell
galleda
paperera
maleta
motxilla
bossa
cartera
moneder
paraigua
clau
cadenat
martell
tornavís
serra
trepant
pinzell
tisores
regle
llapis
bolígraf
retolador
goma d'esborrar
quadern
llibre
diari
sobre
segell
calendari
mapa
brúixola
lupa
binocles
ulleres
ulleres de sol
raspall de dents
pasta de dents
pinta
sabó
xampú
tovallola
coixí
manta
espelma
corda
cadena
imant
pila
bombeta
endoll
pilota
pilota de futbol
pilota de bàsquet
pilota de tennis
raqueta
pala de pàdel
porteria
cistella
xarxa
trofeu
medalla
xiulet
cronòmetre
esquí
snowboard
trineu
surf
planxa de surf
aleta de busseig
ulleres de busseig
màscara de busseig
arc
fletxa
diana
bitlla
frisbee
estel
io-io
baldufa
comba
hula hoop
trampolí
paracaigudes
cometa
barret
gorra
casc
corona
perruca
samarreta
camisa
jersei
jaqueta
abric
armilla
vestit
faldilla
pantalons
pijama
banyador
mitjó
sabata
bota
sabatilla
xancleta
guants
bufanda
corbata
cinturó
collaret
polsera
anell
arracada
cap
cara
ull
nas
boca
orella
cabell
barba
bigoti
dent
llengua
mà
dit
braç
colze
peu
cama
genoll
cor
cervell
esquelet
metge
infermera
bomber
policia
mestre
mestra
cuiner
cuinera
cambrer
pilot
astronauta
mariner
pescador
pagès
jardiner
mecànic
fuster
pintor
paleta
lampista
electricista
fotògraf
periodista
actor
actriu
cantant
guitarrista
pianista
ballarí
àrbitre
futbolista
ciclista
tennista
nedador
esquiador
socorrista
veterinari
dentista
perruquer
forner
pastisser
carter
repartidor
conductor
detectiu
científic
inventor
pallasso
pirata
ninja
cavaller
rei
reina
príncep
princesa
bruixa
fantasma
vampir
zombi
robot
superheroi`.trim().split(/\n+/).map(v=>v.trim()).filter(Boolean);
const SUBJECTS=['gat','gos','pingüí','lleó','mico','ós','conill','elefant','cocodril','girafa','tauró','vaca','porc','ratolí','mussol','zebra','panda','camell','cangur','pirata','astronauta','robot','bruixa','pallasso','rei','princesa','bomber','policia','metge','cuiner','pintor','fotògraf','futbolista','ciclista','esquiador','surfista','músic','ninja','vampir','superheroi'];
const PROPS=['barret','ulleres','paraigua','bufanda','corona','plàtan','mel','pastanaga','globus','raspall de dents','corbata','ulleres de sol','botes','formatge','llibre','motxilla','mapa','maleta','pilota','bandera'];
const DRAW_EXTRA=SUBJECTS.flatMap(subject=>PROPS.map(prop=>`${subject} amb ${prop}`));
const DRAW_WORDS=[...new Set([...DRAW_SIMPLE,...DRAW_EXTRA])];
const TABU_CARDS=[
['platja',['sorra','mar','sol','banyar']],['avió',['volar','aeroport','ales','pilot']],['bicicleta',['pedals','rodes','ciclista','manillar']],['pizza',['formatge','tomàquet','italià','forn']],['gat',['felí','miolar','bigotis','ratolí']],['gos',['bordar','mascota','cua','passejar']],['escola',['alumnes','mestre','classe','pati']],['mòbil',['telèfon','trucar','pantalla','app']],['televisió',['pantalla','canal','sèrie','comandament']],['futbol',['pilota','gol','porter','camp']],['bàsquet',['cistella','pilota','triple','NBA']],['tennis',['raqueta','pilota','xarxa','Wimbledon']],['cafè',['tassa','beure','cafeïna','esmorzar']],['hamburguesa',['pa','carn','formatge','menjar']],['gelat',['fred','estiu','cucurutxo','xocolata']],['paraigua',['pluja','mullar','obrir','tempesta']],['rellotge',['hora','temps','canell','agulles']],['llit',['dormir','coixí','habitació','matalàs']],['sofà',['seure','saló','televisió','coixí']],['nevera',['fred','cuina','menjar','congelador']],['ordinador',['teclat','pantalla','ratolí','internet']],['internet',['wifi','xarxa','web','connexió']],['música',['cançó','escoltar','so','artista']],['guitarra',['cordes','música','tocar','instrument']],['piano',['tecles','instrument','música','tocar']],['cinema',['pel·lícula','pantalla','crispetes','sala']],['llibre',['llegir','pàgines','autor','biblioteca']],['biblioteca',['llibres','llegir','silenci','prestatgeria']],['hospital',['metge','malalt','infermera','urgències']],['metge',['hospital','pacient','curar','bata']],['bomber',['foc','incendi','camió','mànega']],['policia',['agent','presó','sirena','uniforme']],['astronauta',['espai','coet','lluna','NASA']],['pirata',['vaixell','tresor','parxe','mar']],['fantasma',['por','esperit','blanc','casa']],['vampir',['sang','ullals','Dràcula','nit']],['robot',['màquina','metall','programar','automàtic']],['castell',['rei','torre','muralla','princesa']],['corona',['rei','reina','cap','or']],['muntanya',['pujar','cim','neu','excursió']],['riu',['aigua','corrent','pont','mar']],['volcà',['lava','muntanya','erupció','foc']],['desert',['sorra','camell','calor','oasi']],['bosc',['arbres','natura','bolets','caminar']],['arbre',['tronc','fulles','branques','bosc']],['flor',['pètals','jardí','olor','planta']],['sol',['calor','llum','cel','dia']],['lluna',['nit','cel','satèl·lit','estrella']],['estrella',['cel','nit','brillar','espai']],['núvol',['cel','pluja','blanc','tempesta']],['neu',['blanc','fred','hivern','esquí']],['foc',['calor','cremar','flama','incendi']],['aigua',['beure','riu','mar','mullar']],['xocolata',['dolç','cacau','negre','postres']],['pastís',['aniversari','espelmes','dolç','forn']],['regal',['aniversari','paper','sorpresa','obrir']],['globus',['aire','festa','inflar','volar']],['maleta',['viatge','roba','aeroport','equipatge']],['hotel',['habitació','vacances','dormir','recepció']],['tren',['via','estació','vagó','locomotora']],['cotxe',['rodes','conduir','motor','carretera']],['moto',['dues rodes','casc','motor','conduir']],['vaixell',['mar','navegar','port','aigua']],['helicòpter',['volar','hèlix','pilot','aire']],['coet',['espai','llançament','astronauta','NASA']],['semàfor',['vermell','verd','carrer','cotxe']],['mapa',['país','carretera','orientació','ruta']],['brúixola',['nord','orientació','agulla','mapa']],['telèfon',['trucar','mòbil','parlar','número']],['foto',['càmera','imatge','record','fer']],['càmera',['foto','objectiu','imatge','fotògraf']],['ulleres',['veure','ulls','vidres','cara']],['sabata',['peu','cordons','caminar','calçat']],['barret',['cap','gorra','portar','roba']],['pantalons',['cames','roba','butxaca','cintura']],['camisa',['roba','botons','mànigues','coll']],['clau',['porta','obrir','pany','metall']],['martell',['clau','eina','picar','fuster']],['tisores',['tallar','paper','fulles','eina']],['llapis',['escriure','dibuixar','goma','paper']],['motxilla',['esquena','escola','bossa','llibres']],['taula',['moble','menjar','potes','cadira']],['cadira',['seure','moble','potes','taula']],['mirall',['reflex','cara','vidre','bany']],['porta',['obrir','tancar','clau','entrada']],['finestra',['vidre','obrir','casa','llum']],['escala',['pujar','baixar','graons','pis']],['ascensor',['pujar','baixar','pis','botó']],['piscina',['aigua','nedar','estiu','banyar']],['dutxa',['aigua','bany','sabó','rentar']],['pilota',['jugar','rodona','futbol','botar']],['trofeu',['guanyar','premi','campió','copa']],['circ',['pallasso','carpa','espectacle','malabars']],['pallasso',['circ','nas','riure','maquillatge']],['nadal',['desembre','regals','arbre','pare Noel']],['aniversari',['anys','pastís','espelmes','festa']],['vacances',['viatge','estiu','hotel','descans']],['dormir',['llit','nit','somni','ulls']],['córrer',['ràpid','cames','cursa','esport']],['saltar',['amunt','peus','obstacle','bot']],['nedar',['aigua','piscina','mar','braços']],['ballar',['música','ritme','discoteca','moviment']],['cuinar',['menjar','cuina','recepta','forn']],['llegir',['llibre','lletres','pàgina','text']],['escriure',['llapis','paper','lletres','text']]
].map(([word,forbidden])=>({word,forbidden}));
const recentDraw=[],recentTabu=[];
const HISTORY_LIMIT=Math.max(300,Math.min(1100,DRAW_WORDS.length-20));
let installed=false;
function send(socket,payload){if(socket?.readyState===1)socket.send(JSON.stringify(payload))}
function cleanName(v){return String(v||'').trim().slice(0,20)||'Jugador'}
function makeCode(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let code;do code=Array.from({length:5},()=>chars[Math.floor(Math.random()*chars.length)]).join('');while(rooms.has(code));return code}
function playerOf(room,id){return room?.players.find(p=>p.id===id)}
function publicPlayers(room){return room.players.map(p=>({id:p.id,name:p.name,score:p.score||0,connected:p.socket?.readyState===1}))}
function broadcast(room,payload){room.players.forEach(p=>send(p.socket,payload))}
function normalize(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('ca').replace(/[’']/g,' ').replace(/[^a-z0-9ç· ]+/g,' ').replace(/\s+/g,' ').trim()}
function normalizeGuess(v){return normalize(v).replace(/^(el|la|els|les|un|una|uns|unes)\s+/,'')}
function clamp(v,min,max){const n=Number(v);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):min}
function remember(list,value,limit){const key=normalize(value),i=list.indexOf(key);if(i>=0)list.splice(i,1);list.push(key);while(list.length>limit)list.shift()}
function cleanSeen(values){return new Set((Array.isArray(values)?values:[]).slice(-1200).map(normalize).filter(Boolean))}
function state(room){broadcast(room,{type:'social_state',roomCode:room.code,game:room.game,phase:room.phase,creatorId:room.players[0]?.id||null,players:publicPlayers(room),round:room.round,totalRounds:room.totalRounds})}
function clearTimers(room){if(room?.timer)clearTimeout(room.timer);if(room?.nextTimer)clearTimeout(room.nextTimer);if(room){room.timer=null;room.nextTimer=null}}
function leaveCurrent(socket,notify=true){const room=rooms.get(socket.socialRoomCode);if(!room)return;const i=room.players.findIndex(p=>p.id===socket.playerId);if(i<0)return;const [p]=room.players.splice(i,1);clearTimeout(p.disconnectTimer);socket.socialRoomCode=null;clearTimers(room);if(!room.players.length){rooms.delete(room.code);return}room.phase='lobby';room.round=-1;room.current=null;room.ready=new Set();room.players.forEach(x=>x.score=0);if(notify)broadcast(room,{type:'social_player_left'});state(room)}
function create(socket,m){leaveCurrent(socket,false);const p={id:socket.playerId,name:cleanName(m.playerName),socket,score:0,seen:cleanSeen(m.seenWords)};const room={code:makeCode(),game:GAMES.has(m.game)?m.game:'dibuixa',phase:'lobby',players:[p],round:-1,totalRounds:TOTAL_ROUNDS,current:null,ready:new Set(),used:new Set(),timer:null,nextTimer:null,startedAt:0};rooms.set(room.code,room);socket.socialRoomCode=room.code;send(socket,{type:'social_created',roomCode:room.code});state(room)}
function join(socket,m){leaveCurrent(socket,false);const code=String(m.roomCode||'').trim().toUpperCase(),room=rooms.get(code);if(!room)return send(socket,{type:'social_error',message:'La sala no existeix.'});if(room.players.length>=2)return send(socket,{type:'social_error',message:'La sala ja és plena.'});if(room.phase!=='lobby')return send(socket,{type:'social_error',message:'La partida ja ha començat.'});room.players.push({id:socket.playerId,name:cleanName(m.playerName),socket,score:0,seen:cleanSeen(m.seenWords)});socket.socialRoomCode=code;send(socket,{type:'social_joined',roomCode:code});state(room)}
function resume(socket,m){const room=rooms.get(String(m.roomCode||'').trim().toUpperCase()),p=room?.players.find(x=>x.id===m.playerId);if(!room||!p)return send(socket,{type:'social_resume_failed'});clearTimeout(p.disconnectTimer);p.disconnectTimer=null;p.socket=socket;socket.playerId=p.id;socket.socialRoomCode=room.code;send(socket,{type:'social_resumed',playerId:p.id,roomCode:room.code,phase:room.phase});state(room);if(room.current)sendRoundView(room,p)}
function chooseDrawWord(room){const seen=new Set(room.players.flatMap(p=>[...p.seen])),global=new Set(recentDraw);const available=(source,avoidSeen=true,avoidGlobal=true)=>source.filter(w=>!room.used.has(normalize(w))&&(!avoidSeen||!seen.has(normalize(w)))&&(!avoidGlobal||!global.has(normalize(w))));const simple=available(DRAW_SIMPLE);const pools=[simple.length>=35?simple:[],available(DRAW_WORDS),available(DRAW_WORDS,true,false),available(DRAW_WORDS,false,true),available(DRAW_WORDS,false,false)];const pool=pools.find(x=>x.length)||DRAW_WORDS,word=pool[Math.floor(Math.random()*pool.length)];room.used.add(normalize(word));remember(recentDraw,word,HISTORY_LIMIT);return word}
function chooseTabuCard(room){const global=new Set(recentTabu);let pool=TABU_CARDS.filter(c=>!room.used.has(normalize(c.word))&&!global.has(normalize(c.word)));if(!pool.length)pool=TABU_CARDS.filter(c=>!room.used.has(normalize(c.word)));if(!pool.length)pool=TABU_CARDS;const card=pool[Math.floor(Math.random()*pool.length)];room.used.add(normalize(card.word));remember(recentTabu,card.word,Math.max(60,TABU_CARDS.length-15));return card}
function sendRoundView(room,p){const c=room.current;if(!c)return;const actor=p.id===c.actorId,base={type:'social_round',game:room.game,round:room.round+1,totalRounds:room.totalRounds,role:actor?'actor':'guesser',seconds:ROUND_SECONDS,phase:room.phase,players:publicPlayers(room),startAt:room.startedAt||0};if(room.game==='dibuixa')send(p.socket,{...base,word:actor?c.word:null,wordLength:c.word.length});else send(p.socket,{...base,word:actor?c.card.word:null,forbidden:actor?c.card.forbidden:[],clues:c.clues||[]})}
function prepareNextRound(room){clearTimers(room);room.round++;if(room.round>=room.totalRounds)return finish(room);const actor=room.players[room.round%2],guesser=room.players[(room.round+1)%2];room.ready=new Set();room.startedAt=0;room.current=room.game==='dibuixa'?{actorId:actor.id,guesserId:guesser.id,word:chooseDrawWord(room)}:{actorId:actor.id,guesserId:guesser.id,card:chooseTabuCard(room),clues:[]};room.phase='round_ready';room.players.forEach(p=>sendRoundView(room,p))}
function roundReady(socket){const room=rooms.get(socket.socialRoomCode);if(!room||room.phase!=='round_ready'||!playerOf(room,socket.playerId))return;room.ready.add(socket.playerId);if(room.ready.size<2)return;if(room.game==='dibuixa')startTimedRound(room);else{room.phase='waiting_clue';room.players.forEach(p=>sendRoundView(room,p));broadcast(room,{type:'social_waiting_clue'})}}
function startTimedRound(room){room.phase='playing';room.startedAt=Date.now()+250;broadcast(room,{type:'social_timer_start',round:room.round+1,startAt:room.startedAt,seconds:ROUND_SECONDS});if(room.timer)clearTimeout(room.timer);room.timer=setTimeout(()=>endRound(room,false,'Temps!'),Math.max(0,room.startedAt-Date.now())+ROUND_SECONDS*1000+100)}
function forbiddenHit(clue,card){const value=` ${normalize(clue)} `;return [card.word,...card.forbidden].find(term=>{const needle=normalize(term);return needle&&value.includes(` ${needle} `)})||null}
function tabuClue(socket,m){const room=rooms.get(socket.socialRoomCode),c=room?.current;if(!room||room.game!=='tabu'||!c||c.actorId!==socket.playerId||!['waiting_clue','playing'].includes(room.phase))return;const clue=String(m.clue||'').replace(/\s+/g,' ').trim().slice(0,180);if(!clue)return;const hit=forbiddenHit(clue,c.card);if(hit)return send(socket,{type:'social_tabu_invalid',message:`No pots fer servir “${hit}”.`});c.clues.push(clue);if(c.clues.length>8)c.clues.shift();send(playerOf(room,c.guesserId)?.socket,{type:'social_tabu_clue',clue,clues:c.clues});send(socket,{type:'social_tabu_clue_sent',clue,clues:c.clues});if(room.phase==='waiting_clue')startTimedRound(room)}
function submitGuess(socket,m){const room=rooms.get(socket.socialRoomCode),c=room?.current;if(!room||!c||room.phase!=='playing'||c.guesserId!==socket.playerId||Date.now()<room.startedAt)return;const text=String(m.guess||'').trim().slice(0,80);if(!text)return;const answer=room.game==='dibuixa'?c.word:c.card.word,correct=normalizeGuess(text)===normalizeGuess(answer);send(playerOf(room,c.actorId)?.socket,{type:'social_guess_event',name:playerOf(room,c.guesserId)?.name||'Rival',guess:text,correct});send(socket,{type:'social_guess_event',name:'Tu',guess:text,correct});if(correct){const a=playerOf(room,c.actorId),g=playerOf(room,c.guesserId);if(a)a.score++;if(g)g.score++;endRound(room,true,'Encertat!')}}
function drawEvent(socket,m){const room=rooms.get(socket.socialRoomCode),c=room?.current;if(!room||room.game!=='dibuixa'||room.phase!=='playing'||c?.actorId!==socket.playerId)return;const segments=(Array.isArray(m.segments)?m.segments:[]).slice(0,24).map(s=>({x1:clamp(s.x1,0,1),y1:clamp(s.y1,0,1),x2:clamp(s.x2,0,1),y2:clamp(s.y2,0,1),size:clamp(s.size,1,28),color:/^#[0-9a-f]{6}$/i.test(s.color)?s.color:'#111111'}));if(segments.length)send(playerOf(room,c.guesserId)?.socket,{type:'social_draw_event',segments})}
function drawClear(socket){const room=rooms.get(socket.socialRoomCode),c=room?.current;if(room?.game==='dibuixa'&&c?.actorId===socket.playerId)send(playerOf(room,c.guesserId)?.socket,{type:'social_draw_clear'})}
function endRound(room,correct,message){if(!room?.current||!['playing','waiting_clue','round_ready'].includes(room.phase))return;clearTimers(room);room.phase='round_end';const answer=room.game==='dibuixa'?room.current.word:room.current.card.word;room.players.forEach(p=>p.seen.add(normalize(answer)));broadcast(room,{type:'social_round_end',correct,message,answer,players:publicPlayers(room)});room.nextTimer=setTimeout(()=>prepareNextRound(room),1800)}
function finish(room){clearTimers(room);room.phase='results';room.current=null;const players=publicPlayers(room),sorted=[...players].sort((a,b)=>b.score-a.score),winnerText=sorted.length>1&&sorted[0].score===sorted[1].score?'Empat!':`${sorted[0]?.name||'Jugador'} guanya!`;broadcast(room,{type:'social_results',players,winnerText});state(room)}
function start(socket){const room=rooms.get(socket.socialRoomCode);if(!room||room.players[0]?.id!==socket.playerId||room.players.length!==2||room.phase!=='lobby')return;room.players.forEach(p=>p.score=0);room.round=-1;room.used=new Set();prepareNextRound(room)}
function disconnect(socket){const room=rooms.get(socket.socialRoomCode),p=playerOf(room,socket.playerId);if(!room||!p||p.socket!==socket)return;p.socket=null;clearTimeout(p.disconnectTimer);p.disconnectTimer=setTimeout(()=>leaveCurrent({playerId:p.id,socialRoomCode:room.code},true),25000);state(room)}
function handle(socket,m){if(!String(m.type||'').startsWith('social_'))return false;switch(m.type){case'social_create':create(socket,m);break;case'social_join':join(socket,m);break;case'social_resume':resume(socket,m);break;case'social_start':start(socket);break;case'social_round_ready':roundReady(socket);break;case'social_tabu_clue':tabuClue(socket,m);break;case'social_guess':submitGuess(socket,m);break;case'social_draw':drawEvent(socket,m);break;case'social_draw_clear':drawClear(socket);break;case'social_leave':leaveCurrent(socket,true);send(socket,{type:'social_left'});break;default:send(socket,{type:'social_error',message:'Ordre desconeguda.'})}return true}
function install(WebSocket){if(installed)return;installed=true;const proto=WebSocket.Server.prototype,originalServerOn=proto.on;proto.on=function(event,listener){if(event!=='connection')return originalServerOn.call(this,event,listener);return originalServerOn.call(this,event,(socket,request)=>{const originalSocketOn=socket.on;socket.on=function(ev,fn){if(ev==='message')return originalSocketOn.call(socket,'message',(raw,...rest)=>{let m=null;try{m=JSON.parse(raw.toString())}catch{}if(m&&String(m.type||'').startsWith('social_')){handle(socket,m);return}fn(raw,...rest)});if(ev==='close')return originalSocketOn.call(socket,'close',(...args)=>{disconnect(socket);fn(...args)});return originalSocketOn.call(socket,ev,fn)};try{listener(socket,request)}finally{socket.on=originalSocketOn}})}}
module.exports={install,handle,disconnect};