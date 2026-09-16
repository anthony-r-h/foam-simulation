/* Parameter-study execution, CSV download and comparison views. */
'use strict';
(() => {
 const $=id=>document.getElementById(id),M=FoamModel;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const nf=(x,n=1)=>Number.isFinite(x)?x.toLocaleString('en-CA',{minimumFractionDigits:n,maximumFractionDigits:n}):'Unavailable';
 const kn=value=>Number.isFinite(value)?value/1000:null;
 const baseline=JSON.parse($('study-baseline').textContent);
 let summary=FoamSweep.isCurrentStudy(baseline)?baseline:null,worker=null,workerUrl=null,csvParts=[],downloadParts=null,downloadName='',selectedTarget='eva50',yAxis='peak',selectedDesign=null,includeIncomplete=false,fileStream=null,writeQueue=Promise.resolve(),completed=0,totalTests=0;
 let scoring=null,currentFrontier=new Set();
 let bands=null,subset=null,survivors=new Set();
 let layerFilters={},outcomeRanges={},matchingAssignments={};
 const xAxis='weight';
 const comparisonId='builder-comparison';
 let comparison=null,comparisonError='';
 if(!summary)$('study-status').textContent=FoamSweep.STUDY_NAME+': 7,910 unique tests from 32,760 role assignments. Fixed 50 mm stacks against 50 mm EVA75.';
 function workerMain(){
  self.onmessage=event=>{
   try{
    const plan=event.data.plan||FoamSweep.createPlan(),rows=[];
    let chunk=FoamSweep.csvHeader()+'\r\n';
    self.postMessage({type:'start',total:plan.caseCount});
    for(let i=0;i<plan.caseCount;i++){
     const row=FoamSweep.calculateCase(plan,i);rows.push(FoamSweep.compactRow(row));chunk+=FoamSweep.csvRow(row)+'\r\n';
     if((i+1)%25===0||i+1===plan.caseCount){self.postMessage({type:'progress',done:i+1,total:plan.caseCount,csv:chunk});chunk='';}
    }
    self.postMessage({type:'complete',summary:FoamSweep.summarize(plan,rows)});
   }catch(error){self.postMessage({type:'error',message:error.message});}
  };
 }
 function stopWorker(){
  if(worker)worker.terminate();worker=null;
  if(workerUrl)URL.revokeObjectURL(workerUrl);workerUrl=null;
  $('run-study').disabled=false;$('cancel-study').hidden=true;
 }
 function downloadCsv(){
  if(!downloadParts)return;
  const url=URL.createObjectURL(new Blob(['\uFEFF',...downloadParts],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');
  link.href=url;link.download=downloadName;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
 }
 async function runStudy(plan){
  if(worker)return;
  if(window.showSaveFilePicker){
   try{const handle=await window.showSaveFilePicker({suggestedName:FoamSweep.STUDY_ID+'.csv',types:[{description:'CSV',accept:{'text/csv':['.csv']}}]});fileStream=await handle.createWritable();}catch(error){$('study-status').textContent=error.name==='AbortError'?'Study not started: file selection cancelled.':'Could not open CSV: '+error.message;return;}
  }
  completed=0;totalTests=0;writeQueue=Promise.resolve();csvParts=[];$('run-study').disabled=true;$('cancel-study').hidden=false;$('study-progress').hidden=false;$('study-progress').value=0;
  $('study-status').textContent='Starting the study. You can keep using the simulator while it runs.';
  try{
   const source=['foam-engine','impact-engine','sweep-engine'].map(id=>$(id).textContent).join('\n')+'\n('+workerMain.toString()+')();';
   workerUrl=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));worker=new Worker(workerUrl);
   worker.onmessage=async event=>{
    const data=event.data;
    if(data.type==='start'){totalTests=data.total;$('study-progress').max=data.total;}
    if(data.type==='progress'){
     completed=data.done;if(fileStream){const stream=fileStream;writeQueue=writeQueue.then(()=>stream.write(data.csv));writeQueue.catch(error=>{$('study-status').textContent='CSV write failed: '+error.message;stopWorker();});}else csvParts.push(data.csv);$('study-progress').value=data.done;
     $('study-status').textContent=`Calculated ${nf(data.done,0)} of ${nf(data.total,0)} tests (${nf(100*data.done/data.total,0)}%).`;
    }
    if(data.type==='complete'){
     if(fileStream){await writeQueue;await fileStream.close();fileStream=null;}summary=data.summary;downloadParts=csvParts.length?csvParts:null;csvParts=[];downloadName=FoamSweep.STUDY_ID+'-'+new Date().toISOString().replace(/[:.]/g,'-')+'.csv';
     stopWorker();$('download-study').hidden=!downloadParts;
     $('study-status').textContent=`Finished ${nf(summary.evaluatedCases,0)} tests. ${nf(summary.unresolvedCount,0)} unresolved; ${nf(summary.errorCount,0)} calculation errors. CSV downloaded.`;
     renderSummary();downloadCsv();
    }
    if(data.type==='error')await preservePartial('Study failed: '+data.message);
   };
   worker.onerror=event=>preservePartial('Study failed: '+event.message);
   worker.postMessage(plan?{plan}:{});
  }catch(error){stopWorker();csvParts=[];$('study-status').textContent='Study could not start: '+error.message;}
 }
 function updateComparison(){
  comparison=null;comparisonError='';
  try{
   const evaluated=FoamSweep.compareStack(foamApp.getState().layers),r=evaluated.result,last=r.trace.rows.at(-1);
   comparison={id:comparisonId,label:'Your stack - 50 mm',thicknessMm:50,foamWeightG:r.foamWeightG,eligible:r.loadingComplete,layers:evaluated.layers,targets:[{
    id:'eva50',baselinePeakN:r.loadingComplete?r.F:null,baselineEarlyPercent:r.earlyLoading?.available?r.earlyLoading.peakPercent:null,
    baselineTimeMs:r.loadingComplete?r.trace.time*1000:null,baselineFoamLeftMm:r.left,baselineFistSpeed:r.loadingComplete?last.v:null,
    baselineImpulseNs:r.trace.impulse,baselineEnergy10J:r.energyAt10ms?.energyJ??null,energy10Reason:r.energyAt10ms?.reason||'',status:r.loadingComplete?'resolved':'unresolved'
   }]};
  }catch(error){comparisonError=error.message;}
 }
 function targetResult(design,id=selectedTarget){return design.targets.find(t=>t.id===id);}
 function layerRows(roles){return FoamSweep.DISPLAY_ROLE_IDS.map(role=>{const l=roles.find(r=>r.role===role);return `<tr><th scope="row">${esc(FoamSweep.ROLE_LABELS[role])}</th><td>${esc(FoamSweep.MATERIAL_NAMES[l.materialId])}</td><td>${nf(l.thicknessMm,0)} mm</td></tr>`;}).join('');}
 function selectedOutcomes(design){
  const r=targetResult(design),initialEnergy=.5*FoamSweep.IMPACT.mass*FoamSweep.IMPACT.speed**2;
  const metric=(label,value,unit,detail='')=>`<div class="metric"><div class="label">${label}</div><div class="value">${Number.isFinite(value)?nf(value,unit==='kN'||unit==='Ns'||unit==='g'||unit==='m/s'?2:1)+`<span class="unit">${unit}</span>`:'Not available'}</div>${detail?`<div class="sub">${esc(detail)}</div>`:''}</div>`;
  return `<div class="metrics study-selected-outcomes">${metric('Peak force',kn(r?.baselinePeakN),'kN')}${metric('Force reached by 10 ms',r?.baselineEarlyPercent,'%',FoamSweep.buildupRegion('early',r?.baselineEarlyPercent)?.label)}${metric('Time to peak',r?.baselineTimeMs,'ms',FoamSweep.buildupRegion('time',r?.baselineTimeMs)?.label)}${metric('Impact kinetic energy remaining at 10 ms',Number.isFinite(r?.baselineEnergy10J)?100*r.baselineEnergy10J/initialEnergy:null,'%',Number.isFinite(r?.baselineEnergy10J)?`${nf(r.baselineEnergy10J,2)} J remaining of ${nf(initialEnergy,2)} J initially.`:'')}${metric('Impulse',r?.baselineImpulseNs,'Ns')}${metric('Foam weight',design.foamWeightG,'g')}${metric('Fist speed at peak',r?.baselineFistSpeed,'m/s')}${metric('Thickness remaining',FoamSweep.metricValue(design,'remaining',selectedTarget),'%')}</div>${r?.status!=='resolved'?`<p class="tiny">Status: ${esc(r?.status||'not-run')}</p>`:''}`;
 }
 function showDesign(id){
  const design=id===comparisonId?comparison:summary.designs.find(d=>d.id===id);if(!design)return;selectedDesign=id;
  const isComparison=id===comparisonId,title=isComparison?design.label:'Test '+design.testNumber;
  $('study-point-detail').textContent=isComparison?'Your layer-builder stack, scaled proportionally to 50 mm and evaluated under the study settings.':`Test ${design.testNumber}: ${nf(design.foamWeightG,2)} g. ${FoamSweep.BUILDUP_REGIONS[yAxis]?(FoamSweep.buildupRegion(yAxis,axes[yAxis].value(design))?.label||'Buildup unavailable'):currentFrontier.has(design.id)?'On the frontier for the displayed axes.':design.eligible?'Off the frontier for the displayed axes.':'Incomplete test; excluded from the frontier.'}.`;
  $('study-selected').innerHTML=`<h3>${esc(title)}</h3><p class="tiny">Layers from the outside of the glove to your hand.</p><div class="table-wrap"><table id="study-layer-name" class="study-table study-layers"><thead><tr><th>Layer</th><th>Material</th><th>Thickness</th></tr></thead><tbody>${isComparison?design.layers.map(l=>`<tr><th scope="row">${esc(l.name)}</th><td>${esc(M.MATERIALS[l.grade]?.label||l.grade)}${l.edited?' (edited)':''}</td><td>${nf(l.h,2)} mm</td></tr>`).join(''):layerRows(matchingAssignments[design.id]||design.roleAssignments[0])}</tbody></table></div>${selectedOutcomes(design)}<p class="tiny">Nominal foam response. Weight: ${nf(design.foamWeightG,2)} g for the 30 &times; 30 mm sample. ${isComparison?'Comparison point; separate from the enumerated study tests.':'All outcomes and assumptions are included in the CSV.'}</p>`;

 }
 const axes=Object.fromEntries(FoamSweep.METRICS.map(m=>[m.id,{label:m.label+' ('+m.unit+')',direction:m.direction,value:d=>FoamSweep.metricValue(d,m.id,selectedTarget)}]));
 function layerFilterMarkup(){
  return `<section class="study-filter-group" aria-labelledby="study-layer-filter-title"><h3 id="study-layer-filter-title">Filter by layer</h3><p class="tiny">Choose a material and thickness range for any layer. All requirements must fit the same stack. Leave a field blank to allow any thickness.</p><div class="table-wrap"><table class="study-table"><thead><tr><th>Layer</th><th>Material</th><th>Min (mm)</th><th>Max (mm)</th></tr></thead><tbody>${FoamSweep.DISPLAY_ROLE_IDS.map(role=>{
   const f=layerFilters[role]||{};
   return `<tr><th scope="row">${esc(FoamSweep.ROLE_LABELS[role])}</th><td><select id="study-material-${role}" aria-label="${esc(FoamSweep.ROLE_LABELS[role])} material"><option value="">Any material</option>${FoamSweep.MATERIAL_IDS.map(id=>`<option value="${id}" ${f.materialId===id?'selected':''}>${esc(FoamSweep.MATERIAL_NAMES[id])}</option>`).join('')}</select></td>${['min','max'].map(bound=>`<td><input id="study-${bound}-${role}" class="study-allowance" type="number" min="0" max="50" step="1" value="${f[bound+'Mm']??''}" placeholder="Any" aria-label="${esc(FoamSweep.ROLE_LABELS[role])} ${bound==='min'?'minimum':'maximum'} thickness (mm)"></td>`).join('')}</tr>`;
  }).join('')}</tbody></table></div><button id="study-clear-layers">Clear layer filters</button></section>`;
 }
 function bindLayerFilters(){
  for(const role of FoamSweep.DISPLAY_ROLE_IDS){
   for(const field of ['material','min','max'])$('study-'+field+'-'+role).onchange=()=>{
    const materialId=$('study-material-'+role).value,filter={materialId};
    for(const bound of ['min','max']){
     const input=$('study-'+bound+'-'+role),value=input.valueAsNumber;
     if(input.value!==''&&(!Number.isInteger(value)||value<0||value>50)){input.value=layerFilters[role]?.[bound+'Mm']??'';return;}
     if(input.value!=='')filter[bound+'Mm']=value;
    }
    if(materialId||filter.minMm!=null||filter.maxMm!=null)layerFilters[role]=filter;else delete layerFilters[role];
    refreshSubset();
   };
  }
  $('study-clear-layers').onclick=()=>{layerFilters={};for(const role of FoamSweep.DISPLAY_ROLE_IDS)for(const field of ['material','min','max'])$('study-'+field+'-'+role).value='';refreshSubset();};
 }
 function outcomeFilterMarkup(){
  return `<section class="study-filter-group" aria-labelledby="study-outcome-filter-title"><h3 id="study-outcome-filter-title">Filter by outcome</h3><p class="tiny">Enter minimum and maximum values in the units shown. Limits are inclusive; blank means unrestricted. Designs must meet every selected range and layer requirement. Missing values cannot pass an active range.</p><div class="table-wrap"><table class="study-table"><thead><tr><th>Outcome</th><th>Minimum</th><th>Maximum</th></tr></thead><tbody>${FoamSweep.METRICS.map(m=>`<tr><th scope="row">${esc(m.label)} (${esc(m.unit)})</th>${['min','max'].map(bound=>`<td><input id="study-outcome-${bound}-${m.id}" class="study-allowance" type="number" step="any" value="${outcomeRanges[m.id]?.[bound]??''}" placeholder="Any" aria-label="${esc(m.label)} ${bound==='min'?'minimum':'maximum'} (${esc(m.unit)})"></td>`).join('')}</tr>`).join('')}</tbody></table></div><button id="study-clear-outcomes">Clear outcome filters</button></section>`;
 }
 function bindOutcomeFilters(){
  for(const m of FoamSweep.METRICS)for(const bound of ['min','max'])$('study-outcome-'+bound+'-'+m.id).onchange=()=>{
   const input=$('study-outcome-'+bound+'-'+m.id),value=input.valueAsNumber;
   if(input.validity.badInput||input.value!==''&&!Number.isFinite(value)){input.value=outcomeRanges[m.id]?.[bound]??'';return;}
   const range={...outcomeRanges[m.id]};
   if(input.value==='')delete range[bound];else range[bound]=value;
   if(Object.keys(range).length)outcomeRanges[m.id]=range;else delete outcomeRanges[m.id];
   refreshSubset();
  };
  $('study-clear-outcomes').onclick=()=>{outcomeRanges={};for(const m of FoamSweep.METRICS)for(const bound of ['min','max'])$('study-outcome-'+bound+'-'+m.id).value='';refreshSubset();};
 }
 function subsetMarkup(){
  return `<div class="study-subset-toolbar"><button id="study-download-subset">Download surviving designs</button></div><details class="study-ranges"><summary>Outcome ranges among survivors</summary><div id="study-survivor-ranges"></div></details>`;
 }
 function refreshSubset(){
  matchingAssignments={};
  for(const design of summary.designs){const roles=FoamSweep.matchingRoleAssignment(design,layerFilters);if(roles)matchingAssignments[design.id]=roles;}
  subset=FoamSweep.filterFrontierBands(bands);
  subset.ids=summary.designs.filter(d=>matchingAssignments[d.id]&&FoamSweep.matchesOutcomeRanges(d,outcomeRanges,selectedTarget)).map(d=>d.id);subset.outcomeRanges=structuredClone(outcomeRanges);subset.layerFilters=structuredClone(layerFilters);subset.matchingAssignments=matchingAssignments;
  survivors=new Set(subset.ids);
  $('study-download-subset').disabled=survivors.size===0;
  const designs=summary.designs.filter(d=>survivors.has(d.id));
  $('study-survivor-ranges').innerHTML=`<div class="table-wrap"><table class="study-table"><thead><tr><th>Outcome</th><th>Available</th><th>Lowest</th><th>Median</th><th>Highest</th></tr></thead><tbody>${FoamSweep.METRICS.map(m=>{
   const values=designs.map(d=>FoamSweep.metricValue(d,m.id,selectedTarget)).filter(Number.isFinite).sort((a,b)=>a-b),mid=Math.floor(values.length/2),median=values.length?(values.length%2?values[mid]:(values[mid-1]+values[mid])/2):null;
   return `<tr><td>${esc(m.label)} (${esc(m.unit)})</td><td>${nf(values.length,0)}</td><td>${nf(values[0],2)}</td><td>${nf(median,2)}</td><td>${nf(values.at(-1),2)}</td></tr>`;
  }).join('')}</tbody></table></div>`;
  drawStudy();
  if(selectedDesign&&(survivors.has(selectedDesign)||selectedDesign===comparisonId&&comparison))showDesign(selectedDesign);
  else{
   const candidate=designs[0];
   if(candidate)showDesign(candidate.id);
   else{selectedDesign=null;$('study-point-detail').textContent='';$('study-selected').innerHTML='<p>No designs remain. Adjust or clear the layer and outcome filters.</p>';}
  }
 }
 function downloadSubset(){
  const csv=FoamSweep.rankingCsv(summary,scoring,{bands,selection:subset}),url=URL.createObjectURL(new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');
  link.href=url;link.download=FoamSweep.STUDY_ID+'-filtered-designs.csv';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
 }
 function axisOptions(selected){return Object.entries(axes).filter(([id])=>id!=='weight').map(([id,axis])=>`<option value="${id}" ${id===selected?'selected':''}>${esc(axis.label)}</option>`).join('');}
 function inspectStudyPoint(event){const point=event.target.closest('[data-study-design]');if(point)showDesign(point.dataset.studyDesign);}
 function drawStudy(){
  const el=$('study-chart');if(!el||!summary?.designs)return;
  const regions=FoamSweep.BUILDUP_REGIONS[yAxis];
  currentFrontier=new Set(regions?[]:FoamSweep.pairFrontier(summary.designs,xAxis,yAxis,scoring.directions,selectedTarget));
  const x=axes[xAxis],y=axes[yAxis],available=summary.designs.filter(d=>includeIncomplete||d.eligible);
  const fullValues=available.filter(d=>Number.isFinite(x.value(d))&&Number.isFinite(y.value(d))),filtered=available.filter(d=>survivors.has(d.id)),designs=fullValues.filter(d=>survivors.has(d.id));
  $('study-frontier-caption').textContent=regions?regions.map(r=>r.label+': '+r.range).join(' | ')+'. Descriptive buildup regions, not quality ratings.'+(yAxis==='early'?' F10/Fmax samples at min(10 ms, time to peak); an earlier peak is 100%.':''):`Green: ${nf(designs.filter(d=>currentFrontier.has(d.id)).length,0)} visible of ${nf(currentFrontier.size,0)} full-study frontier tests for ${x.label} (${x.direction} is better) and ${y.label} (${y.direction} is better). No other resolved test is as good on both and strictly better on at least one. Changing the Y outcome changes this frontier; filtering does not recalculate it.`;
  $('study-plot-status').textContent=`${nf(designs.length,0)} of ${nf(filtered.length,0)} surviving designs eligible for this view plotted; ${nf(filtered.length-designs.length,0)} lack an axis value. All available points are included; overlapping points may coincide.`;
  const showComparison=comparison&&Number.isFinite(x.value(comparison))&&Number.isFinite(y.value(comparison));
  $('study-comparison-note').textContent=comparisonError?'Your stack comparison unavailable: '+comparisonError:'Gold diamond: your stack scaled to 50 mm, using the study striker, 2.597 kg at 7.7 m/s, 50 mm EVA75 target and fixed model settings. It stays visible through filters and does not change the study frontier.'+(comparison&&!comparison.eligible?' The calculation did not resolve a peak.':'')+(!showComparison?' No comparison point is plotted: an axis value is unavailable.':'');
  if(!designs.length&&!showComparison){el.textContent='No surviving tests have values for both axes. Adjust the layer or outcome filters, or choose another outcome.';return;}
  const w=Math.max(300,el.clientWidth),h=400,L=72,R=20,T=20,B=64;
  function domain(axis){
   const values=[...fullValues,...(showComparison?[comparison]:[])].map(axis.value),low=Math.min(...values),high=Math.max(...values);
   const pad=high===low?Math.max(Math.abs(low)*.05,1):(high-low)*.06;
   return [low-pad,high+pad];
  }
  const [xmin,xmax]=domain(x),[ymin,ymax]=domain(y);
  const sx=value=>L+(value-xmin)/(xmax-xmin)*(w-L-R),sy=value=>h-B-(value-ymin)/(ymax-ymin)*(h-T-B);
  const tick=(value,span)=>Math.abs(span)<.01?value.toExponential(2):nf(value,Math.abs(span)<1?3:Math.abs(span)<10?2:1);
  let svg=`<svg viewBox="0 0 ${w} ${h}" role="group" aria-label="Scatter plot: ${esc(y.label)} versus ${esc(x.label)}"><text transform="translate(16 ${(T+h-B)/2}) rotate(-90)" text-anchor="middle" font-size="12" fill="#63716a">${esc(y.label)}</text>`;
  for(const region of regions||[]){
   const low=Math.max(ymin,region.min),high=Math.min(ymax,region.max);
   if(high<=low)continue;
   const top=sy(high),height=sy(low)-top;
   svg+=`<rect class="study-buildup-region" x="${L}" y="${top}" width="${w-L-R}" height="${height}" fill="${region.color}" fill-opacity=".13"><title>${esc(region.label+': '+region.range)}</title></rect>`;
   if(height>=22)svg+=`<text x="${w-R-6}" y="${top+15}" text-anchor="end" font-size="11" fill="${region.color}">${esc(region.label)}</text>`;
  }
  for(let i=0;i<=4;i++){
   const xv=xmin+(xmax-xmin)*i/4,yv=ymin+(ymax-ymin)*i/4;
   svg+=`<line x1="${L}" x2="${w-R}" y1="${sy(yv)}" y2="${sy(yv)}" stroke="#e4e8e1"/><text x="${L-8}" y="${sy(yv)+4}" text-anchor="end" font-size="11" fill="#63716a">${tick(yv,ymax-ymin)}</text><text x="${sx(xv)}" y="${h-B+21}" text-anchor="middle" font-size="11" fill="#63716a">${tick(xv,xmax-xmin)}</text>`;
  }
  for(const d of designs.toSorted((a,b)=>Number(currentFrontier.has(a.id))-Number(currentFrontier.has(b.id)))){
   const description=`Test ${d.testNumber}: ${FoamSweep.assignmentName(matchingAssignments[d.id]||d.roleAssignments[0])}; ${x.label}: ${nf(x.value(d),3)}; ${y.label}: ${nf(y.value(d),3)}${regions?'; '+FoamSweep.buildupRegion(yAxis,y.value(d))?.label:''}`;
   svg+=`<circle class="study-point" data-study-design="${esc(d.id)}" cx="${sx(x.value(d))}" cy="${sy(y.value(d))}" r="${currentFrontier.has(d.id)?4.5:3}" fill="${regions?FoamSweep.buildupRegion(yAxis,y.value(d))?.color:currentFrontier.has(d.id)?'#2c6250':'#b5bcb6'}" fill-opacity=".7" tabindex="0" role="button" aria-label="${esc(description)}"><title>${esc(description)}</title></circle>`;
  }
  if(showComparison){
   const cx=sx(x.value(comparison)),cy=sy(y.value(comparison)),description=`${comparison.label}: ${x.label}: ${nf(x.value(comparison),3)}; ${y.label}: ${nf(y.value(comparison),3)}`;
   svg+=`<path id="study-comparison-point" data-study-design="${comparisonId}" d="M ${cx} ${cy-8} L ${cx+8} ${cy} L ${cx} ${cy+8} L ${cx-8} ${cy} Z" fill="#bb925c" stroke="#243c35" stroke-width="2" tabindex="0" role="button" aria-label="${esc(description)}"><title>${esc(description)}</title></path>`;
  }
  el.innerHTML=svg+`<text x="${(L+w-R)/2}" y="${h-8}" text-anchor="middle" font-size="12" fill="#63716a">${esc(x.label)}</text></svg>`;
  el.onclick=inspectStudyPoint;el.addEventListener('focusin',inspectStudyPoint);
  el.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();inspectStudyPoint(event);}};
 }
 function renderSummary(){
  const el=$('study-analysis');if(!summary?.designs){el.innerHTML='<p class="tiny">Run the study to generate the comparisons.</p>';return;}
  scoring=FoamSweep.scoreStudy(summary,{},selectedTarget);
  bands=FoamSweep.frontierBands(summary,scoring.directions,selectedTarget);
  includeIncomplete=summary.eligibleDesignCount===0;
  el.innerHTML=`<p class="tiny">${summary.complete?'Complete grid':'Partial grid'} &middot; 50 mm stacks against 50 mm EVA75. Adult reference: 2.597 kg at 7.7 m/s. Comparisons apply to this model and enumerated grid.</p><h3>Explore the tradeoffs</h3><p class="tiny">F10/Fmax and time to peak show descriptive buildup regions. Other outcomes show their frontier against weight. Choose the outcome for the Y axis below. Foam sample weight is fixed on the X axis.</p><details class="study-frontier-method"><summary>Outcome directions and frontiers</summary><div class="table-wrap"><table class="study-table"><thead><tr><th>Outcome</th><th>Better direction</th><th>Weight frontier</th></tr></thead><tbody>${FoamSweep.METRICS.map(m=>`<tr><td>${esc(m.label)} (${esc(m.unit)})</td><td>${FoamSweep.BUILDUP_REGIONS[m.id]?'Descriptive regions':m.direction==='higher'?'Higher':'Lower'}</td><td>${m.id==='weight'||FoamSweep.BUILDUP_REGIONS[m.id]?'&mdash;':`<button class="study-test-link" data-frontier-metric="${m.id}">${nf(scoring.frontiers[m.id].length,0)} tests</button>`}</td></tr>`).join('')}</tbody></table></div><p class="tiny">Thickness remaining is 100 &times; remaining thickness / original thickness. These directions are exploration preferences, not validated protection ratings. F10/Fmax samples at min(10 ms, time to peak), so a lower ratio can also result from a higher peak. Energy uses exactly 10 ms.</p></details><div class="study-filter-grid">${layerFilterMarkup()}${outcomeFilterMarkup()}</div>${subsetMarkup()}<section class="study-plot-panel" aria-label="Study comparison graph"><h3>Compare designs</h3><div class="study-axis-controls"><div class="study-fixed-axis"><span>X axis</span><strong>Foam sample weight (g)</strong></div><label>Y axis<select id="study-y-axis">${axisOptions(yAxis)}</select></label></div><label class="study-filter"><input id="study-incomplete" type="checkbox" ${includeIncomplete?'checked':''}> Include designs with incomplete tests</label><p id="study-plot-status" class="tiny" role="status"></p><div id="study-chart"></div><div class="study-chart-notes"><p id="study-frontier-caption" class="tiny"></p><p id="study-comparison-note" class="tiny" role="status"></p></div></section><section class="study-selection-panel" aria-label="Selected stack"><div class="study-section-label">Selected stack</div><p id="study-point-detail"></p><div id="study-selected"></div></section><p class="tiny"><a href="#study-method" class="method-link">Grid definition and limits</a></p>`;
  $('study-y-axis').addEventListener('change',()=>{yAxis=$('study-y-axis').value;drawStudy();if(selectedDesign)showDesign(selectedDesign);});
  $('study-incomplete').onchange=()=>{includeIncomplete=$('study-incomplete').checked;drawStudy();};
  for(const button of el.querySelectorAll('[data-frontier-metric]'))button.onclick=()=>{yAxis=button.dataset.frontierMetric;$('study-y-axis').value=yAxis;drawStudy();if(selectedDesign)showDesign(selectedDesign);};
  bindLayerFilters();bindOutcomeFilters();$('study-download-subset').onclick=downloadSubset;updateComparison();refreshSubset();
 }
 $('run-study').onclick=()=>runStudy();$('download-study').onclick=downloadCsv;
 async function preservePartial(message){
  stopWorker();
  if(fileStream){await writeQueue;await fileStream.close();fileStream=null;}
  if(csvParts.length){downloadParts=csvParts;downloadName=FoamSweep.STUDY_ID+'-partial.csv';$('download-study').hidden=false;}
  csvParts=[];$('study-progress').hidden=true;
  $('study-status').textContent=`${message} ${nf(completed,0)} completed tests preserved; ${nf(totalTests-completed,0)} tests not recorded. Previous analysis, if any, remains displayed.`;
 }
 $('cancel-study').onclick=()=>preservePartial('Study cancelled.');
 let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(drawStudy,150);});
 window.addEventListener('foam-stack-changed',()=>{updateComparison();drawStudy();if(selectedDesign===comparisonId){if(comparison)showDesign(comparisonId);else{$('study-point-detail').textContent='';$('study-selected').textContent='Your stack comparison unavailable: '+comparisonError;}}});
 Object.assign(foamApp,{runStudy,getStudy:()=>summary,getStudyScoring:()=>scoring,getStudySubset:()=>subset,getStudyComparison:()=>comparison,studyRunning:()=>!!worker});renderSummary();
})();
