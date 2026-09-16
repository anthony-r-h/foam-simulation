/* Deterministic adult-impact parameter study. No DOM or network dependencies. */
'use strict';
const FoamSweep = (() => {
 const M=typeof FoamModel!=='undefined'?FoamModel:require('./engine.js');
 const I=typeof ImpactModel!=='undefined'?ImpactModel:require('./impact_engine.js');
 // Versioned inventory order also defines canonical composition IDs.
 const MATERIAL_IDS=Object.freeze(['soft','hd36','lux','qualux','ev30','ev50','latex']);
 const THICKNESSES=[50],STRESS_SCALES=[1],TAIL_POWERS=[2];
 const IMPACT=Object.freeze({mass:2.597,speed:7.7,gravity:0});
 const FOOTPRINT=Object.freeze({widthMm:30,heightMm:30,areaCm2:9});
 const NUMERICS=Object.freeze({nr:24,nt:20,resolution:550,steps:240,loadingDurationMs:0});
 const STUDY_ID='fr50-eva50-v1',STUDY_NAME='Four-Role 50 mm / EVA75 50 mm - v1';
 const DISPLAY_ROLE_IDS=Object.freeze(['outer_contact','main_padding','support_backing','hand_comfort']);
 const ROLE_LABELS=Object.freeze({outer_contact:'Outer contact',main_padding:'Main padding',support_backing:'Support backing',hand_comfort:'Hand comfort'});
 const MATERIAL_NAMES=Object.freeze({soft:'Soft HR',hd36:'HD36-HQ',lux:'Lux-HQ',qualux:'Qualux Firm',ev30:'Evazote EV30',ev50:'Evazote EV50',latex:'Dunlop latex'});
 const ROLE_IDS=Object.freeze(['hand_comfort','support_backing','main_padding','outer_contact']);
 const BASE_COLUMNS=[
  'study_id','study_name','role_assignments_json','equivalent_role_assignment_count','run_started_utc','test_number','test_code','test_name','display_layer_order','test_id','design_id','design_label','design_kind','scenario_id','target_id','target_label','status','error_message',
  'impact_mass_kg','impact_speed_m_per_s','impact_energy_J','gravity_m_per_s2','hand_spring_stiffness_N_per_m','total_foam_thickness_mm','layer_count',
  'sample_width_mm','sample_height_mm','sample_area_cm2','sample_weight_basis','contact_face_radius_mm','contact_face_area_cm2','striker_radius_mm','contact_geometry_json',
  'loading_curve','glove_stress_multiplier','glove_tail_power','target_stress_multiplier','target_tail_power','thickness_retention','global_firmness_multiplier',
  'uncertainty_interpretation','target_mode','target_thickness_mm','target_mass_kg','target_stiffness_N_per_m','target_radius_mm','target_inputs_json','target_material_inputs_json','solver_settings_json',
  'peak_force_N','force_reached_N','force_at_exact_10ms_N','early_sample_force_N','early_loading_percent_of_peak','early_loading_available','early_loading_reason',
  'early_sample_time_ms','peak_before_10ms','early_loading_definition','time_to_peak_ms','time_reached_ms','foam_thickness_left_mm','foam_thickness_left_percent',
  'fist_speed_at_peak_m_per_s','fist_speed_at_endpoint_m_per_s','loading_impulse_Ns','loading_complete','foam_sample_weight_g',
  'impact_energy_at_10ms_J','energy_at_10ms_available','energy_at_10ms_reason','energy_at_10ms_definition','foam_loading_work_J','target_loading_work_J','hand_compression_mm','hand_spring_work_J','relative_kinetic_energy_left_J','limit_reason'
 ];
 const LAYER_COLUMNS=['role','name','material_id','family','prior_id','thickness_mm','density_lb_per_ft3','density_kg_per_m3','firmness_input_mode','firmness_25_input','deeper_input','pressure_25_kPa','deeper_strain','deeper_pressure_kPa','supplier_known_strain','supplier_url','supplier_note','prior_parameters_json','prior_source_url'];
 const COLUMNS=[...BASE_COLUMNS,...Array.from({length:MATERIAL_IDS.length},(_,i)=>LAYER_COLUMNS.map(key=>'layer_'+(i+1)+'_'+key)).flat()];
 function layerInputs(layer){
  const anchors=M.materialAnchors(layer),prior=M.PRIORS[layer.prior];
  return {
   role:layer.role??'',name:layer.name,material_id:layer.grade,family:layer.family,prior_id:layer.prior,thickness_mm:layer.h,
   density_lb_per_ft3:layer.rho,density_kg_per_m3:layer.rho*M.PCF,firmness_input_mode:layer.mode,
   firmness_25_input:layer.a,deeper_input:layer.b,pressure_25_kPa:anchors[0][1]/1000,
   deeper_strain:anchors[1]?.[0]??null,deeper_pressure_kPa:anchors[1]?anchors[1][1]/1000:null,
   supplier_known_strain:layer.known,supplier_url:layer.source,supplier_note:layer.note,
   prior_parameters_json:JSON.stringify(prior),prior_source_url:M.SOURCES[prior.source]?.url||''
  };
 }
 function displayLayers(design,assignmentIndex=0){
  const roles=design.roleAssignments[assignmentIndex];
  return DISPLAY_ROLE_IDS.map(role=>{
   const allocation=roles.find(r=>r.role===role);
   return {...design.layers.find(l=>l.grade===allocation.materialId),name:MATERIAL_NAMES[allocation.materialId],role};
  });
 }
 function assignmentName(roles){return DISPLAY_ROLE_IDS.map(role=>{const l=roles.find(r=>r.role===role);return ROLE_LABELS[role]+': '+l.thicknessMm+' mm '+MATERIAL_NAMES[l.materialId];}).join('; ');}
 function testName(design,assignmentIndex=0){return assignmentName(design.roleAssignments[assignmentIndex]);}
 function createPlan(){
  const targets=[{id:'eva50',label:'50 mm EVA75 target',target:I.targetSpec({mode:'padded',thicknessMm:50})}];
  const unique=new Map();
  let roleThicknessPatternCount=0,roleAssignmentCount=0;
  // Each occupied role has exactly one material; no material repeats in a stack.
  for(let comfort=1;comfort<=5;comfort++)for(let backing=1;backing<=5;backing++)for(let main=5;main<50;main+=5){
   const outer=50-comfort-backing-main;
   if(outer<5||outer%5!==0)continue;
   roleThicknessPatternCount++;
   const thicknesses=[comfort,backing,main,outer];
   for(const a of MATERIAL_IDS)for(const b of MATERIAL_IDS)for(const c of MATERIAL_IDS)for(const d of MATERIAL_IDS){
    const materials=[a,b,c,d];
    if(new Set(materials).size!==4)continue;
    roleAssignmentCount++;
    const roles=ROLE_IDS.map((role,i)=>({role,materialId:materials[i],thicknessMm:thicknesses[i]}));
    const canonical=roles.slice().sort((x,y)=>MATERIAL_IDS.indexOf(x.materialId)-MATERIAL_IDS.indexOf(y.materialId));
    const id=canonical.map(l=>l.materialId+'-'+l.thicknessMm).join('_');
    if(unique.has(id)){unique.get(id).roleAssignments.push(roles);continue;}
    const layers=canonical.map((l,i)=>M.layer(l.materialId,l.thicknessMm,M.MATERIALS[l.materialId].label,'layer-'+i,M.COLORS[i]));
    unique.set(id,{id,label:layers.map(l=>l.name+' '+l.h+' mm').join(' + '),kind:'four-role',thicknessMm:50,layers,foamWeightG:M.stackWeightGrams(layers),roleAssignments:[roles]});
   }
  }
  // Code-point ordering is independent of locale and worker scheduling.
  const designs=[...unique.values()].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
  designs.forEach((design,i)=>{design.testNumber=i+1;design.testCode=STUDY_ID+'-'+String(i+1).padStart(5,'0');design.label=testName(design);});
  const scenarios=[];
  for(const stressScale of STRESS_SCALES)for(const tailPower of TAIL_POWERS)scenarios.push({id:'stress-'+stressScale+'-tail-'+tailPower,stressScale,tailPower});
  return {studyId:STUDY_ID,studyName:STUDY_NAME,roleIds:[...ROLE_IDS],displayRoleIds:[...DISPLAY_ROLE_IDS],roleThicknessPatternCount,roleAssignmentCount,createdAt:new Date().toISOString(),impact:{...IMPACT},handSpring:{...I.HAND},footprint:{...FOOTPRINT},numerics:{...NUMERICS},materialIds:[...MATERIAL_IDS],thicknessesMm:[...THICKNESSES],targets,scenarios,designs,caseCount:designs.length*scenarios.length*targets.length};
 }
 function isCurrentStudy(study){return study?.studyId===STUDY_ID&&study.handSpring?.stiffness===I.HAND.stiffness;}
 function caseSpec(plan,index){
  if(!Number.isInteger(index)||index<0||index>=plan.caseCount)throw Error('Choose a case index inside the parameter-study plan.');
  const target=plan.targets[index%plan.targets.length];
  const scenario=plan.scenarios[Math.floor(index/plan.targets.length)%plan.scenarios.length];
  const design=plan.designs[Math.floor(index/(plan.targets.length*plan.scenarios.length))];
  return {design,scenario,target};
 }
 function calculateCase(plan,index){
  if(!isCurrentStudy(plan))throw Error('Create a new study plan for the current Hand Spring model.');
  const {design,scenario,target}=caseSpec(plan,index),spec=plan.impact;
  const config={...M.DEFAULT_CONFIG,mass:spec.mass,speed:spec.speed,targetMode:'rigid',speedModel:'fast',rateScale:scenario.stressScale,tailPower:scenario.tailPower,targetScale:1,targetTailPower:2,ret:1,firmness:1};
  const row=Object.fromEntries(COLUMNS.map(key=>[key,null]));
  Object.assign(row,{
   study_id:plan.studyId,study_name:STUDY_NAME,role_assignments_json:JSON.stringify(design.roleAssignments),equivalent_role_assignment_count:design.roleAssignments.length,run_started_utc:plan.createdAt,test_number:design.testNumber,test_code:design.testCode,test_name:design.label,display_layer_order:'outside to hand: outer_contact, main_padding, support_backing, hand_comfort',test_id:design.id+'__'+scenario.id+'__'+target.id,design_id:design.id,design_label:design.label,design_kind:design.kind,
   scenario_id:scenario.id,target_id:target.id,target_label:target.label,status:'pending',error_message:'',
   impact_mass_kg:spec.mass,impact_speed_m_per_s:spec.speed,impact_energy_J:.5*spec.mass*spec.speed**2,gravity_m_per_s2:0,hand_spring_stiffness_N_per_m:plan.handSpring.stiffness,total_foam_thickness_mm:design.thicknessMm,layer_count:design.layers.length,
   sample_width_mm:plan.footprint.widthMm,sample_height_mm:plan.footprint.heightMm,sample_area_cm2:plan.footprint.areaCm2,
   sample_weight_basis:'30 x 30 mm foam specimen only; contact geometry and effective strike mass are unchanged',contact_face_radius_mm:I.RIG.faceRadius*1000,contact_face_area_cm2:Math.PI*I.RIG.faceRadius**2*1e4,striker_radius_mm:I.RIG.strikerRadius*1000,
   loading_curve:config.speedModel,glove_stress_multiplier:scenario.stressScale,glove_tail_power:scenario.tailPower,target_stress_multiplier:1,target_tail_power:2,thickness_retention:1,global_firmness_multiplier:1,
   uncertainty_interpretation:'Fixed nominal model; no sensitivity scenarios or material-property changes',
   target_mode:target.target.mode,target_thickness_mm:target.target.thicknessMm??null,target_mass_kg:target.target.mass??null,target_stiffness_N_per_m:target.target.stiffness??null,target_radius_mm:target.target.radius?target.target.radius*1000:null,
   target_inputs_json:JSON.stringify(target.target),target_material_inputs_json:target.target.mode==='padded'?JSON.stringify({...I.EVA75,priorParameters:M.PRIORS[I.EVA75.prior],stressScale:1,tailPower:2,loadingCurve:'fast',loadingDurationMs:0}):'',solver_settings_json:JSON.stringify(plan.numerics),
   early_loading_definition:'100 * F(min(0.010, t_peak)) / F_peak; resolved first-compression peak required',foam_sample_weight_g:design.foamWeightG
  });
  displayLayers(design).forEach((layer,i)=>{for(const [key,value] of Object.entries(layerInputs(layer)))row['layer_'+(i+1)+'_'+key]=value;});
  try{
   const r=I.calculate(design.layers,config,spec,true,{...plan.numerics,target:target.target}),last=r.trace.rows.at(-1),early=r.earlyLoading;
   if(r.mass!==spec.mass||r.speed!==spec.speed||r.gravity!==0)throw Error('The target calculation changed the matched horizontal impact setup.');
   const geometry=r.comp.geo;
   Object.assign(row,{
    contact_geometry_json:JSON.stringify({flat:geometry.flat,supportRadius:geometry.supportRadius,outerRadius:geometry.outerRadius,faceArea:geometry.area,nr:geometry.nr,nt:geometry.nt}),
    status:r.loadingComplete?'resolved':'unresolved',peak_force_N:r.loadingComplete?r.F:null,force_reached_N:r.F,
    force_at_exact_10ms_N:early?.forceAt10N??null,early_sample_force_N:early?.sampleForceN??null,early_loading_percent_of_peak:early?.available?early.peakPercent:null,
    early_loading_available:!!early?.available,early_loading_reason:early?.reason||'',early_sample_time_ms:early?.sampleTimeSeconds==null?null:early.sampleTimeSeconds*1000,peak_before_10ms:early?.peakBefore10??false,
    time_to_peak_ms:r.loadingComplete?r.trace.time*1000:null,time_reached_ms:r.trace.time*1000,foam_thickness_left_mm:r.left,foam_thickness_left_percent:100*r.left/design.thicknessMm,
    fist_speed_at_peak_m_per_s:r.loadingComplete?last.v:null,fist_speed_at_endpoint_m_per_s:last.v,loading_impulse_Ns:r.trace.impulse,loading_complete:r.loadingComplete,foam_sample_weight_g:r.foamWeightG,
    impact_energy_at_10ms_J:r.energyAt10ms?.energyJ??null,energy_at_10ms_available:!!r.energyAt10ms?.available,energy_at_10ms_reason:r.energyAt10ms?.reason||'',energy_at_10ms_definition:'Kinetic energy at exactly 10 ms, linearly interpolated on the loading trace; relative kinetic energy for bag, striker kinetic energy for fixed targets; unavailable after an earlier peak',foam_loading_work_J:r.fw,target_loading_work_J:r.tw,hand_compression_mm:r.xh*1000,hand_spring_work_J:r.hw,relative_kinetic_energy_left_J:r.relativeK??r.endK,limit_reason:r.limitReason||''
   });
  }catch(error){row.status='error';row.error_message=error.message;}
  return row;
 }
 function compactRow(row){
  const keys=['study_id','hand_spring_stiffness_N_per_m','test_id','design_id','scenario_id','target_id','status','peak_force_N','glove_stress_multiplier','glove_tail_power','early_loading_percent_of_peak','time_to_peak_ms','foam_thickness_left_mm','fist_speed_at_peak_m_per_s','loading_impulse_Ns','impact_energy_at_10ms_J','energy_at_10ms_reason','early_loading_available','peak_before_10ms'];
  return Object.fromEntries(keys.map(key=>[key,row[key]]));
 }
 function csvValue(value){
  if(value==null)return '';
  const text=typeof value==='boolean'?(value?'true':'false'):String(value);
  return /[",\r\n]/.test(text)?'"'+text.replace(/"/g,'""')+'"':text;
 }
 function csvHeader(){return COLUMNS.map(csvValue).join(',');}
 function csvRow(row){return COLUMNS.map(key=>csvValue(row[key])).join(',');}
 function summarize(plan,rows){
  if(!isCurrentStudy(plan))throw Error('Create a new study plan for the current Hand Spring model.');
  const byTest=new Map();
  const designIds=new Set(plan.designs.map(d=>d.id)),scenarioIds=new Set(plan.scenarios.map(s=>s.id)),targetIds=new Set(plan.targets.map(t=>t.id));
  for(const row of rows){
   if(row.study_id!==plan.studyId||row.hand_spring_stiffness_N_per_m!==plan.handSpring.stiffness||!designIds.has(row.design_id)||!scenarioIds.has(row.scenario_id)||!targetIds.has(row.target_id)||row.test_id!==row.design_id+'__'+row.scenario_id+'__'+row.target_id)throw Error('Result does not belong to this study plan: '+row.test_id);
   if(byTest.has(row.test_id))throw Error('Duplicate study result: '+row.test_id);
   byTest.set(row.test_id,row);
  }
  const keys=plan.scenarios.flatMap(s=>plan.targets.map(t=>s.id+'__'+t.id));
  const designs=plan.designs.map(design=>{
   const matched=keys.map(key=>byTest.get(design.id+'__'+key)),eligible=matched.every(row=>row?.status==='resolved'&&Number.isFinite(row.peak_force_N));
   const targets=plan.targets.map(target=>{
    const selected=matched.filter(row=>row?.target_id===target.id),resolved=selected.filter(row=>row.status==='resolved'),base=selected.find(row=>row.glove_stress_multiplier===1&&row.glove_tail_power===2);
    const forces=resolved.map(row=>row.peak_force_N);
    return {id:target.id,baselinePeakN:base?.peak_force_N??null,baselineEarlyPercent:base?.early_loading_percent_of_peak??null,baselineTimeMs:base?.time_to_peak_ms??null,baselineFoamLeftMm:base?.foam_thickness_left_mm??null,baselineFistSpeed:base?.fist_speed_at_peak_m_per_s??null,baselineImpulseNs:base?.loading_impulse_Ns??null,baselineEnergy10J:base?.impact_energy_at_10ms_J??null,energy10Reason:base?.energy_at_10ms_reason??null,status:base?.status??'not-run',minPeakN:forces.length?Math.min(...forces):null,maxPeakN:forces.length?Math.max(...forces):null,resolvedScenarios:resolved.length};
   });
   return {id:design.id,testNumber:design.testNumber,testCode:design.testCode,label:design.label,roleAssignments:design.roleAssignments,kind:design.kind,thicknessMm:design.thicknessMm,foamWeightG:design.foamWeightG,layers:design.layers.map(l=>({materialId:l.grade,thicknessMm:l.h})),eligible,targets,forces:eligible?matched.map(row=>row.peak_force_N):null};
  });
  const eligible=designs.filter(d=>d.eligible),tolerance=1e-8;
  function dominates(a,b){
   if(a.foamWeightG>b.foamWeightG+tolerance||a.thicknessMm>b.thicknessMm+tolerance)return false;
   let strict=a.foamWeightG<b.foamWeightG-tolerance||a.thicknessMm<b.thicknessMm-tolerance;
   for(let i=0;i<a.forces.length;i++){
    const tol=tolerance*Math.max(1,b.forces[i]);
    if(a.forces[i]>b.forces[i]+tol)return false;
    if(a.forces[i]<b.forces[i]-tol)strict=true;
   }
   return strict;
  }
  // Sort by mass, then thickness and forces: a later point cannot dominate
  // an earlier point. Compare only the surviving frontier, not every pair.
  function frontier(candidates){
   const ordered=candidates.slice().sort((a,b)=>a.foamWeightG-b.foamWeightG||a.thicknessMm-b.thicknessMm||a.forces.reduce((s,f)=>s+f,0)-b.forces.reduce((s,f)=>s+f,0));
   const result=[];
   for(const candidate of ordered){
    const witness=result.find(other=>dominates(other,candidate));
    if(witness){candidate.dominatedBy=witness.id;continue;}
    for(let i=result.length-1;i>=0;i--)if(dominates(candidate,result[i]))result.splice(i,1);
    result.push(candidate);
   }
   return new Set(result.map(d=>d.id));
  }
  const frontierIds=frontier(eligible);
  const commonEligibleSensitivity=null;
  let strongestDominance=null;
  const eligibleById=new Map(eligible.map(d=>[d.id,d]));
  for(const b of eligible){
   const a=eligibleById.get(b.dominatedBy);
   if(!a||a.thicknessMm!==b.thicknessMm)continue;
   const minReductionPct=Math.min(...a.forces.map((force,i)=>100*(1-force/b.forces[i])));
   if(!strongestDominance||minReductionPct>strongestDominance.minReductionPct)strongestDominance={dominatorId:a.id,dominatedId:b.id,minReductionPct,massReductionPct:100*(1-a.foamWeightG/b.foamWeightG),thicknessMm:a.thicknessMm};
  }
  const clean=d=>{const {forces,...rest}=d;return {...rest,robustFrontier:frontierIds.has(d.id)};};
  const targetSummaries=plan.targets.map(target=>{
   const targetFrontier=frontier(designs.filter(d=>Number.isFinite(d.targets.find(t=>t.id===target.id).baselinePeakN)).map(d=>({...d,forces:[d.targets.find(t=>t.id===target.id).baselinePeakN]})));
   const targetRows=rows.filter(row=>row.target_id===target.id),resolved=targetRows.filter(row=>row.status==='resolved');
   const leaders=designs.filter(d=>d.targets.find(t=>t.id===target.id).baselinePeakN!==null).sort((a,b)=>a.targets.find(t=>t.id===target.id).baselinePeakN-b.targets.find(t=>t.id===target.id).baselinePeakN||a.foamWeightG-b.foamWeightG).slice(0,5).map(clean);
   const spreads=designs.map(d=>d.targets.find(t=>t.id===target.id)).filter(t=>t.resolvedScenarios===plan.scenarios.length&&t.minPeakN>0).map(t=>100*(t.maxPeakN/t.minPeakN-1)).sort((a,b)=>a-b);
   return {id:target.id,label:target.label,target:target.target,frontierIds:[...targetFrontier],resolvedCount:resolved.length,unresolvedCount:targetRows.filter(r=>r.status==='unresolved').length,errorCount:targetRows.filter(r=>r.status==='error').length,baselineLeaders:leaders,medianScenarioSpreadPct:spreads.length?spreads[Math.floor(spreads.length/2)]:null,maxScenarioSpreadPct:spreads.length?spreads.at(-1):null};
  });
  return {
   studyId:plan.studyId,studyName:STUDY_NAME,roleAssignmentCount:plan.roleAssignmentCount,createdAt:plan.createdAt,impact:plan.impact,handSpring:plan.handSpring,footprint:plan.footprint,numerics:plan.numerics,expectedCases:plan.caseCount,evaluatedCases:rows.length,complete:rows.length===plan.caseCount,
   designCount:designs.length,scenarioCount:plan.scenarios.length,resolvedCount:rows.filter(r=>r.status==='resolved').length,unresolvedCount:rows.filter(r=>r.status==='unresolved').length,errorCount:rows.filter(r=>r.status==='error').length,
   peakBefore10Count:rows.filter(r=>r.peak_before_10ms).length,earlyLoadingUnavailableCount:rows.filter(r=>!r.early_loading_available).length,
   eligibleDesignCount:eligible.length,excludedDesignCount:designs.length-eligible.length,robustFrontierCount:frontierIds.size,
   dominanceDefinition:'No higher peak force in every matched target/scenario, no greater 30 x 30 mm sample mass, and no greater thickness, with at least one strict improvement; only fully resolved designs can dominate',
   targetSummaries,commonEligibleSensitivity,strongestDominance,robustFrontier:[...frontierIds],designs:designs.map(clean),
   limitations:['Finite material/composition grid; not a global optimum.','The 1 kN/mm Hand Spring represents combined hand and wrist give; it is an uncalibrated assumption, not measured human stiffness.','Stress scaling 1 and tail power 2 are fixed assumptions, not measured uncertainty bounds.','Dominance uses a relative numerical tolerance of 1e-8; small differences require finer-grid checks and may be below model uncertainty.','Early-loading percentage and impulse are descriptive outputs, not protection objectives.','Sample weight is for a 30 x 30 mm specimen and is not whole-glove weight.','Predicted peak force is not an injury threshold.']
  };
 }
 const SCORE_METHOD='outcome-rank-percentile-v1';
 const METRICS=Object.freeze([
  {id:'weight',label:'Foam sample weight',unit:'g',direction:'lower'},
  {id:'peak',label:'Peak force',unit:'kN',direction:'lower',field:'baselinePeakN',scale:.001},
  {id:'early',label:'F10/Fmax',unit:'%',direction:'lower',field:'baselineEarlyPercent'},
  {id:'time',label:'Time to peak',unit:'ms',direction:'higher',field:'baselineTimeMs'},
  {id:'remaining',label:'Thickness remaining',unit:'%',direction:'higher'},
  {id:'energy',label:'Energy remaining at 10 ms',unit:'J',direction:'lower',field:'baselineEnergy10J'}
 ]);
 function metricValue(design,id,targetId='eva50'){
  const result=design.targets.find(t=>t.id===targetId);
  if(id==='weight')return Number.isFinite(design.foamWeightG)?design.foamWeightG:null;
  if(id==='remaining')return Number.isFinite(result?.baselineFoamLeftMm)&&design.thicknessMm>0?100*result.baselineFoamLeftMm/design.thicknessMm:null;
  const metric=METRICS.find(m=>m.id===id),value=result?.[metric?.field];
  return Number.isFinite(value)?value*(metric.scale??1):null;
 }
 function scoringDirections(input={}){
  const directions={};
  for(const m of METRICS){
   const value=input[m.id]??m.direction;
   if(!['lower','higher'].includes(value))throw Error('Choose lower or higher for '+m.label+'.');
   directions[m.id]=value;
  }
  return directions;
 }
 function pairFrontier(designs,xId,yId,input={},targetId='eva50'){
  const directions=scoringDirections(input);
  if(!directions[xId]||!directions[yId])throw Error('Unknown frontier metric.');
  const points=designs.filter(d=>d.targets.find(t=>t.id===targetId)?.status==='resolved').map(d=>({id:d.id,x:metricValue(d,xId,targetId),y:metricValue(d,yId,targetId)})).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)).map(p=>({...p,x:p.x*(directions[xId]==='lower'?1:-1),y:p.y*(directions[yId]==='lower'?1:-1)})).sort((a,b)=>a.x-b.x||a.y-b.y);
  const ids=[];let bestY=Infinity;
  // At each x, retain only the best y, and only if it improves on cheaper x.
  // Equal coordinates share frontier membership; an equal y at worse x does not.
  for(let i=0;i<points.length;){
   let end=i+1;while(end<points.length&&points[end].x===points[i].x)end++;
   const best=points[i].y;
   if(best<bestY){for(let j=i;j<end&&points[j].y===best;j++)ids.push(points[j].id);bestY=best;}
   i=end;
  }
  return ids;
 }
 function scoreStudy(summary,input={},targetId='eva50'){
  const directions=scoringDirections(input),results=summary.designs.map(d=>({id:d.id,testNumber:d.testNumber,testCode:d.testCode,label:d.label,status:'unavailable',metrics:{}})),byId=new Map(results.map(r=>[r.id,r]));
  function rank(items,value,assign){
   for(let i=0;i<items.length;){
    let end=i+1;while(end<items.length&&value(items[end])===value(items[i]))end++;
    const averageRank=(i+1+end)/2,score=items.length===1?50:100*(items.length-averageRank)/(items.length-1);
    for(let j=i;j<end;j++)assign(items[j],i+1,score);
    i=end;
   }
  }
  const counts={};
  for(const m of METRICS){
   const values=summary.designs.filter(d=>d.targets.find(t=>t.id===targetId)?.status==='resolved').map(d=>({id:d.id,value:metricValue(d,m.id,targetId)})).filter(r=>Number.isFinite(r.value)).sort((a,b)=>(a.value-b.value)*(directions[m.id]==='lower'?1:-1));
   counts[m.id]=values.length;
   rank(values,r=>r.value,(r,position,score)=>{byId.get(r.id).metrics[m.id]={value:r.value,rank:position,score};});
  }
  for(const r of results)if(Object.keys(r.metrics).length)r.status='ranked';
  const frontiers=Object.fromEntries(METRICS.filter(m=>m.id!=='weight').map(m=>[m.id,pairFrontier(summary.designs,'weight',m.id,directions,targetId)]));
  return {method:SCORE_METHOD,targetId,directions,metricCounts:counts,frontiers,results};
 }
 function rankingCsv(summary,scoring){
  const columns=['study_id','run_started_utc','score_method','target_id','directions_json','metric_counts_json','test_number','test_code','test_name','ranking_status',...METRICS.flatMap(m=>[m.id+'_value',m.id+'_unit',m.id+'_rank',m.id+'_score',m.id+'_weight_frontier'])];
  const frontiers=Object.fromEntries(Object.entries(scoring.frontiers).map(([id,ids])=>[id,new Set(ids)]));
  return [columns.join(','),...scoring.results.map(r=>[
   summary.studyId,summary.createdAt,scoring.method,scoring.targetId,JSON.stringify(scoring.directions),JSON.stringify(scoring.metricCounts),r.testNumber,r.testCode,r.label,r.status,
   ...METRICS.flatMap(m=>[r.metrics[m.id]?.value,m.unit,r.metrics[m.id]?.rank,r.metrics[m.id]?.score,r.metrics[m.id]&&frontiers[m.id]?frontiers[m.id].has(r.id):null])
  ].map(csvValue).join(','))].join('\r\n')+'\r\n';
 }
 return {METRICS,SCORE_METHOD,metricValue,scoringDirections,pairFrontier,scoreStudy,rankingCsv,STUDY_ID,STUDY_NAME,ROLE_IDS,DISPLAY_ROLE_IDS,ROLE_LABELS,MATERIAL_NAMES,assignmentName,displayLayers,testName,MATERIAL_IDS,THICKNESSES,STRESS_SCALES,TAIL_POWERS,IMPACT,FOOTPRINT,NUMERICS,COLUMNS,compactRow,createPlan,isCurrentStudy,caseSpec,calculateCase,csvHeader,csvRow,summarize};
})();
if(typeof module!=='undefined')module.exports=FoamSweep;
