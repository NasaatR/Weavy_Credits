// Local UI fixture only: no Weavy account, extension permissions or network capture.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/'){res.writeHead(302,{Location:'/extension/panel.html'+url.search}).end();return;}
  const name=url.pathname;
  const file=path.resolve(root,'.'+decodeURIComponent(name));
  if(!file.startsWith(root)||(!name.startsWith('/extension/')&&name!=='/scripts/preview-fixture.js')){res.writeHead(404).end();return;}
  let body=await fs.readFile(file);
  if(name==='/extension/panel.html')body=body.toString().replace('<script type="module" src="panel.js"></script>','<script type="module" src="/scripts/preview-fixture.js"></script>');
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(body);
 }catch{res.writeHead(404).end('Not found');}
});
server.listen(Number(process.env.PORT||18765),'127.0.0.1',()=>console.log('Synthetic UI preview: http://localhost:'+server.address().port));
