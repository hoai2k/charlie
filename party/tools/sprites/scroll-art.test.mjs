import assert from 'node:assert/strict';
import { drawMirroredScroll } from '../../src/engine/scroll-art.js';
function tiles(scroll) { let x=0,sign=1,stack=[],out=[]; const g={save(){stack.push([x,sign])},restore(){[x,sign]=stack.pop()},translate(dx){x+=sign*dx},scale(s){sign*=s},drawImage(im,dx,dy,w,h){out.push({left:x+sign*dx,right:x+sign*(dx+w)})}};drawMirroredScroll(g,{},100,80,scroll);return out }
for (const t of [0,1,99,100,101,199,200,-1]) {const a=tiles(t); const ranges=a.map(v=>[Math.min(v.left,v.right),Math.max(v.left,v.right)]); assert.equal(ranges[0][1],ranges[1][0]);assert.ok(ranges[0][0]<=0&&ranges[1][1]>=100);assert.equal((a[0].right>a[0].left),(a[1].right<a[1].left)); }
assert.deepEqual(tiles(0),tiles(200)); console.log('Mirrored scrolling covers viewport and preserves alternating edge joins across wrap.');
