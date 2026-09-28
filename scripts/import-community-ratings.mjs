import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {validateRating,validateSource,validateCommunity} from './community-contract.mjs';
export function integrate(data,input){
 if(!input||!Array.isArray(input.records)||Object.keys(input).some(k=>k!=='records'))throw Error('Expected {records:[]}');
 const out=structuredClone(data),seen=new Set();
 for(const record of input.records){
  if(!record||Object.keys(record).some(k=>!['beerId','rating','source'].includes(k)))throw Error('Invalid record');
  const {beerId,rating:r,source}=record,b=out.beers.find(b=>b.id===beerId);if(!b)throw Error('Unknown beer ID '+beerId);
  validateSource(source,r?.sourceId);
  const key=JSON.stringify([beerId,r.platform,r.sourceId]);if(seen.has(key))throw Error('Duplicate input rating');seen.add(key);
  if(Object.hasOwn(out.sources,source.id)&&!isDeepStrictEqual(out.sources[source.id],source))throw Error('Conflicting registered source');
  Object.defineProperty(out.sources,source.id,{value:structuredClone(source),enumerable:true,configurable:true,writable:true});validateRating(r,out.sources);
  const ratings=b.communityRatings||[],old=ratings.find(x=>x.platform===r.platform&&x.sourceId===r.sourceId);
  if(old&&!isDeepStrictEqual(old,r))throw Error('Conflicting existing rating');
  if(!old)b.communityRatings=[...ratings,structuredClone(r)];
 }
 validateCommunity(out);
 if(out.meta?.coverage)out.meta.coverage.sources=Object.keys(out.sources).length;
 return out;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);let inputPath,dataPath='data/beers.json',write=false;
 for(let i=0;i<args.length;i++){if(args[i]==='--write')write=true;else if(['--input','--data'].includes(args[i])){const key=args[i],v=args[++i];if(!v||v.startsWith('--'))throw Error('Missing path');if(key==='--input')inputPath=v;else dataPath=v;}else throw Error('Unknown argument '+args[i]);}
 if(!inputPath)throw Error('--input is required');
 const inputReal=fs.realpathSync(inputPath),dataReal=fs.realpathSync(dataPath);
 if(inputReal===dataReal||fs.statSync(inputReal).ino===fs.statSync(dataReal).ino)throw Error('Input and data must differ');
 if(write&&fs.lstatSync(path.resolve(dataPath)).isSymbolicLink())throw Error('Refusing symlink output');
 const data=JSON.parse(fs.readFileSync(dataReal,'utf8')),out=integrate(data,JSON.parse(fs.readFileSync(inputReal,'utf8')));
 if(write){const temporary=fs.mkdtempSync(path.join(path.dirname(dataReal),'.community-import-'));try{const staged=path.join(temporary,'beers.json');fs.writeFileSync(staged,JSON.stringify(out,null,2)+'\n');fs.renameSync(staged,dataReal);}finally{fs.rmSync(temporary,{recursive:true,force:true});}}
 console.log(JSON.stringify({mode:write?'write':'dry-run',changed:!isDeepStrictEqual(data,out)}));
}
