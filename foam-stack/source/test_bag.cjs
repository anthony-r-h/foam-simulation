'use strict';
const assert=require('assert'),fs=require('fs'),M=require('./engine.js'),I=require('./impact_engine.js');
const checks=[],physicsBenchmarks=[],cases=[];
function ck(ok,name){assert(ok,name);checks.push(name);}
function close(actual,expected,relative=1e-8,absolute=1e-10){
 return Number.isFinite(actual)&&Math.abs(actual-expected)<=absolute+relative*Math.abs(expected);
}
function springContact(stiffness,maxDelta=2){
 return {maxDelta,state(delta){
  if(delta<0||delta>maxDelta)throw Error('Synthetic spring range exceeded.');
  const W=stiffness*delta*delta/2;
  return {delta,F:stiffness*delta,stiffness,W,area:1,es:[],ws:[],fw:W,tw:0,xg:delta,xt:0,X:delta};
 }};
}

// Two independent linear springs have an exact series solution. The mechanical
// benchmark does not depend on the foam law, curved contact or supplier inputs.
for(const mass of [.5,2.5,10])for(const targetMass of [5,41])for(const targetStiffness of [20000,80000]){
 const stiffness=12000,speed=2,mu=mass*targetMass/(mass+targetMass);
 const equivalent=stiffness*targetStiffness/(stiffness+targetStiffness),omega=Math.sqrt(equivalent/mu);
 const energy=.5*mu*speed*speed,expectedForce=speed*Math.sqrt(mu*equivalent);
 const target={...I.BAG,mass:targetMass,stiffness:targetStiffness,radius:2};
 const comp=I.compileBagContact(springContact(stiffness),target);
 const peak=I.solve(comp,energy,mu,0),trace=I.trajectory(comp,peak,energy,240,mu,0);
 const name=`series springs m=${mass}, M=${targetMass}, kb=${targetStiffness}`;
 ck(!peak.limited,name+' completes first compression');
 ck(close(peak.F,expectedForce),name+' force matches closed form');
 ck(close(peak.delta,speed/omega)&&close(peak.X,peak.delta),name+' total closure matches closed form');
 ck(close(peak.foamDelta,expectedForce/stiffness)&&close(peak.xt,expectedForce/targetStiffness),name+' separates foam and bag indentation');
 ck(close(peak.fw,expectedForce**2/(2*stiffness))&&close(peak.tw,expectedForce**2/(2*targetStiffness)),name+' separates spring work');
 ck(close(peak.W,energy)&&close(peak.fw+peak.tw,peak.W),name+' work equals available relative energy');
 ck(close(trace.time,Math.PI/(2*omega),1e-7),name+' first-compression time matches closed form');
 ck(close(trace.impulse,mu*speed)&&trace.impulseError<2e-5,name+' impulse matches reduced momentum and independent force integration');
 ck(trace.rows.every(row=>close(row.delta,speed/omega*Math.sin(omega*row.t),1e-7)&&close(row.v,speed*Math.cos(omega*row.t),1e-6,1e-7)),name+' full relative displacement and speed history match closed form');
 ck(trace.rows.every(row=>close(row.xt,row.F/targetStiffness)&&close(row.xg,row.F/stiffness)&&close(row.fw,row.F**2/(2*stiffness))&&close(row.tw,row.F**2/(2*targetStiffness))&&close(row.fw+row.tw,row.W)),name+' direct series trajectory preserves bag indentation and separate spring work throughout loading');
 const sample=comp.state(peak.delta*.63,true),h=peak.delta*1e-5;
 const workDerivative=(comp.state(sample.delta+h).W-comp.state(sample.delta-h).W)/(2*h);
 ck(close(workDerivative,sample.F,1e-7),name+' force is the derivative of total loading work');
 ck(close(sample.stiffness,equivalent),name+' tangent stiffness matches the exact series stiffness');
 physicsBenchmarks.push({kind:'analyticSeriesSprings',mass,targetMass,targetStiffness,
  forceRelativeError:Math.abs(peak.F/expectedForce-1),timeRelativeError:Math.abs(trace.time/(Math.PI/(2*omega))-1),
  impulseRelativeError:Math.abs(trace.impulse/(mu*speed)-1)});
}
{
 const spring=springContact(12000),withoutTangent={maxDelta:spring.maxDelta,state(delta){const z=spring.state(delta);delete z.stiffness;return z;}};
 const withTangent=I.solve(I.compileBagContact(spring,I.BAG),10,2,0);
 const fallback=I.solve(I.compileBagContact(withoutTangent,I.BAG),10,2,0);
 ck(close(fallback.F,withTangent.F)&&close(fallback.delta,withTangent.delta),'bracketed series inversion remains accurate when the contact has no analytic tangent');
}

// Both restrictions stop the model with unused relative kinetic energy. A bag
// indentation guard is a model domain, not a prediction of physical bottoming.
for(const [name,foamStiffness,foamLimit,target,expectedReason] of [
 ['foam range',12000,.003,{...I.BAG,radius:2},/foam|material/i],
 ['bag range',1e6,2,{...I.BAG,stiffness:1000,radius:.1},/bag/i],
]){
 const comp=I.compileBagContact(springContact(foamStiffness,foamLimit),target);
 const peak=I.solve(comp,100,2,0),trace=I.trajectory(comp,peak,100,240,2,0);
 ck(peak.limited&&100-peak.W>0&&trace.rows.at(-1).v>0,name+' preserves unresolved relative energy and speed');
 ck(peak.foamDelta<=foamLimit&&peak.xt<=target.radius/2,name+' respects both deformation bounds');
 ck(expectedReason.test(peak.limitReason),name+' identifies the domain that ends the curve');
 ck(close(peak.delta,comp.maxDelta,1e-7),name+' stops at the combined curve endpoint');
}

// Limiting cases distinguish target compliance from target inertia.
{
 const mass=2.5,speed=2,stiffness=12000,target={...I.BAG,mass:1e9,stiffness:1e9,radius:2};
 const mu=mass*target.mass/(mass+target.mass),energy=.5*mu*speed*speed;
 const series=I.compileBagContact(springContact(stiffness),target),peak=I.solve(series,energy,mu,0);
 const rigid=I.solve(springContact(stiffness),.5*mass*speed*speed,mass,0);
 ck(close(peak.F,rigid.F,1e-5)&&close(peak.foamDelta,rigid.delta,1e-5),'large target mass and stiffness approach the horizontal rigid spring result');
 const masses=[1,10,1000],forces=masses.map(targetMass=>{
  const effective=mass*targetMass/(mass+targetMass);
  return I.solve(I.compileBagContact(springContact(stiffness),{...I.BAG,mass:targetMass,radius:2}),.5*effective*speed**2,effective,0).F;
 });
 ck(forces[0]<forces[1]&&forces[1]<forces[2],'larger free target mass increases peak force for the same incident striker');
 const stiffnesses=[20000,40000,80000].map(k=>I.solve(I.compileBagContact(springContact(stiffness),{...I.BAG,stiffness:k,radius:2}),energy,mu,0).F);
 ck(stiffnesses[0]<stiffnesses[1]&&stiffnesses[1]<stiffnesses[2],'stiffer local target increases force in the independent spring benchmark');
}

const config={...M.DEFAULT_CONFIG},target=Object.freeze({...I.BAG});
const stack=Object.freeze(M.recipe('canonicalMedium').map(layer=>Object.freeze(layer)));
const frozenConfig=Object.freeze({...config}),initial=JSON.stringify({stack,config:frozenConfig,target});
for(const impact of [{mass:2.5,speed:2,gravity:0},'gentle','adult']){
 const r=I.calculate(stack,frozenConfig,impact,true,{target}),rows=r.trace.rows,last=rows.at(-1);
 const name=typeof impact==='string'?impact:'low-energy custom';
 const mu=r.mass*target.mass/(r.mass+target.mass),momentum=r.mass*r.speed;
 const comVelocity=momentum/(r.mass+target.mass),comEnergy=momentum**2/(2*(r.mass+target.mass));
 ck(r.target.mode==='bag'&&r.gravity===0&&r.gravityWork===0,name+' uses a horizontal freely moving target');
 ck(close(r.relativeEnergy,.5*mu*r.speed**2),name+' uses reduced mass for available compression energy');
 ck(r.hasStopped===false&&r.loadingComplete===!r.limited,name+' distinguishes completed compression from a globally stopped striker');
 ck(r.limit===null&&r.pass===null,name+' has no rigid reference pass/fail verdict');
 ck(close(r.X,r.delta+r.xt+(r.xh??0))&&r.delta>0&&r.xt>0,name+' records foam compression, local bag deformation and hand give');
 ck(r.bagDisplacement>0&&r.bagSpeed>0&&r.strikerSpeed>0,name+' records target translation and positive world velocities');
 ck(close(r.W,r.fw+r.tw+(r.hw??0))&&r.fw>0&&r.tw>0,name+' total loading work includes foam, bag and hand contributions');
 ck(close(r.W+r.endK,r.E)&&close(r.endK,last.kinetic),name+' endpoint world energy balances');
 ck(rows.every(row=>close(row.kinetic,row.strikerK+row.bagK)&&close(row.kinetic+row.fw+row.tw+(row.hw??0),r.E)),name+' total energy balances throughout contact');
 ck(rows.every(row=>close(r.mass*row.v+target.mass*row.bagV,momentum)),name+' linear momentum balances throughout contact');
 ck(rows.every(row=>close(row.v-row.bagV,row.relativeV)),name+' world velocities reconstruct relative motion');
 ck(rows.every(row=>close(row.strikerX-row.bagX,row.X)),name+' world travel reconstructs total closure');
 ck(rows.every(row=>close(r.mass*row.strikerX+target.mass*row.bagX,momentum*row.t)),name+' centre-of-mass travel stays uniform');
 ck(rows.every(row=>close(row.J,r.mass*(r.speed-row.v))&&close(row.J,target.mass*row.bagV)),name+' impulse agrees with both bodies momentum changes');
 ck(rows.every(row=>close(row.ws.reduce((sum,work)=>sum+work,0),row.fw)),name+' layer work sums to foam work, excluding bag work');
 ck(rows.every(row=>close(row.tw,target.stiffness*row.xt**2/2)&&close(row.F,target.stiffness*row.xt)),name+' target loading law agrees with force and work');
 ck(rows.every((row,index)=>!index||(row.X>=rows[index-1].X-1e-12&&row.xt>=rows[index-1].xt-1e-12&&row.delta>=rows[index-1].delta-1e-12)),name+' contact follows a monotonic first-compression branch');
 ck(r.trace.impulseError<.002,name+' independent force-time impulse agrees within 0.2%');
 ck(close(r.bagSpeed,last.bagV)&&close(r.strikerSpeed,last.v)&&close(r.bagDisplacement,last.bagX),name+' endpoint and trace world results agree');
 if(r.loadingComplete){
  ck(close(last.relativeV,0)&&close(last.v,comVelocity)&&close(last.bagV,comVelocity),name+' completed compression leaves both bodies travelling together');
  ck(close(r.endK,comEnergy)&&close(r.W,r.relativeEnergy),name+' completed compression retains centre-of-mass kinetic energy');
  ck(!r.peakIsLowerBound,name+' resolved compression identifies a resolved force peak');
 }else{
  ck(last.relativeV>0&&r.endK>comEnergy&&r.peakIsLowerBound,name+' incomplete compression retains relative energy and an unresolved peak');
 }
}
ck(JSON.stringify({stack,config:frozenConfig,target})===initial,'bag calculation preserves frozen layer, config and target inputs');

{
 const light=I.calculate(stack,config,{mass:1,speed:Math.sqrt(20),gravity:0},false,{target});
 const heavy=I.calculate(stack,config,{mass:4,speed:Math.sqrt(5),gravity:0},false,{target});
 ck(close(light.E,heavy.E)&&light.relativeEnergy>heavy.relativeEnergy,'equal incoming energy with different masses has different available relative energy');
 ck(light.F>heavy.F&&light.delta>heavy.delta,'equal incoming energy alone does not fix the moving-bag outcome');
 const unpadded=I.calculate([],config,'gentle',true,{target});
 ck(unpadded.unpadded&&unpadded.target.mode==='bag'&&unpadded.xt>0&&unpadded.bagDisplacement>0,'unpadded comparison also deforms and moves the same target');
 ck(close(unpadded.W+unpadded.endK,unpadded.E)&&unpadded.trace.impulseError<.002,'unpadded bag comparison conserves energy and impulse');
 const direct=I.unpadded(config,'gentle',true,{target});
 ck(['F','W','delta','xt','endK','bagSpeed','bagDisplacement'].every(key=>direct[key]===unpadded[key])&&direct.trace.time===unpadded.trace.time,'direct unpadded API agrees with the empty-stack bag calculation');
 for(const layers of [stack,[]]){
  const full=I.calculate(layers,config,'gentle',false,{target}),quick=I.quick(layers,config,'gentle',{target});
  ck(['F','W','delta','xt','endK','bagSpeed','loadingComplete','hasStopped'].every(key=>quick[key]===full[key]),(layers.length?'padded':'unpadded')+' quick API agrees with the full bag result');
 }
 const guarded=I.calculate(stack,config,{mass:20,speed:30,gravity:0},true,{target});
 ck(guarded.limited&&!guarded.loadingComplete&&!guarded.hasStopped&&guarded.peakIsLowerBound,'high-energy bag scenario reports an incomplete first compression');
 ck(guarded.xt<=target.radius/2&&guarded.trace.rows.at(-1).relativeV>0,'high-energy bag scenario respects the domain guard and retains relative motion');
 const fine=I.calculate(stack,config,'gentle',true,{target,nr:48,nt:40,steps:480});
 const normal=I.calculate(stack,config,'gentle',true,{target});
 ck(close(normal.F,fine.F,.001)&&close(normal.trace.time,fine.trace.time,.001),'bag force and compression time converge under contact and time refinement');
}

for(const id of Object.keys(M.CANONICAL)){
 const layers=M.recipe(id),rigid=I.compile(layers,config),bag=I.compile(layers,config,{target});
 const wider=I.compile(layers,config,{target:{...target,radius:.3}});
 ck(rigid.geo.supportRadius===I.RIG.supportRadius&&bag.geo.supportRadius===target.radius&&wider.geo.supportRadius===.3,id+' contact geometry uses the selected target radius');
 ck(rigid!==bag&&bag!==wider&&I.compile(layers,config)===rigid,id+' target curvature has an isolated cache and leaves the rigid curve unchanged');
 ck(I.compile(layers,config,{target:{...target,mass:20,stiffness:80000}})===bag,id+' contact curve cache depends on curvature independently of translation and spring constants');
 ck(rigid.state(.01).F!==bag.state(.01).F&&bag.state(.01).F!==wider.state(.01).F,id+' target curvature changes the integrated foam force');
 for(const [name,comp] of [['rigid',rigid],['bag',bag]])for(const delta of [.0053,.0157,.0251]){
  const h=1e-10,state=comp.state(delta);
  const derivative=(comp.state(delta+h).F-comp.state(delta-h).F)/(2*h);
  const workDerivative=(comp.state(delta+h).W-comp.state(delta-h).W)/(2*h);
  ck(close(state.stiffness,derivative,1e-5),id+'/'+name+'/'+delta+' analytic contact tangent agrees with an independent force difference');
  ck(close(state.F,workDerivative,1e-5),id+'/'+name+'/'+delta+' contact force agrees with the work derivative');
 }
 for(const impact of I.PRESETS){
  const r=I.calculate(layers,config,impact.id,true,{target}),rows=r.trace.rows,last=rows.at(-1),momentum=r.mass*r.speed;
  const energyError=Math.max(...rows.map(row=>Math.abs(row.kinetic+row.fw+row.tw+(row.hw??0)-r.E)));
  const momentumError=Math.max(...rows.map(row=>Math.abs(r.mass*row.v+target.mass*row.bagV-momentum)));
  const name=id+'/'+impact.id;
  ck(Number.isFinite(r.F)&&r.F>0&&r.delta>0&&r.xt>0,name+' moving-bag force and both deformations are finite and positive');
  ck(energyError<1e-7&&momentumError<1e-10,name+' complete history conserves world energy and momentum');
  ck(r.trace.impulseError<.002,name+' independent contact impulse agrees within 0.2%');
  ck(r.hasStopped===false&&r.loadingComplete===!r.limited&&r.pass===null&&r.limit===null,name+' first-compression result cannot claim a stationary striker or SATRA verdict');
  ck(r.delta<=r.comp.maxDelta&&r.xt<=target.radius/2,name+' foam and local bag motion remain within the model domain');
  ck(close(last.v-last.bagV,last.relativeV)&&last.v>0&&last.bagV>0,name+' endpoint motion agrees in relative and world coordinates');
  if(r.loadingComplete)ck(close(last.relativeV,0)&&close(r.W,r.relativeEnergy),name+' completed loading spends only relative kinetic energy');
  else ck(last.relativeV>0&&r.peakIsLowerBound,name+' incomplete loading retains relative motion and unresolved peak status');
  cases.push({recipe:id,impact:impact.id,forceN:r.loadingComplete?r.F:null,forceReachedN:r.F,
   loadingComplete:r.loadingComplete,hasStopped:r.hasStopped,foamCompressionMm:r.delta*1000,bagIndentationMm:r.xt*1000,
   bagTravelMm:r.bagDisplacement*1000,bagSpeed:r.bagSpeed,strikerSpeed:r.strikerSpeed,timeMs:r.trace.time*1000,
   incidentEnergyJ:r.E,relativeEnergyJ:r.relativeEnergy,foamWorkJ:r.fw,bagWorkJ:r.tw,handWorkJ:r.hw??0,handGiveMm:(r.xh??0)*1000,remainingKineticEnergyJ:r.endK,
   maximumEnergyErrorJ:energyError,maximumMomentumErrorNs:momentumError,impulseRelativeError:r.trace.impulseError});
 }
}
{
 const rigid=I.compileReference(),bag=I.compileReference({target}),wider=I.compileReference({target:{...target,radius:.3}});
 ck(rigid!==bag&&bag!==wider&&I.compileReference()===rigid,'synthetic reference curvature has an isolated cache and preserves the rigid reference');
 ck(bag.geo.supportRadius===target.radius&&wider.geo.supportRadius===.3,'synthetic reference follows the selected bag curvature');
 const delta=.00031,h=1e-10,state=bag.state(delta),derivative=(bag.state(delta+h).F-bag.state(delta-h).F)/(2*h);
 ck(close(state.stiffness,derivative,1e-5),'synthetic reference tangent agrees with an independent force difference');
}

// Default, explicit rigid target and automatic SATRA results retain the old rig.
for(const impact of ['test3','test10','gentle']){
 const before=I.calculate(stack,config,impact,true),explicit=I.calculate(stack,config,impact,true,{target:{mode:'rigid'}});
 ck(['F','W','delta','E','endK','gravityWork','hasStopped'].every(key=>before[key]===explicit[key]),impact+' explicit rigid target preserves default mechanical results exactly');
 ck(before.trace.time===explicit.trace.time&&before.trace.impulse===explicit.trace.impulse,impact+' explicit rigid target preserves default time and impulse exactly');
 ck(before.loadingComplete===before.hasStopped,impact+' rigid loading completion remains the stopping condition');
}
ck(JSON.stringify(I.referenceChecks(stack,config))===JSON.stringify(I.referenceChecks(stack,{...config,target,targetMode:'bag'})),'automatic SATRA checks ignore selected target settings');
ck(I.targetSpec().mode==='rigid','omitted target keeps the rigid default');
ck(I.targetSpec({...target}).mode==='bag','validated bag target preserves the selected mode');
for(const invalid of [
 {mode:'unsupported'},
 ...['mass','stiffness'].flatMap(key=>[0,-1,NaN,Infinity].map(value=>({...target,[key]:value}))),
 ...[0,-1,I.RIG.faceRadius,NaN,Infinity].map(radius=>({...target,radius})),
]){
 assert.throws(()=>I.targetSpec(invalid));
 ck(true,'invalid target rejected: '+JSON.stringify(invalid));
}
if(!process.argv.includes('--no-write'))fs.writeFileSync(__dirname+'/bag_checks_v12.json',JSON.stringify({status:'passed',count:checks.length,target:I.BAG,checks,physicsBenchmarks,cases},null,2));
console.log('PASS',checks.length,'moving-bag numerical checks');
