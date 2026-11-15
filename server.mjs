import http from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {MemoryStore} from './functions/src/store.mjs';
import {dispatch} from './functions/src/service.mjs';

const root=path.dirname(fileURLToPath(import.meta.url));
function loadLocalSettings() {
  const file=path.join(root,'.env.local'); if(!existsSync(file)) return;
  for(const line of readFileSync(file,'utf8').split('\n')) {
    const match=line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);if(!match)continue;
    if(!['GEMINI_API_KEY','GEMINI_MODEL','ENABLE_OLLAMA','OLLAMA_MODEL','USE_FIRESTORE','FIRESTORE_EMULATOR_HOST','GCLOUD_PROJECT'].includes(match[1]))continue;
    const value=match[2].trim().replace(/^(["'])(.*)\1$/,'$2');if(value)process.env[match[1]]=value;
  }
}
loadLocalSettings();
const store=process.env.USE_FIRESTORE==='1'?new (await import('./functions/src/firestore-store.mjs')).FirestoreStore():new MemoryStore();
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.wasm':'application/wasm','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.ttf':'font/ttf'};
const server=http.createServer(async(req,res)=>{
  const origin=req.headers.origin||'';
  if(/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');}
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  try {
    const pathname=new URL(req.url,'http://127.0.0.1').pathname;
    if(pathname.startsWith('/api/')) {
      loadLocalSettings();let body='';for await(const chunk of req){body+=chunk;if(body.length>20000){res.writeHead(413);res.end('{"error":"Request too large"}');return;}}
      const payload=body?JSON.parse(body):{};
      const result=await dispatch(store,pathname,req.method,payload);
      res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(result));return;
    }
    const flutter=pathname.startsWith('/flutter/');
    const base=path.join(root,flutter?'flutter_app/build/web':'web');
    const rel=flutter?pathname.slice('/flutter/'.length):pathname.slice(1);
    const file=path.resolve(base,decodeURIComponent(rel||'index.html'));
    if(file!==base&&!file.startsWith(base+path.sep))throw Object.assign(new Error('Not found'),{status:404});
    const content=readFileSync(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(content);
  } catch(error){const status=error.status||(error.code==='ENOENT'?404:error instanceof SyntaxError?400:502);res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify({error:error.status?error.message:status===400?'Invalid JSON request.':status===404?'Not found.':'Dependency unavailable. Check model and database configuration; no purchase occurred.'}));}
});
const port=Number(process.env.PORT||8787);
server.listen(port,'127.0.0.1',()=>console.log(`Commerce Trust Lab: http://127.0.0.1:${port} | storage=${store.storage} | synthetic catalog`));
