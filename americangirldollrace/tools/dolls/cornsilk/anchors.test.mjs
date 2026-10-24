import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../../../',import.meta.url);
const read=name=>fs.readFileSync(new URL(name,root),'utf8');

test('plush wing roots use measured chest points for every sheet, with legacy fallback',()=>{
 const c={window:{},dollAssetKey:k=>k};vm.createContext(c);vm.runInContext(read('doll-art.js'),c);
 const sprites={},actions={},toys={},ledge={};
 Object.assign(c,{getActionSheet:()=>actions,getRideToySheet:()=>toys,getLedgeSheet:()=>ledge,FRAME:418,wingRoot:()=>['fallback']});
 const code=read('game-mounts.js');vm.runInContext(code.slice(code.indexOf('function racerWingRoot('),code.indexOf('function drawFairyWings(')),c);
 c.racer={spriteKey:'cornsilk',sheet:sprites};
 for(const [kind,image] of Object.entries({sprites,actions,toys,ledge})){
  c.image=image;c.sx=418;c.sy=kind==='ledge'?0:418;
  const actual=vm.runInContext('racerWingRoot(racer,image,sx,sy)',c);
  assert.deepEqual(actual,c.window.DOLL_WING_ROOTS.cornsilk[kind][kind==='ledge'?1:4]);
 }
 c.racer.spriteKey='juliette';assert.deepEqual(vm.runInContext('racerWingRoot(racer,image,0,0)',c),['fallback']);
});

test('ledge anatomical scale preserves the measured corner in either facing direction',()=>{
 const c={window:{LEDGE_FRAMES:{cornsilk:[{renderScale:1.3} ]},LEDGE_ANCHORS:{cornsilk:[[300,220]]}},
  FRAME:418,state:{camera:100},cloudLedgePhase:()=> 'hang',getLedgeSheet:()=>({complete:true,width:1254}),dollAssetKey:k=>k,
  drawFacingImage:(...args)=>{c.drawn=args},withDollScale:(racer,x,y,fn)=>fn()};
 vm.createContext(c);const code=read('game-terrain.js');vm.runInContext(code.slice(code.indexOf('function drawLedgeRacer('),code.indexOf('// After her vertical motion')),c);
 for(const side of [-1,1]){
  c.racer={spriteKey:'cornsilk',y:390,ledge:{side,edgeX:600}};
  vm.runInContext('drawLedgeRacer(racer,.4)',c);
  const a=c.drawn,k=.4*1.3;
  assert.equal(a[5]+300*k,500);assert.equal(a[6]+220*k,444);
  assert.equal(a[7],418*k);assert.equal(a[9],side);assert.equal(a[10],500);
 }
});

test('Cornsilk has one natural plush appearance and twenty unapproved boot fits',()=>{
 const c={window:{GAME_CONFIG:{}}};vm.createContext(c);vm.runInContext(read('dolls.js'),c);
 vm.runInContext(read('hands.js')+read('moon-boot-guesses.js')+read('moon-boot-overrides.js'),c);
 assert.equal(c.window.EXTRA_DOLLS.cornsilk.outfitData.outfits.length,0);
 assert.deepEqual(Object.keys(c.window.DOLL_HANDS.cornsilk).sort(),['pogo','ride','skate','stand']);
 const poses=Object.entries(c.window.MOON_BOOT_GUESSES).filter(([key])=>key.startsWith('cornsilk/'));
 assert.equal(poses.length,20);
 assert.ok(poses.every(([key,boots])=>boots.length===2&&!c.window.MOON_BOOT_OVERRIDES[key]));
});
