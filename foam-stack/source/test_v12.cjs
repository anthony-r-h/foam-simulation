'use strict';
const assert=require('assert'),fs=require('fs'),M=require('./engine.js'),I=require('./impact_engine.js');
let checks=[];function ck(ok,name){assert(ok,name);checks.push(name);}
const config=M.DEFAULT_CONFIG,ids=Object.keys(M.CANONICAL),cases=[];
const audit=JSON.parse(fs.readFileSync(__dirname+'/preset_selection_v12.json')),screen=JSON.parse(fs.readFileSync(__dirname+'/screen_v12.json'));
ck(screen.rows.length===4256,'4256 combinations actually stored');
ck(new Set(screen.rows.map(r=>r.thicknesses.join('/'))).size===76,'76 thickness allocations actually stored');
for(let i=0;i<4;i++)ck(new Set(screen.rows.map(r=>r.thicknesses[i])).size>1,'thickness varied in layer '+i);
ck(screen.rows.every(r=>Object.keys(r.tests).length===7),'all seven impact cases stored per candidate');
for(const id of ids){
 const s=M.recipe(id),pick=audit.selection.find(r=>r.id===id);
 ck(JSON.stringify(s.map(l=>l.h))===JSON.stringify(pick.thicknesses),id+' thicknesses match screening selection');
 ck(JSON.stringify(s.map(l=>l.grade))===JSON.stringify(pick.grades),id+' materials match screening selection');
 ck(s.reduce((a,b)=>a+b.h,0)===40,id+' exactly 40 mm');
 for(const p of I.PRESETS){
  const r=I.calculate(s,config,p.id,true),ref=I.calculate([],config,p.id,true);
  ck(Number.isFinite(r.F)&&r.F>0,id+'/'+p.id+' finite reached force');
  ck(Math.abs(r.W+r.endK-r.E-r.gravityWork)<1e-7,id+'/'+p.id+' energy balance');
  ck(r.trace.impulseError<.002,id+'/'+p.id+' impulse balance');
  ck(r.left>=0,id+'/'+p.id+' nonnegative remaining thickness');
  if(p.id==='test3'||p.id==='test10')ck(r.hasStopped,id+'/'+p.id+' resolved peak');
  if(r.limited){
   ck(!r.hasStopped&&r.endK>0&&r.trace.rows.at(-1).v>0,id+'/'+p.id+' unresolved contact retains motion and kinetic energy');
   ck(r.peakIsLowerBound&&r.pass!==true,id+'/'+p.id+' unresolved force is a lower bound and never a pass');
  }
  // Historical screening predates the hand spring; its mechanical cases remain exact regressions.
  if(['test3','test10','commercial3','commercial5'].includes(p.id)){
   const expected=pick.tests[p.id];ck(Math.abs(r.F/expected.forceReachedN-1)<1e-10,id+'/'+p.id+' mechanical result matches screening');
  }
  cases.push({recipe:id,impact:p.id,forceN:r.hasStopped?r.F:null,forceReachedN:r.F,stop:r.hasStopped,referenceN:ref.F,reductionPct:r.hasStopped?100*(1-r.F/ref.F):null,timeMs:r.trace.time*1000});
 }
 for(const h of [4,10,20]){const slow=I.compile(s,{...config,speedModel:'slow'});const hi=I.compile(s,{...config,speedModel:'slow'},{nr:48,nt:40});ck(Math.abs(slow.state(h*.001).F/hi.state(h*.001).F-1)<.01,id+' slow-grid convergence '+h+' mm');}
}
for(const h of [4,10,20])for(const tail of [1.5,2,3]){
 const f=ids.map(id=>I.compile(M.recipe(id),{...config,speedModel:'slow',tailPower:tail}).state(h*.001).F);
 ck(f[0]<f[1]&&f[1]<f[2],'soft < medium < firm at '+h+' mm, tail '+tail);
}
for(const p of I.PRESETS){
 const r=I.calculate([],config,p.id,true),fine=I.calculate([],config,p.id,true,{nr:192,nt:160});
 ck(r.hasStopped,'reference '+p.id+' resolved stop');ck(r.F>0&&r.delta<.001,'reference '+p.id+' positive force inside 1 mm');
 ck(r.trace.rows.at(-1).v===0,'reference '+p.id+' zero final speed');
 ck(Math.abs(r.W-r.E-r.gravityWork)<1e-7,'reference '+p.id+' energy balance');
 ck(r.trace.impulseError<.0001,'reference '+p.id+' impulse integration');
 ck(Math.abs(r.F/fine.F-1)<.001,'reference '+p.id+' contact-grid convergence <0.1%');
 const independent=Array.from({length:10001},(_,i)=>r.comp.state(r.delta*i/10000).F).reduce((a,f,i)=>a+f*(i===0||i===10000?.5:1),0)*r.delta/10000;
 ck(Math.abs((independent+(r.hw??0))/r.W-1)<1e-6,'reference '+p.id+' independent contact-work integral plus exact hand-spring energy');
 const changed=I.calculate([],{...config,speedModel:'slow',rateScale:2,tailPower:3,ret:.8,firmness:.7},p.id,false);
 ck(Math.abs(changed.F-r.F)<1e-7,'reference '+p.id+' independent of glove assumptions');
 ck(I.quick([],config,p.id).hasStopped,'reference '+p.id+' quick solver matches');
}
for(const id of ids){
 const s=M.recipe(id),a=I.calculate(s,config,'test10',false),b=I.calculate(s.slice().reverse(),config,'test10',false);
 ck(Math.abs(a.F/b.F-1)<1e-10,id+' massless series order invariance');
 const one=audit.selection.find(r=>r.id===id).mainOnlySensitivity;ck(one[0].forceN>one[1].forceN&&one[1].forceN>one[2].forceN,id+' selected +/-5 mm controlled thickness comparison');
}
const referenceStress=[4e9,5e9,10e9].map(E=>({E,forceN:I.calculate([],config,'test10',false,{referenceModulusPa:E}).F}));
ck(referenceStress[0].forceN<referenceStress[1].forceN&&referenceStress[1].forceN<referenceStress[2].forceN,'synthetic stiffness changes baseline explicitly');

// Closed-form spring dynamics provide an independent check of the energy solver
// and time transformation, without using the foam material or contact equations.
function springContact(stiffness,maxDelta){
 return {maxDelta,state(delta){return {delta,F:stiffness*delta,W:stiffness*delta*delta/2,area:1,es:[],ws:[]};}};
}
const physicsBenchmarks=[];
for(const gravity of [0,M.G])for(const mass of [.2,2.5,20]){
 const stiffness=12000,speed=2,energy=.5*mass*speed*speed,omega=Math.sqrt(stiffness/mass);
 const comp=springContact(stiffness,1),peak=I.solve(comp,energy,mass,gravity),trace=I.trajectory(comp,peak,energy,240,mass,gravity);
 const expectedDelta=(mass*gravity+Math.sqrt((mass*gravity)**2+2*stiffness*energy))/stiffness;
 const expectedTime=(Math.PI/2+Math.atan(gravity/(speed*omega)))/omega;
 const expectedImpulse=mass*speed+mass*gravity*expectedTime,label=`analytic spring ${mass} kg / g=${gravity}`;
 const deltaError=Math.abs(peak.delta/expectedDelta-1),timeError=Math.abs(trace.time/expectedTime-1),impulseError=Math.abs(trace.impulse/expectedImpulse-1);
 ck(!peak.limited&&deltaError<1e-10,label+' stopping compression matches closed form');
 ck(timeError<1e-8,label+' compression time matches closed form');
 ck(impulseError<1e-8,label+' contact impulse includes gravity');
 ck(trace.rows.every(row=>{
  const angle=omega*row.t,delta=speed/omega*Math.sin(angle)+gravity/omega**2*(1-Math.cos(angle));
  const velocity=speed*Math.cos(angle)+gravity/omega*Math.sin(angle);
  return Math.abs(row.delta-delta)<1e-9&&Math.abs(row.v-velocity)<1e-7;
 }),label+' full displacement and velocity history matches closed form');
 physicsBenchmarks.push({kind:'analyticSpring',mass,gravity,deltaRelativeError:deltaError,timeRelativeError:timeError,impulseRelativeError:impulseError});
}
{
 const mass=2.5,speed=2,energy=.5*mass*speed*speed,stiffness=12000,omega=Math.sqrt(stiffness/mass);
 const comp=springContact(stiffness,.0075),peak=I.solve(comp,energy,mass,0),trace=I.trajectory(comp,peak,energy,240,mass,0);
 const expectedSpeed=Math.sqrt(speed*speed-omega*omega*peak.delta*peak.delta),expectedTime=Math.asin(omega*peak.delta/speed)/omega;
 ck(peak.limited&&trace.rows.at(-1).v>0,'analytic limited spring retains positive endpoint speed');
 ck(Math.abs(trace.rows.at(-1).v/expectedSpeed-1)<1e-10,'analytic limited spring endpoint speed matches closed form');
 ck(Math.abs(trace.time/expectedTime-1)<1e-8,'analytic limited spring compression time matches closed form');
}
for(const thickness of [.001,.04,.1]){
 const geo=I.geometry(thickness),area=geo.nodes.reduce((sum,node)=>sum+node.weight,0);
 ck(Math.abs(area/(Math.PI*I.RIG.faceRadius**2)-1)<1e-12,`${thickness} m quadrature integrates the full projected face area`);
 ck(geo.nodes.every(node=>node.gap>=0&&node.stretch>=1&&Number.isFinite(node.stretch)),`${thickness} m curved geometry has finite positive column thickness`);
}
for(const id of ids){
 const stack=M.recipe(id),r=I.calculate(stack,config,'test10',true),intervals=10000,step=r.delta/intervals;
 let integral=0;
 for(let i=0;i<=intervals;i++)integral+=r.comp.state(step*i).F*(i===0||i===intervals?.5:1)*step;
 ck(Math.abs(integral/r.W-1)<1e-6,id+' independent padded force-distance work integral');
 ck(r.trace.rows.every(row=>Math.abs(row.ws.reduce((sum,work)=>sum+work,0)-row.W)<1e-8),id+' layer work sums to total contact work throughout loading');
 for(const impact of ['test3','test10']){
  const normal=I.calculate(stack,config,impact,false),fine=I.calculate(stack,config,impact,false,{nr:48,nt:40});
  ck(normal.hasStopped&&fine.hasStopped&&Math.abs(normal.F/fine.F-1)<.001,id+'/'+impact+' fast-curve peak converges under refined contact quadrature');
 }
 const light=I.calculate(stack,config,{mass:1,speed:Math.sqrt(20),gravity:0},true);
 const heavy=I.calculate(stack,config,{mass:4,speed:Math.sqrt(5),gravity:0},true);
 ck(Math.abs(light.F/heavy.F-1)<1e-10&&Math.abs(light.delta/heavy.delta-1)<1e-10,id+' equal energy with zero gravity preserves force and compression');
 ck(Math.abs(heavy.trace.time/light.trace.time-2)<1e-8&&Math.abs(heavy.trace.impulse/light.trace.impulse-2)<1e-10,id+' equal energy distinguishes mass-dependent time and impulse');
 physicsBenchmarks.push({kind:'paddedContact',recipe:id,forceDistanceWorkRelativeError:Math.abs(integral/r.W-1),equalEnergyTimeRatio:heavy.trace.time/light.trace.time,equalEnergyImpulseRatio:heavy.trace.impulse/light.trace.impulse});
}
ck(Math.abs(I.impactSpec('gentle').energy/I.impactSpec('adult').energy-.7)<1e-12,'gentler preset means 30% less incoming energy');
ck(Math.abs(I.impactSpec('commercial3').energy-3.324*M.G*3)<1e-10,'3 m commercial severity includes the reported mechanical fist and 10 oz glove mass');

// Automatic reference checks reuse the fixed rig independently of the selected
// main impact, and only a resolved comparison can receive a passing result.
const checkedStack=Object.freeze(M.recipe('canonicalSoft').map(layer=>Object.freeze(layer)));
const checkedConfig=Object.freeze({...config,mass:12,speed:14});
const originalCheckedState=JSON.stringify({stack:checkedStack,config:checkedConfig});
const automaticChecks=I.referenceChecks(checkedStack,checkedConfig);
ck(automaticChecks.length===2&&automaticChecks[0].id==='test3'&&automaticChecks[1].id==='test10','automatic checks contain the two fixed reference impacts');
for(const [i,check] of automaticChecks.entries()){
 const expected=I.calculate(checkedStack,config,check.id,false,{loadingDurationMs:0});
 ck(Math.abs(check.E-[3,10][i])<1e-12&&check.mass===2.5&&Math.abs(check.speed-Math.sqrt(2*[3,10][i]/2.5))<1e-12&&check.gravity===M.G&&check.limit===2000,check.id+' automatic check keeps its fixed energy, mass, speed, gravity and limit');
 ck(check.F===expected.F&&check.hasStopped===expected.hasStopped&&check.status===expected.label,check.id+' automatic result agrees with the existing reference calculation');
 ck(check.status==='Pass'&&check.hasStopped&&check.F<=check.limit,check.id+' automatic pass requires a complete stop within the force limit');
 ck(!('trace' in check)&&!('comp' in check),check.id+' automatic summary omits unrequested trajectory and compiler data');
}
ck(JSON.stringify({stack:checkedStack,config:checkedConfig})===originalCheckedState,'automatic checks preserve frozen input layers and config');
ck(JSON.stringify(I.referenceChecks(checkedStack,{...checkedConfig,mass:.25,speed:90}))===JSON.stringify(automaticChecks),'automatic reference results are independent of main impact mass and speed');
ck(JSON.stringify(I.referenceChecks(checkedStack,{...checkedConfig,loadingDurationMs:20}))===JSON.stringify(automaticChecks),'automatic reference checks retain zero-duration baseline when unrelated sensitivity metadata is present');
ck(I.referenceChecks(checkedStack,{...checkedConfig,firmness:1.1}).some((r,i)=>r.F!==automaticChecks[i].F),'automatic checks update after material strength settings change');
ck(I.referenceChecks(checkedStack.map(layer=>({...layer,h:layer.h+1})),checkedConfig).some((r,i)=>r.F!==automaticChecks[i].F),'automatic checks update after layer thickness changes');
const slowAutomatic=I.referenceChecks(checkedStack,{...checkedConfig,speedModel:'slow'});
for(const check of slowAutomatic){
 const expected=I.calculate(checkedStack,{...config,speedModel:'slow'},check.id,false);
 ck(check.F===expected.F&&check.hasStopped===expected.hasStopped&&check.status===expected.label,check.id+' automatic checks preserve the active legacy slow curve');
}
ck(slowAutomatic.some(check=>!check.hasStopped&&check.F>check.limit&&check.status==='Fail'&&check.peakIsLowerBound),'automatic incomplete stop exceeding the limit is a known failure');
ck(I.referenceChecks([],config).length===0,'empty stack has no applicable glove reference checks');
assert.throws(()=>I.referenceChecks(checkedStack,{...config,speedModel:'invalid'}),/supported loading curve/);
ck(true,'automatic checks reject invalid active material settings');
for(const [force,limited,label] of [[1999,false,'Pass'],[2000,false,'Pass'],[2001,false,'Fail'],[1999,true,'Unresolved'],[2000,true,'Unresolved'],[2001,true,'Fail']]){
 const result=I.outcome({F:force,limited},2000);
 ck(result.label===label&&result.pass===(label==='Pass'?true:label==='Fail'?false:null),`reference verdict ${force} N / incomplete=${limited} is ${label}`);
}
const out={status:'passed',count:checks.length,checks,cases,referenceStiffnessSensitivity:referenceStress};
out.physicsBenchmarks=physicsBenchmarks;
if(!process.argv.includes('--no-write'))fs.writeFileSync(__dirname+'/numerical_checks_v12.json',JSON.stringify(out,null,2));console.log('PASS',checks.length,'numerical checks');
