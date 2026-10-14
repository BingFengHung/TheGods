// Optional real Canvas check. Requires an existing local native Canvas module.
// This checks painted seams, not artistic fidelity or a phone browser.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {drawHero,setHeroAtlas,setCreatureAtlas,heroPose} from '../src/draw.mjs';
const modulePath=process.env.THEGODS_CANVAS_MODULE;
if(!modulePath)throw Error('Set THEGODS_CANVAS_MODULE to a local @napi-rs/canvas/index.js path.');
const {createCanvas,loadImage}=await import(pathToFileURL(resolve(modulePath)).href);
setHeroAtlas(await loadImage(new URL('../src/assets/hero-parts.webp',import.meta.url).pathname));
setCreatureAtlas(await loadImage(new URL('../src/assets/creatures.webp',import.meta.url).pathname));
const canvas=createCanvas(600,700),c=canvas.getContext('2d'),scale=3;
let cases=0;
for(const armor of ['crimson','jade','ivory'])for(const weapon of ['sword','staff','glaive']){
 for(const dir of [3,7])for(const action of ['idle','walk','attack','cast','defend','hit'])for(const t of [0,.157,.31,.471]){
  c.clearRect(0,0,600,700);
  drawHero(c,260,610,{equip:{armor,weapon,head:'crown',hair:'silver'},dir,action,t,scale,portrait:true});
  const pose=heroPose({action,t}),mirror=dir===7?-1:1;
  const bob=action==='walk'?Math.abs(Math.sin(t*10))*2:Math.sin(t*2)*.6;
  const ox=260+(action==='hit'?Math.sin(t*48)*3*scale:0),oy=610-bob*scale;
  for(const arm of pose.arms)for(const name of ['elbow','wrist','grip']){
   const p=arm[name],x=Math.round(ox+mirror*p.x*scale),y=Math.round(oy+p.y*scale);
   const data=c.getImageData(x-1,y-1,3,3).data;
   const opaque=Array.from({length:9},(_,i)=>data[i*4+3]).filter(a=>a>200).length;
   assert(opaque>=5,JSON.stringify({problem:'painted limb seam',armor,weapon,dir,action,t,side:arm.side,joint:name,opaque}));
  }
  cases++;
 }
}
console.log(`PASS: ${cases} rendered limb states; both elbows, wrists and grips stay painted.`);
