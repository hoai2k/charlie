import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const game=new URL('../../',import.meta.url);
import { gameSource as source } from '../game-source.mjs';
const draw=source.match(/function drawBackground\(\) \{[^]*?\n\}/)[0];
function renderer(loopMode,camera){
 const calls=[];const bg={width:2172,height:724};
 const ctx={fillRect(){},drawImage(...args){calls.push(['draw',...args.slice(1)]);},save(){},restore(){},translate(...xy){calls.push(['translate',...xy]);},scale(...xy){calls.push(['scale',...xy]);}};
 const c={ctx,images:{bg},state:{camera},H:720,TRACK_TOP:480,PATH_TOP:480,TRACK_BOTTOM:665,
  getCurrentBackground:()=>({imageKey:'bg'}),getTrackTheme:()=>({loopMode}),
  getWorldViewportWidth:()=>1280,getWorldViewportTop:()=>0};
 vm.runInNewContext(draw+'\ndrawBackground();',c);return calls;
}
test('reviewed periodic backgrounds repeat with no reflection at the scrolling wrap',()=>{
 const a=renderer('repeat',2161),b=renderer('repeat',2162);
 assert.equal(a.filter(c=>c[0]==='scale').length,0);
 assert.equal(a.find(c=>c[0]==='draw')[1],-1);
 assert.equal(b.find(c=>c[0]==='draw')[1],-2,'Increasing camera scrolls the scenery right to left');
 const crossing=renderer('repeat',2100).filter(c=>c[0]==='draw');
 assert.equal(crossing.length,2);
 assert.equal(crossing[0][1]+crossing[0][3],crossing[1][1],'Adjacent tiles meet with no gap');
});
test('legacy backgrounds retain their previous reflected repeat',()=>{
 assert.ok(renderer(undefined,2161).some(c=>c[0]==='scale'&&c[1]===-1));
});
test('every advertised themed file exists, and every new track declares reviewed direct repetition',()=>{
 const c={window:{}};vm.runInNewContext(fs.readFileSync(new URL('tracks.js',game),'utf8'),c);
 for(const [key,t] of Object.entries(c.window.TRACK_THEMES)){
  const expected=t.name?['background','hurdle','powerups','projectile','card']:['hurdle','powerups','projectile'];
  if (key === 'beach') expected.push('wave');
  if (key === 'toyroom') expected.push('windup_car');
  for (const file of t.art) assert.ok(expected.includes(file), `${key}: unknown art ${file}`);
  for(const file of t.art)assert.ok(fs.existsSync(new URL(`assets/tracks/${key}/${file}.webp`,game)),`${key}/${file}`);
  if(t.art.includes('background'))assert.equal(t.loopMode,'repeat',key);
 }
});
