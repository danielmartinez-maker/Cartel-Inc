import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=process.argv.includes('--dist')?resolve('dist'):fileURLToPath(new URL('../',import.meta.url));
const portArgument=process.argv.find(a=>/^--port=\d+$/.test(a))?.split('=')[1]||process.argv[process.argv.indexOf('--port')+1];
const port=Number(process.env.PORT||(/^\d+$/.test(portArgument)?portArgument:8080));
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.md':'text/plain; charset=utf-8'};
http.createServer(async(req,res)=>{
  try{
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end('Method not allowed');return;}
    const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(path.split('/').some(p=>p.startsWith('.')||p==='node_modules'))throw new Error('Forbidden');
    let target=resolve(root,`.${path}`);
    if(target!==resolve(root)&&!target.startsWith(resolve(root)+sep))throw new Error('Forbidden');
    if((await stat(target)).isDirectory())target=resolve(target,'index.html');
    const content=await readFile(target);
    res.writeHead(200,{'Content-Type':types[extname(target)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'"});
    res.end(req.method==='HEAD'?undefined:content);
  }catch(error){res.writeHead(error.message==='Forbidden'?403:404,{'Content-Type':'text/plain'});res.end(error.message==='Forbidden'?'Forbidden':'Not found');}
}).listen(port,'0.0.0.0',()=>console.log(`Cartel: Containment running at http://localhost:${port}${process.argv.includes('--dist')?' (production build)':''}`));
