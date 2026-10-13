import test from 'node:test';
import assert from 'node:assert/strict';
import {visibleViewport,cameraFor,worldToScreen,screenToWorld,hitActor} from '../src/layout.mjs';

test('an embedded visible viewport bounds the stage, including its offset',()=>{
 assert.deepEqual(visibleViewport(1536,710,{width:1194,height:557,offsetLeft:85,offsetTop:16}),{width:1194,height:557,left:85,top:16});
 assert.deepEqual(visibleViewport(844,390,{width:932,height:430}),{width:844,height:390,left:0,top:0});
 assert.deepEqual(visibleViewport(667,320),{width:667,height:320,left:0,top:0});
});

test('battle actors and their labels stay between the HUD and command row on short phones',()=>{
 const bounds=[{x:290,y:146},{x:628,y:580},{x:782,y:286},{x:908,y:493},{x:685,y:466}];
 for(const [width,height,left,right,bottom]of [[844,390,44,44,21],[932,430,59,59,21],[667,320,0,0,0],[728,300,0,0,0],[1194,557,0,0,21]]){
  const camera=cameraFor(width,height,true,{left,right,bottom});
  for(const point of bounds){
   const screen=worldToScreen(point.x,point.y,camera);
   assert(screen.x>=left+12&&screen.x<=width-right-12,JSON.stringify({width,height,screen}));
   assert(screen.y>=62&&screen.y<=height-bottom-88,JSON.stringify({width,height,screen}));
  }
 }
});

test('the backdrop covers the full stage on wide and tall landscape viewports',()=>{
 for(const [width,height]of [[844,390],[1194,557],[667,400]]){
  const camera=cameraFor(width,height);
  const origin=worldToScreen(0,0,camera),end=worldToScreen(1280,720,camera);
  assert(origin.x<=0&&origin.y<=0);assert(end.x>=width&&end.y>=height);
 }
});

test('touch coordinates invert the same camera used by the renderer after a resize',()=>{
 for(const [width,height]of [[844,390],[667,320],[1194,557]]){
  for(const battle of [true,false]){
   const camera=cameraFor(width,height,battle,{left:44,right:44,bottom:21});
   const screen=worldToScreen(475,185,camera),point=screenToWorld(screen.x,screen.y,camera);
   assert(Math.abs(point.x-475)<1e-8);assert(Math.abs(point.y-185)<1e-8);
  }
 }
});

test('tapping a tall enemy head selects it; a defeated enemy or empty floor does not',()=>{
 const actors=[{id:0,x:475,y:350,width:160,height:183,alive:true},{id:1,x:365,y:483,width:66,height:104,alive:false},{id:'hero',x:842,y:463,width:80,height:162,alive:true}];
 for(const scale of [.32,.6,1]){
  assert.equal(hitActor({x:475,y:176},actors,scale)?.id,0);
  assert.equal(hitActor({x:842,y:308},actors,scale)?.id,'hero');
  assert.equal(hitActor({x:365,y:420},actors,scale),null);
  assert.equal(hitActor({x:670,y:650},actors,scale),null);
 }
});
