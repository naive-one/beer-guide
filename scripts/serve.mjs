import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
const port=Number(process.env.PORT ?? 8080);
if(!Number.isInteger(port)||port<0||port>65535)throw new Error('PORT must be an integer between 0 and 65535.');
await fs.access(path.join(root,'index.html'));
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer(async(req,res)=>{
 const send=(status,body,type='text/plain; charset=utf-8')=>{
  res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
  res.end(req.method==='HEAD'?undefined:body);
 };
 if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');return send(405,'Method not allowed');}
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const parts=pathname.split('/').filter(Boolean);
  // Do not serve deployment-control files, dotfiles, or anything outside dist.
  if(pathname.includes('\0')||pathname.includes('\\')||parts.some(p=>p.startsWith('.')||p.startsWith('_')))return send(404,'Not found');
  const filename=path.resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
  if(!filename.startsWith(root+path.sep))return send(404,'Not found');
  const body=await fs.readFile(filename);
  send(200,body,types[path.extname(filename)]??'application/octet-stream');
 }catch(err){
  if(err instanceof URIError)return send(400,'Malformed URL');
  if(!['ENOENT','EISDIR','ENOTDIR'].includes(err.code)){console.error(err);return send(500,'Internal error');}
  send(404,await fs.readFile(path.join(root,'404.html')),'text/html; charset=utf-8');
 }
});
server.on('error',err=>{console.error(err.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`Preview: http://127.0.0.1:${server.address().port} (dist only; Ctrl+C to stop)`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
