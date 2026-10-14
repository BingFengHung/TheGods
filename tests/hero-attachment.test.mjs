import test from 'node:test';
import assert from 'node:assert/strict';
import {heroAttachment} from '../src/draw.mjs';

test('all garments retain their source aspect ratios instead of flattening the torso',()=>{
 const source={crimson:[278,262],jade:[240,269],ivory:[284,262]};
 for(const [armor,[w,h]]of Object.entries(source)){
  const {body}=heroAttachment(armor);
  assert(Math.abs(body.w/body.h-w/h)<1e-10);
 }
});

test('the smaller head joins each collar at the cervical root, not the forward chin',()=>{
 for(const armor of ['crimson','jade','ivory'])for(const back of [false,true]){
  const {head,socket,lip}=heroAttachment(armor,back);
  const [w,h,nx,ny]=back?[217,292,111,263]:[259,287,145,267];
  assert(head.w<=30,'regression: enlarged head');
  assert(Math.abs(head.w/head.h-w/h)<1e-10,'stretched face');
  assert(Math.abs(head.x+nx*head.w/w-socket.x)<1e-10,'detached neck horizontally');
  assert(Math.abs(head.y+ny*head.h/h-socket.y)<1e-10,'detached neck vertically');
  assert(lip-socket.y>=1&&lip-socket.y<5,'neck held too far above collar');
 }
});
