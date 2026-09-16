'use strict';
const assert=require('assert'),M=require('./engine.js'),I=require('./impact_engine.js');
const checks=[];
function ck(ok,name){assert(ok,name);checks.push(name);}
function close(actual,expected,relative=1e-10,absolute=1e-12){
 return Number.isFinite(actual)&&Math.abs(actual-expected)<=absolute+relative*Math.abs(expected);
}
function unavailable(result,reason,name,forceAt10N=null){
 ck(!result.available&&result.peakPercent===null&&(forceAt10N===null?result.forceAt10N===null:close(result.forceAt10N,forceAt10N)),name+' reports no percentage and only a known force');
 ck(result.sampleSeconds===.010&&result.reason===reason,name+' identifies the fixed sample time and reason');
}
function springContact(stiffness,maxDelta=1){
 return {maxDelta,state(delta){return {delta,F:stiffness*delta,W:stiffness*delta*delta/2,area:1,es:[],ws:[]};}};
}
function sample(rows,time,key){
 const i=rows.findIndex(row=>row.t>=time);
 if(i===0)return rows[0][key];
 const left=rows[i-1],right=rows[i],weight=(time-left.t)/(right.t-left.t);
 return left[key]*(1-weight)+right[key]*weight;
}

for(const percent of [0,10,25,50,75,100]){
 const peak=2000,force=peak*percent/100;
 const rows=[{t:0,F:0},{t:.007,F:force},{t:.010,F:force},{t:.020,F:peak}];
 const r=I.earlyLoading(rows,peak,true);
 ck(r.available&&r.coveredSeconds===.010,percent+'% case covers first contact through exactly 10 ms');
 ck(close(r.forceAt10N,force)&&close(r.peakPercent,percent),percent+'% case divides the instantaneous force by peak force');
 ck(!('reason' in r),percent+'% available result has no unavailable reason');
 const scale=37,scaled=I.earlyLoading(rows.map(row=>({...row,F:row.F*scale})),peak*scale,true);
 ck(close(scaled.peakPercent,r.peakPercent),percent+'% is dimensionless and unchanged by a common force scaling');
}
{
 const slope=200000,intercept=120,peak=intercept+slope*.045;
 const rows=[0,.0003,.0029,.008,.017,.045].map(t=>({t,F:intercept+slope*t}));
 const r=I.earlyLoading(rows,peak,true),expected=intercept+slope*.010;
 ck(close(r.forceAt10N,expected),'nonuniform linear ramp is interpolated exactly at 10 ms');
 ck(close(r.peakPercent,100*expected/peak),'nonuniform ramp percentage uses the resolved peak denominator');
 const exact=rows.filter(row=>row.t<.010).concat({t:.010,F:expected},rows.filter(row=>row.t>.010));
 ck(close(I.earlyLoading(exact,peak,true).peakPercent,r.peakPercent),'an exact endpoint sample and an interpolated sample give the same percentage');
 const frozen=Object.freeze(rows.map(row=>Object.freeze({...row}))),before=JSON.stringify(frozen);
 I.earlyLoading(frozen,peak,true);
 ck(JSON.stringify(frozen)===before,'early loading calculation preserves frozen input samples');
}
{
 const immediate=[{t:0,F:0},{t:.001,F:1000},{t:.010,F:1000},{t:.020,F:2000}];
 const delayed=[{t:0,F:0},{t:.009,F:0},{t:.010,F:1000},{t:.020,F:2000}];
 ck(I.earlyLoading(immediate,2000,true).peakPercent===50&&I.earlyLoading(delayed,2000,true).peakPercent===50,
  'different prior force histories with the same 10 ms force give the same percentage, not an impulse or average');
 const extended=[{t:0,F:0},{t:.007,F:500},{t:.013,F:1500},{t:.200,F:2000}];
 const shorter=extended.slice(0,-1).concat({t:.025,F:2000});
 ck(close(I.earlyLoading(extended,2000,true).peakPercent,I.earlyLoading(shorter,2000,true).peakPercent),
  'changing time to peak after 10 ms does not change the fixed-time numerator');
 const atPeak=I.earlyLoading([{t:0,F:0},{t:.010,F:2000}],2000,true);
 ck(atPeak.available&&atPeak.peakPercent===100,'a resolved peak at exactly 10 ms gives 100%');
 const rounded=I.earlyLoading([{t:0,F:0},{t:.010-Number.EPSILON*.010,F:2000}],2000,true);
 ck(rounded.available&&close(rounded.peakPercent,100),'machine-precision endpoint rounding at 10 ms is accepted');
 const zero=I.earlyLoading([{t:0,F:0},{t:.010,F:0},{t:.020,F:1000}],1000,true);
 ck(zero.available&&zero.forceAt10N===0&&zero.peakPercent===0,'known zero force at 10 ms is distinct from unavailable data');
 const unresolved=I.earlyLoading(extended,2000,false);
 unavailable(unresolved,'peak-unresolved','covered trace with unresolved peak',1000);
 ck(unresolved.coveredSeconds===.010,'unresolved peak preserves complete sample coverage');
 const inconsistent=I.earlyLoading(extended,1200,true);
 unavailable(inconsistent,'invalid-peak','resolved peak below a later sampled force',1000);
 const exceeded=I.earlyLoading([{t:0,F:0},{t:.010,F:2000}],1500,true);
 unavailable(exceeded,'invalid-peak','sample at 10 ms exceeds a claimed resolved peak',2000);
 const roundoff=I.earlyLoading([{t:0,F:0},{t:.010,F:2000+Number.EPSILON*2000}],2000,true);
 ck(roundoff.available&&roundoff.peakPercent===100,'machine-precision peak rounding is bounded at exactly 100%');
 const afterPeak=I.earlyLoading([{t:0,F:0},{t:.005,F:2000},{t:.010,F:500},{t:.020,F:0}],2000,true);
 ck(afterPeak.available&&afterPeak.peakPercent===100&&afterPeak.peakBefore10,'a full trace with an early peak caps the rising-phase metric even when force later falls');
 ck(afterPeak.sampleForceN===2000&&afterPeak.sampleTimeSeconds===.005&&afterPeak.forceAt10N===500,'a supplied post-peak trace keeps the actual 10 ms force distinct from its earlier peak sample');
 const plateau=I.earlyLoading([{t:0,F:0},{t:.005,F:2000},{t:.008,F:2000},{t:.015,F:0}],2000,true);
 ck(plateau.sampleTimeSeconds===.005,'a peak plateau uses its earliest sampled occurrence');
}
for(const end of [.001,.004,.009,.010-1e-12,.010-1e-15])for(const completed of [true,false]){
 const r=I.earlyLoading([{t:0,F:0},{t:end,F:1000}],1000,completed);
 if(completed){
  ck(r.available&&r.peakPercent===100&&r.peakBefore10,end+' s resolved peak caps the rising-phase percentage at 100');
  ck(r.forceAt10N===null&&r.sampleForceN===1000&&r.sampleTimeSeconds===end,end+' s early peak identifies its actual sample time without inventing force at 10 ms');
 }else unavailable(r,'window-not-covered',end+' s trace, loadingComplete='+completed);
 ck(r.coveredSeconds===end,end+' s trace reports actual coverage without substituting its earlier endpoint force');
}
for(const [name,rows] of [
 ['missing trace',undefined],['non-array trace',{}],['empty trace',[]],['single sample',[{t:0,F:0}]],
 ['missing first contact',[{t:.001,F:0},{t:.011,F:1000}]],
 ['negative start',[{t:-.001,F:0},{t:.011,F:1000}]],
 ['duplicate time',[{t:0,F:0},{t:.005,F:100},{t:.005,F:200},{t:.011,F:1000}]],
 ['descending time',[{t:0,F:0},{t:.007,F:100},{t:.005,F:200},{t:.011,F:1000}]],
 ['NaN time',[{t:0,F:0},{t:NaN,F:1000}]],
 ['infinite time',[{t:0,F:0},{t:Infinity,F:1000}]],
 ['NaN force',[{t:0,F:0},{t:.011,F:NaN}]],
 ['infinite force',[{t:0,F:0},{t:.011,F:Infinity}]],
 ['negative contact force',[{t:0,F:0},{t:.011,F:-1000}]],
 ['missing force',[{t:0,F:0},{t:.011}]],
 ['missing row',[{t:0,F:0},null,{t:.011,F:1000}]],
 ['non-numeric force',[{t:0,F:0},{t:.011,F:'1000'}]],
 ['invalid data after window',[{t:0,F:0},{t:.011,F:1000},{t:.020,F:NaN}]],
 ['unordered data after window',[{t:0,F:0},{t:.011,F:1000},{t:.020,F:1200},{t:.015,F:1000}]],
])unavailable(I.earlyLoading(rows,1000,true),'invalid-trace',name);
for(const peak of [0,-1,NaN,Infinity,undefined,'2000']){
 const r=I.earlyLoading([{t:0,F:0},{t:.010,F:1000}],peak,true);
 unavailable(r,'invalid-peak','invalid peak '+String(peak),1000);
}
for(const completion of [undefined,null,0,1,'true','false']){
 const r=I.earlyLoading([{t:0,F:0},{t:.010,F:1000}],2000,completion);
 unavailable(r,'invalid-peak','nonboolean completion '+String(completion),1000);
}

// Closed-form spring force checks interpolation independently of the foam law
// and confirms convergence as the trajectory time grid is refined.
for(const gravity of [0,M.G]){
 const mass=2.5,speed=2,stiffness=12000,energy=.5*mass*speed**2,omega=Math.sqrt(stiffness/mass);
 const comp=springContact(stiffness),peak=I.solve(comp,energy,mass,gravity);
 const exactForce=stiffness*(speed/omega*Math.sin(omega*.010)+gravity/omega**2*(1-Math.cos(omega*.010)));
 const exactPeak=mass*gravity+Math.sqrt((mass*gravity)**2+2*stiffness*energy),errors=[];
 for(const steps of [60,120,240,480]){
  const name='analytic spring g='+gravity+', '+steps+' samples';
  const trace=I.trajectory(comp,peak,energy,steps,mass,gravity),r=I.earlyLoading(trace.rows,peak.F,!peak.limited);
  ck(r.available&&trace.time>.010,name+' covers the fixed time');
  const error=Math.abs(r.forceAt10N/exactForce-1);errors.push(error);
  ck(error<.0001,name+' matches exact force at 10 ms within 0.01%');
  ck(close(r.peakPercent,100*exactForce/exactPeak,.0001),name+' matches the exact percentage');
 }
 ck(errors.every((error,i)=>!i||error<errors[i-1]),'analytic spring g='+gravity+' interpolation error decreases under time-grid refinement');
 ck(errors.at(-1)<errors[0]/10,'analytic spring g='+gravity+' refinement reduces force error by more than tenfold');
}
{
 const mass=.2,speed=2,energy=.5*mass*speed**2,comp=springContact(12000),peak=I.solve(comp,energy,mass,0);
 const trace=I.trajectory(comp,peak,energy,240,mass,0);
 ck(!peak.limited&&trace.time<.010,'analytic stiff spring reaches maximum compression before 10 ms');
 const early=I.earlyLoading(trace.rows,peak.F,true);
 ck(early.available&&early.peakBefore10&&early.peakPercent===100,'completed short first compression reports a reached peak');
 ck(early.forceAt10N===null&&early.sampleTimeSeconds===trace.time,'completed short first compression leaves post-peak force unknown');
}
for(const maxDelta of [.0075,.022]){
 const mass=2.5,speed=2,energy=.5*mass*speed**2,comp=springContact(12000,maxDelta),peak=I.solve(comp,energy,mass,0);
 const trace=I.trajectory(comp,peak,energy,240,mass,0),r=I.earlyLoading(trace.rows,peak.F,!peak.limited);
 ck(peak.limited&&trace.rows.at(-1).v>0,maxDelta+' m spring stops at a model limit with residual speed');
 if(trace.time>=.010){
  ck(!r.available&&r.peakPercent===null&&r.reason==='peak-unresolved','long model-limited trace never divides by an unresolved peak');
  const omega=Math.sqrt(12000/mass),exactForce=12000*speed/omega*Math.sin(omega*.010);
  ck(close(r.forceAt10N,exactForce,.0001),'long model-limited trace retains its known force at 10 ms');
 }else unavailable(r,'window-not-covered','short model-limited first compression');
}

const config=M.DEFAULT_CONFIG,cases=[];
for(const target of [{mode:'rigid'},I.BAG,...I.PADDED_TARGETS])for(const id of Object.keys(M.CANONICAL))for(const preset of I.PRESETS){
 const r=I.calculate(M.recipe(id),config,preset.id,true,{target}),early=r.earlyLoading,name=target.mode+'/'+id+'/'+preset.id;
 ck(early&&early.sampleSeconds===.010,name+' traced result exposes fixed-time early loading');
 ck(early.available===r.loadingComplete,name+' capped rising-phase percentage requires a resolved peak');
 if(r.trace.time>=.010){
  const expectedForce=sample(r.trace.rows,.010,'F');
  ck(close(early.forceAt10N,expectedForce),name+' samples force at the interpolated 10 ms instant');
  ck(close(early.forceAt10N,r.mass*(sample(r.trace.rows,.010,'a')+r.gravity)),name+' sampled force agrees with striker acceleration and gravity');
  if(r.loadingComplete){
   ck(close(early.peakPercent,100*expectedForce/r.F),name+' percentage uses the resolved total contact-force peak');
   ck(early.peakPercent>=0&&early.peakPercent<=100,name+' monotonic loading gives a percentage between zero and 100');
  }else unavailable(early,'peak-unresolved',name,early.forceAt10N);
 }else if(r.loadingComplete){
  ck(early.peakBefore10&&early.peakPercent===100,name+' resolved peak before 10 ms uses the capped rising phase');
  ck(early.forceAt10N===null&&early.sampleForceN===r.F&&early.sampleTimeSeconds===r.trace.time,name+' reports the early sample without fabricating unloading');
 }else unavailable(early,'window-not-covered',name);
 ck(early.definition==='100 * F(min(0.010, t_peak)) / F_peak',name+' result records the capped metric definition');
 ck(!('earlyImpact' in r),name+' no longer attaches the superseded impulse metric');
 cases.push({target:target.mode,recipe:id,impact:preset.id,loadingComplete:r.loadingComplete,timeMs:r.trace.time*1000,...early});
}
for(const target of [{mode:'rigid'},I.BAG,...I.PADDED_TARGETS])for(const stack of [M.recipe('canonicalMedium'),[]]){
 const name=target.mode+'/'+(stack.length?'foam':'synthetic reference');
 const traced=I.calculate(stack,config,'gentle',true,{target});
 ck(traced.earlyLoading&&traced.earlyLoading.available===traced.loadingComplete,name+' traced branch attaches the new metric with the correct availability');
 const direct=stack.length?null:I.unpadded(config,'gentle',true,{target});
 if(direct)ck(JSON.stringify(direct.earlyLoading)===JSON.stringify(traced.earlyLoading),name+' direct reference API preserves early loading');
 const noTrace=I.calculate(stack,config,'gentle',false,{target}),quick=I.quick(stack,config,'gentle',{target});
 ck(!('earlyLoading' in noTrace)&&!('trace' in noTrace),name+' calculation without a trace does not invent early loading');
 ck(!('earlyLoading' in quick)&&!('trace' in quick),name+' quick calculation does not invent early loading');
}
ck(!('earlyImpact' in I),'engine no longer exports the superseded impulse metric');
// Compare fixed-time energy with an independent analytic spring solution.
for(const gravity of [0,M.G]){
 const mass=2.5,speed=2,energy=.5*mass*speed**2,stiffness=12000,omega=Math.sqrt(stiffness/mass);
 for(const maxDelta of [1,.0075,.022]){
  const comp=springContact(stiffness,maxDelta),peak=I.solve(comp,energy,mass,gravity);
  const trace=I.trajectory(comp,peak,energy,240,mass,gravity);
  const metric=I.energyAt10ms({trace,E:energy,target:{mode:'rigid'},loadingComplete:!peak.limited});
  if(trace.time>=.010){
   const velocity=speed*Math.cos(omega*.010)+gravity/omega*Math.sin(omega*.010);
   ck(metric.available&&close(metric.energyJ,.5*mass*velocity**2,.0001),'10 ms energy matches analytic spring, gravity='+gravity+', domain='+maxDelta);
   ck(close(metric.percent,100*metric.energyJ/energy),'energy percentage uses initial impact energy');
  }else ck(!metric.available&&metric.reason==='window-not-covered','short limited trace leaves 10 ms energy unknown');
 }
}
{
 const metric=(rows,loadingComplete=true)=>I.energyAt10ms({trace:{rows},E:10,target:{mode:'rigid'},loadingComplete});
 ck(metric([{t:0,kinetic:10},{t:.005,kinetic:0}]).reason==='peak-before-10ms','early peak does not invent post-peak energy');
 for(const time of [.010,.010-Number.EPSILON*.010]){
  const result=metric([{t:0,kinetic:10},{t:time,kinetic:0}]);
  ck(result.available&&result.percent===0,'peak exactly at 10 ms allows zero including endpoint roundoff');
 }
 ck(close(metric([{t:0,kinetic:10},{t:.006,kinetic:8},{t:.014,kinetic:2}]).percent,50),'nonuniform trace interpolates energy at exactly 10 ms');
 ck(metric([{t:0,kinetic:10},{t:.010,kinetic:11}]).percent===110,'gravity-driven energy above initial value is not clipped');
 for(const rows of [[],[{t:0,kinetic:10},{t:.010,kinetic:NaN}],[{t:0,kinetic:10},{t:0,kinetic:5}]]){
  ck(metric(rows).reason==='invalid-trace','invalid energy samples remain unavailable');
 }
}
for(const target of [{mode:'rigid'},I.BAG,...I.PADDED_TARGETS])for(const stack of [M.recipe('canonicalMedium'),[]]){
 const r=I.calculate(stack,config,'gentle',true,{target}),metric=r.energyAt10ms;
 ck(!!metric,'every traced calculation branch exposes 10 ms energy');
 if(r.trace.time>=.010){
  const bag=target.mode==='bag',key=bag?'relativeK':'kinetic',initial=bag?r.relativeEnergy:r.E;
  ck(metric.available&&close(metric.energyJ,sample(r.trace.rows,.010,key)),'target energy uses the appropriate trace energy');
  ck(close(metric.percent,100*metric.energyJ/initial),'target energy uses the appropriate initial energy');
  if(bag)ck(metric.energyJ<sample(r.trace.rows,.010,'kinetic'),'bag metric excludes shared forward kinetic energy');
 }else ck(!metric.available&&metric.energyJ===null,'short first compression leaves energy unavailable');
 ck(!('energyAt10ms' in I.calculate(stack,config,'gentle',false,{target})),'untraced calculation does not invent energy at 10 ms');
}
console.log('PASS',checks.length,'early-loading numerical checks');
console.log(JSON.stringify({defaultBag:cases.find(row=>row.target==='bag'&&row.recipe==='canonicalMedium'&&row.impact==='gentle'),
 availableCases:cases.filter(row=>row.available).length,totalCases:cases.length},null,2));
