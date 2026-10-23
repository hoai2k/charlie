import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const game=new URL('../../',import.meta.url);
import { gameSource as source } from '../game-source.mjs';
const data=JSON.parse(fs.readFileSync(new URL('tools/mounts/troll-alignment.json',game),'utf8'));
const fn=name=>source.match(new RegExp(`function ${name}\\([^]*?\\n\\}`))[0];
function context(){
 const c={window:{TROLL_ART:data},FRAME:418,SPRITE_ANCHOR_X:225,SPRITE_ANCHOR_Y:409,MOUNT_SEAT_REFERENCE:{x:225,y:228.67},MOUNTED_MONSTER_HORSE_SCALE:1.3,TRACK_TOP:450,TRACK_BOTTOM:665,
  racerDepthScale:()=>.45,monsterDrawY:m=>m.y,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),jumpSpriteScale:{default:.9,test:1.05},
  images:{troll_riding:{},skeleton_horse:{}},};
 c.getTrollMountImage=()=>c.images.skeleton_horse;
 vm.createContext(c);vm.runInContext(fn('getTrollRiderOffset')+'\n'+fn('setGrabbedRacerPosition'),c);return c;
}
test('all gallop, idle and jump seats align with every rider frame',()=>{
 const c=context();for(let h=0;h<9;h++)for(let r=0;r<6;r++){
  const o=c.getTrollRiderOffset(true,Math.floor(h/3),h%3,Math.floor(r/3),r%3);
  assert.equal(data.rider[r].hip[0]+o.x,data.horse[h].seat[0]);
  assert.ok(Math.abs(data.rider[r].hip[1]+o.y-data.horse[h].seat[1])<1e-9);
 }
});
test('grabbed doll torso meets each measured hand in either direction and at both sprite scales',()=>{
 const c=context(),hs=.45*1.08*1.3;
 for(const [col,state] of ['grab','lift','throw'].entries())for(const facing of [-1,1])for(const spriteKey of ['test','default']){
  const m={state,riding:true,x:600,y:550,z:20,timer:.2,facing};const r={spriteKey};c.setGrabbedRacerPosition(m,r);
  const p=data.rider[3+col],o=c.getTrollRiderOffset(true,0,0,1,col);
  const x=m.x+(p.hand[0]+o.x-225)*hs*facing,y=m.y+58+(p.hand[1]+o.y-409)*hs-m.z;
  assert.equal(r.x,x);const scale=.45*(spriteKey==='test'?1.05:.9);
  assert.ok(Math.abs(r.y+54-r.z-(409-270)*scale-y)<1e-9);assert.equal(r.speed,0);
 }
});
