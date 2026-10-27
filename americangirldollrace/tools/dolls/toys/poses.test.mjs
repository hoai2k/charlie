import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { gameSource as source } from '../../game-source.mjs';
const body=source.slice(source.indexOf('function getRideToyPose('),source.indexOf('\nfunction getBoostMultiplier'));
const context=vm.createContext({getRideToySheet:r=>r.missing?null:{},isMounted:r=>Boolean(r.mounted),SKATE_STRIDE_PX:100,POGO_BOUNCE_HEIGHT:12});
vm.runInContext(body,context);
const base={rideToys:[{type:'skates'},{type:'pogo'}],moving:true,toyDistance:200,pogoPhase:0};
const pose=(extra={},jumping=false)=>context.getRideToyPose({...base,...extra},jumping);
test('skating movement, balance, push, fall and jump use dedicated cells',()=>{
 for(const [r,j,row,col] of [[{},false,0,2],[{moving:false},false,1,0],[{pushTimer:1},false,1,1],[{fallBackTimer:1},false,1,2],[{},true,0,1]]){const p=pose(r,j);assert.equal(p.row,row);assert.equal(p.col,col);}
});
test('pogo and first-pickup priority retain all interaction poses',()=>{
 for(const [r,j,row,col] of [[{},false,2,0],[{frozenTimer:1},false,3,0],[{pushTimer:1},false,3,1],[{fallBackTimer:1},false,3,2],[{},true,2,2]]){const p=pose({...r,rideToys:[{type:'pogo'},{type:'skates'}]},j);assert.equal(p.row,row);assert.equal(p.col,col);}
});
test('mounted, grabbed, unavailable and menu dolls keep their existing renderer',()=>{
 for(const r of [{mounted:true},{grabbedBy:{}},{missing:true},{rideToys:undefined}])assert.equal(pose(r),null);
});
