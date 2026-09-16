'use strict';
const assert=require('assert'),M=require('./engine.js'),I=require('./impact_engine.js');
const checks=[];
function ck(ok,name){assert(ok,name);checks.push(name);}
function close(a,b,relative=1e-8,absolute=1e-10){return Number.isFinite(a)&&Math.abs(a-b)<=absolute+relative*Math.abs(b);}
const config=M.DEFAULT_CONFIG,stack=M.recipe('canonicalMedium');

ck(close(I.EVA75.rho*M.PCF,75)&&I.EVA75.a===55&&I.EVA75.b===null,'target uses nominal density and the midpoint 25% anchor without an invented 50% anchor');
ck(close(M.atStrain(M.materialCurve(I.EVA75,2,550,'slow'),.25).p,55000),'slow target calibration passes through the 55 kPa supplier-range midpoint');
for(const target of I.PADDED_TARGETS){
 const comp=I.compile(stack,config,{target}),contact=I.compilePaddedContact(comp,target),name=target.thicknessMm+' mm target';
 ck(comp.geo.plane&&!comp.geo.flat&&comp.geo.supportRadius===Infinity,name+' uses a plane while retaining striker curvature');
 ck(comp.geo.nodes.every(n=>close(n.stretch,1)&&close(n.gap,I.RIG.strikerRadius-Math.sqrt(I.RIG.strikerRadius**2-n.x**2-n.y**2))),name+' contact gap contains only the inherited domed-striker curvature');
 ck(comp.geo.nodes.some(n=>n.gap>0),name+' plane support is distinct from the all-flat analytic-test option');
 ck(close(comp.geo.area,Math.PI*.040**2)&&comp.geo.area!==.030*.030,name+' keeps the 40 mm contact radius independent of the mass-estimate footprint');
 ck(contact.targetDef.h===target.thicknessMm/1000&&contact.targetDef.scale===1,name+' target thickness and scale are fixed');
 ck(contact.targetDef.cv.speedModel==='fast'&&contact.targetDef.cv.loadingDurationMs===0,name+' target retains the prescribed rapid loading curve');
 ck(contact.defs.length===stack.length&&comp.defs.length===stack.length,name+' material outputs contain glove layers only');
 for(const delta of [.005,.02,.045]){
  const q=contact.column(delta,true),z=contact.state(delta,true),step=1e-8;
  ck(close(q.xg+q.xt,delta)&&close(q.fw+q.tw,q.u),name+' local compression and work separate at '+delta+' m');
  ck(close(M.atStrain(contact.targetDef.cv,q.targetStrain).p,q.p),name+' target shares local glove pressure at '+delta+' m');
  ck(comp.defs.every((d,i)=>close(M.atStrain(d.cv,q.es[i],d.scale).p,q.p)),name+' every glove layer shares local target pressure at '+delta+' m');
  ck(close(z.F,(contact.state(delta+step).W-contact.state(delta-step).W)/(2*step),2e-5),name+' force is the derivative of combined work at '+delta+' m');
  ck(close(z.stiffness,(contact.state(delta+step).F-contact.state(delta-step).F)/(2*step),2e-5),name+' analytic stiffness agrees with a force difference at '+delta+' m');
  ck(close(z.fw+z.tw,z.W)&&close(z.ws.reduce((sum,w)=>sum+w,0),z.fw),name+' integrated layer work excludes the target at '+delta+' m');
 }
}

// In the first lookup interval both material laws are exactly linear. With flat
// contact, their independent spring-in-series solution is therefore exact.
for(const target of I.PADDED_TARGETS)for(const mass of [.5,2.5,10]){
 const layers=[M.layer('ev50',40,'Synthetic linear interval','linear')],opts={target,flat:true};
 const comp=I.compile(layers,config,opts),contact=I.compilePaddedContact(comp,target),a=comp.geo.area;
 const glove=comp.defs[0],mat=contact.targetDef;
 const kg=a*glove.cv.ps[1]*glove.scale/(glove.cv.es[1]*glove.h),kt=a*mat.cv.ps[1]/(mat.cv.es[1]*mat.h);
 const keq=kg*kt/(kg+kt),energy=1e-8,speed=Math.sqrt(2*energy/mass),force=Math.sqrt(2*keq*energy);
 const peak=I.solve(contact,energy,mass,0),trace=I.trajectory(contact,peak,energy,240,mass,0);
 const name='linear series '+target.thicknessMm+' mm / '+mass+' kg';
 ck(peak.es[0]<glove.cv.es[1]&&peak.targetStrain<mat.cv.es[1],name+' stays within both exactly linear intervals');
 ck(close(peak.F,force)&&close(peak.delta,force/keq),name+' force and total approach match two independent springs');
 ck(close(peak.xg,force/kg)&&close(peak.xt,force/kt),name+' separates glove and target displacements analytically');
 ck(close(peak.fw,force**2/(2*kg))&&close(peak.tw,force**2/(2*kt))&&close(peak.W,energy),name+' separates the exact spring energies');
 ck(close(trace.time,Math.PI/2*Math.sqrt(mass/keq),1e-7),name+' loading duration matches the analytic oscillator');
 ck(close(trace.impulse,mass*speed)&&trace.impulseError<.0001,name+' force-time impulse matches momentum loss');
 const omega=Math.sqrt(keq/mass);
 ck(trace.rows.every(row=>close(row.F,speed*Math.sqrt(mass*keq)*Math.sin(omega*row.t),1e-7)),name+' full force history agrees with the closed form');
}

const referenceBefore=JSON.stringify(I.referenceChecks(stack,config));
for(const id of Object.keys(M.CANONICAL))for(const preset of I.PRESETS){
 const layers=M.recipe(id),pair=[];
 for(const target of I.PADDED_TARGETS){
  const r=I.calculate(layers,config,preset.id,true,{target}),name=id+'/'+preset.id+'/'+target.thicknessMm+' mm';pair.push(r);
  ck(r.loadingComplete===!r.limited&&r.hasStopped===r.loadingComplete,name+' distinguishes resolved compression from the finite material limit');
  ck(r.gravity===0&&r.gravityWork===0&&r.limit===null&&r.pass===null,name+' study impact is horizontal and cannot claim a SATRA verdict');
  ck(close(r.E,.5*r.mass*r.speed**2)&&close(r.mass,preset.mass)&&close(r.speed,preset.speed),name+' target changes preserve incident mass, speed and energy');
  ck(close(r.X,r.delta+r.xt+(r.xh??0))&&r.delta>0&&r.xt>0,name+' total approach separates glove, mat and hand compression');
  ck(r.delta<r.comp.total/1000&&r.xt<target.thicknessMm/1000,name+' glove and mat compressions stay below their own thicknesses');
  ck(close(r.W,r.fw+r.tw+(r.hw??0))&&close(r.W+r.endK,r.E),name+' endpoint total energy balances');
  ck(r.trace.rows.every(row=>close(row.kinetic+row.fw+row.tw+(row.hw??0),r.E)),name+' energy balances throughout the contact history');
  ck(r.trace.rows.every(row=>close(row.J,r.mass*(r.speed-row.v))),name+' fixed support impulse equals striker momentum loss throughout contact');
  ck(r.trace.rows.every(row=>close(row.X,row.delta+row.xt+(row.xh??0))&&close(row.ws.reduce((sum,w)=>sum+w,0),row.fw)),name+' trace labels retain glove-only compression and work');
  ck(r.trace.rows.every(row=>close(row.es.reduce((sum,e,i)=>sum+e*r.comp.defs[i].h,0),row.delta)),name+' central layer compressions sum to glove compression');
  ck((r.loadingComplete?r.trace.rows.at(-1).v===0&&r.strikerSpeed===0:r.trace.rows.at(-1).v>0&&r.strikerSpeed>0)&&r.trace.impulseError<.002,name+' endpoint speed follows completion status and integrated force conserves momentum');
  ck(close(r.foamWeightG,M.stackWeightGrams(layers)),name+' foam mass uses only the specified glove layers');
  ck(r.comp.defs.length===layers.length&&r.es.length===layers.length&&r.ws.length===layers.length,name+' target material is not presented as a glove layer');
 }
 if(pair.every(r=>r.loadingComplete))ck(pair[1].F<pair[0].F&&pair[1].trace.time>pair[0].trace.time,id+'/'+preset.id+' thicker identical target reduces a resolved peak and lengthens first compression');
}
ck(JSON.stringify(I.referenceChecks(stack,config))===referenceBefore,'padded calculations leave fixed SATRA reference checks unchanged');

for(const target of I.PADDED_TARGETS){
 const base=I.calculate(stack,config,'gentle',true,{target});
 for(const changes of [{tailPower:3},{rateScale:1.1},{firmness:.8},{ret:.9},{speedModel:'slow'},{targetScale:2}]){
  const changed=I.calculate(stack,{...config,...changes},'gentle',false,{target}),mat=changed.paddedComp.targetDef,original=base.paddedComp.targetDef;
  ck(mat.cv===original.cv&&mat.h===original.h&&mat.scale===original.scale,target.thicknessMm+' mm target law is isolated from glove setting '+Object.keys(changes)[0]);
  ck(changed.foamWeightG===base.foamWeightG,target.thicknessMm+' mm specified foam mass ignores constitutive and retained-thickness settings');
 }
 const sensitivity=I.calculate(stack,config,'gentle',false,{target,loadingDurationMs:20});
 ck(sensitivity.paddedComp.targetDef.cv===base.paddedComp.targetDef.cv,target.thicknessMm+' mm target curve is isolated from the PU duration sensitivity');
 const fine=I.calculate(stack,config,'gentle',true,{target,nr:48,nt:40,steps:480});
 ck(close(base.F,fine.F,.001)&&close(base.trace.time,fine.trace.time,.001),target.thicknessMm+' mm target force and duration converge with finer contact/time grids');
 ck(close(base.earlyLoading.peakPercent,fine.earlyLoading.peakPercent,.001),target.thicknessMm+' mm early percentage converges with finer contact/time grids');
 const quick=I.quick(stack,config,'gentle',{target});
 ck(['F','delta','xt','W','fw','tw','foamWeightG'].every(key=>quick[key]===base[key]),target.thicknessMm+' mm quick results agree with the traced solve');
 ck(!('trace' in quick)&&!('earlyLoading' in quick),target.thicknessMm+' mm quick results do not fabricate trace metrics');
 const high=I.calculate(stack,config,{mass:20,speed:1e4,gravity:0},true,{target});
 ck(high.limited&&!high.loadingComplete&&high.endK>0&&high.trace.rows.at(-1).v>0,target.thicknessMm+' mm model-domain limit retains unresolved kinetic energy and speed');
 ck(high.earlyLoading.available===false,target.thicknessMm+' mm unresolved limit cannot supply a capped peak percentage');
}
{
 const comp25=I.compile(stack,config,{target:I.PADDED_TARGETS[0]}),comp50=I.compile(stack,config,{target:I.PADDED_TARGETS[1]});
 ck(comp25===comp50,'glove-only planar diagnostic is independent of target mat thickness');
 ck(I.compilePaddedContact(comp25,I.PADDED_TARGETS[0])!==I.compilePaddedContact(comp50,I.PADDED_TARGETS[1]),'combined contact cache separates the two mat thicknesses');
 ck(I.compile(stack,config)!==comp25&&I.compile(stack,config,{target:I.BAG})!==comp25,'padded contact geometry cannot contaminate rigid or bag compile caches');
 const frozen=Object.freeze(stack.map(l=>Object.freeze({...l}))),before=JSON.stringify(frozen);
 I.calculate(frozen,Object.freeze({...config}),'gentle',false,{target:I.PADDED_TARGETS[0]});
 ck(JSON.stringify(frozen)===before,'padded solver preserves frozen layer and configuration inputs');
}
ck(close(M.stackWeightGrams([{h:10,rho:50/M.PCF}]),.45),'30 mm square by 10 mm of 50 kg/m3 foam weighs 0.45 g');
ck(close(M.stackWeightGrams(stack),1.7104154259141),'default Medium stack has the expected 30 mm square mass');
ck(close(M.stackWeightGrams(M.scaleThickness(stack,80)),2*M.stackWeightGrams(stack)),'proportionally doubling specified thickness doubles estimated foam mass');
ck(M.stackWeightGrams([])===0,'empty legacy reference has no foam mass');
for(const invalid of [null,[{h:0,rho:1}],[{h:10,rho:NaN}],[{h:10,rho:-1}]]){
 assert.throws(()=>M.stackWeightGrams(invalid));ck(true,'invalid mass-estimate input is rejected');
}
for(const target of [{mode:'padded'},{mode:'padded',thicknessMm:0},{mode:'padded',thicknessMm:30},{mode:'padded',thicknessMm:'25'}]){
 assert.throws(()=>I.targetSpec(target));ck(true,'unsupported padded target thickness is rejected');
}
console.log('PASS',checks.length,'padded-target and foam-mass numerical checks');
