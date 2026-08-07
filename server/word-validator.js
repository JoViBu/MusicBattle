const CACHE_TTL_MS=7*24*60*60*1000;
const cache=new Map();

function normalize(value){
  return String(value||'')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/Ç/g,'C')
    .replace(/ç/g,'c')
    .replace(/[^a-zA-Z]/g,'')
    .toUpperCase();
}

function cacheGet(key){
  const item=cache.get(key);
  if(!item||item.expiresAt<Date.now()){
    if(item)cache.delete(key);
    return null;
  }
  return item.value;
}

function cacheSet(key,value){
  cache.set(key,{value,expiresAt:Date.now()+CACHE_TTL_MS});
  if(cache.size>5000){
    const first=cache.keys().next().value;
    if(first)cache.delete(first);
  }
}

async function fetchJson(url){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),4500);
  try{
    const response=await fetch(url,{signal:controller.signal,headers:{'User-Agent':'MusicBattle/1.0 Catalan word validator'}});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    return await response.json();
  }finally{
    clearTimeout(timer);
  }
}

async function hasCatalanSection(title){
  const params=new URLSearchParams({action:'parse',page:title,prop:'sections',format:'json',origin:'*'});
  const data=await fetchJson(`https://ca.wiktionary.org/w/api.php?${params}`);
  const sections=data?.parse?.sections||[];
  return sections.some(section=>normalize(section.line)==='CATALA');
}

async function lookupCatalanWord(rawWord){
  const key=normalize(rawWord);
  if(key.length<2||key.length>11)return{valid:false,title:null,source:'invalid'};
  const cached=cacheGet(key);
  if(cached)return cached;

  try{
    const searchParams=new URLSearchParams({action:'opensearch',search:String(rawWord||'').toLocaleLowerCase('ca'),limit:'12',namespace:'0',format:'json',origin:'*'});
    const search=await fetchJson(`https://ca.wiktionary.org/w/api.php?${searchParams}`);
    const titles=Array.isArray(search?.[1])?search[1]:[];
    const matching=[...new Set(titles.filter(title=>normalize(title)===key))];

    for(const title of matching){
      if(await hasCatalanSection(title)){
        const result={valid:true,title,source:'viccionari'};
        cacheSet(key,result);
        return result;
      }
    }
    const result={valid:false,title:null,source:'viccionari'};
    cacheSet(key,result);
    return result;
  }catch(error){
    return{valid:false,title:null,source:'unavailable',error:error.message};
  }
}

async function validateCatalanWords(words,fallbackDictionary){
  const values=[...new Set((words||[]).map(normalize).filter(Boolean))];
  const results=[];
  for(const word of values){
    if(fallbackDictionary?.has(word)){
      results.push({word,valid:true,title:word.toLocaleLowerCase('ca'),source:'local'});
      continue;
    }
    const checked=await lookupCatalanWord(word);
    results.push({word,...checked});
  }
  return{
    valid:results.every(item=>item.valid),
    invalid:results.filter(item=>!item.valid).map(item=>item.word),
    unavailable:results.some(item=>item.source==='unavailable'),
    results
  };
}

module.exports={lookupCatalanWord,validateCatalanWords};
