import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const game = new URL('../../', import.meta.url);
const scope = {window:{}};
vm.runInNewContext(fs.readFileSync(new URL('recolor.js', game), 'utf8'), scope);
vm.runInNewContext(fs.readFileSync(new URL('dolls.js', game), 'utf8'), scope);
const { DollRecolor } = scope.window;
const { EXTRA_DOLLS } = scope.window;
const stats = EXTRA_DOLLS.hermione.outfitData.stats;

test('Felicity denim and Barbie chevrons become visibly red while identity colours stay exact',()=>{
 for(const [key,rgb] of [['felicity',[50,65,95]],['barbie',[45,45,45]]]){
  const p=new Uint8ClampedArray([...rgb,255,225,165,115,255,240,240,240,255]);
  const original=p.slice(),mask=new Uint8ClampedArray(p.length);mask[0]=255;
  DollRecolor.recolorPixelsLut(p,mask,EXTRA_DOLLS[key].outfitData.stats,[216,38,47]);
  assert.ok(p[0]>p[2]+30,key);
  assert.deepEqual(p.slice(4),original.slice(4));
 }
});

test('neutral uniform becomes visibly coloured while unmasked face and hair stay byte-identical', () => {
  const pixels = new Uint8ClampedArray([70,70,70,255, 225,165,115,255, 160,90,40,255]);
  const mask = new Uint8ClampedArray([255,0,0,255, 0,0,0,255, 0,0,0,255]);
  const original = pixels.slice();
  DollRecolor.recolorPixelsLut(pixels, mask, stats, [216,38,47]);
  assert.ok(pixels[0] > pixels[1]+35, 'Red outfit must be distinguishable from the charcoal original');
  assert.deepEqual(pixels.slice(4), original.slice(4));
});

test('neutral-uniform LUT agrees with the exact recolour at garment grey values', () => {
  const pixels = [];
  for (let n=25;n<180;n+=7) pixels.push(n,n,n,255);
  const mask = new Uint8ClampedArray(pixels.length);
  for(let i=0;i<mask.length;i+=4) mask[i]=255;
  for(const target of [[216,38,47],[242,194,48],[47,111,224]]) {
    const exact = new Uint8ClampedArray(pixels), fast = new Uint8ClampedArray(pixels);
    DollRecolor.recolorPixels(exact,mask,stats,target);
    DollRecolor.recolorPixelsLut(fast,mask,stats,target);
    assert.ok(Math.max(...exact.map((v,i)=>Math.abs(v-fast[i]))) <= 3);
  }
});

test('Mira variants tint the neutral outfit while retaining unmasked pink hair, gold skirt and skin', () => {
  const p = new Uint8ClampedArray([70,70,70,255, 220,35,125,255, 245,190,35,255, 225,165,115,255]);
  const mask = new Uint8ClampedArray([255,0,0,255, 0,0,0,255, 0,0,0,255, 0,0,0,255]);
  const original=p.slice();
  DollRecolor.recolorPixelsLut(p,mask,EXTRA_DOLLS.mira.outfitData.stats,[47,111,224]);
  assert.ok(p[2]>p[0]+30,'Blue outfit must be visibly different');
  assert.deepEqual(p.slice(4),original.slice(4));
});

test('Luna cardigan changes colour while unmasked pink glasses and other identity colours stay exact', () => {
  const p = new Uint8ClampedArray([210,130,160,255, 235,110,170,255, 220,190,130,255, 70,120,180,255, 225,165,115,255]);
  const mask = new Uint8ClampedArray(p.length);
  mask[0]=255;
  const original=p.slice();
  DollRecolor.recolorPixelsLut(p,mask,EXTRA_DOLLS.luna.outfitData.stats,[47,111,224]);
  assert.ok(p[2]>p[0]+30,'Blue cardigan must read as blue');
  assert.deepEqual(p.slice(4),original.slice(4));
});


test('updated Rumi jacket changes colour without tinting purple hair/laces or warm skin',()=>{
 const p=new Uint8ClampedArray([245,185,35,255, 145,65,195,255, 225,165,115,255, 35,40,70,255]);
 const original=p.slice(),mask=new Uint8ClampedArray(p.length);mask[0]=255;
 DollRecolor.recolorPixelsLut(p,mask,EXTRA_DOLLS.rumi.outfitData.stats,[47,111,224]);
 assert.ok(p[2]>p[0]+30);assert.deepEqual(p.slice(4),original.slice(4));
});
