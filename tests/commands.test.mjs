import test from 'node:test';
import assert from 'node:assert/strict';
import {freshGame,startBattle,resolveRound,restoreSave} from '../src/core.mjs';
import {emptyCommand,beginCommand,chooseCommandTarget,confirmedCommand} from '../src/commands.mjs';

test('selecting and cancelling a spell leaves the entire saved state untouched',()=>{
 const state=startBattle(freshGame()),snapshot=JSON.stringify(state);
 let draft=beginCommand(state,'frost');
 assert.equal(draft.phase,'target');
 assert.throws(()=>confirmedCommand(state,draft),/目標/);
 draft=chooseCommandTarget(state,draft,1);
 assert.equal(draft.target,'all');
 assert.deepEqual(confirmedCommand(state,draft),{action:'frost',target:0});
 draft=emptyCommand();
 assert.equal(draft.phase,'command');
 assert.equal(JSON.stringify(state),snapshot);
});

test('an attack keeps the exact chosen enemy through confirmation',()=>{
 const state=startBattle(freshGame());
 const draft=chooseCommandTarget(state,beginCommand(state,'attack'),2);
 const chosen=confirmedCommand(state,draft);
 const result=resolveRound(state,chosen.action,chosen.target);
 assert.equal(result.events[0].who,'enemy2');
 assert.equal(result.state.activeBattle.enemies[1].hp,state.activeBattle.enemies[1].hp);
 assert.equal(result.state.activeBattle.round,2);
 // A second tap carrying the same draft cannot resolve another round.
 assert.throws(()=>confirmedCommand(result.state,draft),/回合/);
});

test('defeated, missing and friendly targets cannot receive an attack',()=>{
 const state=startBattle(freshGame()),draft=beginCommand(state,'attack');
 state.activeBattle.enemies[0].hp=0;
 for(const target of [0,9,-1,'hero',null])assert.throws(()=>chooseCommandTarget(state,draft,target));
 const ready=chooseCommandTarget(state,draft,1);
 state.activeBattle.enemies[1].hp=0;
 assert.throws(()=>confirmedCommand(state,ready),/失效/);
});

test('healing and items require a self target and spend resources only after confirmation',()=>{
 for(const action of ['heal','potion']){
  const state=startBattle(freshGame());state.hp=70;
  const draft=beginCommand(state,action);
  assert.throws(()=>chooseCommandTarget(state,draft,0),/自己/);
  assert.throws(()=>confirmedCommand(state,draft));
  const ready=chooseCommandTarget(state,draft,'hero');
  assert.equal(state.mp,65);assert.equal(state.potions,5);
  const chosen=confirmedCommand(state,ready),next=resolveRound(state,chosen.action,chosen.target).state;
  assert.equal(next.mp,action==='heal'?55:65);
  assert.equal(next.potions,action==='potion'?4:5);
 }
});

test('defence and retreat are explicit confirmations, not immediate actions',()=>{
 for(const action of ['guard','flee']){
  const state=startBattle(freshGame()),snapshot=JSON.stringify(state),draft=beginCommand(state,action);
  assert.equal(draft.phase,'confirm');assert.equal(draft.target,null);
  assert.equal(confirmedCommand(state,draft).action,action);
  assert.equal(JSON.stringify(state),snapshot);
 }
});

test('old battles, changed resources and finished battles invalidate a pending command',()=>{
 const state=startBattle(freshGame()),draft=chooseCommandTarget(state,beginCommand(state,'frost'),0);
 const other=structuredClone(state);other.activeBattle.id+='-other';
 assert.throws(()=>confirmedCommand(other,draft),/回合/);
 state.mp=0;assert.throws(()=>confirmedCommand(state,draft),/真氣/);
 state.mp=65;state.activeBattle.status='fled';assert.throws(()=>confirmedCommand(state,draft),/出招/);
});

test('a version 1 battle save can enter the new command flow without migration',()=>{
 const saved=resolveRound(startBattle(freshGame()),'attack',1).state;
 const resumed=restoreSave(JSON.parse(JSON.stringify(saved)));
 const ready=chooseCommandTarget(resumed,beginCommand(resumed,'attack'),2);
 assert.equal(confirmedCommand(resumed,ready).target,2);
 assert.equal(resumed.schemaVersion,1);
 assert.equal(resumed.activeBattle.round,saved.activeBattle.round);
});
