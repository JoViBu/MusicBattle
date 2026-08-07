(function(){
const SIZE=11,CENTER=5;
const POINTS={A:1,B:3,C:2,D:2,E:1,F:4,G:3,H:4,I:1,J:8,K:8,L:1,M:3,N:1,O:1,P:3,Q:8,R:1,S:1,T:1,U:1,V:4,W:8,X:8,Y:8,Z:10,'*':0};
const DISTRIBUTION={A:12,B:2,C:3,D:3,E:13,F:1,G:2,H:1,I:8,J:1,L:4,M:3,N:6,O:5,P:2,Q:1,R:8,S:8,T:5,U:4,V:1,X:1,Z:1,'*':2};
const PREMIUM={
  '0,0':'tw','0,5':'tw','0,10':'tw','5,0':'tw','5,10':'tw','10,0':'tw','10,5':'tw','10,10':'tw',
  '1,1':'dw','2,2':'dw','3,3':'dw','4,4':'dw','6,6':'dw','7,7':'dw','8,8':'dw','9,9':'dw','1,9':'dw','2,8':'dw','3,7':'dw','4,6':'dw','6,4':'dw','7,3':'dw','8,2':'dw','9,1':'dw','5,5':'center',
  '0,3':'tl','0,7':'tl','3,0':'tl','3,10':'tl','7,0':'tl','7,10':'tl','10,3':'tl','10,7':'tl',
  '1,5':'dl','2,4':'dl','2,6':'dl','4,2':'dl','4,8':'dl','5,1':'dl','5,9':'dl','6,2':'dl','6,8':'dl','8,4':'dl','8,6':'dl','9,5':'dl'
};
function normalize(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Ç/g,'C').replace(/ç/g,'c').replace(/[^a-zA-Z]/g,'').toUpperCase()}
function emptyBoard(){return Array.from({length:SIZE},()=>Array(SIZE).fill(null))}
function boardHasLetters(board){return board.some(row=>row.some(Boolean))}
function key(r,c){return `${r},${c}`}
function premiumAt(r,c){return PREMIUM[key(r,c)]||''}
function buildBag(random=Math.random){const bag=[];Object.entries(DISTRIBUTION).forEach(([letter,count])=>{for(let i=0;i<count;i++)bag.push(letter)});for(let i=bag.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]]}return bag}
function draw(bag,count){return bag.splice(0,Math.min(count,bag.length))}
function cellLetter(value){return normalize(typeof value==='string'?value:value?.letter)}
function cellIsWildcard(value){return typeof value==='string'?value!==value.toUpperCase():Boolean(value?.isWildcard)}
function wordAt(board,placements,r,c,dr,dc){
  const placed=new Map(placements.map(p=>[key(p.r,p.c),p]));
  const value=(rr,cc)=>placed.get(key(rr,cc))||board[rr]?.[cc]||null;
  const letter=(rr,cc)=>cellLetter(value(rr,cc));
  while(letter(r-dr,c-dc)){r-=dr;c-=dc}
  let word='',cells=[];
  while(r>=0&&c>=0&&r<SIZE&&c<SIZE&&letter(r,c)){const current=value(r,c);word+=cellLetter(current);cells.push({r,c,isNew:placed.has(key(r,c)),isWildcard:cellIsWildcard(current)});r+=dr;c+=dc}
  return {word,cells};
}
function scoreWord(wordData){let base=0,mult=1;for(let i=0;i<wordData.cells.length;i++){const cell=wordData.cells[i],letter=wordData.word[i];let points=cell.isWildcard?0:(POINTS[letter]||1);if(cell.isNew){const premium=premiumAt(cell.r,cell.c);if(premium==='dl')points*=2;if(premium==='tl')points*=3;if(premium==='dw'||premium==='center')mult*=2;if(premium==='tw')mult*=3}base+=points}return base*mult}
function validateMove(board,placements,dictionary){
  const wordsSet=dictionary==null?null:(dictionary instanceof Set?dictionary:(dictionary&&typeof dictionary.has==='function'?dictionary:new Set((dictionary||[]).map(normalize))));
  const clean=placements.map(p=>({r:Number(p.r),c:Number(p.c),letter:normalize(p.letter),rackIndex:Number(p.rackIndex),isWildcard:Boolean(p.isWildcard)}));
  if(!clean.length)return {ok:false,message:'Col·loca almenys una lletra.'};
  const seen=new Set();for(const p of clean){if(!Number.isInteger(p.r)||!Number.isInteger(p.c)||p.r<0||p.c<0||p.r>=SIZE||p.c>=SIZE||!p.letter)return {ok:false,message:'Hi ha una fitxa mal col·locada.'};if(board[p.r][p.c])return {ok:false,message:'Aquesta casella ja està ocupada.'};if(seen.has(key(p.r,p.c)))return {ok:false,message:'No pots posar dues fitxes al mateix lloc.'};seen.add(key(p.r,p.c))}
  const sameRow=clean.every(p=>p.r===clean[0].r),sameCol=clean.every(p=>p.c===clean[0].c);
  if(!sameRow&&!sameCol)return {ok:false,message:'Les lletres han d’anar en una sola línia.'};
  let dir=sameRow?[0,1]:[1,0];
  if(clean.length===1){const horizontal=wordAt(board,clean,clean[0].r,clean[0].c,0,1),vertical=wordAt(board,clean,clean[0].r,clean[0].c,1,0);dir=vertical.word.length>horizontal.word.length?[1,0]:[0,1]}
  const sorted=[...clean].sort((a,b)=>dir[0]?(a.r-b.r):(a.c-b.c));
  const start=sorted[0],end=sorted[sorted.length-1];
  for(let r=start.r,c=start.c;r<=end.r&&c<=end.c;r+=dir[0],c+=dir[1])if(!board[r][c]&&!seen.has(key(r,c)))return {ok:false,message:'No poden quedar forats entre les lletres.'};
  const occupied=boardHasLetters(board);
  if(!occupied&&!clean.some(p=>p.r===CENTER&&p.c===CENTER))return {ok:false,message:'La primera paraula ha de passar pel centre.'};
  if(occupied&&!clean.some(p=>[[1,0],[-1,0],[0,1],[0,-1]].some(([dr,dc])=>board[p.r+dr]?.[p.c+dc])))return {ok:false,message:'La paraula ha de tocar les que ja hi ha.'};
  const main=wordAt(board,clean,clean[0].r,clean[0].c,dir[0],dir[1]);
  if(main.word.length<2)return {ok:false,message:'Forma una paraula de dues lletres o més.'};
  const formed=[main];const crossDir=dir[0]?[0,1]:[1,0];
  for(const p of clean){const cross=wordAt(board,clean,p.r,p.c,crossDir[0],crossDir[1]);if(cross.word.length>1)formed.push(cross)}
  const unique=[...new Map(formed.map(item=>[item.word,item])).values()];
  if(wordsSet){const invalid=unique.find(item=>!wordsSet.has(normalize(item.word)));if(invalid)return {ok:false,message:`“${invalid.word.toLocaleLowerCase('ca')}” no és al diccionari.`}}
  const score=unique.reduce((sum,item)=>sum+scoreWord(item),0)+(clean.length===7?40:0);
  return {ok:true,score,words:unique.map(item=>item.word),placements:clean};
}
function applyMove(board,placements){const next=board.map(row=>[...row]);placements.forEach(p=>{next[p.r][p.c]=p.isWildcard?p.letter.toLowerCase():p.letter});return next}
function rackCanSupply(word,board,r,c,dr,dc,rack){const counts={};rack.forEach(letter=>counts[letter]=(counts[letter]||0)+1);const placements=[];for(let i=0;i<word.length;i++){const rr=r+dr*i,cc=c+dc*i;if(rr<0||cc<0||rr>=SIZE||cc>=SIZE)return null;const fixed=board[rr][cc];if(fixed&&cellLetter(fixed)!==word[i])return null;if(!fixed){let isWildcard=false;if(counts[word[i]])counts[word[i]]--;else if(counts['*']){counts['*']--;isWildcard=true}else return null;placements.push({r:rr,c:cc,letter:word[i],isWildcard})}}return placements.length?placements:null}
function findMoves(board,rack,dictionary,limit=80){const words=[...dictionary].map(normalize).filter(word=>word.length>=2&&word.length<=Math.min(11,rack.length+5));const moves=[];const empty=!boardHasLetters(board);for(const word of words){for(const [dr,dc] of [[0,1],[1,0]]){for(let r=0;r<SIZE;r++){for(let c=0;c<SIZE;c++){if(r+dr*(word.length-1)>=SIZE||c+dc*(word.length-1)>=SIZE)continue;if(empty){const covers=dr===0?r===CENTER&&c<=CENTER&&c+word.length-1>=CENTER:c===CENTER&&r<=CENTER&&r+word.length-1>=CENTER;if(!covers)continue}const placements=rackCanSupply(word,board,r,c,dr,dc,rack);if(!placements)continue;const result=validateMove(board,placements,dictionary);if(result.ok){moves.push({...result,word,placements});if(moves.length>limit*8)moves.sort((a,b)=>b.score-a.score).splice(limit*4)}}}}}return moves.sort((a,b)=>b.score-a.score).slice(0,limit)}
function chooseAiMove(board,rack,dictionary,difficulty='normal',random=Math.random){const moves=findMoves(board,rack,dictionary);if(!moves.length)return null;const band=difficulty==='hard'?Math.min(3,moves.length):difficulty==='easy'?Math.min(15,moves.length):Math.min(7,moves.length);const start=difficulty==='easy'?Math.floor(band/3):0;return moves[start+Math.floor(random()*Math.max(1,band-start))]}
window.WordEngine={SIZE,CENTER,POINTS,normalize,emptyBoard,premiumAt,buildBag,draw,validateMove,applyMove,chooseAiMove};
})();
