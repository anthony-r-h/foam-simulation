'use strict';
const assert=require('assert'),M=require('./engine.js'),I=require('./impact_engine.js');
const checks=[];
function ck(ok,name){assert(ok,name);checks.push(name);}
function close(a,b,relative=1e-8,absolute=1e-10){return Number.isFinite(a)&&Math.abs(a-b)<=absolute+relative*Math.abs(b);}
function springContact(stiffness,maxDelta=1){
 return {maxDelta,state(delta){
  if(delta<0||delta>maxDelta)throw Error('Synthetic contact range exceeded.');
  const W=.5*stiffness*delta**2;
  return {delta,F:stiffness*delta,stiffness,W,fw:W,tw:0,xg:delta,xt:0,X:delta,area:1,es:[],ws:[]};
 }};
}
ck(I.HAND.stiffness===1e6,'fixed hand assumption is 1 kN/mm in SI units');
ck(Object.isFrozen(I.HAND),'fixed hand assumption cannot be mutated');

// Two springs in series have an independent closed form, including gravity.
// Cover both a much softer contact and a much stiffer contact than the hand.
for(const stiffness of [1e4,1e6,1e8])for(const mass of [.5,2.5,10])for(const gravity of [0,M.G]){
 const speed=2,energy=.5*mass*speed**2,k=I.HAND.stiffness,keq=1/(1/stiffness+1/k),omega=Math.sqrt(keq/mass);
 const contact=I.compileHandContact(springContact(stiffness)),peak=I.solve(contact,energy,mass,gravity);
 const trace=I.trajectory(contact,peak,energy,240,mass,gravity),name='analytic hand '+stiffness+' N/m / '+mass+' kg / g='+gravity;
 const force=mass*gravity+Math.sqrt((mass*gravity)**2+2*keq*energy);
 const duration=(Math.PI/2+Math.atan(gravity/(speed*omega)))/omega;
 ck(!peak.limited&&close(peak.F,force),name+' peak force matches the independent series oscillator');
 ck(close(peak.delta,force/keq)&&close(peak.X,peak.delta),name+' total closure matches exact series compression');
 ck(close(peak.xg,force/stiffness)&&close(peak.xh,force/k),name+' contact and hand carry the same force');
 ck(close(peak.fw,force**2/(2*stiffness))&&close(peak.hw,force**2/(2*k)),name+' separates exact contact and hand energies');
 ck(close(peak.W,energy+mass*gravity*peak.X)&&close(peak.W,peak.fw+peak.tw+peak.hw),name+' total work and gravity balance');
 ck(close(peak.stiffness,keq),name+' tangent matches equivalent series stiffness');
 ck(close(trace.time,duration,1e-7),name+' first-compression duration matches the oscillator');
 ck(close(trace.impulse,mass*speed+mass*gravity*duration,1e-7)&&trace.impulseError<.0001,name+' impulse balances momentum including gravity');
 ck(trace.rows.every(row=>{
  const angle=omega*row.t,delta=speed/omega*Math.sin(angle)+gravity/omega**2*(1-Math.cos(angle));
  const velocity=speed*Math.cos(angle)+gravity/omega*Math.sin(angle);
  return close(row.delta,delta,1e-7)&&close(row.v,velocity,1e-6,1e-7)&&close(row.kinetic+row.fw+row.tw+row.hw,energy+mass*gravity*row.X);
 }),name+' full trajectory matches the closed form and preserves energy');
 const delta=.63*peak.delta,h=delta*1e-5,z=contact.state(delta,true);
 ck(close((contact.state(delta+h).W-contact.state(delta-h).W)/(2*h),z.F,1e-7),name+' total work derivative is contact force');
}
{
 const spring=springContact(12000),noTangent={maxDelta:spring.maxDelta,state(delta){const z=spring.state(delta);delete z.stiffness;return z;}};
 const direct=I.solve(I.compileHandContact(spring),10,2,0),fallback=I.solve(I.compileHandContact(noTangent),10,2,0);
 ck(close(direct.F,fallback.F)&&close(direct.delta,fallback.delta),'hand series inversion remains accurate without an analytic contact tangent');
 const limited=I.compileHandContact(springContact(10000,.0005)),peak=I.solve(limited,10,2,0),trace=I.trajectory(limited,peak,10,240,2,0);
 ck(peak.limited&&peak.W<10&&trace.rows.at(-1).v>0,'hand spring preserves unresolved motion when the underlying contact range is exceeded');
 ck(peak.xg<=.0005&&close(peak.xh,peak.F/I.HAND.stiffness),'hand does not continue a fictional contact law beyond its range');
}

const config=M.DEFAULT_CONFIG,stack=M.recipe('canonicalSoft');
const referenceBefore=JSON.stringify(I.referenceChecks(stack,config));
for(const thickness of [20,40,100]){
 const layers=M.scaleThickness(stack,thickness),r=I.calculate(layers,config,'adult',true),name='Adult Soft '+thickness+' mm';
 ck(r.loadingComplete&&r.hasStopped&&!r.peakIsLowerBound&&r.trace.rows.at(-1).v===0,name+' resolves first compression and striker stop');
 ck(r.handSpring===I.HAND&&r.xh>0&&r.hw>0,name+' identifies the fixed hand assumption and positive give');
 ck(close(r.X,r.delta+r.xh)&&r.delta<r.total/1000,name+' separates hand give from remaining foam thickness');
 ck(close(r.W+r.endK,r.E+r.gravityWork)&&close(r.W,r.fw+r.hw),name+' endpoint energy balances');
 ck(r.trace.rows.every(row=>close(row.F,I.HAND.stiffness*row.xh)&&close(row.hw,.5*I.HAND.stiffness*row.xh**2)),name+' trace obeys the same hand spring throughout contact');
 ck(r.trace.rows.every(row=>close(row.kinetic+row.fw+row.hw,r.E+row.gravityWork)&&close(row.X,row.delta+row.xh)),name+' trace preserves energy and separate displacements');
 ck(r.trace.rows.every(row=>close(row.ws.reduce((sum,w)=>sum+w,0),row.fw)),name+' hand energy is never reported as foam layer work');
 const fine=I.calculate(layers,config,'adult',true,{nr:48,nt:40,steps:480});
 ck(close(r.F,fine.F,.003)&&close(r.trace.time,fine.trace.time,.003),name+' force and duration converge under refined contact and time grids');
}
for(const target of [{mode:'rigid'},...I.PADDED_TARGETS,I.BAG])for(const layers of [stack,[]]){
 const name=target.mode+'/'+(target.thicknessMm??'')+'/'+(layers.length?'foam':'unpadded');
 const result=I.calculate(layers,config,'adult',true,{target}),quick=I.quick(layers,config,'adult',{target});
 ck(result.handSpring===I.HAND&&result.xh>0&&result.hw>0,name+' uses the same hand assumption');
 ck(['F','delta','X','W','xh','hw','fw','loadingComplete'].every(key=>quick[key]===result[key]),name+' quick and traced calculations agree');
 ck(close(result.X,result.delta+(result.xt??0)+result.xh)&&close(result.W,result.fw+(result.tw??0)+result.hw),name+' separates foam, target and hand deformation and work');
 if(!layers.length){
  const direct=I.unpadded(config,'adult',true,{target});
  ck(['F','delta','X','W','xh','hw'].every(key=>direct[key]===result[key]),name+' direct unpadded API agrees');
 }
 const changed=I.calculate(layers,config,'adult',false,{target,referenceModulusPa:4e9});
 if(!layers.length)ck(close(result.F,changed.F,.005),name+' peak is controlled by the hand and target rather than the synthetic contact-film stiffness');
}
for(const preset of I.PRESETS){
 const human=['gentle','adult','olympic'].includes(preset.id),r=I.calculate(stack,config,preset.id,false);
 ck(human?r.handSpring===I.HAND:!r.handSpring,preset.id+' applies the hand only to human-striker scenarios');
 if(!human){
  const original=I.solve(I.compile(stack,config),preset.energy,preset.mass,preset.gravity);
  ck(r.F===original.F&&r.delta===original.delta&&r.W===original.W,preset.id+' retains the original mechanical contact solution exactly');
 }
}
ck(I.calculate(stack,config,{mass:2,speed:3,gravity:0},false).handSpring===I.HAND,'custom hit uses the human hand assumption');
ck(JSON.stringify(I.referenceChecks(stack,config))===referenceBefore,'human hand calculations do not change automatic SATRA reference results');
console.log('PASS',checks.length,'hand-spring numerical checks');
