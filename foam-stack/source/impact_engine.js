/* Domed striker and layered foam against a rigid support or a moving padded bag.
 * SI units internally. Only first compression is modeled. The bag's loading
 * stiffness is an explicit assumption, independent of its literature-based size.
 */
'use strict';
const ImpactModel = (() => {
 const M=typeof FoamModel!=='undefined'?FoamModel:require('./engine.js');
 const RIG=Object.freeze({mass:2.5,strikerRadius:.100,faceRadius:.040,supportRadius:.045,limit:2000,gravity:M.G});
 const BAG=Object.freeze({mode:'bag',mass:41,stiffness:40000,radius:.21});
 const HAND=Object.freeze({stiffness:1e6,label:'Hand Spring',note:'Assumed hand and wrist give: 1 kN per mm; not measured tissue stiffness.'});
 const PADDED_TARGETS=Object.freeze([25,50].map(thicknessMm=>Object.freeze({mode:'padded',thicknessMm})));
 const EVA75=Object.freeze({label:'EVA75 target mat',family:'EVA',prior:'eva35',mode:'CFD',rho:75/M.PCF,a:55,b:null,known:.25,
  source:M.SOURCES.target.url,note:'Nominal 75 kg/m3; 55 kPa midpoint of the published 42-68 kPa range at 25%. No 50% compression anchor.'});
 function targetSpec(input={mode:'rigid'}){
  if(typeof input==='string')input={mode:input};
  if(!input||!['rigid','bag','padded'].includes(input.mode))throw Error('Choose a supported target.');
  if(input.mode==='rigid')return {mode:'rigid'};
  if(input.mode==='padded'){
   if(![25,50].includes(input.thicknessMm))throw Error('Choose a 25 mm or 50 mm EVA target mat.');
   return {mode:'padded',thicknessMm:input.thicknessMm};
  }
  const target={...BAG,...input};
  finitePositive(target.mass,'bag mass');finitePositive(target.stiffness,'bag stiffness');finitePositive(target.radius,'bag radius');
  if(target.radius<=RIG.faceRadius)throw Error('Bag radius must exceed the 40 mm contact radius.');
  return {mode:'bag',mass:target.mass,stiffness:target.stiffness,radius:target.radius};
 }
 const PRESETS=Object.freeze([
  {id:'test3',label:'3 J test',mass:2.5,speed:Math.sqrt(6/2.5),energy:3,limit:2000,gravity:M.G},
  {id:'test10',label:'10 J test',mass:2.5,speed:Math.sqrt(20/2.5),energy:10,limit:2000,gravity:M.G},
  {id:'gentle',label:'Adult reference (gentle)',mass:2.597,speed:7.7*Math.sqrt(.7),gravity:M.G},
  {id:'adult',label:'Adult reference',mass:2.597,speed:7.7,gravity:M.G},
  {id:'olympic',label:'Olympic boxer',mass:2.9,speed:9.14,gravity:M.G},
  {id:'commercial3',label:'Commercial study · 3 m',mass:3.324,speed:Math.sqrt(2*M.G*3),gravity:M.G},
  {id:'commercial5',label:'Commercial study · 5 m',mass:3.324,speed:10.01,gravity:M.G}
 ].map(p=>Object.freeze({...p,energy:p.energy??.5*p.mass*p.speed**2,limit:p.limit??null})));
 function impactSpec(input='test3'){
  const preset=typeof input==='string'?PRESETS.find(p=>p.id===input):null;
  if(typeof input==='string'&&!preset)throw Error('Choose a known impact preset.');
  const p=preset||{...input};
  finitePositive(p.mass,'impact mass');finitePositive(p.speed,'impact speed');
  const gravity=p.gravity??M.G;
  if(!Number.isFinite(gravity)||gravity<0||gravity>20)throw Error('Gravity must be between 0 and 20 m/s².');
  const energy=.5*p.mass*p.speed**2;
  // A limit is attached only to an unchanged reference test, never to an athlete hit.
  const named=PRESETS.find(q=>q.id===p.id);
  const matches=named&&Math.abs(p.mass-named.mass)<1e-10&&Math.abs(p.speed-named.speed)<1e-10&&gravity===M.G;
  return {...p,id:matches?named.id:'custom',label:matches?named.label:'Custom hit',energy,mass:p.mass,speed:p.speed,gravity,limit:matches?named.limit:null};
 }
 const geoCache=new Map(),compileCache=new Map();
 function finitePositive(x,name){if(!Number.isFinite(x)||x<=0)throw Error('Enter a positive '+name+'.');}
 function loadingDuration(opts){const ms=opts.loadingDurationMs===undefined?0:opts.loadingDurationMs;if(!Number.isFinite(ms)||ms<0)throw Error('Loading duration must be a finite nonnegative number of milliseconds.');return ms;}
 function verdict(force,limit=RIG.limit){if(!Number.isFinite(force)||force<0)return {pass:null,label:'Calculation unavailable',marginN:null,marginPct:null};const marginN=limit-force;return {pass:force<=limit,label:force<=limit?'Pass':'Fail',marginN,marginPct:100*marginN/limit};}
 function geometry(thickness=.040,nr=24,nt=20,flat=false,supportRadius=RIG.supportRadius){
  finitePositive(thickness,'stack thickness');
  if(!Number.isInteger(nr)||nr<4||!Number.isInteger(nt)||nt<4)throw Error('Contact quadrature must have at least four divisions.');
  if(supportRadius!==Infinity&&(!Number.isFinite(supportRadius)||supportRadius<=RIG.faceRadius))throw Error('Support radius must exceed the contact radius.');
  const key=[thickness,nr,nt,flat,supportRadius].join();if(geoCache.has(key))return geoCache.get(key);
  const nodes=[],a=RIG.faceRadius,dr=a/nr,outerRadius=supportRadius+thickness,plane=supportRadius===Infinity;
  for(let j=0;j<nr;j++){const r=(j+.5)*dr,weight=Math.PI*((j+1)**2-j*j)*dr*dr/nt;
   // Four quadrants have identical gaps, so integrate only one quadrant.
   for(let k=0;k<nt;k++){const angle=(k+.5)*Math.PI/(2*nt),x=r*Math.cos(angle),y=r*Math.sin(angle);
    const gap=flat?0:(RIG.strikerRadius-Math.sqrt(RIG.strikerRadius**2-r*r))+(plane?0:outerRadius-Math.sqrt(outerRadius**2-x*x));
    const verticalThickness=flat||plane?thickness:Math.sqrt(outerRadius**2-x*x)-Math.sqrt(supportRadius**2-x*x);
    nodes.push({gap,weight,x,y,stretch:verticalThickness/thickness});}}
  nodes.sort((a,b)=>a.gap-b.gap);const out={nodes,area:Math.PI*a*a,nr,nt,flat,plane,thickness,outerRadius,supportRadius};geoCache.set(key,out);return out;
 }
 function compile(stack,input={},opts={}){
  // Target compression is coupled separately; this curve describes only the foam.
  const c={...M.DEFAULT_CONFIG,...input,mass:RIG.mass,speed:1,area:Math.PI*RIG.faceRadius**2*1e4,targetMode:'rigid'};
  M.validate(stack,c);
  const loadingDurationMs=loadingDuration(opts),target=targetSpec(opts.target),supportRadius=target.mode==='bag'?target.radius:target.mode==='padded'?Infinity:RIG.supportRadius;
  const key=JSON.stringify([stack,c.speedModel,c.rateScale,c.tailPower,c.ret,c.firmness,opts.nr||24,opts.nt||20,opts.resolution||550,!!opts.flat,loadingDurationMs,supportRadius]);
  if(compileCache.has(key))return compileCache.get(key);
  const defs=stack.map(l=>({l,cv:M.materialCurve(l,c.tailPower,opts.resolution||550,c.speedModel,loadingDurationMs),h:l.h*c.ret*.001,scale:c.rateScale*c.firmness}));
  const geo=geometry(defs.reduce((s,d)=>s+d.h,0),opts.nr||24,opts.nt||20,!!opts.flat,supportRadius),ps=[0,1e9];
  for(const d of defs)for(const p of d.cv.ps){const z=p*d.scale;if(z>0&&z<1e9)ps.push(z);}
  ps.sort((a,b)=>a-b);const P=ps.filter((p,i)=>!i||p-ps[i-1]>Math.max(1e-9,p*1e-13));
  // Union of pressure knots makes every layer, and hence the series stack,
  // exactly piecewise-linear in pressure. Integrals remain quadratic.
  const D=[],U=[],EPS=defs.map(()=>[]),WI=defs.map(()=>[]);
  for(const p of P){let x=0,w=0;defs.forEach((d,i)=>{const q=M.atPressure(d.cv,p,d.scale);x+=d.h*q.e;w+=d.h*q.w;EPS[i].push(q.e);WI[i].push(d.h*q.w);});D.push(x);U.push(w);}
  const caps=defs.map(d=>({supplier:d.h*M.atStrain(d.cv,d.cv.anchors.at(-1)[0],d.scale).w,family:d.h*M.atStrain(d.cv,d.cv.join,d.scale).w}));
  function column(x,detail=false){
   if(x<=0)return {p:0,u:0,index:0,frac:0,es:detail?defs.map(()=>0):null,ws:detail?defs.map(()=>0):null};
   if(x>D.at(-1))throw Error('Contact compression exceeds the finite material range. Increase padding or inspect material inputs.');
   const i=Math.min(P.length-2,Math.max(0,M.upper(D,x)-1)),f=(x-D[i])/(D[i+1]-D[i]),p=P[i]+f*(P[i+1]-P[i]);
   const out={p,u:U[i]+.5*(P[i]+p)*(x-D[i]),index:i,frac:f};
   if(detail){out.es=defs.map((d,j)=>EPS[j][i]+f*(EPS[j][i+1]-EPS[j][i]));out.ws=defs.map((d,j)=>WI[j][i]+.5*(P[i]+p)*d.h*(out.es[j]-EPS[j][i]));}
   return out;
  }
  function state(delta,detail=false){
   if(!Number.isFinite(delta)||delta<0)throw Error('Invalid indentation.');
   let F=0,W=0,area=0,stiffness=0,supplierWork=0,familyWork=0;const ws=defs.map(()=>0);
   for(const n of geo.nodes){if(n.gap>=delta)break;const q=column((delta-n.gap)/n.stretch,detail);F+=n.weight*q.p;W+=n.weight*n.stretch*q.u;area+=n.weight;stiffness+=n.weight*(P[q.index+1]-P[q.index])/((D[q.index+1]-D[q.index])*n.stretch);
    if(detail)q.ws.forEach((w,i)=>{ws[i]+=n.weight*n.stretch*w;supplierWork+=n.weight*n.stretch*Math.min(w,caps[i].supplier);familyWork+=n.weight*n.stretch*Math.min(w,caps[i].family);});}
   const out={delta,F,W,area,stiffness};
   if(detail){const center=column(delta,true);Object.assign(out,{centerP:center.p,es:center.es,ws,supplierWork,familyWork,fw:W,tw:0,xg:delta,xt:0,X:delta,parts:defs.map((d,i)=>({e:center.es[i],x:d.h*center.es[i],w:ws[i]}))});}
   return out;
  }
  const out={defs,geo,column,state,P,D,U,EPS,WI,total:defs.reduce((s,d)=>s+d.h,0)*1000,maxDelta:D.at(-1),stack,c,loadingDurationMs};
  if(compileCache.size>260)compileCache.clear();compileCache.set(key,out);return out;
 }
 const paddedCache=new WeakMap();
 function compilePaddedContact(comp,input=PADDED_TARGETS[0],opts={}){
  const target=targetSpec(input);
  if(target.mode!=='padded'||!comp.geo.plane)throw Error('EVA target contact requires a planar support.');
  loadingDuration(opts);
  const key=JSON.stringify([target.thicknessMm,opts.resolution||550]);
  const cached=paddedCache.get(comp);if(cached?.has(key))return cached.get(key);
  const targetDef={l:{...EVA75,h:target.thicknessMm,name:'Target mat'},h:target.thicknessMm*.001,
   cv:M.materialCurve(EVA75,2,opts.resolution||550,'fast',0),scale:1};
  const defs=[...comp.defs,targetDef],last=defs.length-1;
  const maximumPressure=Math.min(1e9,...defs.map(d=>d.cv.ps.at(-1)*d.scale)),knots=[0,maximumPressure];
  for(const d of defs)for(const p of d.cv.ps){const z=p*d.scale;if(z>0&&z<maximumPressure)knots.push(z);}
  knots.sort((a,b)=>a-b);const P=knots.filter((p,i)=>!i||p-knots[i-1]>Math.max(1e-9,p*1e-13));
  const D=[],U=[],EPS=defs.map(()=>[]),WI=defs.map(()=>[]);
  for(const p of P){
   let x=0,w=0;
   defs.forEach((d,i)=>{const q=M.atPressure(d.cv,p,d.scale);x+=d.h*q.e;w+=d.h*q.w;EPS[i].push(q.e);WI[i].push(d.h*q.w);});
   D.push(x);U.push(w);
  }
  const caps=comp.defs.map(d=>comp.reference?{supplier:0,family:0}:{
   supplier:d.h*M.atStrain(d.cv,d.cv.anchors.at(-1)[0],d.scale).w,
   family:d.h*M.atStrain(d.cv,d.cv.join,d.scale).w});
  function column(x,detail=false){
   if(x<0||x>D.at(-1))throw Error('Compression exceeds the combined glove and target material range.');
   const i=Math.min(P.length-2,Math.max(0,M.upper(D,x)-1)),f=(x-D[i])/(D[i+1]-D[i]);
   const p=P[i]+f*(P[i+1]-P[i]),u=U[i]+.5*(P[i]+p)*(x-D[i]),out={p,u,index:i};
   if(detail){
    const es=defs.map((d,j)=>EPS[j][i]+f*(EPS[j][i+1]-EPS[j][i]));
    const ws=defs.map((d,j)=>WI[j][i]+.5*(P[i]+p)*d.h*(es[j]-EPS[j][i]));
    const xt=targetDef.h*es[last];
    Object.assign(out,{es:es.slice(0,last),ws:ws.slice(0,last),xg:x-xt,xt,fw:ws.slice(0,last).reduce((sum,w)=>sum+w,0),tw:ws[last],targetStrain:es[last]});
   }
   return out;
  }
  function state(delta,detail=false){
   if(!Number.isFinite(delta)||delta<0||delta>D.at(-1))throw Error('Invalid padded-target compression.');
   let F=0,W=0,area=0,stiffness=0,fw=0,tw=0,supplierWork=0,familyWork=0;
   const ws=comp.defs.map(()=>0);
   for(const n of comp.geo.nodes){
    if(n.gap>=delta)break;
    const q=column(delta-n.gap,detail);F+=n.weight*q.p;W+=n.weight*q.u;area+=n.weight;
    stiffness+=n.weight*(P[q.index+1]-P[q.index])/(D[q.index+1]-D[q.index]);
    if(detail){fw+=n.weight*q.fw;tw+=n.weight*q.tw;q.ws.forEach((w,i)=>{
     ws[i]+=n.weight*w;supplierWork+=n.weight*Math.min(w,caps[i].supplier);familyWork+=n.weight*Math.min(w,caps[i].family);
    });}
   }
   const out={delta,F,W,area,stiffness};
   if(detail){
    const center=column(delta,true);
    Object.assign(out,{foamDelta:center.xg,xg:center.xg,xt:center.xt,X:delta,fw,tw,centerP:center.p,
     es:center.es,ws,supplierWork,familyWork,targetStrain:center.targetStrain,
     parts:comp.defs.map((d,i)=>({e:center.es[i],x:d.h*center.es[i],w:ws[i]}))});
   }
   return out;
  }
  const out={...comp,foamComp:comp,target,targetDef,column,state,P,D,U,maxDelta:D.at(-1),
   limitReason:'The combined glove and target material range ends before maximum compression.'};
  const cache=cached||new Map();cache.set(key,out);paddedCache.set(comp,cache);return out;
 }
 function compileBagContact(comp,input=BAG){
  const target=targetSpec(input);
  if(target.mode!=='bag')throw Error('A bag target is required for coupled contact.');
  const k=target.stiffness,maxBagIndentation=target.radius/2;
  let maxFoamDelta=comp.maxDelta*(1-1e-10),limitReason='The foam material range ends before maximum compression.';
  // A quarter-diameter indentation is an assumed domain guard, not a measured
  // bag capacity. The illustrative linear law must not offer unlimited travel.
  if(comp.state(maxFoamDelta).F/k>maxBagIndentation){
   let lo=0,hi=maxFoamDelta;
   for(let i=0;i<52;i++){const mid=(lo+hi)/2;if(comp.state(mid).F/k<maxBagIndentation)lo=mid;else hi=mid;}
   maxFoamDelta=(lo+hi)/2;limitReason='The assumed bag compression range ends before maximum compression.';
  }
  const maxDelta=maxFoamDelta+comp.state(maxFoamDelta).F/k;
  function state(delta,detail=false){
   if(!Number.isFinite(delta)||delta<0||delta>maxDelta*(1+1e-12))throw Error('Compression exceeds the coupled contact range.');
   let lo=0,hi=Math.min(delta,maxFoamDelta),foamDelta=hi/2,converged=delta===0;
   for(let i=0;i<64&&!converged;i++){
    const z=comp.state(foamDelta),residual=foamDelta+z.F/k-delta;
    if(Math.abs(residual)<1e-13+delta*1e-12){converged=true;break;}
    if(residual<0)lo=foamDelta;else hi=foamDelta;
    const next=foamDelta-residual/(1+z.stiffness/k);
    foamDelta=Number.isFinite(next)&&next>lo&&next<hi?next:(lo+hi)/2;
   }
   if(!converged)throw Error('Bag contact inversion did not converge.');
   const z=comp.state(foamDelta,detail),xt=z.F/k,tw=.5*z.F*xt;
   return {...z,delta,foamDelta,xg:foamDelta,xt,X:delta,fw:z.W,tw,W:z.W+tw,
    stiffness:Number.isFinite(z.stiffness)?k*z.stiffness/(k+z.stiffness):undefined};
  }
  return {...comp,foamComp:comp,state,maxDelta,maxFoamDelta,maxBagIndentation,limitReason,target};
 }
 // Global hand/wrist give is in series with the contact from first loading.
 // It neither extends the foam's material domain nor changes its local strain.
 function compileHandContact(comp){
  const k=HAND.stiffness,maxContactDelta=comp.maxDelta*(1-1e-10);
  const maxDelta=maxContactDelta+comp.state(maxContactDelta).F/k;
  function state(delta,detail=false){
   if(!Number.isFinite(delta)||delta<0||delta>maxDelta*(1+1e-12))throw Error('Compression exceeds the hand and contact range.');
   let lo=0,hi=Math.min(delta,maxContactDelta),contactDelta=hi/2,converged=delta===0;
   for(let i=0;i<64&&!converged;i++){
    const z=comp.state(contactDelta),residual=contactDelta+z.F/k-delta;
    if(Math.abs(residual)<1e-13+delta*1e-12){converged=true;break;}
    if(residual<0)lo=contactDelta;else hi=contactDelta;
    const next=contactDelta-residual/(1+z.stiffness/k);
    contactDelta=Number.isFinite(next)&&next>lo&&next<hi?next:(lo+hi)/2;
   }
   if(!converged)throw Error('Hand spring contact inversion did not converge.');
   const z=comp.state(contactDelta,detail),xh=z.F/k,hw=.5*z.F*xh;
   return {...z,delta,X:delta,foamDelta:z.foamDelta??z.delta,xg:z.xg??z.delta,xt:z.xt??0,
    fw:z.fw??z.W,tw:z.tw??0,xh,hw,handSpring:HAND,W:z.W+hw,
    stiffness:Number.isFinite(z.stiffness)?k*z.stiffness/(k+z.stiffness):undefined};
  }
  return {...comp,contactComp:comp,state,maxDelta,handSpring:HAND};
 }
 function withHandSpring(comp,spec){
  return ['gentle','adult','olympic','custom'].includes(spec.id)?compileHandContact(comp):comp;
 }
 function solve(comp,energy,mass=RIG.mass,gravity=RIG.gravity){
  finitePositive(energy,'impact energy');finitePositive(mass,'impact mass');const mg=mass*gravity;
  let lo=0,hi=Math.min(.006,comp.maxDelta*.45),st=comp.state(hi);
  while(st.W-mg*hi<energy){const next=Math.min(hi*1.5,comp.maxDelta*(1-1e-9));if(next<=hi)return {...comp.state(hi,true),limited:true,limitReason:comp.limitReason||'The local material range ends before the striker stops.'};hi=next;st=comp.state(hi);}
  for(let i=0;i<46;i++){const mid=(lo+hi)/2,z=comp.state(mid);if(z.W-mg*mid<energy)lo=mid;else hi=mid;}
  return comp.state((lo+hi)/2,true);
 }
 function trajectory(comp,peak,energy,steps=240,mass=RIG.mass,gravity=RIG.gravity){
  const mg=mass*gravity,v0=Math.sqrt(2*energy/mass),deltaMax=peak.delta;
  function point(s,detail){const delta=deltaMax*(2*s-s*s),z=s===1?peak:comp.state(delta,detail),K=s===1&&!peak.limited?0:Math.max(0,energy+mg*delta-z.W),v=Math.sqrt(2*K/mass);
   const q=s===1?(peak.limited?0:Math.sqrt(2*mass*deltaMax/(peak.F-mg))):2*deltaMax*(1-s)/v;
   return {z,v,q,K};}
  let t=0,last=point(0,true),rows=[];
  function append(p){const z=p.z;rows.push({...z,t,F:z.F,v:p.v,a:z.F/mass-gravity,J:mass*(v0-p.v)+mg*t,kinetic:p.K,gravityWork:mg*z.delta,es:z.es,ws:z.ws,xg:z.xg??z.delta,xt:z.xt??0,fw:z.fw??z.W,tw:z.tw??0});}
  append(last);
  for(let i=1;i<=steps;i++){const mid=point((i-.5)/steps,false),next=point(i/steps,true);t+=(last.q+4*mid.q+next.q)/(6*steps);append(next);last=next;}
  let numericalImpulse=0;for(let i=1;i<rows.length;i++)numericalImpulse+=.5*(rows[i].F+rows[i-1].F)*(rows[i].t-rows[i-1].t);
  const impulse=mass*(v0-rows.at(-1).v)+mg*t;
  return {rows,time:t,impulse,numericImpulse:numericalImpulse,impulseError:Math.abs(numericalImpulse-impulse)/impulse,steps};
 }
 function energyAt10ms(result){
  const sampleSeconds=.010,tolerance=8*Number.EPSILON*sampleSeconds;
  const rows=result.trace?.rows,bag=result.target?.mode==='bag';
  const initialEnergyJ=bag?result.relativeEnergy:result.E,key=bag?'relativeK':'kinetic';
  const unavailable=reason=>({available:false,sampleSeconds,initialEnergyJ,energyJ:null,percent:null,reason});
  if(!Number.isFinite(initialEnergyJ)||initialEnergyJ<=0)return unavailable('invalid-energy');
  if(!Array.isArray(rows)||rows.length<2||rows[0]?.t!==0)return unavailable('invalid-trace');
  for(let i=0;i<rows.length;i++){
   const row=rows[i];
   if(!row||!Number.isFinite(row.t)||!Number.isFinite(row[key])||row[key]<0||(i&&row.t<=rows[i-1].t))return unavailable('invalid-trace');
  }
  const endTime=rows.at(-1).t;
  if(endTime<sampleSeconds-tolerance)return unavailable(result.loadingComplete?'peak-before-10ms':'window-not-covered');
  for(let i=1;i<rows.length;i++){
   const left=rows[i-1],right=rows[i],rightTime=i===rows.length-1?Math.max(right.t,sampleSeconds):right.t;
   if(rightTime<sampleSeconds)continue;
   const fraction=(sampleSeconds-left.t)/(rightTime-left.t),energyJ=left[key]+fraction*(right[key]-left[key]);
   return {available:true,sampleSeconds,initialEnergyJ,energyJ,percent:100*energyJ/initialEnergyJ};
  }
  return unavailable('invalid-trace');
 }
 function earlyLoading(rows,peakForce,loadingComplete){
  const sampleSeconds=.010,roundingTolerance=8*Number.EPSILON*sampleSeconds;
  const definition='100 * F(min(0.010, t_peak)) / F_peak';
  const unavailable=(reason,coveredSeconds=0,forceAt10N=null)=>({sampleSeconds,available:false,forceAt10N,peakPercent:null,coveredSeconds,
   sampleForceN:forceAt10N,sampleTimeSeconds:forceAt10N===null?null:sampleSeconds,peakBefore10:false,definition,reason});
  if(!Array.isArray(rows)||rows.length<2||rows[0]?.t!==0)return unavailable('invalid-trace');
  for(let i=0;i<rows.length;i++){
   const row=rows[i];
   if(!row||!Number.isFinite(row.t)||!Number.isFinite(row.F)||row.F<0||(i&&row.t<=rows[i-1].t))return unavailable('invalid-trace');
  }
  const endTime=rows.at(-1).t,coveredSeconds=Math.min(sampleSeconds,endTime),covered=endTime>=sampleSeconds-roundingTolerance;
  let forceAt10N=null;
  if(covered)for(let i=1;i<rows.length;i++){
   const left=rows[i-1],right=rows[i];
   const rightTime=i===rows.length-1&&endTime<sampleSeconds?sampleSeconds:right.t;
   if(rightTime<sampleSeconds)continue;
   const fraction=(sampleSeconds-left.t)/(rightTime-left.t);
   forceAt10N=left.F+fraction*(right.F-left.F);
   break;
  }
  if(!covered&&loadingComplete!==true)return unavailable('window-not-covered',coveredSeconds);
  if(covered&&!Number.isFinite(forceAt10N))return unavailable('invalid-trace');
  if(!Number.isFinite(peakForce)||peakForce<=0||typeof loadingComplete!=='boolean')return unavailable('invalid-peak',coveredSeconds,forceAt10N);
  if(!loadingComplete)return unavailable('peak-unresolved',coveredSeconds,forceAt10N);
  const forceTolerance=8*Number.EPSILON*peakForce,peakRow=rows.find(row=>Math.abs(row.F-peakForce)<=forceTolerance);
  if(!peakRow||rows.some(row=>row.F>peakForce&&row.F-peakForce>forceTolerance))return unavailable('invalid-peak',coveredSeconds,forceAt10N);
  // The capped sample stops at the first resolved peak. Any actual force sample
  // at 10 ms remains separate; no unloading or rebound force is invented.
  const peakBefore10=peakRow.t<sampleSeconds-roundingTolerance;
  const sampleTimeSeconds=peakBefore10?peakRow.t:sampleSeconds,sampleForceN=peakBefore10?peakForce:forceAt10N;
  const peakPercent=Math.min(100,100*(sampleForceN/peakForce));
  if(!Number.isFinite(peakPercent))return unavailable('invalid-peak',coveredSeconds,forceAt10N);
  return {sampleSeconds,available:true,forceAt10N,peakPercent,coveredSeconds,
   sampleForceN,sampleTimeSeconds,peakBefore10,definition};
 }
 function outcome(peak,limit){
  if(limit===null)return {pass:null,label:'',marginN:null,marginPct:null,limit:null,peakIsLowerBound:!!peak.limited};
  if(peak.limited&&peak.F<=limit)return {pass:null,label:'Unresolved',marginN:null,marginPct:null,limit,peakIsLowerBound:true};
  return {...verdict(peak.F,limit),limit,peakIsLowerBound:!!peak.limited};
 }
 // Fixed synthetic contact film for the unpadded comparison. This is a mathematical
 // regularization of rigid contact, not a measured foam or bare-hand tissue model.
 // h = 1 mm; p = E * strain; E = 5 GPa. The same geometry, energy solve and
 // trajectory integration are used. The constants do not depend on the glove.
 const REFERENCE=Object.freeze({thicknessMm:1,modulusPa:5e9,label:'1 mm synthetic contact layer'});
 const referenceComps=new Map();
 function compileReference(opts={}){
  loadingDuration(opts);
  const h=(opts.referenceThicknessMm??REFERENCE.thicknessMm)/1000,modulus=opts.referenceModulusPa??REFERENCE.modulusPa;
  finitePositive(h,'reference thickness');finitePositive(modulus,'reference modulus');
  const target=targetSpec(opts.target),supportRadius=target.mode==='bag'?target.radius:target.mode==='padded'?Infinity:RIG.supportRadius;
  const nr=opts.nr||96,nt=opts.nt||80,key=[h,modulus,nr,nt,supportRadius].join();
  if(referenceComps.has(key))return referenceComps.get(key);
  const geo=geometry(h,nr,nt,false,supportRadius),cv={cap:1,knee:.9,join:1,anchors:[],es:[0,.999],ps:[0,modulus*.999],ws:[0,.5*modulus*.999**2],pressure:e=>modulus*e};
  function column(x,detail=false){const e=x/h;return {p:modulus*e,u:.5*modulus*e*e*h,es:detail?[e]:null,ws:detail?[.5*modulus*e*e*h]:null};}
  function state(delta,detail=false){
   if(!Number.isFinite(delta)||delta<0||delta>h)throw Error('Reference layer compression outside 0–1 mm.');
   let F=0,W=0,area=0,stiffness=0;
   for(const n of geo.nodes){if(n.gap>=delta)break;const x=delta-n.gap,e=x/(h*n.stretch),p=modulus*e;F+=n.weight*p;W+=n.weight*.5*p*x;area+=n.weight;stiffness+=n.weight*modulus/(h*n.stretch);}
   const z={delta,F,W,area,stiffness};
   if(detail)Object.assign(z,{centerP:modulus*delta/h,es:[delta/h],ws:[W],supplierWork:0,familyWork:0,fw:W,tw:0,xg:delta,xt:0,X:delta,parts:[{e:delta/h,x:delta,w:W}]});
   return z;
  }
  const out={reference:true,defs:[{l:{name:'Reference contact',h:h*1000,color:'#8b9894'},h,cv,scale:1}],geo,column,state,total:h*1000,maxDelta:h*.999};
  referenceComps.set(key,out);return out;
 }
 function unpadded(input={},impact='test3',withTrace=true,opts={}){
  if(targetSpec(opts.target).mode==='padded')return calculatePadded([],input,impact,withTrace,opts);
  if(targetSpec(opts.target).mode==='bag')return calculateBag([],input,impact,withTrace,opts);
  const spec=impactSpec(impact),{energy,mass,speed,gravity,limit}=spec,c={...M.DEFAULT_CONFIG,...input,targetMode:'rigid'};
  M.validate([],c,true);
  const comp=compileReference(opts),contact=withHandSpring(comp,spec),peak=solve(contact,energy,mass,gravity),delta=peak.foamDelta??peak.delta;
  const endK=Math.max(0,energy+mass*gravity*peak.delta-peak.W);
  const r={...peak,delta,handSpring:contact.handSpring??null,xh:peak.xh??0,hw:peak.hw??0,unpadded:true,reference:REFERENCE,impact:spec,E:energy,mass,speed,gravity,total:comp.total,left:comp.total-delta*1000,
   squeeze:delta*1000/comp.total*100,endK,hasStopped:!peak.limited,gravityWork:mass*gravity*peak.delta,extendedShare:0,
   ...outcome(peak,limit),comp,layerInfo:[{remaining:comp.total-delta*1000,e:peak.es[0],cap:1,knee:.9,afterKnee:peak.es[0]>.9,beyondClass:false}],
   stoppingMomentum:mass*speed};
  r.target={mode:'rigid'};r.loadingComplete=!peak.limited;r.foamWeightG=0;
  if(withTrace){r.trace=trajectory(contact,peak,energy,opts.steps||240,mass,gravity);r.trace.rows=r.trace.rows.map(z=>({...z,delta:z.foamDelta??z.delta,xh:z.xh??0,hw:z.hw??0}));r.earlyLoading=earlyLoading(r.trace.rows,r.F,r.loadingComplete);r.energyAt10ms=energyAt10ms(r);}
  return r;
 }
 function calculatePadded(stack,input,impact,withTrace,opts){
  const target=targetSpec(opts.target),requested=impactSpec(impact),spec={...requested,gravity:0,limit:null};
  const {mass,speed,energy}=spec,unpadded=Array.isArray(stack)&&stack.length===0,c={...M.DEFAULT_CONFIG,...input,targetMode:'rigid'};
  if(unpadded)M.validate([],c,true);
  const comp=unpadded?compileReference(opts):compile(stack,input,opts),contact=withHandSpring(compilePaddedContact(comp,target,opts),spec);
  const peak=solve(contact,energy,mass,0),delta=peak.foamDelta,endK=Math.max(0,energy-peak.W);
  const r={...peak,delta,handSpring:contact.handSpring??null,xh:peak.xh??0,hw:peak.hw??0,target,impact:spec,comp,paddedComp:contact,unpadded,reference:unpadded?REFERENCE:undefined,
   E:energy,mass,speed,gravity:0,gravityWork:0,height:null,total:comp.total,left:comp.total-delta*1000,squeeze:100*delta*1000/comp.total,
   endK,hasStopped:!peak.limited,loadingComplete:!peak.limited,strikerSpeed:peak.limited?Math.sqrt(2*endK/mass):0,
   foamWeightG:M.stackWeightGrams(stack),extendedShare:unpadded?0:Math.max(0,1-peak.familyWork/peak.fw),...outcome(peak,null),
   layerInfo:comp.defs.map((d,i)=>({remaining:d.h*1000*(1-peak.es[i]),e:peak.es[i],cap:d.cv.cap,knee:d.cv.knee,afterKnee:peak.es[i]>d.cv.knee,beyondClass:peak.es[i]>d.cv.join}))};
  if(withTrace){
   const trace=trajectory(contact,peak,energy,opts.steps||240,mass,0);
   trace.rows=trace.rows.map(z=>({...z,delta:z.foamDelta,X:z.delta,xh:z.xh??0,hw:z.hw??0}));
   r.trace=trace;r.earlyLoading=earlyLoading(trace.rows,r.F,r.loadingComplete);r.energyAt10ms=energyAt10ms(r);
  }
  return r;
 }
 function calculateBag(stack,input,impact,withTrace,opts){
  const target=targetSpec(opts.target),requested=impactSpec(impact),{mass,speed,energy}=requested;
  finitePositive(energy,'impact energy');
  // A horizontal bag hit reuses the preset's mass and speed, not its vertical
  // gravity or SATRA verdict. Suspension impulse is neglected over first loading.
  const spec={...requested,gravity:0,limit:null},unpadded=Array.isArray(stack)&&stack.length===0;
  if(unpadded)M.validate([],{...M.DEFAULT_CONFIG,...input,targetMode:'rigid'},true);
  const comp=unpadded?compileReference(opts):compile(stack,input,opts),contact=withHandSpring(compileBagContact(comp,target),spec);
  const reducedMass=mass/(1+mass/target.mass),relativeEnergy=.5*reducedMass*speed**2;
  const peak=solve(contact,relativeEnergy,reducedMass,0),fraction=mass/(mass+target.mass),commonSpeed=fraction*speed;
  const relativeK=Math.max(0,relativeEnergy-peak.W),relativeSpeed=peak.limited?Math.sqrt(2*relativeK/reducedMass):0;
  const bagSpeed=fraction*(speed-relativeSpeed),strikerSpeed=commonSpeed+(1-fraction)*relativeSpeed;
  const endK=.5*mass*strikerSpeed**2+.5*target.mass*bagSpeed**2,delta=peak.foamDelta;
  const r={...peak,delta,handSpring:contact.handSpring??null,xh:peak.xh??0,hw:peak.hw??0,limitReason:peak.limited?contact.limitReason:undefined,target,impact:spec,comp,bagComp:contact,
   unpadded,reference:unpadded?REFERENCE:undefined,E:energy,relativeEnergy,reducedMass,mass,speed,gravity:0,gravityWork:0,height:null,
   total:comp.total,left:comp.total-delta*1000,squeeze:100*delta*1000/comp.total,endK,relativeK,
   loadingComplete:!peak.limited,hasStopped:false,strikerSpeed,bagSpeed,foamWeightG:M.stackWeightGrams(stack),...outcome(peak,null),
   extendedShare:unpadded?0:Math.max(0,1-peak.familyWork/peak.fw),
   layerInfo:comp.defs.map((d,i)=>({remaining:d.h*1000*(1-peak.es[i]),e:peak.es[i],cap:d.cv.cap,knee:d.cv.knee,afterKnee:peak.es[i]>d.cv.knee,beyondClass:peak.es[i]>d.cv.join}))};
  if(withTrace){
   const trace=trajectory(contact,peak,relativeEnergy,opts.steps||240,reducedMass,0);
   trace.rows=trace.rows.map(z=>{
    const relativeV=z.v,bagV=fraction*(speed-relativeV),v=commonSpeed+(1-fraction)*relativeV;
    const bagX=fraction*(speed*z.t-z.delta),strikerX=bagX+z.delta;
    const strikerK=.5*mass*v*v,bagK=.5*target.mass*bagV*bagV;
    return {...z,delta:z.foamDelta,X:z.delta,xh:z.xh??0,hw:z.hw??0,
     v,bagV,relativeV,bagX,strikerX,strikerK,bagK,kinetic:strikerK+bagK,relativeK:z.kinetic,a:z.F/mass};
   });
   r.trace=trace;r.earlyLoading=earlyLoading(trace.rows,r.F,r.loadingComplete);r.energyAt10ms=energyAt10ms(r);r.bagDisplacement=trace.rows.at(-1).bagX;r.strikerDisplacement=trace.rows.at(-1).strikerX;
  }
  return r;
 }
 function calculate(stack,input,impact='test3',withTrace=true,opts={}){
  if(targetSpec(opts.target).mode==='padded')return calculatePadded(stack,input,impact,withTrace,opts);
  if(targetSpec(opts.target).mode==='bag')return calculateBag(stack,input,impact,withTrace,opts);
  if(Array.isArray(stack)&&stack.length===0)return unpadded(input,impact,withTrace,opts);
  const spec=impactSpec(impact),{energy,mass,speed,gravity,limit}=spec;
  const comp=compile(stack,input,opts),contact=withHandSpring(comp,spec),peak=solve(contact,energy,mass,gravity),delta=peak.foamDelta??peak.delta,total=comp.total,W=peak.W;
  const endK=Math.max(0,energy+mass*gravity*peak.delta-W);
  const r={...peak,delta,handSpring:contact.handSpring??null,xh:peak.xh??0,hw:peak.hw??0,endK,hasStopped:!peak.limited,E:energy,total,left:total-delta*1000,squeeze:100*delta*1000/total,gravityWork:mass*gravity*peak.delta,
   extendedShare:Math.max(0,1-peak.familyWork/peak.fw),speed,mass,gravity,impact:spec,height:gravity?energy/(mass*gravity):null,...outcome(peak,limit),comp,
   layerInfo:comp.defs.map((d,i)=>({remaining:d.h*1000*(1-peak.es[i]),e:peak.es[i],cap:d.cv.cap,knee:d.cv.knee,afterKnee:peak.es[i]>d.cv.knee,beyondClass:peak.es[i]>d.cv.join}))};
  r.target={mode:'rigid'};r.loadingComplete=!peak.limited;r.foamWeightG=M.stackWeightGrams(stack);
  if(withTrace){r.trace=trajectory(contact,peak,energy,opts.steps||240,mass,gravity);r.trace.rows=r.trace.rows.map(z=>({...z,delta:z.foamDelta??z.delta,xh:z.xh??0,hw:z.hw??0}));r.earlyLoading=earlyLoading(r.trace.rows,r.F,r.loadingComplete);r.energyAt10ms=energyAt10ms(r);}
  return r;
 }
 function quick(stack,input,impact='test3',opts={}){
  if(targetSpec(opts.target).mode==='padded')return calculatePadded(stack,input,impact,false,opts);
  if(targetSpec(opts.target).mode==='bag')return calculateBag(stack,input,impact,false,opts);
  if(Array.isArray(stack)&&stack.length===0)return unpadded(input,impact,false,opts);
  const spec=impactSpec(impact),comp=compile(stack,input,opts),contact=withHandSpring(comp,spec),z=solve(contact,spec.energy,spec.mass,spec.gravity),delta=z.foamDelta??z.delta;
  return {...z,delta,handSpring:contact.handSpring??null,xh:z.xh??0,hw:z.hw??0,E:spec.energy,mass:spec.mass,speed:spec.speed,total:comp.total,left:comp.total-delta*1000,foamWeightG:M.stackWeightGrams(stack),...outcome(z,spec.limit),impact:spec,target:{mode:'rigid'},loadingComplete:!z.limited};
 }
 // Reference force comparisons in the model's fixed surrogate rig, not a
 // reproduction of the complete SATRA apparatus or certification procedure.
 function referenceChecks(stack,input={}){
  if(Array.isArray(stack)&&stack.length===0)return [];
  const c=Object.freeze({...M.DEFAULT_CONFIG,...input,mass:RIG.mass,speed:1});
  return ['test3','test10'].map(id=>{
   const r=calculate(stack,c,id,false,{loadingDurationMs:0});
   return {id,label:id==='test3'?'SATRA 3 J':'SATRA 10 J',E:r.E,mass:r.mass,speed:r.speed,gravity:r.gravity,limit:r.limit,F:r.F,hasStopped:r.hasStopped,status:r.label,pass:r.pass,peakIsLowerBound:r.peakIsLowerBound,marginN:r.marginN,marginPct:r.marginPct};
  });
 }
 return {REFERENCE,compileReference,RIG,BAG,HAND,PADDED_TARGETS,EVA75,PRESETS,impactSpec,targetSpec,geometry,compile,compilePaddedContact,compileBagContact,compileHandContact,solve,trajectory,earlyLoading,energyAt10ms,calculate,quick,referenceChecks,unpadded,verdict,outcome};
})();
if(typeof module!=='undefined')module.exports=ImpactModel;
