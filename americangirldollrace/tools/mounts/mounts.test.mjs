import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const game=new URL('../../',import.meta.url);
const source=fs.readFileSync(new URL('game.js',game),'utf8');
const names=['isAlwaysMountedTrack','isFlyingMountType','isSpecialMountType','chooseHorseType','updateRacerVerticalMotion','horseDurationForType','mountLoopKey','bumpMonstersWithSpecialMounts','isMounted','broomRideBlend'];
function setup(){
  const math=Object.create(Math);
  const c={Math:math,characters:{},getTrackTheme:()=>({}),clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),state:{specials:'none',racers:[],monsters:[]},GRAVITY:2100,PEGASUS_HOVER_Z:940**2/(2*2100),HORSE_DURATION:10,UNICORN_DURATION_MULTIPLIER:2,PEGASUS_DURATION_MULTIPLIER:1.5,
    isHorsingAroundMode:()=>c.state.specials==='horsing',applyMonsterKnockback:(m,d)=>{m.hit=d;},isRacerRunningAtMonster:()=>true,
    WIZARD_MOUNTS:['griffon','broom'],wizardUnlocked:true,areWizardMountsUnlocked:()=>c.wizardUnlocked};
  vm.createContext(c);
  vm.runInContext(source.match(/const DEFAULT_MOUNT_ODDS = [^;]+;/)[0],c);
  for(const name of names){const match=source.match(new RegExp(`function ${name}\\([^]*?\\n\\}`));assert.ok(match,name);vm.runInContext(match[0],c);}
  return c;
}

test('normal pickups retain special odds and add a 5% broom chance',()=>{
 const c=setup(),counts={horse:0,unicorn:0,pegasus:0,griffon:0,broom:0};
 // Sample interval midpoints so floating-point boundary rounding cannot skew counts.
 for(let n=0;n<10000;n++){c.Math.random=()=>(n+.5)/10000;counts[c.chooseHorseType()]++;}
 assert.deepEqual(counts,{horse:7000,unicorn:1000,pegasus:1000,griffon:500,broom:500});
 for(const special of ['unicorn','pegasus','griffon','broom']){c.state.specials=special;c.Math.random=()=>.99;assert.equal(c.chooseHorseType(),special);}
});

test('before a Wizard School finish, gryphons and broomsticks are left out of normal pickups',()=>{
 const c=setup(),counts={horse:0,unicorn:0,pegasus:0,griffon:0,broom:0};
 c.wizardUnlocked=false;
 for(let n=0;n<10000;n++){c.Math.random=()=>(n+.5)/10000;counts[c.chooseHorseType()]++;}
 assert.deepEqual(counts,{horse:8000,unicorn:1000,pegasus:1000,griffon:0,broom:0});
 for(const special of ['griffon','broom']){c.state.specials=special;c.Math.random=()=>.99;assert.equal(c.chooseHorseType(),special);}
});

test('griffon holds at the pegasus glide height, falls on release and cannot glide after expiry',()=>{
 const c=setup();
 for(const type of ['pegasus','griffon','broom']){
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


test('broom transition follows altitude and returns exactly to carrying on landing',()=>{
 const c=setup();
 assert.equal(c.broomRideBlend({z:0}),0);
 assert.equal(c.broomRideBlend({z:42.5}),.5);
 assert.equal(c.broomRideBlend({z:85}),1);
 assert.equal(c.broomRideBlend({z:210}),1);
 const ascent=[0,10,30,60,85].map(z=>c.broomRideBlend({z}));
 assert.deepEqual(ascent,[...ascent].sort((a,b)=>a-b));
 assert.equal(c.horseDurationForType('broom'),15);
 assert.equal(c.mountLoopKey({horseType:'broom',z:0}),null);
 assert.equal(c.mountLoopKey({horseType:'broom',z:200}),'pegasus_glide_loop');
});

test('all roster dolls have finite hand anchors and broom modes persist through both settings UIs',()=>{
 const c={window:{}};vm.runInNewContext(fs.readFileSync(new URL('broom.js',game),'utf8'),c);
 const keys=['lily','rumi','kaya','amanda','juliette','claudia','whirlpool','marisol','penelope','hermione','mira','luna'];
 for(const key of keys){const rows=c.window.BROOM_ART.carryHands[key];assert.equal(rows.length,2);for(const row of rows){assert.equal(row.length,3);for(const [x,y] of row){assert.ok(x>0&&x<418&&y>0&&y<418);}}}
 const html=fs.readFileSync(new URL('index.html',game),'utf8'),menu=fs.readFileSync(new URL('menu.js',game),'utf8');
 for(const label of ['All Gryphons','All Brooms']){assert.ok(menu.includes(label));assert.ok(html.includes(label));}
 assert.match(source,/const SPECIALS = new Set\([^\n]*"broom"/);
});

test('broom render places the carried grip at the hand and mirrors prop and rider together',()=>{
 const c=setup(),props=[],sprites=[];
 c.FRAME=418;c.SPRITE_ANCHOR_X=209;c.SPRITE_ANCHOR_Y=409;c.MOUNT_SEAT_REFERENCE={x:225,y:228.67};c.HORSE_FLASH_TIME=3;
 c.window={BROOM_ART:JSON.parse(fs.readFileSync(new URL('tools/mounts/broom.json',game),'utf8'))};
 c.ctx={globalAlpha:1,save(){},restore(){}};c.drawFacingImage=(...args)=>sprites.push(args);c.drawBroomProp=(...args)=>props.push(args);
 vm.runInContext(source.match(/function drawBroomRacer\([^]*?\n\}/)[0],c);
 for(const key of Object.keys(c.window.BROOM_ART.carryHands))for(const facing of [-1,1]){
  const r={spriteKey:key,sheet:key,moving:true,frame:0,z:0,y:550,horseTimer:15,riderXOffset:0,riderYOffset:100};
  props.length=0;sprites.length=0;c.drawBroomRacer(r,400,1,facing);
  const hand=c.window.BROOM_ART.carryHands[key][1][0];
  assert.equal(props.length,1);assert.equal(props[0][0],400+(hand[0]-209)*facing);assert.equal(props[0][1],550+54-409+hand[1]);
  assert.equal(props[0][4],facing);assert.equal(sprites.length,2);assert.equal(sprites[0][2],418);assert.equal(sprites[1][3],24);
  r.z=100;props.length=0;sprites.length=0;c.drawBroomRacer(r,400,1,facing);
  assert.equal(sprites.length,1);assert.equal(sprites[0][1],0);assert.equal(sprites[0][2],1254);assert.equal(sprites[0][7],418*.7);
  assert.equal(props[0][0],400+(225-209)*1.08*facing);assert.equal(props[0][4],facing);
  assert.equal(props[0][1],550+58+(228.67-409)*1.08-100+18);
 }
});
