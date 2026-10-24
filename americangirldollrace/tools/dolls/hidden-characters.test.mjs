import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../../',import.meta.url);
const read=f=>fs.readFileSync(new URL(f,root),'utf8');
test('Annie and Katniss are hidden normally, visible in All Dolls, and eligible for Random',()=>{
 const c={window:{GAME_CONFIG:{}},TRACK_THEMES:{},loadImage:p=>p,DEFAULT_RIDER_X_OFFSET:0,DEFAULT_RIDER_Y_OFFSET:100};vm.createContext(c);
 vm.runInContext(read('dolls.js'),c);
 const src=read('game.js'),start=src.indexOf('const extraDolls =');
 vm.runInContext(src.slice(start,src.indexOf('const state =',start))+'\nconst state={specials:"none"};',c);
 const fn=src.slice(src.indexOf('function isAllDollsMode()'),src.indexOf('function updateCharacterSelectOptions()'));
 vm.runInContext(fn,c);
 const order=vm.runInContext(read('menu.js').match(/const ROSTER_ORDER = ([^;]+);/)[1],c);
 for(const key of ['annie','katniss']){
  assert.equal(c.window.EXTRA_DOLLS[key].hidden,true);
  assert.equal(c.window.EXTRA_DOLLS[key].verifyAllMoonBoots,true);
  assert.ok(order.includes(key),'Random uses this complete roster');
  assert.equal(vm.runInContext(`getVisibleCharacterEntries().some(([key])=>key===${JSON.stringify(key)})`,c),false);
 }
 vm.runInContext('state.specials="all-dolls"',c);
 for(const key of ['annie','katniss'])assert.equal(vm.runInContext(`getVisibleCharacterEntries().some(([key])=>key===${JSON.stringify(key)})`,c),true);
});
test('new hidden dolls enter the workbench queue for every applicable moon-boot pose',()=>{
 const c={game:{Bench:{characters:{}},DOLL_FEET:{},ACTION_SHEETS:['annie','katniss'],dollAssetKey:k=>k,MOON_BOOT_OVERRIDES:{'annie/sprites/0':[]}}};
 for(const key of ['annie','katniss']){c.game.Bench.characters[key]={name:key,image:()=>({}),hidden:true,verifyAllMoonBoots:true};c.game.DOLL_FEET[key]={};}
 vm.createContext(c);
 const source=read('workbench/verify.js');
 const constants=source.slice(source.indexOf('const SPRITE_FRAMES'),source.indexOf('const verify ='));
 const functions=source.slice(source.indexOf('const inGame ='),source.indexOf('const copyBoots ='));
 vm.runInContext(constants+functions+'\nglobalThis.queue=buildVerifyQueue()',c);
 assert.equal(c.queue.length,39); // 20 per doll, minus the owner's checked pose
 assert.equal(new Set(c.queue.map(x=>x.id)).size,39);
 assert.ok(c.queue.some(x=>x.id==='annie/actions/7'));
 assert.ok(c.queue.some(x=>x.id==='katniss/sprites/0'));
 assert.ok(c.queue.every(x=>x.label));
 assert.ok(!c.queue.some(x=>x.kind==='actions'&&x.index===8),'painted float already wears boots');
});
