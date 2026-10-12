import {readFile,readdir,stat} from 'node:fs/promises';import assert from 'node:assert/strict';
const sw=await readFile('src/sw.js','utf8');const list=sw.match(/const FILES=\[([^\]]+)\]/)[1].match(/'([^']+)'/g).map(x=>x.slice(1,-1));
for(const f of list){const path=f==='./'?'src/index.html':'src/'+f.slice(2);assert((await stat(path)).isFile(),path);}
const manifest=JSON.parse(await readFile('src/manifest.webmanifest'));assert.equal(manifest.orientation,'landscape');for(const icon of manifest.icons)await stat('src/'+icon.src.slice(2));
const walk=async p=>{const result=[];for(const n of await readdir(p,{withFileTypes:true})){if(n.isDirectory())result.push(...await walk(p+'/'+n.name));else result.push(p+'/'+n.name);}return result;};
const files=await walk('src');for(const f of files){assert((await stat(f)).size<25*1024*1024,f+' exceeds static asset budget');if(/\.(mjs|css|html|json|webmanifest)$/.test(f)){const s=await readFile(f,'utf8');assert(!/https?:\/\//.test(s),f+' has a runtime network dependency');}}
console.log('PASS: all offline resources exist; landscape manifest; no external runtime dependencies; asset limits');
