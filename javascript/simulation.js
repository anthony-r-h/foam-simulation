/* Browser port of ../simulation.py. Keep numerical changes in parity with Python. */
'use strict';
(() => {
 const assumptions={
  dome:{curvature_radius_mm:100,footprint_radius_mm:40},
  hand_stiffness_n_per_mm:1000,
  indenter_area_m2:0.032258,
  pound_force_n:4.44822161526,
  sample_width_mm:30,
  sample_length_mm:30,
  tail_exponent:2,
  minimum_tail_strain_interval:0.04,
  reference_curves:{
   pu55:{family:'PU',solid_density_kg_m3:1200,fit_strain:0.70,relaxation_pa_s:48000,relaxing_stiffness_pa:33000,base_stiffness_pa:1600,rise_scale_pa:2450,rise_exponent:4,slow_strain_rate_per_s:0.0333},
   hr40:{family:'PU',solid_density_kg_m3:1200,fit_strain:0.70,relaxation_pa_s:130000,relaxing_stiffness_pa:1200000,base_stiffness_pa:1800,rise_scale_pa:14000,rise_exponent:2,slow_strain_rate_per_s:0.0333},
   latex85:{family:'Latex',solid_density_kg_m3:920,fit_strain:0.70,relaxation_pa_s:9000,relaxing_stiffness_pa:100000,base_stiffness_pa:6800,rise_scale_pa:14000,rise_exponent:4,slow_strain_rate_per_s:0.0333},
   eva35:{family:'EVA',solid_density_kg_m3:950,fit_strain:0.80,plateau_pa:12900,initial_rise:20,air_pressure_pa:101325,slow_leakage_ratio:0.19308}
  },
  metrics:{early_time_ms:10,loading_rate_window_ms:0.5},
  numerics:{maximum_pressure_pa:1000000000,curve_steps:600,tail_steps:160,trajectory_steps:1000}
 };

 function sum(values){return values.reduce((total,value)=>total+value,0);}

 function referenceResponse(strain,reference,fast){
  if(reference.family==='EVA'){
   const air=reference.air_pressure_pa*(fast?1:1-reference.slow_leakage_ratio);
   const shape=Math.tanh(reference.initial_rise*strain);
   const pressure=reference.plateau_pa*shape+air*strain/(1-strain);
   const slope=reference.plateau_pa*reference.initial_rise*(1-shape**2)+air/(1-strain)**2;
   return [pressure,slope];
  }
  const stiffness=reference.relaxing_stiffness_pa;
  let pressure;
  let slope;
  if(fast){
   pressure=stiffness*strain;
   slope=stiffness;
  }else{
   const relaxation=reference.relaxation_pa_s*reference.slow_strain_rate_per_s;
   pressure=relaxation*(1-Math.exp(-stiffness*strain/relaxation));
   slope=stiffness*Math.exp(-stiffness*strain/relaxation);
  }
  const shape=Math.expm1(strain);
  pressure+=reference.base_stiffness_pa*strain+reference.rise_scale_pa*strain*shape**reference.rise_exponent;
  slope+=reference.base_stiffness_pa+reference.rise_scale_pa*(shape**reference.rise_exponent+strain*reference.rise_exponent*shape**(reference.rise_exponent-1)*Math.exp(strain));
  return [pressure,slope];
 }

 function minimumSkew(reference,join,steps){
  let bound=-Infinity;
  for(const fast of [false,true]){
   const requiredSkew=strain=>{
    const [pressure,slope]=referenceResponse(strain,reference,fast);
    return -slope/pressure;
   };
   const strains=Array.from({length:steps+1},(_,index)=>join*index/steps);
   const bounds=[-Infinity,...strains.slice(1).map(requiredSkew)];
   bound=Math.max(bound,...bounds);
   for(let index=1;index<steps;index+=1){
    if(bounds[index]<bounds[index-1]||bounds[index]<bounds[index+1])continue;
    let left=strains[index-1];
    let right=strains[index+1];
    for(let iteration=0;iteration<60;iteration+=1){
     const first=left+(right-left)/3;
     const second=right-(right-left)/3;
     if(requiredSkew(first)<requiredSkew(second))left=first;
     else right=second;
    }
    bound=Math.max(bound,requiredSkew((left+right)/2));
   }
  }
  return bound+1e-10*Math.max(1,Math.abs(bound));
 }

 function materialCurve(foam,settings,fast=true){
  const reference=settings.reference_curves[foam.reference_curve];
  const anchors=foam.anchors;
  const cap=1-foam.density_kg_m3/reference.solid_density_kg_m3;
  const join=Math.min(reference.fit_strain,cap-settings.minimum_tail_strain_interval);
  if(anchors.at(-1)[0]>join){
   throw Error(`Anchor at ${anchors.at(-1)[0]*100}% exceeds the assumed tail start at ${join*100}%.`);
  }
  const observedStrains=anchors.map(anchor=>anchor[0]);
  const logRatios=anchors.map(([strain,pressure])=>Math.log(pressure/referenceResponse(strain,reference,false)[0]));
  const meanStrain=sum(observedStrains)/anchors.length;
  const meanLogRatio=sum(logRatios)/anchors.length;
  let skew=0;
  if(new Set(observedStrains).size>1){
   const covariance=sum(observedStrains.map((strain,index)=>(strain-meanStrain)*(logRatios[index]-meanLogRatio)));
   const variance=sum(observedStrains.map(strain=>(strain-meanStrain)**2));
   skew=covariance/variance;
  }
  let constrained=false;
  if(skew<0){
   const lowerBound=minimumSkew(reference,join,settings.numerics.curve_steps);
   constrained=skew<lowerBound;
   skew=Math.max(skew,lowerBound);
  }
  const scale=Math.exp(meanLogRatio-skew*meanStrain);
  const observations=anchors.map(([strain,pressure])=>{
   const fitted=scale*Math.exp(skew*strain)*referenceResponse(strain,reference,false)[0];
   return {strain,supplier_pressure_pa:pressure,fitted_pressure_pa:fitted,difference_percent:100*(fitted/pressure-1)};
  });
  const calibrated=strain=>{
   const [pressure,slope]=referenceResponse(strain,reference,fast);
   const multiplier=scale*Math.exp(skew*strain);
   return [multiplier*pressure,multiplier*(slope+skew*pressure)];
  };
  const [joinPressure,joinSlope]=calibrated(join);
  const tailLength=cap-join;
  const pressureAt=strain=>{
   if(strain<=join)return calibrated(strain)[0];
   return joinPressure+joinSlope*tailLength/settings.tail_exponent*((tailLength/(cap-strain))**settings.tail_exponent-1);
  };
  const numerics=settings.numerics;
  let low=0;
  let high=cap*(1-1e-12);
  for(let iteration=0;iteration<60;iteration+=1){
   const middle=(low+high)/2;
   if(pressureAt(middle)<numerics.maximum_pressure_pa)low=middle;
   else high=middle;
  }
  const endStrain=(low+high)/2;
  const baseEnd=Math.min(join,endStrain);
  const strains=Array.from({length:numerics.curve_steps+1},(_,index)=>baseEnd*index/numerics.curve_steps);
  strains.push(...anchors.filter(([strain])=>strain<endStrain).map(([strain])=>strain));
  if(endStrain>join){
   for(let index=1;index<=numerics.tail_steps;index+=1){
    const fraction=index/numerics.tail_steps;
    strains.push(cap-tailLength*((cap-endStrain)/tailLength)**fraction);
   }
  }
  strains.push(endStrain);
  const uniqueStrains=[...new Set(strains)].sort((left,right)=>left-right);
  const pressures=uniqueStrains.map(pressureAt);
  pressures[pressures.length-1]=numerics.maximum_pressure_pa;
  const work=[0];
  for(let index=1;index<uniqueStrains.length;index+=1){
   work.push(work.at(-1)+(pressures[index-1]+pressures[index])/2*(uniqueStrains[index]-uniqueStrains[index-1]));
  }
  return {strain:uniqueStrains,pressure_pa:pressures,work_density_j_m3:work,join_strain:join,cap_strain:cap,anchors,fit:{scale,skew,constrained,observations}};
 }

 function interval(values,value){
  let low=0;
  let high=values.length;
  while(low<high){
   const middle=Math.floor((low+high)/2);
   if(value<values[middle])high=middle;
   else low=middle+1;
  }
  const index=Math.min(values.length-2,Math.max(0,low-1));
  return [index,(value-values[index])/(values[index+1]-values[index])];
 }

 function segmentIntegrals(column,foams,index,distance){
  const start=column.shortening_m[index];
  const width=column.shortening_m[index+1]-start;
  const pressure=column.pressure_pa[index];
  const slope=(column.pressure_pa[index+1]-pressure)/width;
  const pressureIntegral=pressure*distance+slope*distance**2/2;
  const pressureMoment=start*pressureIntegral+pressure*distance**2/2+slope*distance**3/3;
  const workIntegrals=[];
  const workMoments=[];
  for(let foamIndex=0;foamIndex<foams.length;foamIndex+=1){
   const strainChange=column.strain[foamIndex][index+1]-column.strain[foamIndex][index];
   const share=foams[foamIndex].thickness_mm/1000*strainChange/width;
   const work=column.work_j_m2[foamIndex][index];
   const integral=work*distance+share*(pressure*distance**2/2+slope*distance**3/6);
   let moment=start*integral+work*distance**2/2;
   moment+=share*(pressure*distance**3/3+slope*distance**4/8);
   workIntegrals.push(integral);
   workMoments.push(moment);
  }
  return [pressureIntegral,pressureMoment,workIntegrals,workMoments];
 }

 function prepareIntegrals(column,foams){
  const pressure=[0];
  const pressureMoment=[0];
  const work=foams.map(()=>[0]);
  const workMoment=foams.map(()=>[0]);
  for(let index=0;index<column.shortening_m.length-1;index+=1){
   const width=column.shortening_m[index+1]-column.shortening_m[index];
   const [integralP,momentP,integralsW,momentsW]=segmentIntegrals(column,foams,index,width);
   pressure.push(pressure.at(-1)+integralP);
   pressureMoment.push(pressureMoment.at(-1)+momentP);
   for(let foamIndex=0;foamIndex<foams.length;foamIndex+=1){
    work[foamIndex].push(work[foamIndex].at(-1)+integralsW[foamIndex]);
    workMoment[foamIndex].push(workMoment[foamIndex].at(-1)+momentsW[foamIndex]);
   }
  }
  column.integrals={pressure,pressure_moment:pressureMoment,work,work_moment:workMoment};
 }

 function prepareColumn(foams,curves){
  const pressures=[...new Set(curves.flatMap(curve=>curve.pressure_pa))].sort((left,right)=>left-right);
  const strains=[];
  const works=[];
  for(let foamIndex=0;foamIndex<foams.length;foamIndex+=1){
   const foam=foams[foamIndex];
   const curve=curves[foamIndex];
   const layerStrains=[];
   const layerWorks=[];
   const thickness=foam.thickness_mm/1000;
   for(const pressure of pressures){
    const [index,fraction]=interval(curve.pressure_pa,pressure);
    const strain=curve.strain[index]+fraction*(curve.strain[index+1]-curve.strain[index]);
    let work=curve.work_density_j_m3[index];
    work+=(curve.pressure_pa[index]+pressure)/2*(strain-curve.strain[index]);
    layerStrains.push(strain);
    layerWorks.push(thickness*work);
   }
   strains.push(layerStrains);
   works.push(layerWorks);
  }
  const shortening=pressures.map((_,index)=>sum(foams.map((foam,foamIndex)=>foam.thickness_mm/1000*strains[foamIndex][index])));
  const column={pressure_pa:pressures,shortening_m:shortening,strain:strains,work_j_m2:works};
  prepareIntegrals(column,foams);
  return column;
 }

 function columnIntegrals(shortening,column,foams){
  const [index]=interval(column.shortening_m,shortening);
  const distance=shortening-column.shortening_m[index];
  const result=segmentIntegrals(column,foams,index,distance);
  const prefix=column.integrals;
  result[0]+=prefix.pressure[index];
  result[1]+=prefix.pressure_moment[index];
  for(let foamIndex=0;foamIndex<foams.length;foamIndex+=1){
   result[2][foamIndex]+=prefix.work[foamIndex][index];
   result[3][foamIndex]+=prefix.work_moment[foamIndex][index];
  }
  return result;
 }

 function columnState(shortening,column,foams){
  const [index,fraction]=interval(column.shortening_m,shortening);
  const pressure=column.pressure_pa[index]+fraction*(column.pressure_pa[index+1]-column.pressure_pa[index]);
  const strains=[];
  const works=[];
  for(let foamIndex=0;foamIndex<foams.length;foamIndex+=1){
   const strain=column.strain[foamIndex][index]+fraction*(column.strain[foamIndex][index+1]-column.strain[foamIndex][index]);
   let work=column.work_j_m2[foamIndex][index];
   work+=(column.pressure_pa[index]+pressure)/2*foams[foamIndex].thickness_mm/1000*(strain-column.strain[foamIndex][index]);
   strains.push(strain);
   works.push(work);
  }
  return [pressure,strains,works];
 }

 function contactState(advance,column,foams,settings){
  const radius=settings.dome.curvature_radius_mm/1000;
  const face=settings.dome.footprint_radius_mm/1000;
  const edgeGap=radius-Math.sqrt(radius**2-face**2);
  const contactRadiusSquared=advance<edgeGap?2*radius*advance-advance**2:face**2;
  const area=Math.PI*contactRadiusSquared;
  const low=columnIntegrals(Math.max(0,advance-edgeGap),column,foams);
  const high=columnIntegrals(advance,column,foams);
  const force=2*Math.PI*((radius-advance)*(high[0]-low[0])+high[1]-low[1]);
  const works=foams.map((_,index)=>2*Math.PI*((radius-advance)*(high[2][index]-low[2][index])+high[3][index]-low[3][index]));
  const [centerPressure,strains]=columnState(advance,column,foams);
  const handM=force/(settings.hand_stiffness_n_per_mm*1000);
  const handWork=force*handM/2;
  return {dome_m:advance,mass_m:advance+handM,force_n:force,area_m2:area,center_pressure_pa:centerPressure,strain:strains,foam_work_j:works,hand_m:handM,hand_work_j:handWork,total_work_j:sum(works)+handWork};
 }

 function traceRow(state,foams,massKg,incomingSpeed,speed,timeS){
  const components=foams.map((foam,index)=>{
   const compression=foam.thickness_mm*state.strain[index];
   return {strain:state.strain[index],compression_mm:compression,remaining_mm:foam.thickness_mm-compression,work_j:state.foam_work_j[index]};
  });
  const gloveCompression=sum(components.slice(0,-1).map(layer=>layer.compression_mm));
  const gloveThickness=sum(foams.slice(0,-1).map(foam=>foam.thickness_mm));
  return {time_s:timeS,force_n:state.force_n,speed_m_s:speed,kinetic_energy_j:massKg*speed**2/2,loading_impulse_n_s:massKg*(incomingSpeed-speed),dome_advance_mm:state.dome_m*1000,mass_advance_mm:state.mass_m*1000,contact_area_mm2:state.area_m2*1e6,center_pressure_pa:state.center_pressure_pa,glove_compression_mm:gloveCompression,glove_remaining_mm:gloveThickness-gloveCompression,glove_remaining_percent:100*(1-gloveCompression/gloveThickness),glove_work_j:sum(state.foam_work_j.slice(0,-1)),total_work_j:state.total_work_j,layers:components.slice(0,-1),target:components.at(-1),hand:{compression_mm:state.hand_m*1000,work_j:state.hand_work_j}};
 }

 function interpolate(xValues,yValues,x){
  const [index,fraction]=interval(xValues,x);
  return yValues[index]+fraction*(yValues[index+1]-yValues[index]);
 }

 function peakWindowRate(times,forces,windowS){
  if(times.at(-1)<windowS)return null;
  const lastStart=times.at(-1)-windowS;
  const starts=[0,lastStart];
  starts.push(...times.filter(time=>time>0&&time<lastStart));
  starts.push(...times.map(time=>time-windowS).filter(time=>time>0&&time<lastStart));
  return Math.max(...starts.map(start=>(interpolate(times,forces,start+windowS)-interpolate(times,forces,start))/windowS));
 }

 function summarize(rows,foams,curves,settings,energy,complete){
  const end=rows.at(-1);
  const times=rows.map(row=>row.time_s);
  const forces=rows.map(row=>row.force_n);
  const earlyS=settings.metrics.early_time_ms/1000;
  const windowS=settings.metrics.loading_rate_window_ms/1000;
  const sampleArea=settings.sample_width_mm*settings.sample_length_mm/1e6;
  const weightG=sum(foams.slice(0,-1).map(foam=>foam.density_kg_m3*sampleArea*foam.thickness_mm));
  const metrics={peak_force_n:null,time_to_peak_s:null,loading_rate_10_90_n_s:null,peak_loading_rate_n_s:null,loading_rate_window_s:windowS,force_at_5ms_n:null,loading_impulse_n_s:null,speed_at_peak_m_s:null,maximum_glove_compression_mm:null,maximum_glove_compression_percent:null,minimum_glove_thickness_mm:null,foam_sample_weight_g:weightG,early_time_s:earlyS,early_force_n:null,early_force_percent_of_peak:null,early_sample_time_s:null,peak_before_early_time:null,force_at_early_time_n:null,kinetic_energy_at_early_time_j:null,kinetic_energy_at_early_time_percent:null,components:null};
  if(end.time_s>=0.005)metrics.force_at_5ms_n=interpolate(times,forces,0.005);
  if(end.time_s>=earlyS){
   metrics.force_at_early_time_n=interpolate(times,forces,earlyS);
   const kinetic=interpolate(times,rows.map(row=>row.kinetic_energy_j),earlyS);
   metrics.kinetic_energy_at_early_time_j=kinetic;
   metrics.kinetic_energy_at_early_time_percent=100*kinetic/energy;
  }
  if(!complete)return metrics;
  const peak=end.force_n;
  const t10=interpolate(forces,times,0.1*peak);
  const t90=interpolate(forces,times,0.9*peak);
  const sampleTime=Math.min(earlyS,end.time_s);
  const earlyForce=interpolate(times,forces,sampleTime);
  const states=[...end.layers,end.target];
  const components=foams.map((foam,index)=>({role:foam.role,layer:foam.layer??null,foam_id:foam.foam_id,compression_mm:states[index].compression_mm,remaining_mm:states[index].remaining_mm,strain:states[index].strain,work_j:states[index].work_j,work_share_percent:100*states[index].work_j/energy,beyond_reference_fit:states[index].strain>curves[index].join_strain}));
  components.push({role:'hand',compression_mm:end.hand.compression_mm,work_j:end.hand.work_j,work_share_percent:100*end.hand.work_j/energy});
  Object.assign(metrics,{peak_force_n:peak,time_to_peak_s:end.time_s,loading_rate_10_90_n_s:0.8*peak/(t90-t10),peak_loading_rate_n_s:peakWindowRate(times,forces,windowS),loading_impulse_n_s:end.loading_impulse_n_s,speed_at_peak_m_s:end.speed_m_s,maximum_glove_compression_mm:end.glove_compression_mm,maximum_glove_compression_percent:100-end.glove_remaining_percent,minimum_glove_thickness_mm:end.glove_remaining_mm,early_force_n:earlyForce,early_force_percent_of_peak:100*earlyForce/peak,early_sample_time_s:sampleTime,peak_before_early_time:end.time_s<earlyS,components});
  return metrics;
 }

 function prepareFoams(request,catalog,settings){
  const catalogById=new Map(catalog.map(foam=>[foam.id,foam]));
  const requested=[...request.layers.map(layer=>({...layer,role:'glove'})),{...request.target,role:'target'}];
  const foams=[];
  const errors=[];
  for(const item of requested){
   const entry=catalogById.get(item.foam_id);
   const missing=[];
   if(!entry?.referenceCurve)missing.push('reference_curve');
   if(!entry?.densityKgM3)missing.push('density_kg_m3');
   if(!entry?.firmnessUnits)missing.push('firmness_units');
   if(!entry?.firmness?.length)missing.push('firmness_p1_value','firmness_p1_at_pct');
   if(missing.length){
    errors.push({foam_id:item.foam_id,role:item.role,layer:item.layer??null,missing_fields:missing});
    continue;
   }
   const conversions={Pa:1,kPa:1000,N:1/settings.indenter_area_m2,lbf:settings.pound_force_n/settings.indenter_area_m2};
   const conversion=conversions[entry.firmnessUnits];
   const anchors=entry.firmness.map(point=>[point.compressionPercent/100,point.value*conversion]).sort((left,right)=>left[0]-right[0]);
   if(anchors.some(([strain,pressure])=>strain<=0||strain>=1||pressure<=0)){
    return {error:{status:'error',reason:'invalid anchors',foam_id:item.foam_id,message:'Observations must have positive pressures and compression percentages between 0 and 100.'}};
   }
   foams.push({...item,materials:[entry.name],family:entry.family,subtype:entry.subtype,reference_curve:entry.referenceCurve,density_kg_m3:entry.densityKgM3,anchors,firmness_units:entry.firmnessUnits});
  }
  return errors.length?{error:{status:'error',reason:'incomplete data',errors}}:{foams};
 }

 function simulate(request,catalog,settings=assumptions){
  const prepared=prepareFoams(request,catalog,settings);
  if(prepared.error)return prepared.error;
  const foams=prepared.foams;
  const curves=[];
  for(const foam of foams){
   try{curves.push(materialCurve(foam,settings));}
   catch(error){return {status:'error',reason:'invalid foam curve',foam_id:foam.foam_id,message:error.message};}
  }
  const column=prepareColumn(foams,curves);
  const energy=request.mass_kg*request.speed_m_s**2/2;
  let low=0;
  let high=column.shortening_m.at(-1);
  let end=contactState(high,column,foams,settings);
  const complete=end.total_work_j>=energy;
  if(complete){
   for(let iteration=0;iteration<50;iteration+=1){
    const middle=(low+high)/2;
    const state=contactState(middle,column,foams,settings);
    if(state.total_work_j<energy)low=middle;
    else high=middle;
   }
   end=contactState((low+high)/2,column,foams,settings);
  }
  let previous=contactState(0,column,foams,settings);
  let previousSpeed=request.speed_m_s;
  let timeS=0;
  const rows=[traceRow(previous,foams,request.mass_kg,request.speed_m_s,previousSpeed,timeS)];
  const steps=settings.numerics.trajectory_steps;
  for(let index=1;index<=steps;index+=1){
   const fraction=index/steps;
   const advance=end.dome_m*(2*fraction-fraction**2);
   const state=index===steps?end:contactState(advance,column,foams,settings);
   let speed=Math.sqrt(2*Math.max(0,energy-state.total_work_j)/request.mass_kg);
   if(index===steps&&complete)speed=0;
   timeS+=2*(state.mass_m-previous.mass_m)/(previousSpeed+speed);
   rows.push(traceRow(state,foams,request.mass_kg,request.speed_m_s,speed,timeS));
   previous=state;
   previousSpeed=speed;
  }
  let numericalImpulse=0;
  for(let index=1;index<rows.length;index+=1){
   numericalImpulse+=(rows[index-1].force_n+rows[index].force_n)/2*(rows[index].time_s-rows[index-1].time_s);
  }
  return {status:complete?'complete':'incomplete',reason:complete?null:'Numerical pressure range ended before the striker stopped.',punch:{mass_kg:request.mass_kg,speed_m_s:request.speed_m_s,energy_j:energy},foams,assumptions:settings,metrics:summarize(rows,foams,curves,settings,energy,complete),trace:rows,reached:rows.at(-1),curves:curves.map((curve,index)=>({foam_id:foams[index].foam_id,role:foams[index].role,layer:foams[index].layer,fast:curve})),checks:{energy_residual_j:energy-end.total_work_j-rows.at(-1).kinetic_energy_j,integrated_force_n_s:numericalImpulse,impulse_residual_n_s:numericalImpulse-rows.at(-1).loading_impulse_n_s}};
 }

 function frontendResult(result){
  const response={};
  for(const key of ['status','reason','message','errors','metrics']){
   if(key in result)response[key]=result[key];
  }
  const trace=result.trace||[];
  const step=Math.max(1,Math.floor(trace.length/250));
  const rows=[];
  for(let index=0;index<trace.length;index+=step)rows.push(trace[index]);
  if(trace.length&&rows.at(-1)!==trace.at(-1))rows.push(trace.at(-1));
  response.trace=rows.map(row=>({time_s:row.time_s,force_n:row.force_n,speed_m_s:row.speed_m_s,glove_work_j:row.glove_work_j,glove_remaining_percent:row.glove_remaining_percent,layers:row.layers.map(layer=>({remaining_mm:layer.remaining_mm}))}));
  return response;
 }

 globalThis.FoamSimulation=Object.freeze({assumptions,simulate,simulateFrontend:(request,catalog)=>frontendResult(simulate(request,catalog)),frontendResult});
})();
