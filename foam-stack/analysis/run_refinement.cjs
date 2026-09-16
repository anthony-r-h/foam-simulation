'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert'),S=require('../source/sweep.js');
const plan=JSON.parse(fs.readFileSync(path.join(__dirname,'adult-parameter-study-plan.json'),'utf8'));
const summary=JSON.parse(fs.readFileSync(path.join(__dirname,'adult-parameter-study-summary.json'),'utf8'));
const finePlan={...plan,numerics:{...plan.numerics,nr:48,nt:40,steps:480}};
const checks=[],records=[],cache=new Map();
function ck(ok,name){assert(ok,name);checks.push(name);}
function close(a,b,relative=1e-8,absolute=1e-10){return Math.abs(a-b)<=absolute+relative*Math.abs(b);}
const outcomes={peakForceN:'peak_force_N',earlyLoadingPercent:'early_loading_percent_of_peak',timeToPeakMs:'time_to_peak_ms',
 foamThicknessLeftMm:'foam_thickness_left_mm',fistSpeedAtPeakMPerS:'fist_speed_at_peak_m_per_s',loadingImpulseNs:'loading_impulse_Ns',foamWeightG:'foam_sample_weight_g'};
function selectOutcomes(row){return Object.fromEntries(Object.entries(outcomes).map(([name,key])=>[name,row[key]]));}
function evaluate(designId,scenarioId,targetId){
 const key=[designId,scenarioId,targetId].join('/');if(cache.has(key))return cache.get(key);
 const d=plan.designs.findIndex(x=>x.id===designId),s=plan.scenarios.findIndex(x=>x.id===scenarioId),t=plan.targets.findIndex(x=>x.id===targetId);
 ck(d>=0&&s>=0&&t>=0,key+' belongs to the stored full-study plan');
 const index=(d*plan.scenarios.length+s)*plan.targets.length+t;
 const coarseRow=S.calculateCase(plan,index),fineRow=S.calculateCase(finePlan,index);
 ck(coarseRow.status==='resolved'&&fineRow.status==='resolved',key+' resolves on both numerical grids');
 const coarse=selectOutcomes(coarseRow),fine=selectOutcomes(fineRow);
 ck(Object.values(coarse).every(Number.isFinite)&&Object.values(fine).every(Number.isFinite),key+' has seven finite outcomes on both grids');
 const absoluteChanges={},relativeChangesPct={};
 for(const name of Object.keys(outcomes)){
  absoluteChanges[name]=fine[name]-coarse[name];
  relativeChangesPct[name]=coarse[name]===0?(fine[name]===0?0:null):100*(fine[name]/coarse[name]-1);
 }
 ck(close(coarse.foamWeightG,fine.foamWeightG)&&close(coarse.loadingImpulseNs,fine.loadingImpulseNs)&&close(coarse.fistSpeedAtPeakMPerS,fine.fistSpeedAtPeakMPerS),key+' grid refinement preserves mass and endpoint momentum quantities');
 const record={designId,scenarioId,targetId,testNumber:index+1,coarse,fine,absoluteChanges,relativeChangesPct,
  coarseEarlySampleTimeMs:coarseRow.early_sample_time_ms,fineEarlySampleTimeMs:fineRow.early_sample_time_ms,
  coarsePeakBefore10:coarseRow.peak_before_10ms,finePeakBefore10:fineRow.peak_before_10ms};
 records.push(record);cache.set(key,record);return record;
}
const nominalScenario='stress-1-tail-2',nominalDesigns=['qualux-h70','soft-h70','soft-qualux-25-h70'];
const nominal=nominalDesigns.flatMap(designId=>plan.targets.map(target=>evaluate(designId,nominalScenario,target.id)));
const oldKeys={peakForceN:'baselinePeakN',earlyLoadingPercent:'baselineEarlyPercent',timeToPeakMs:'baselineTimeMs',foamThicknessLeftMm:'baselineFoamLeftMm',fistSpeedAtPeakMPerS:'baselineFistSpeed',loadingImpulseNs:'baselineImpulseNs'};
for(const record of nominal){
 const design=summary.designs.find(d=>d.id===record.designId),old=design.targets.find(t=>t.id===record.targetId);
 ck(Object.entries(oldKeys).every(([key,oldKey])=>close(record.coarse[key],old[oldKey]))&&close(record.coarse.foamWeightG,design.foamWeightG),record.designId+'/'+record.targetId+' original seven outcomes match the stored study');
}
const winnerOrdering=plan.targets.map(target=>{
 const chosen=nominal.filter(r=>r.targetId===target.id),expected=target.id==='eva25'?'qualux-h70':'soft-h70';
 const coarse=[...chosen].sort((a,b)=>a.coarse.peakForceN-b.coarse.peakForceN),fine=[...chosen].sort((a,b)=>a.fine.peakForceN-b.fine.peakForceN);
 ck(coarse[0].designId===expected&&fine[0].designId===expected,target.id+' nominal winner remains lowest after refinement');
 const marginN=fine[1].fine.peakForceN-fine[0].fine.peakForceN;
 const maximumChangeN=Math.max(...chosen.map(r=>Math.abs(r.absoluteChanges.peakForceN)));
 ck(marginN>10*maximumChangeN,target.id+' selected nominal winner margin exceeds ten times the observed grid change');
 return {targetId:target.id,coarseOrder:coarse.map(r=>r.designId),fineOrder:fine.map(r=>r.designId),winner:expected,
  nearestSelectedCompetitorMarginN:marginN,maximumSelectedPeakChangeN:maximumChangeN};
});
const dominator='soft-qualux-75-h70',dominated='hd36-qualux-75-h70';
const dominanceCases=[];
for(const scenario of plan.scenarios)for(const target of plan.targets){
 const a=evaluate(dominator,scenario.id,target.id),b=evaluate(dominated,scenario.id,target.id);
 const fineMarginN=b.fine.peakForceN-a.fine.peakForceN,fineReductionPct=100*(1-a.fine.peakForceN/b.fine.peakForceN);
 const coarseReductionPct=100*(1-a.coarse.peakForceN/b.coarse.peakForceN);
 ck(fineMarginN>1e-8*Math.max(1,b.fine.peakForceN),scenario.id+'/'+target.id+' strict force dominance survives refinement');
 ck(a.fine.foamWeightG<b.fine.foamWeightG,scenario.id+'/'+target.id+' dominating composition also has less specimen mass');
 dominanceCases.push({scenarioId:scenario.id,targetId:target.id,coarseReductionPct,fineReductionPct,fineMarginN});
}
const aDesign=plan.designs.find(d=>d.id===dominator),bDesign=plan.designs.find(d=>d.id===dominated);
ck(aDesign.thicknessMm===bDesign.thicknessMm,'dominance comparison holds total thickness at 70 mm');
const maxima=Object.fromEntries(Object.keys(outcomes).map(name=>[name,Math.max(...records.map(r=>Math.abs(r.relativeChangesPct[name]??0)))]));
const result={status:'passed',generatedAt:new Date().toISOString(),sourceStudy:'adult-parameter-study-plan.json',
 scope:'Nine nominal cases for three selected 70 mm designs, plus 54 cases for one pair across all 27 matched target/scenario conditions. This checks selected rankings, not the full frontier.',
 coarseNumerics:plan.numerics,fineNumerics:finePlan.numerics,caseCount:records.length,solverEvaluations:2*records.length,
 metrics:Object.keys(outcomes),relativeChangeDefinition:'100 * (fine / coarse - 1); zero when both values are zero, null if only the coarse value is zero',
 maximumAbsoluteRelativeChangePct:maxima,winnerOrdering,
 dominance:{dominator,dominated,thicknessMm:aDesign.thicknessMm,dominatorWeightG:aDesign.foamWeightG,dominatedWeightG:bDesign.foamWeightG,
  massReductionPct:100*(1-aDesign.foamWeightG/bDesign.foamWeightG),dominancePreserved:dominanceCases.every(c=>c.fineMarginN>0),
  minimumFineForceReductionPct:Math.min(...dominanceCases.map(c=>c.fineReductionPct)),minimumFineForceMarginN:Math.min(...dominanceCases.map(c=>c.fineMarginN)),
  matchedCases:dominanceCases},
 furtherRefinement:'Not required for these selected comparisons: all nominal winner margins exceed ten times the observed 24-to-48 radial grid change, and the dominance example retains a substantial force margin. This does not validate near-ties elsewhere in the grid.',
 records,checkCount:checks.length,checks};
fs.writeFileSync(path.join(__dirname,'refinement-checks.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,caseCount:result.caseCount,checkCount:checks.length,maximumAbsoluteRelativeChangePct:maxima,
 winnerOrdering,dominance:{...result.dominance,matchedCases:undefined}},null,2));
