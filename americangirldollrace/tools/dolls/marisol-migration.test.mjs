import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
const game=new URL('../../',import.meta.url);
const read=file=>fs.readFileSync(new URL(file,game),'utf8');
async function runtime(legacy){
 const window={GAME_CONFIG:{dollArtVersion:'test-version',legacyDollArt:{marisol:legacy}}};
 const c={window,TRACK_THEMES:{},loadImage:path=>path,DEFAULT_RIDER_X_OFFSET:0,DEFAULT_RIDER_Y_OFFSET:100,
 fetch:async()=>({ok:true,json:async()=>JSON.parse(read('assets/masks/outfits.json'))})};
 vm.createContext(c);vm.runInContext(read('dolls.js'),c);vm.runInContext(read('tracks.js'),c);vm.runInContext(read('doll-art.js'),c);
 const source=read('game.js');const start=source.indexOf('const extraDolls =');const end=source.indexOf('const state =',start);
 vm.runInContext(source.slice(start,end)+'\nglobalThis.selected={images,characters,jumpSpriteScale};',c);
 vm.runInContext(read('recolor.js'),c);vm.runInContext(read('outfits.js'),c);await window.DollOutfits.ready;return c;
}
test('Marisol migration selects matching normal, menu, toy and action identity with measured offsets',async()=>{
 const c=await runtime(false),r=c.selected,d=c.window;
 assert.equal(r.images.marisol,'assets/doll_marisol-v2_sprites.webp?v=test-version');
 assert.equal(r.characters.marisol.assetKey,'marisol-v2');assert.equal(r.characters.marisol.riderYOffset,122.164);
 for(const kind of ['portrait','wave','cheer','ride','toys','actions'])assert.match(d.DollOutfits.sourceUrl('marisol',kind),/marisol-v2/);
 assert.ok(d.RIDE_TOY_SHEETS.includes('marisol-v2'));assert.ok(d.ACTION_SHEETS.includes('marisol-v2'));
 assert.equal(d.DollOutfits.count('marisol'),8);assert.equal(r.jumpSpriteScale.marisol,1);
});
test('one legacy switch restores original Marisol identity, offsets and outfit statistics together',async()=>{
 const c=await runtime(true),r=c.selected,d=c.window;
 assert.equal(d.EXTRA_DOLLS.marisol,undefined);assert.equal(r.images.marisol,'assets/doll_marisol_sprites.webp');
 assert.equal(r.characters.marisol.assetKey,undefined);assert.equal(r.characters.marisol.riderYOffset,95);assert.equal(r.jumpSpriteScale.marisol,.99);
 assert.equal(d.DollOutfits.sourceUrl('marisol','portrait'),'assets/portraits/marisol.webp');
 assert.ok(!d.RIDE_TOY_SHEETS.includes('marisol'));assert.ok(!d.ACTION_SHEETS.includes('marisol'));
 assert.ok(d.EXTRA_DOLLS.luna);
});
test('original Marisol art and outfit data remain available byte for byte',()=>{
 const old=JSON.parse(read('tools/dolls/marisol-legacy.json'));
 for(const [file,hash] of Object.entries(old.sha256))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(file,game))).digest('hex'),hash,file);
 assert.deepEqual(JSON.parse(read('assets/masks/outfits.json')).dolls.marisol,old.outfitData);
 const c={window:{}};vm.runInNewContext(read('broom.js'),c);assert.ok(c.window.BROOM_ART.carryHands.marisol);assert.ok(c.window.BROOM_ART.carryHands['marisol-v2']);
});
