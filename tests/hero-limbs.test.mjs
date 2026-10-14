import test from 'node:test';
import assert from 'node:assert/strict';
import {heroPose} from '../src/draw.mjs';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const close=(actual,expected)=>assert(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);

test('limbs retain human joint lengths throughout movement, casting and guarding',()=>{
 for(const action of ['idle','walk','attack','cast','defend','hit'])for(const mounted of [false,true]){
  for(let frame=0;frame<=120;frame++){
   const pose=heroPose({action,mounted,t:frame/30});
   for(const arm of pose.arms){
    close(distance(arm.shoulder,arm.elbow),17);
    close(distance(arm.elbow,arm.wrist),16);
    close(distance(arm.wrist,arm.grip),3.5);
   }
   for(const leg of pose.legs){
    close(distance(leg.hip,leg.knee),24);
    close(distance(leg.knee,leg.ankle),23);
   }
  }
 }
});

test('breathing and walking leave the supporting sole on its ground plane',()=>{
 for(const action of ['idle','walk'])for(let frame=0;frame<=120;frame++){
  const t=frame/60,phase=Math.sin(t*10),bob=action==='walk'?Math.abs(phase)*2:Math.sin(t*2)*.6;
  const legs=heroPose({action,t}).legs;
  assert(legs.some(leg=>leg.lift===0),'both feet lifted');
  for(const leg of legs){
   // Complete boot silhouette reaches 50 source pixels below its ankle.
   const sole=leg.ankle.y+50*.145-bob,plane=leg.side===1?-2:0;
   if(leg.lift===0)close(sole,plane);
   else assert(sole<plane,'swing foot below the floor');
  }
 }
});
