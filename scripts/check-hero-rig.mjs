// Optional native Canvas regression check; not shipped or needed by the game.
// Checks the rendered attachment area, not artistic similarity or real-device UI.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {drawHero,setHeroAtlas,setCreatureAtlas,setTrouserAtlas,heroAttachment} from '../src/draw.mjs';
const modulePath=process.env.THEGODS_CANVAS_MODULE;
if(!modulePath)throw Error('Set THEGODS_CANVAS_MODULE to a local @napi-rs/canvas/index.js path.');
const {createCanvas,loadImage}=await import(pathToFileURL(resolve(modulePath)).href);
setHeroAtlas(await loadImage(new URL('../src/assets/hero-parts.webp',import.meta.url).pathname));
setCreatureAtlas(await loadImage(new URL('../src/assets/creatures.webp',import.meta.url).pathname));
setTrouserAtlas(await loadImage(new URL('../src/assets/trousers.webp',import.meta.url).pathname));
const canvas=createCanvas(480,800),ctx=canvas.getContext('2d'),scale=4;
let cases=0;
for(const armor of ['crimson','jade','ivory'])for(const head of ['crown','halo'])for(const hair of ['silver','ink']){
 for(let dir=0;dir<8;dir++)for(const action of ['idle','walk','attack','cast','defend','hit'])for(const mounted of [false,true])for(const t of [.12,.27,.45,.83]){
  ctx.clearRect(0,0,480,800);
  drawHero(ctx,240,740,{equip:{armor,head,hair,weapon:'sword'},dir,action,mounted,t,scale});
  const socket=heroAttachment(armor,[0,1,7].includes(dir)).socket;
  const phase=action==='walk'?Math.sin(t*10):Math.sin(t*2)*.06;
  const bob=action==='walk'?Math.abs(phase)*2:Math.sin(t*2)*.6;
  const mirror=[5,6,7].includes(dir)?-1:1;
  const originX=240+scale*(action==='hit'?Math.sin(t*48)*3:0),originY=740-scale*(bob+(mounted?24:0));
  // Follow the cervical socket across motion; sample a band, not a single dot.
  for(const dx of [-1,0,1])for(const dy of [-3,-2,-1,0,1]){
   const x=originX+scale*mirror*(socket.x+dx),y=originY+scale*(socket.y+dy);
   const [r,g,b,a]=ctx.getImageData(Math.round(x),Math.round(y),1,1).data;
   assert(a>240,JSON.stringify({problem:'transparent neck seam',armor,head,hair,dir,action,mounted,t,dx,dy,rgba:[r,g,b,a]}));
   if(dy===0&&dx===0)assert(r>90&&g>60,JSON.stringify({problem:'empty dark collar',armor,head,hair,dir,action,mounted,t,rgba:[r,g,b,a]}));
  }
  cases++;
 }
}
console.log(`PASS: ${cases} rendered attachment states; 15 seam samples each. This does not verify artistic fidelity.`);
