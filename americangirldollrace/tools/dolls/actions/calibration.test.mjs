import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const game=fs.readFileSync(new URL('../../../game.js',import.meta.url),'utf8');
const tracks=fs.readFileSync(new URL('../../../tracks.js',import.meta.url),'utf8');
const frames=JSON.parse(tracks.match(/window.ACTION_FRAMES = (.*?);/s)[1]);
function body(name,next){return game.slice(game.indexOf(`function ${name}(`),game.indexOf(`function ${next}(`));}
const context={window:{ACTION_FRAMES:frames},FRAME:418,SPRITE_ANCHOR_X:225,SPRITE_ANCHOR_Y:409,SPELL_CAST_TIME:1,WAND_HAND:{x:349,y:151},dollAssetKey:k=>k,racerDepthScale:()=>.45,getActionSheet:()=>({})};
vm.createContext(context);vm.runInContext(body('actionFrameBox','drawRacerBody')+body('wandTip','spellTargetPoint'),context);
test('spell particles originate at the painted star through packing and facing transforms',()=>{
 for(const [key,list] of Object.entries(frames))for(const [col,timer] of [.9,.6,.1].entries())for(const facing of [1,-1]){
  const r={spriteKey:key,x:200,y:500,z:40,castTimer:timer,facing};const f=list[col],scale=.45;
  const box=context.actionFrameBox(r,col*418,0,r.x-225*scale,r.y+54-r.z-409*scale,418*scale,418*scale);
  const tip=context.wandTip(r);const px=box.x+f.wandTip[0]*box.w/418;const py=box.y+f.wandTip[1]*box.h/418;
  assert.ok(Math.abs(tip.x-(r.x+facing*(px-r.x)))<1e-7,key);assert.ok(Math.abs(tip.y-py)<1e-7,key);
 }
});
test('grounded actions retain their world baseline after packed-frame restoration',()=>{
 for(const [key,list] of Object.entries(frames))for(const n of [0,1,2,3,4,5,7,8]){
  const b=context.actionFrameBox({spriteKey:key},n%3*418,Math.floor(n/3)*418,-225,-409,418,418);
  assert.ok(Math.abs(b.y+409*b.h/418)<1e-7,key);
 }
});
