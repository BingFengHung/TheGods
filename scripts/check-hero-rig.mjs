// Optional raster regression check. Supply a local @napi-rs/canvas module path;
// this tool is not shipped with the game and is not a runtime dependency.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {drawHero,setHeroAtlas,setCreatureAtlas,HERO_PROPORTIONS} from '../src/draw.mjs';

const modulePath=process.env.THEGODS_CANVAS_MODULE;
if(!modulePath)throw Error('Set THEGODS_CANVAS_MODULE to a local @napi-rs/canvas/index.js path.');
const {createCanvas,loadImage}=await import(pathToFileURL(resolve(modulePath)).href);
setHeroAtlas(await loadImage(new URL('../src/assets/hero-parts.webp',import.meta.url).pathname));
setCreatureAtlas(await loadImage(new URL('../src/assets/creatures.webp',import.meta.url).pathname));
const canvas=createCanvas(720,1280),ctx=canvas.getContext('2d'),scale=6,t=.27;
let cases=0;
for(const armor of ['crimson','jade','ivory'])for(const head of ['crown','halo']){
 for(const hair of ['silver','ink'])for(const dir of [2,3,4,5,6]){
  for(const action of ['idle','walk','attack','cast','defend','hit'])for(const mounted of [false,true]){
   ctx.clearRect(0,0,720,1280);
   drawHero(ctx,360,1200,{equip:{armor,head,hair,weapon:'sword'},dir,action,mounted,t,scale});
   const phase=action==='walk'?Math.sin(t*10):Math.sin(t*2)*.06;
   const bob=action==='walk'?Math.abs(phase)*2:Math.sin(t*2)*.6;
   const x=360+scale*(action==='hit'?Math.sin(t*48)*3:0);
   const y=1200+scale*(-92*HERO_PROPORTIONS.bodyHeight-bob-(mounted?24:0));
   const [r,g,b,a]=ctx.getImageData(Math.round(x),Math.round(y),1,1).data;
   // This point was the empty dark collar in 0.1.1 for all three armors.
   // It must now be a visible skin/neck surface, not transparent or a cavity.
   assert(a>240&&r>130&&g>95&&b>70&&r>g&&g>=b,
    JSON.stringify({armor,head,hair,dir,action,mounted,rgba:[r,g,b,a]}));
   cases++;
  }
 }
}
console.log(`PASS: ${cases} rendered neck-joint checks across armors, headwear, hair, front directions, actions and mounts`);
