(function(){
const originalPlayWord=playWord;
async function serverCheckWords(words){
  const params=new URLSearchParams();
  words.forEach(word=>params.append('word',word));
  const response=await fetch(`/api/word-check?${params.toString()}`,{cache:'no-store'});
  if(!response.ok)throw new Error('No s’ha pogut consultar el diccionari.');
  return response.json();
}
playWord=async function(){
  const view=currentWordView();
  const structural=WE.validateMove(view.board,pendingWord,null);
  if(!structural.ok)return setFeedback(structural.message,'bad');
  let dictionaryResult;
  try{dictionaryResult=await serverCheckWords(structural.words)}catch(error){return setFeedback(error.message||'No s’ha pogut consultar el diccionari.','bad')}
  if(!dictionaryResult.ok){const invalid=(dictionaryResult.invalid&&dictionaryResult.invalid[0])||structural.words[0];return setFeedback(`“${String(invalid).toLocaleLowerCase('ca')}” no és al diccionari.`,'bad')}
  if(mode==='room'){
    send('arcade_word_move',{placements:pendingWord});
    pendingWord=[];selectedRackIndex=null;selectedWildcardLetter=null;pendingWildcardDrop=null;
    return;
  }
  localWord.board=WE.applyMove(localWord.board,structural.placements);
  const used=[...pendingWord].sort((a,b)=>b.rackIndex-a.rackIndex);
  used.forEach(p=>localWord.racks[0].splice(p.rackIndex,1));
  localWord.racks[0].push(...WE.draw(localWord.bag,7-localWord.racks[0].length));
  localWord.scores[0]+=structural.score;localWord.turn=1;localWord.turns++;localWord.passes=0;setScore(localWord.scores[0]);
  pendingWord=[];selectedRackIndex=null;selectedWildcardLetter=null;pendingWildcardDrop=null;
  setFeedback(`${structural.words.join(' · ')}: +${structural.score} punts`,'good');
  if(shouldFinishWords())return finishLocalWords();
  renderWordState();
};
})();
