import assert from 'node:assert/strict';
globalThis.location = { search: '' };
const hand = await import('../../src/games/nail-studio/hand.js');
const art = await import('../../src/engine/art.js');
const { HAND_ART_NAILS, HAND_ART_SHAPES } = await import('../../src/games/nail-studio/hand-art-geometry.js');
const base = hand.handStyle('felicity');
const fallback = hand.geom(base);
assert.notEqual(fallback.nails[2].y, HAND_ART_NAILS[base.tone][2].y, 'Missing art keeps the existing drawn-hand geometry');
globalThis.fetch = async () => ({ok:true,json:async()=>({images:Object.fromEntries(Array.from({length:5},(_,i)=>['prop/nail-hand-'+i,'prop/nail-hand-'+i+'.webp']))})});
globalThis.Image = class {set src(v){this.width=this.height=1024;queueMicrotask(()=>this.onload());}};
await art.loadArt();
for(let tone=0;tone<5;tone++){
 const style={...base,tone};const G=hand.geom(style,1,3);
 assert.deepEqual(G.nails,hand.geom(style,0,0).nails,'Authored nails do not wiggle away from the hand');
 for(const n of G.nails){
  assert.equal(hand.nailAt(G,n.x,n.y,0),n.i,'Painting targets the measured nail centre');
  const p=hand.fromNail(n,n.w*.2,-n.h*.25),q=hand.toNail(n,p.x,p.y);
  assert.ok(Math.abs(q.u-n.w*.2)<1e-8&&Math.abs(q.v+n.h*.25)<1e-8,'Gems and painting share the rotated nail frame');
  assert.ok(HAND_ART_SHAPES[n.shape].length>=8,'Clipping uses the painted nail silhouette');
 }
}
console.log('Generated nail centres, painting hit tests, gem coordinates and fallback geometry pass.');
