(function(){
if(typeof game==='undefined'||game!=='emparaulats')return;

const pendingValidations=new Map();
let validationSeq=0;
const originalOnMessage=socket?.onmessage;
if(socket&&originalOnMessage){
  socket.onmessage=event=>{
    let data=null;
    try{data=JSON.parse(event.data)}catch{}
    if(data?.type==='arcade_word_validation'&&data.requestId){
      const pending=pendingValidations.get(data.requestId);
      if(pending){
        pendingValidations.delete(data.requestId);
        clearTimeout(pending.timer);
        pending.resolve(data);
      }
      return;
    }
    return originalOnMessage.call(socket,event);
  };
}

function validateWordsOnline(words){
  return new Promise((resolve,reject)=>{
    if(!socket||socket.readyState!==WebSocket.OPEN)return reject(new Error('No hi ha connexió amb el servidor.'));
    const requestId=`wv_${Date.now()}_${++validationSeq}`;
    const timer=setTimeout(()=>{
      pendingValidations.delete(requestId);
      reject(new Error('La consulta del diccionari està trigant massa.'));
    },7000);
    pendingValidations.set(requestId,{resolve,reject,timer});
    socket.send(JSON.stringify({type:'arcade_word_validate',requestId,words}));
  });
}

playWord=async function(){
  const view=currentWordView();
  const permissive={has:()=>true};
  const result=WE.validateMove(view.board,pendingWord,permissive);
  if(!result.ok)return setFeedback(result.message,'bad');

  if(mode==='room'){
    setFeedback('Comprovant la paraula al diccionari català...');
    send('arcade_word_move',{placements:pendingWord});
    pendingWord=[];
    selectedRackIndex=null;
    selectedWildcardLetter=null;
    pendingWildcardDrop=null;
    return;
  }

  const playButton=$('wordPlay');
  if(playButton)playButton.disabled=true;
  setFeedback('Comprovant la paraula al diccionari català...');
  try{
    const checked=await validateWordsOnline(result.words);
    if(!checked.valid){
      const invalid=(checked.invalid||[])[0]||result.words[0];
      const suffix=checked.unavailable?' Ara mateix no s’ha pogut consultar el diccionari online.':'';
      return setFeedback(`“${String(invalid).toLocaleLowerCase('ca')}” no és al diccionari català.${suffix}`,'bad');
    }

    localWord.board=WE.applyMove(localWord.board,result.placements);
    const used=[...pendingWord].sort((a,b)=>b.rackIndex-a.rackIndex);
    used.forEach(p=>localWord.racks[0].splice(p.rackIndex,1));
    localWord.racks[0].push(...WE.draw(localWord.bag,7-localWord.racks[0].length));
    localWord.scores[0]+=result.score;
    localWord.turn=1;
    localWord.turns++;
    localWord.passes=0;
    setScore(localWord.scores[0]);
    pendingWord=[];
    selectedRackIndex=null;
    selectedWildcardLetter=null;
    pendingWildcardDrop=null;
    setFeedback(`${result.words.join(' · ')}: +${result.score} punts`,'good');
    if(shouldFinishWords())return finishLocalWords();
    renderWordState();
  }catch(error){
    setFeedback(error.message||'No s’ha pogut consultar el diccionari català.','bad');
  }finally{
    const button=$('wordPlay');
    if(button&&currentWordView().turnId===(mode==='solo'?'me':myId))button.disabled=false;
  }
};
})();
