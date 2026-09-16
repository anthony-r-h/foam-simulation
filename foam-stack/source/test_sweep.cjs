'use strict';
const assert=require('assert'),M=require('./engine.js'),I=require('./impact_engine.js'),S=require('./sweep.js');
let checks=0;
function ck(value,label){assert(value,label);checks++;}
function close(a,b){return Math.abs(a-b)<1e-9*Math.max(1,Math.abs(b));}
const plan=S.createPlan();
ck(S.isCurrentStudy(plan)&&plan.handSpring.stiffness===1e6,'study metadata records the current 1 kN/mm Hand Spring model');
ck(!S.isCurrentStudy({...plan,studyId:'adult-parameter-study-v1',handSpring:undefined}),'historical study baseline is not displayed as current Hand Spring results');
ck(!S.isCurrentStudy({...plan,handSpring:{stiffness:2e6}})&&!S.isCurrentStudy({...plan,handSpring:undefined}),'different or missing hand stiffness cannot be compared as the current study');
assert.throws(()=>S.calculateCase({...plan,studyId:'adult-parameter-study-v1'},0),/new study plan/);checks++;
ck(plan.designs.length===7910&&plan.scenarios.length===1&&plan.targets.length===1&&plan.caseCount===7910,'full inventory grid contains 7,910 tests on EVA50');
ck(new Set(plan.designs.map(d=>d.id)).size===7910,'every design ID is unique');
ck(plan.roleThicknessPatternCount===39&&plan.roleAssignmentCount===32760,'39 thickness patterns and 32,760 role assignments');
ck(plan.designs.every(d=>d.layers.length===4&&new Set(d.layers.map(l=>l.grade)).size===4),'exactly four distinct materials per stack');
ck(plan.thicknessesMm.join()==='50','only 50 mm stacks');
const assignmentKeys=new Set();
for(const design of plan.designs)for(const roles of design.roleAssignments){
 assert(roles.length===4&&new Set(roles.map(r=>r.materialId)).size===4);
 assert.deepStrictEqual(roles.map(r=>r.role),S.ROLE_IDS);
 assert(roles.slice(0,2).every(r=>Number.isInteger(r.thicknessMm)&&r.thicknessMm>=1&&r.thicknessMm<=5));
 assert(roles.slice(2).every(r=>r.thicknessMm>=5&&r.thicknessMm%5===0));
 assert(roles.reduce((sum,r)=>sum+r.thicknessMm,0)===50);
 assert(roles.every(r=>design.layers.some(l=>l.grade===r.materialId&&l.h===r.thicknessMm)));
 assignmentKeys.add(JSON.stringify(roles));
}
ck(assignmentKeys.size===32760,'every valid role assignment is preserved exactly once after deduplication');
ck(S.DISPLAY_ROLE_IDS.join()==='outer_contact,main_padding,support_backing,hand_comfort','study roles match the simulator layer order');
ck(plan.designs.every(d=>!d.label.includes(' -> ')&&!d.label.includes('secondary')),'names use normal role-labelled text');
const repeat=S.createPlan();
ck(JSON.stringify({...plan,createdAt:null})===JSON.stringify({...repeat,createdAt:null}),'independent enumeration gives identical IDs, numbers, role mappings and settings');
ck(S.COLUMNS.includes('layer_7_material_id')&&!S.MATERIAL_IDS.some(id=>id.startsWith('custom')),'export covers all inventory materials and excludes custom definitions');
ck(plan.designs.every(d=>close(d.layers.reduce((sum,l)=>sum+l.h,0),d.thicknessMm)),'every stack has its specified total thickness');
ck(plan.designs.every(d=>d.layers.every(l=>S.MATERIAL_IDS.includes(l.grade)&&l.h>=.5&&l.h<=100)),'all layer materials and thicknesses remain inside the declared grid');
ck(plan.designs.every(d=>close(d.foamWeightG,d.layers.reduce((sum,l)=>sum+l.rho*M.PCF*l.h*.0009,0))),'sample mass independently matches the 30 x 30 mm density-volume calculation');
ck(plan.impact.mass===2.597&&plan.impact.speed===7.7&&plan.impact.gravity===0,'all targets share the same horizontal adult strike');
ck(plan.targets.map(t=>t.id).join()==='eva50','only the requested 50 mm EVA75 target is included');
const ids=new Set();
for(let i=0;i<plan.caseCount;i++){const {design,scenario,target}=S.caseSpec(plan,i);ids.add(design.id+'__'+scenario.id+'__'+target.id);}
ck(ids.size===plan.caseCount,'case index covers every matched design scenario and target once');
ck(plan.designs.every(d=>d.layers.every(l=>l.a===M.MATERIALS[l.grade].a&&l.b===M.MATERIALS[l.grade].b&&l.rho===M.MATERIALS[l.grade].rho)),'retail density and commercial anchor ratios are not changed independently');
assert.throws(()=>S.caseSpec(plan,-1));assert.throws(()=>S.caseSpec(plan,plan.caseCount));checks+=2;
const baselineScenario=plan.scenarios.findIndex(s=>s.stressScale===1&&s.tailPower===2);
const indices=[0,1,Math.floor(plan.caseCount/2),plan.caseCount-1];
const snapshot=JSON.stringify(plan),rows=indices.map(i=>S.calculateCase(plan,i));
for(let i=0;i<rows.length;i++){
 const row=rows[i],{design,target}=S.caseSpec(plan,indices[i]);
 const direct=I.calculate(design.layers,{...M.DEFAULT_CONFIG,targetMode:'rigid',speedModel:'fast',rateScale:1,tailPower:2,targetScale:1,targetTailPower:2,ret:1,firmness:1},plan.impact,true,{...plan.numerics,target:target.target});
 ck(row.status!=='error','case calculates without an unreported error');
 ck(row.test_number===indices[i]+1&&row.run_started_utc===plan.createdAt,'CSV records a one-based test number and the run UTC timestamp');
 ck(close(row.force_reached_N,direct.F)&&row.loading_complete===direct.loadingComplete,'CSV force and completion match the shared solver');
 ck(row.impact_mass_kg===2.597&&row.impact_speed_m_per_s===7.7&&row.gravity_m_per_s2===0&&close(row.impact_energy_J,.5*2.597*7.7**2),'CSV preserves mass speed energy and direction across targets');
 ck(row.hand_spring_stiffness_N_per_m===1e6&&row.hand_compression_mm>0&&close(row.hand_compression_mm*.001*row.hand_spring_stiffness_N_per_m,row.force_reached_N),'CSV hand deformation and stiffness reproduce the shared transmitted force');
 ck(close(row.hand_spring_work_J,.5*row.hand_spring_stiffness_N_per_m*(row.hand_compression_mm*.001)**2),'CSV spring work matches the independently calculated elastic energy');
 ck(close(row.foam_loading_work_J+row.target_loading_work_J+row.hand_spring_work_J,direct.W),'CSV accounts separately for foam, target and hand work');
 ck(close(row.loading_impulse_Ns,direct.trace.impulse)&&close(row.foam_thickness_left_mm,direct.left)&&close(row.foam_sample_weight_g,direct.foamWeightG),'remaining thickness impulse and sample weight use actual calculated values');
 ck(direct.loadingComplete?row.peak_force_N===direct.F&&row.time_to_peak_ms===direct.trace.time*1000:row.peak_force_N===null&&row.time_to_peak_ms===null,'unresolved endpoints do not become peak outcomes');
 ck(row.early_loading_percent_of_peak===(direct.earlyLoading.available?direct.earlyLoading.peakPercent:null),'early-loading percentage follows the current rising-phase definition');
 ck(row.impact_energy_at_10ms_J===direct.energyAt10ms.energyJ&&row.energy_at_10ms_available===direct.energyAt10ms.available,'energy at exactly 10 ms agrees with individual simulation');
 ck(JSON.parse(row.role_assignments_json).length===design.roleAssignments.length&&row.study_name===S.STUDY_NAME,'CSV preserves role mappings and named protocol');
 ck(row.test_code===design.testCode&&row.test_name===S.testName(design),'CSV exports a stable test code and ordered human-readable name');
 ck([1,2,3,4].map(i=>row['layer_'+i+'_role']).join()===S.DISPLAY_ROLE_IDS.join(),'CSV layer columns follow outside-to-hand order');
 ck([1,2,3,4].map(i=>S.ROLE_LABELS[row['layer_'+i+'_role']]+': '+row['layer_'+i+'_thickness_mm']+' mm '+row['layer_'+i+'_name']).join('; ')===row.test_name,'CSV name and ordered layer fields agree');
 ck(row.layer_1_density_kg_per_m3===S.displayLayers(design)[0].rho*M.PCF&&row.layer_1_pressure_25_kPa===M.materialAnchors(S.displayLayers(design)[0])[0][1]/1000,'CSV includes full commercial calibration inputs');
}
ck(JSON.stringify(plan)===snapshot,'calculations never mutate the study plan');
const escaped=S.csvRow({...rows[0],design_label:'Text, with "quotes"\nand a line break'});
ck(escaped.includes('"Text, with ""quotes""\nand a line break"'),'CSV escapes quotes commas and line breaks');
ck(S.csvHeader().split(',').length===S.COLUMNS.length&&S.COLUMNS.includes('peak_before_10ms')&&S.COLUMNS.includes('early_sample_time_ms'),'CSV identifies every field including capped early sampling');

// Independent synthetic comparison: lower early percentage cannot compensate
// for worse force, and an unresolved force cannot dominate a resolved design.
const small={...plan,designs:plan.designs.slice(0,4),caseCount:4};
small.designs=small.designs.map((d,i)=>({...d,foamWeightG:[2,3,1,1][i],thicknessMm:40}));
const synthetic=[];
for(let i=0;i<small.designs.length;i++)for(const scenario of small.scenarios)for(const target of small.targets){
 const design=small.designs[i];synthetic.push({study_id:small.studyId,hand_spring_stiffness_N_per_m:small.handSpring.stiffness,test_id:design.id+'__'+scenario.id+'__'+target.id,design_id:design.id,scenario_id:scenario.id,target_id:target.id,status:i===3?'unresolved':'resolved',peak_force_N:i===3?null:[1000,1200,1100][i],glove_stress_multiplier:scenario.stressScale,glove_tail_power:scenario.tailPower,early_loading_percent_of_peak:[80,10,60,0][i],time_to_peak_ms:20,early_loading_available:i!==3,peak_before_10ms:false});
}
const summary=S.summarize(small,synthetic);
ck(S.isCurrentStudy(summary),'completed summaries retain the hand assumption needed for model compatibility');
ck(summary.complete&&summary.eligibleDesignCount===3&&summary.robustFrontierCount===2,'robust frontier includes force-mass tradeoffs and excludes unresolved designs');
ck(!summary.robustFrontier.includes(small.designs[1].id),'low early-loading percentage does not rescue a force-and-mass dominated design');
ck(summary.strongestDominance.dominatedId===small.designs[1].id&&summary.strongestDominance.minReductionPct>0&&summary.strongestDominance.massReductionPct>0,'dominance witness improves both peak and mass at the same thickness');
const noResults=S.summarize(small,[]);
ck(noResults.strongestDominance===null&&noResults.evaluatedCases===0,'empty studies do not invent findings');
ck(summary.targetSummaries[0].frontierIds.length===2,'target frontier uses force, mass and thickness');
const perturbed=synthetic.map(r=>({...r}));
perturbed.find(r=>r.design_id===small.designs[1].id).peak_force_N=900;
ck(S.summarize(small,perturbed).robustFrontierCount===3,'a single matched scenario reversal prevents a false robust dominance claim');
assert.throws(()=>S.summarize(small,[synthetic[0],synthetic[0]]));checks++;
assert.throws(()=>S.summarize(small,[{...synthetic[0],study_id:'adult-parameter-study-v1'}]),/does not belong/);checks++;
assert.throws(()=>S.summarize(small,[{...synthetic[0],hand_spring_stiffness_N_per_m:2e6}]),/does not belong/);checks++;
// Outcome-specific frontiers and independent outcome scoring.
function scoredDesign(id,weight,peak,time,energy=10,status='resolved'){
 return {id,testNumber:Number(id),testCode:'test-'+id,label:'Test '+id,foamWeightG:weight,thicknessMm:50,targets:[{id:'eva50',status,baselinePeakN:peak,baselineEarlyPercent:peak/100,baselineTimeMs:time,baselineFoamLeftMm:time,baselineEnergy10J:energy}]};
}
const candidates=[scoredDesign('1',1,1000,10,20),scoredDesign('2',2,900,20,10),scoredDesign('3',3,1100,30,30),scoredDesign('4',2,900,20,10)];
const scoreSummary={studyId:'test',createdAt:'fixed',designs:candidates};
const scores=S.scoreStudy(scoreSummary),scoreMap=new Map(scores.results.map(r=>[r.id,r]));
ck(scores.results.every(r=>r.status==='ranked'&&Object.keys(r.metrics).length===6),'all six outcomes are ranked independently');
ck(!('weights' in scores)&&scores.results.every(r=>!('totalScore' in r)&&!('totalRank' in r))&&!('score' in scores.frontiers),'no weighting, aggregate score, aggregate ranking or aggregate frontier is calculated');
ck(S.metricValue(candidates[0],'remaining')===20,'remaining thickness is divided by original thickness and expressed as percent');
ck(scoreMap.get('2').metrics.peak.rank===1&&scoreMap.get('2').metrics.weight.rank===2,'lower outcomes rank in the requested direction');
ck(scoreMap.get('3').metrics.time.rank===1&&scoreMap.get('3').metrics.remaining.rank===1,'higher time and percent remaining rank first');
ck(scoreMap.get('2').metrics.energy.rank===1,'lower energy at 10 ms ranks first');
ck(scoreMap.get('2').metrics.peak.score===scoreMap.get('4').metrics.peak.score,'exact ties receive equal scores and ranks');
ck(close(scoreMap.get('2').metrics.peak.score,100*2.5/3),'tied percentile uses average positions');
ck(scores.frontiers.peak.slice().sort().join()==='1,2,4','force versus weight frontier excludes the dominated heavier design and retains equal-coordinate ties');
ck(scores.frontiers.time.slice().sort().join()==='1,2,3,4','time versus weight frontier changes to include the longest-time design');
ck(S.pairFrontier(candidates,'time','weight').slice().sort().join()===scores.frontiers.time.slice().sort().join(),'swapping axes preserves the corresponding frontier');
const reversed=S.scoreStudy(scoreSummary,{time:'lower'});
ck(reversed.results[0].metrics.time.rank===1&&reversed.frontiers.time.join()==='1','reversing an outcome direction reverses ranking and frontier consistently');
const missing=scoredDesign('5',.1,100,100,null),failed=scoredDesign('6',.01,1,200,0,'error');
const mixed=S.scoreStudy({...scoreSummary,designs:[...candidates,missing,failed]});
ck(!mixed.results[4].metrics.energy&&mixed.results[4].metrics.time.rank===1,'missing metric stays unranked while available outcomes retain their ranks');
ck(mixed.results[5].status==='unavailable'&&Object.keys(mixed.results[5].metrics).length===0,'failed tests never enter ranks or scores even if numbers are present');
ck(!mixed.frontiers.energy.includes('5')&&!mixed.frontiers.time.includes('6'),'missing and failed outcomes cannot enter the corresponding frontier');
const constant=S.scoreStudy({...scoreSummary,designs:[scoredDesign('1',1,1000,10),scoredDesign('2',1,1000,10)]});
ck(constant.results.every(r=>Object.values(r.metrics).every(m=>m.score===50&&m.rank===1)),'constant outcomes score a neutral 50 with tied rank 1');
ck(Object.values(S.scoreStudy({...scoreSummary,designs:[candidates[0]]}).results[0].metrics).every(m=>m.score===50),'one test scores neutrally without division by zero');
ck(S.scoreStudy({...scoreSummary,designs:[]}).results.length===0,'empty studies have no invented scores');
const scaled=S.scoreStudy({...scoreSummary,designs:candidates.map(d=>({...d,targets:d.targets.map(t=>({...t,baselinePeakN:t.baselinePeakN*1000}))}))});
ck(scaled.results.every((r,i)=>S.METRICS.every(m=>r.metrics[m.id].score===scores.results[i].metrics[m.id].score)),'units do not affect rank-normalized scores');
assert.throws(()=>S.scoreStudy(scoreSummary,{energy:'invalid'}));checks++;
const rankedCsv=S.rankingCsv(scoreSummary,scores);
ck(rankedCsv.includes('remaining_unit')&&!rankedCsv.includes('total_score')&&!rankedCsv.includes('overall_rank')&&!rankedCsv.includes('weights_json')&&rankedCsv.includes('energy_weight_frontier')&&rankedCsv.includes(S.SCORE_METHOD),'rankings CSV records scores, frontiers, units and the reproducible scoring method');
// Near-frontier filters always use the full reference population.
const bandCandidates=[...candidates,scoredDesign('7',2.5,920,10,12),scoredDesign('8',3,900,20,10)];
const bandSummary={...scoreSummary,designs:bandCandidates},bands=S.frontierBands(bandSummary),bandMap=new Map(bands.rows.map(r=>[r.id,r]));
ck(close(bandMap.get('7').metrics.peak.gapPercent,100*(.92-.9)/.9),'lower-is-better gap is relative to the best force available at no greater weight');
ck(bandMap.get('7').metrics.time.gapPercent===50,'higher-is-better gap measures the percentage shortfall from the best attainable time');
ck(bandMap.get('7').metrics.time.referenceDesignId==='2','reference remains a full-population design at lower weight');
ck(S.filterFrontierBands(bands).ids.length===bandCandidates.length,'no selected filters preserves the full design set');
const bandSnapshot=JSON.stringify(bands),forceOnly=S.filterFrontierBands(bands,{peak:3}),combined=S.filterFrontierBands(bands,{peak:3,time:5});
ck(forceOnly.ids.includes('7')&&!combined.ids.includes('7'),'combining outcome filters keeps only their intersection');
ck(combined.ids.every(id=>forceOnly.ids.includes(id))&&combined.steps[1].remaining<=combined.steps[0].remaining,'adding a filter can only remove candidates');
ck(S.filterFrontierBands(bands,{time:5,peak:3}).ids.join()===combined.ids.join(),'final subset does not depend on filter order');
ck(S.filterFrontierBands(bands,{peak:0}).ids.slice().sort().join()===S.pairFrontier(bandCandidates,'weight','peak').slice().sort().join(),'zero allowance means the exact weight frontier');
ck(!S.filterFrontierBands(bands,{peak:0}).ids.includes('8')&&S.filterFrontierBands(bands,{peak:.1}).ids.includes('8'),'a heavier equal-performance plateau is excluded in frontier-only mode and can enter a positive allowance');
ck(forceOnly.ids.every(id=>S.filterFrontierBands(bands,{peak:25}).ids.includes(id)),'widening allowance cannot remove existing survivors');
ck(JSON.stringify(bands)===bandSnapshot,'filtering never recomputes or mutates the reference population');
const sharedWeight=S.frontierBands({...scoreSummary,designs:[scoredDesign('1',1,1050,10),scoredDesign('2',1,1000,10)]});
ck(close(sharedWeight.rows[0].metrics.peak.gapPercent,5)&&S.filterFrontierBands(sharedWeight,{peak:5}).ids.includes('1'),'same-weight references are considered together and allowance boundaries are inclusive');
const zeroBands=S.frontierBands({...scoreSummary,designs:[scoredDesign('1',1,0,10),scoredDesign('2',2,10,10)]});
ck(zeroBands.rows[1].metrics.peak.gapPercent===null&&zeroBands.rows[1].metrics.peak.gapReason==='zero-reference-with-nonzero-value','zero reference with nonzero value records an unbounded relative gap');
ck(S.filterFrontierBands(zeroBands,{peak:100}).ids.join()==='1','no finite allowance admits an unbounded gap');
const missingBands=S.frontierBands({...scoreSummary,designs:[...candidates,missing,failed]});
ck(!S.filterFrontierBands(missingBands,{energy:100}).ids.includes('5')&&!S.filterFrontierBands(missingBands,{peak:100}).ids.includes('6'),'missing selected outcomes and failed tests cannot pass a filter');
for(const filters of [{weight:5},{peak:-1},{peak:101},{time:NaN},{peak:'5'}]){assert.throws(()=>S.filterFrontierBands(bands,filters));checks++;}
const subsetCsv=S.rankingCsv(bandSummary,S.scoreStudy(bandSummary),{bands,selection:combined});
ck(subsetCsv.includes('frontier_filters_json')&&subsetCsv.includes('peak_gap_percent')&&subsetCsv.includes('reference_design_count')&&subsetCsv.includes(S.FRONTIER_BAND_METHOD),'subset CSV preserves allowance definition, gaps and full reference size');
ck(subsetCsv.trim().split('\r\n').length===combined.ids.length+1,'subset CSV contains only survivors');
const roleDesign={roleAssignments:[
 [{role:'hand_comfort',materialId:'soft',thicknessMm:3},{role:'support_backing',materialId:'ev50',thicknessMm:2}],
 [{role:'hand_comfort',materialId:'ev50',thicknessMm:2},{role:'support_backing',materialId:'soft',thicknessMm:3}]
]};
ck(S.matchingRoleAssignment(roleDesign)===roleDesign.roleAssignments[0],'unrestricted layer filter preserves the original displayed assignment');
ck(S.matchingRoleAssignment(roleDesign,{hand_comfort:{materialId:'ev50',minMm:2,maxMm:2}})===roleDesign.roleAssignments[1],'layer filters find a matching alternate assignment and include exact thickness boundaries');
ck(!S.matchingRoleAssignment(roleDesign,{hand_comfort:{materialId:'soft'},support_backing:{materialId:'soft'}}),'requirements cannot be satisfied using different assignments of the same composition');
ck(!S.matchingRoleAssignment(roleDesign,{hand_comfort:{minMm:4}}),'thickness constraints exclude all assignments outside the range');
ck(!S.matchingRoleAssignment(roleDesign,{hand_comfort:{minMm:4,maxMm:2}}),'contradictory thickness limits produce no matches');
const exportSelection={...combined,layerFilters:{hand_comfort:{materialId:'soft',minMm:3}},matchingAssignments:Object.fromEntries(combined.ids.map(id=>[id,plan.designs[0].roleAssignments[0]]))};
const layerCsv=S.rankingCsv(bandSummary,S.scoreStudy(bandSummary),{bands,selection:exportSelection});
ck(layerCsv.includes('layer_filters_json,matching_layers')&&layerCsv.includes('Hand comfort:')&&layerCsv.includes('minMm'),'filtered CSV records layer requirements and the matching displayed layers');
const comparisonInput=M.recipe('canonicalMedium'),comparisonSnapshot=JSON.stringify(comparisonInput),comparison=S.compareStack(comparisonInput);
ck(close(comparison.layers.reduce((sum,l)=>sum+l.h,0),50),'comparison stack is normalized to 50 mm');
ck(comparison.layers.every((l,i)=>close(l.h/comparison.layers[0].h,comparisonInput[i].h/comparisonInput[0].h)&&l.a===comparisonInput[i].a&&l.rho===comparisonInput[i].rho),'comparison preserves layer proportions and entered properties');
ck(JSON.stringify(comparisonInput)===comparisonSnapshot,'comparison leaves the builder layers unchanged');
ck(comparison.result.mass===S.IMPACT.mass&&comparison.result.speed===S.IMPACT.speed&&comparison.result.gravity===0&&comparison.target.thicknessMm===50,'comparison uses the matched study impact and target');
const gridComparison=S.compareStack(plan.designs[0].layers),gridRow=S.calculateCase(plan,0);
ck(close(gridComparison.result.F,gridRow.peak_force_N)&&close(gridComparison.result.foamWeightG,gridRow.foam_sample_weight_g)&&close(gridComparison.result.trace.time*1000,gridRow.time_to_peak_ms),'comparison matches a grid test at identical material thicknesses');
assert.throws(()=>S.compareStack([]));checks++;
const outcomeDesign=scoredDesign('range',2,3500,15);
ck(S.matchesOutcomeRanges(outcomeDesign,{peak:{min:3.5,max:3.5},weight:{min:2,max:2}}),'outcome ranges include both exact boundaries in displayed units');
ck(!S.matchesOutcomeRanges(outcomeDesign,{peak:{max:3.49}}),'peak range uses kN rather than N');
ck(!S.matchesOutcomeRanges(outcomeDesign,{peak:{min:3},weight:{max:1}}),'outcome ranges combine with AND');
ck(!S.matchesOutcomeRanges(outcomeDesign,{peak:{min:4,max:3}}),'contradictory outcome bounds yield no matches');
ck(S.matchesOutcomeRanges(outcomeDesign,{peak:{min:3}})&&S.matchesOutcomeRanges(outcomeDesign,{peak:{max:4}}),'one-sided outcome ranges are supported');
ck(!S.matchesOutcomeRanges({...outcomeDesign,targets:[]},{energy:{min:0}})&&S.matchesOutcomeRanges({...outcomeDesign,targets:[]},{}),'missing values fail active ranges but do not remove unfiltered tests');
for(const [metric,value,label] of [['early',49.9,'Gradual buildup'],['early',50,'Moderate buildup'],['early',70,'Sharp buildup'],['early',85,'Sharp buildup'],['early',85.1,'Very sharp buildup'],['time',9.9,'Abrupt buildup'],['time',10,'Quick buildup'],['time',12,'Moderate buildup'],['time',18,'Moderate buildup'],['time',18.1,'Gradual buildup']])ck(S.buildupRegion(metric,value)?.label===label,'buildup boundary '+metric+' '+value);
ck(!S.buildupRegion('early',null),'missing buildup values remain unclassified');
console.log('PASS',checks,'parameter-study checks');
