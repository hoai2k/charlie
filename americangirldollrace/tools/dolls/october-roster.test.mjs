import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const game=new URL('../../',import.meta.url);
const read=file=>fs.readFileSync(new URL(file,game),'utf8');
function runtime(legacy=false){
 const c={window:{GAME_CONFIG:{legacyDollArt:{claudia:legacy}}},TRACK_THEMES:{},loadImage:p=>p,
  DEFAULT_RIDER_X_OFFSET:0,DEFAULT_RIDER_Y_OFFSET:100};
 vm.createContext(c);vm.runInContext(read('dolls.js'),c);
 const source=read('game.js'),start=source.indexOf('const extraDolls =');
 vm.runInContext(source.slice(start,source.indexOf('const state =',start))+'\nglobalThis.selected={images,characters,jumpSpriteScale};',c);
 vm.runInContext(read('broom.js'),c);
 return c;
}
test('four approved dolls resolve complete art, outfits and matching broom anchors once each',()=>{
 const c=runtime();
 const order=vm.runInContext(read('menu.js').match(/const ROSTER_ORDER = ([^;]+);/)[1],c);
 for(const key of ['claudia','cinnamon','felicity','barbie']){
  const art=key==='claudia'?'claudia-v2':key;
  assert.equal(c.selected.images[key],`assets/doll_${art}_sprites.webp`);
  assert.equal(order.filter(k=>k===key).length,1);
  assert.equal(c.window.EXTRA_DOLLS[key].outfitData.outfits.length,7);
  assert.equal(c.selected.jumpSpriteScale[key],1);
  assert.ok(c.window.BROOM_ART.carryHands[art]);
 }
});
test('Claudia can revert all runtime art while retaining the three additions',()=>{
 const c=runtime(true);
 assert.equal(c.selected.images.claudia,'assets/doll_claudia_sprites.webp');
 assert.equal(c.window.EXTRA_DOLLS.claudia,undefined);
 assert.ok(c.window.BROOM_ART.carryHands.claudia);
 for(const key of ['cinnamon','felicity','barbie'])assert.ok(c.window.EXTRA_DOLLS[key]);
});
