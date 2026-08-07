const http=require('http');
const WebSocket=require('ws');
const wordGame=require('./word-game');
const social=require('./social');

async function start(){
  await wordGame.loadCatalanDictionary();
  const originalCreateServer=http.createServer.bind(http);
  http.createServer=(listener)=>originalCreateServer((request,response)=>{
    const url=new URL(request.url,`http://${request.headers.host||'localhost'}`);
    if(url.pathname==='/api/word-check'){
      const words=url.searchParams.getAll('word').slice(0,20);
      const result=wordGame.validateWords(words);
      response.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
      return response.end(JSON.stringify(result));
    }
    return listener(request,response);
  });
  social.install(WebSocket);
  require('./server');
}

start().catch(error=>{console.error('No s’ha pogut carregar el diccionari català:',error);process.exit(1)});
