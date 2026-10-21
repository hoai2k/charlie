import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
const game=new URL('../../',import.meta.url);
const read=file=>fs.readFileSync(new URL(file,game),'utf8');
async function runtime(legacy){
 const window={GAME_CONFIG:{legacyDollArt:{rumi:legacy}}};
 const c={window,TRACK_THEMES:{},loadImage:path=>path,DEFAULT_RIDER_X_OFFSET:0,DEFAULT_RIDER_Y_OFFSET:100,
   fetch:async()=>({ok:true,json:async()=>JSON.parse(read('assets/masks/outfits.json'))})};
 vm.createContext(c);vm.runInContext(read('dolls.js'),c);
 const source=read('game.js');const start=source.indexOf('const extraDolls =');const end=source.indexOf('const state =',start);
 vm.runInContext(source.slice(start,end)+'\nglobalThis.selected={images,characters,jumpSpriteScale};',c);
 vm.runInContext(read('recolor.js'),c);vm.runInContext(read('outfits.js'),c);await window.DollOutfits.ready;
 return c;
}

test('updated Rumi resolves versioned race/menu art and new calibrated offsets exactly once in roster',async()=>{
 const c=await runtime(false),r=c.selected;
 assert.equal(r.images.rumi,'assets/doll_rumi-v2_sprites.webp');
 assert.equal(r.characters.rumi.assetKey,'rumi-v2');
 assert.equal(r.characters.rumi.riderYOffset,c.window.EXTRA_DOLLS.rumi.riderYOffset);
 assert.equal(r.jumpSpriteScale.rumi,1);
 assert.notEqual(c.window.DollOutfits.colorOf('rumi',0),'#8c5600','Use updated outfit statistics instead of the old data');
 assert.equal(c.window.DollOutfits.sourceUrl('rumi','portrait'),'assets/portraits/rumi-v2.webp');
 assert.equal(c.window.DollOutfits.count('rumi'),8);
 assert.equal(c.window.DollOutfits.colorOf('rumi',1),'#5fd3a4');
 const order=read('menu.js').match(/const ROSTER_ORDER = ([^;]+);/)[1];
 const keys=vm.runInContext(order,c);assert.equal(keys.filter(k=>k==='rumi').length,1);
});

test('one config switch restores original Rumi race/menu paths, outfit stats, jump and rider alignment',async()=>{
 const c=await runtime(true),r=c.selected;
 assert.equal(c.window.EXTRA_DOLLS.rumi,undefined);
 assert.equal(r.images.rumi,'assets/doll_rumi_sprites.webp');
 assert.equal(r.characters.rumi.assetKey,undefined);
 assert.equal(r.characters.rumi.riderYOffset,85);
 assert.equal(r.jumpSpriteScale.rumi,.99);
 assert.equal(c.window.DollOutfits.sourceUrl('rumi','portrait'),'assets/portraits/rumi.webp');
 assert.equal(c.window.DollOutfits.count('rumi'),8);
 assert.equal(c.window.DollOutfits.colorOf('rumi',0),'#8c5600');
 assert.ok(c.window.EXTRA_DOLLS.luna,'Reverting Rumi must retain the other dolls');
});

test('original Rumi art and outfit data remain byte-for-byte available for rollback',()=>{
 const original=JSON.parse(read('tools/dolls/rumi-legacy.json'));
 for(const [file,hash] of Object.entries(original.sha256)){
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(file,game))).digest('hex'),hash,file);
 }
 const c={window:{}};vm.runInNewContext(read('broom.js'),c);
 assert.ok(c.window.BROOM_ART.carryHands.rumi);
 assert.ok(c.window.BROOM_ART.carryHands['rumi-v2']);
});
