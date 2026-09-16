'use strict';
const assert=require('assert'),M=require('./engine.js');
let checks=0;
function ck(ok,name){assert(ok,name);checks++;}
function close(a,b){return Math.abs(a-b)<=1e-9*Math.max(1,Math.abs(b));}
const layers=M.recipe('canonicalMedium'),original=JSON.stringify(layers);
const scaled=M.scaleThickness(layers,52);
ck(close(scaled.reduce((sum,l)=>sum+l.h,0),52),'total thickness scales to the requested value');
ck(scaled.every((l,i)=>close(l.h/layers[i].h,1.3)),'total thickness preserves every layer proportion');
ck(JSON.stringify(layers)===original&&scaled.every((l,i)=>l!==layers[i]),'scaling never mutates or shares source layers');
for(const total of [0,-1,NaN,Infinity,1,1000]){
 assert.throws(()=>M.scaleThickness(layers,total));checks++;
}
const single=[M.layer('soft',1,'Thin foam','thin')];
ck(M.scaleThickness(single,.5)[0].h===.5&&M.scaleThickness(single,100)[0].h===100,'inclusive per-layer thickness limits are accepted');

console.log('PASS',checks,'layer thickness checks');
