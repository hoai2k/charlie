import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const game=new URL('../../',import.meta.url);
const source=fs.readFileSync(new URL('game.js',game),'utf8');
const names=['isFlyingMountType','isSpecialMountType','chooseHorseType','updateRacerVerticalMotion','horseDurationForType','mountLoopKey','bumpMonstersWithSpecialMounts','isMounted'];
function setup(){
  const math=Object.create(Math);
  const c={Math:math,state:{specials:'none',racers:[],monsters:[]},GRAVITY:2100,PEGASUS_HOVER_Z:940**2/(2*2100),HORSE_DURATION:10,UNICORN_DURATION_MULTIPLIER:2,PEGASUS_DURATION_MULTIPLIER:1.5,
    isHorsingAroundMode:()=>c.state.specials==='horsing',applyMonsterKnockback:(m,d)=>{m.hit=d;},isRacerRunningAtMonster:()=>true};
  vm.createContext(c);
  for(const name of names){const match=source.match(new RegExp(`function ${name}\\([^]*?\\n\\}`));assert.ok(match,name);vm.runInContext(match[0],c);}
  return c;
}

test('normal pickups keep unicorn/pegasus odds and add a 5% griffon chance',()=>{
 const c=setup(),counts={horse:0,unicorn:0,pegasus:0,griffon:0};
 for(let n=0;n<10000;n++){c.Math.random=()=>n/10000;counts[c.chooseHorseType()]++;}
 assert.deepEqual(counts,{horse:7500,unicorn:1000,pegasus:1000,griffon:500});
 for(const special of ['unicorn','pegasus','griffon']){c.state.specials=special;c.Math.random=()=>.99;assert.equal(c.chooseHorseType(),special);}
});

test('griffon holds at the pegasus glide height, falls on release and cannot glide after expiry',()=>{
 const c=setup();
 for(const type of ['pegasus','griffon']){
  const r={horseType:type,z:c.PEGASUS_HOVER_Z-1,vy:200};
  c.updateRacerVerticalMotion(r,true,true,.016);
  assert.equal(r.z,c.PEGASUS_HOVER_Z);assert.equal(r.vy,0);assert.equal(r.pegasusGliding,true);
  for(let n=0;n<30;n++)c.updateRacerVerticalMotion(r,true,true,.016);
  assert.equal(r.z,c.PEGASUS_HOVER_Z);
  c.updateRacerVerticalMotion(r,true,false,.016);c.updateRacerVerticalMotion(r,true,false,.016);
  assert.ok(r.z<c.PEGASUS_HOVER_Z);assert.ok(r.vy<0);assert.equal(r.pegasusGliding,false);
  r.z=c.PEGASUS_HOVER_Z;r.vy=0;c.updateRacerVerticalMotion(r,false,true,.016);
  assert.equal(r.pegasusGliding,false);assert.ok(r.vy<0);
 }
 for(const type of ['horse','unicorn']){let r={horseType:type,z:c.PEGASUS_HOVER_Z+10,vy:100};c.updateRacerVerticalMotion(r,true,true,.016);assert.equal(r.pegasusGliding,false);assert.notEqual(r.z,c.PEGASUS_HOVER_Z);}
});

test('griffon gets pegasus duration, flying audio and special-mount monster bumps',()=>{
 const c=setup();assert.equal(c.horseDurationForType('griffon'),15);
 c.state.specials='horsing';assert.equal(c.horseDurationForType('griffon'),Infinity);c.state.specials='none';
 assert.equal(c.mountLoopKey({horseType:'griffon',pegasusGliding:true,z:200}),'pegasus_glide_loop');
 assert.equal(c.mountLoopKey({horseType:'griffon',pegasusGliding:false,z:100}),'pegasus_flight_loop');
 const monster={x:130,y:550,state:'walk'};
 c.state.monsters=[monster];c.state.racers=[{x:100,y:550,z:0,horseTimer:15,horseType:'griffon',mountBumpCooldown:0}];
 c.bumpMonstersWithSpecialMounts();assert.equal(monster.hit,1);assert.equal(c.state.racers[0].mountBumpCooldown,.45);
});

test('griffon calibration has nine finite seats inside the exported sprite cells',()=>{
 const c={window:{}};vm.runInNewContext(fs.readFileSync(new URL('mounts.js',game),'utf8'),c);
 const rows=c.window.MOUNT_ART.griffon.calibration;
 assert.equal(rows.length,3);for(const row of rows){assert.equal(row.length,3);for(const [x,y,shift]of row){assert.ok(x>0&&x<418&&y>0&&y<418);assert.equal(shift,0);}}
 const meta=JSON.parse(fs.readFileSync(new URL('tools/mounts/griffon.json',game)));
 assert.equal(meta.frames.length,9);for(const f of meta.frames){assert.equal(f.scale,meta.scale);const [x0,y0,x1,y1]=f.bounds;assert.ok(x0>=5&&y0>=5&&x1<=413&&y1<=413);}
});
