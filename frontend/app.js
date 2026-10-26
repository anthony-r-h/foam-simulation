/* Catalog-backed inputs for the browser simulation. */
'use strict';
(() => {
 const $=id=>document.getElementById(id);
 const esc=value=>String(value??'').replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
 const catalog=JSON.parse($('foam-catalog').textContent);
 const catalogById=new Map(catalog.map(foam=>[foam.id,foam]));
 const materialGroups=['EVA','Latex','High-resilience PU','Other PU'];
 const catalogByGroup=new Map(materialGroups.map(group=>[
  group,
  catalog.filter(foam=>materialGroup(foam)===group).sort((a,b)=>a.name.localeCompare(b.name))
 ]));
 const colors=['#d7c3a6','#a5c7da','#d6a5bb','#a4cdb9'];
 const target=Object.freeze({foam_id:'cutfoam-eva75',thickness_mm:50});
 const impactLevels=[
  {label:'Light',energy:5},
  {label:'Child',energy:20},
  {label:'Developing',energy:45},
  {label:'Adult',speed:7.7},
  {label:'Boxer',energy:121},
  {label:'Gorilla',energy:200}
 ];
 const presets=[
  {id:'soft',label:'Soft',layers:[
   ['foam-factory-dunlop-latex-29-ild',20],
   ['foamonline-high-resilience-very-soft',20],
   ['evazote-ev50',5],
   ['foam-factory-super-soft',5]
  ]},
  {id:'medium',label:'Medium',layers:[
   ['foam-factory-dunlop-latex-29-ild',20],
   ['foamonline-high-resilience-medium-firm',20],
   ['cutfoam-eva75',5],
   ['foam-factory-super-soft',5]
  ]},
  {id:'hard',label:'Hard',layers:[
   ['foam-factory-dunlop-latex-29-ild',20],
   ['foamonline-high-resilience-extra-firm',20],
   ['cutfoam-eva240',5],
   ['foam-factory-super-soft',5]
  ]}
 ];
 let activePreset='medium';
 let layers=layersFromPreset(activePreset);
 let result=null;
 let calculation=0;

 function layersFromPreset(presetId){
  const preset=presets.find(item=>item.id===presetId);
  if(!preset)throw Error(`Unknown preset: ${presetId}`);
  return preset.layers.map(([foamId,thicknessMm],index)=>{
   if(!catalogById.has(foamId))throw Error(`Unknown foam: ${foamId}`);
   return {id:`layer-${index+1}`,foamId,thicknessMm,color:colors[index]};
  });
 }

 function number(value,digits=1){
  return Number(value).toLocaleString('en-CA',{maximumFractionDigits:digits});
 }

 function materialGroup(foam){
  if(foam.family==='EVA')return 'EVA';
  if(foam.family==='Latex')return 'Latex';
  if(/high[_ -]?resilience/i.test(foam.subtype))return 'High-resilience PU';
  return 'Other PU';
 }

 function materialType(foam){
  const subtype=foam.subtype.toLowerCase();
  if(foam.family==='EVA')return subtype.includes('eva_pe')?'Closed-cell EVA/PE':'Closed-cell EVA';
  if(foam.family==='Latex')return 'Dunlop latex';
  if(subtype.includes('high_resilience')||subtype.includes('high-resilience'))return 'High-resilience PU';
  if(subtype.includes('reticulated'))return 'Reticulated PU';
  if(subtype.includes('microcellular'))return 'Microcellular PU';
  return 'Conventional PU';
 }

 function materialOptions(selectedId){
  return materialGroups.map(group=>{
   const entries=catalogByGroup.get(group);
   return `<optgroup label="${esc(group)}">${entries.map(foam=>`<option value="${esc(foam.id)}" ${foam.id===selectedId?'selected':''}>${esc(foam.name)}</option>`).join('')}</optgroup>`;
  }).join('');
 }

 function firmnessText(foam){
  return foam.firmness.map(point=>`${number(point.value,2)} ${foam.firmnessUnits} at ${number(point.compressionPercent,1)}%`).join(', ');
 }

 function layerPosition(index){
  return ['Outside','Main cushion','Support','Hand comfort'][index];
 }

 function message(text){
  $('error').hidden=!text;
  $('error').textContent=text||'';
 }

 function readImpact(){
  const level=impactLevels[Number($('impact-level').value)];
  // Retain the existing energy reference points and Adult's original inputs.
  const mass=2.597;
  const speed=level.speed??Math.sqrt(2*level.energy/mass);
  return {mass,speed,energy:mass*speed*speed/2,label:level.label};
 }

 function renderImpact(){
  const impact=readImpact();
  $('impact-energy').textContent=number(impact.energy,1);
  $('impact-description').style.setProperty('--impact-position',Number($('impact-level').value)/(impactLevels.length-1));
  $('impact-level').setAttribute('aria-valuetext',impact.label);
  $('impact-points').innerHTML=impactLevels.map((item,index)=>`<span class="reference-point ${item.label===impact.label?'reference-point--active':''}" style="--position:${index*100/(impactLevels.length-1)}%"><span>${esc(item.label)}</span></span>`).join('');
 }

 function renderLayers(){
  const expanded=new Set([...$('layers').querySelectorAll('details[open]')].map(details=>details.closest('[data-layer]').dataset.layer));
  $('preset-buttons').innerHTML=presets.map(preset=>`<button data-preset="${preset.id}" class="${preset.id===activePreset?'active':''}" aria-pressed="${preset.id===activePreset}">${preset.label}</button>`).join('');
  $('total-thickness').textContent=number(layers.reduce((total,layer)=>total+layer.thicknessMm,0),0);
  $('layers').innerHTML=layers.map((layer,index)=>{
   const foam=catalogById.get(layer.foamId);
   return `<article class="layer" data-layer="${esc(layer.id)}">
    <div class="layer-title"><i class="swatch" style="--c:${layer.color}" aria-hidden="true"></i><strong>${esc(layerPosition(index))}</strong></div>
    <div class="field-grid">
     <label class="field">Material<select data-field="foamId">${materialOptions(layer.foamId)}</select></label>
     <label class="field">Thickness (mm)<input data-field="thicknessMm" type="number" min="1" step="1" inputmode="numeric" value="${layer.thicknessMm}"></label>
    </div>
    <details class="material-details" ${expanded.has(layer.id)?'open':''}>
    <summary>Material details</summary>
    <dl class="foam-data">
     <div><dt>Type</dt><dd>${esc(materialType(foam))}</dd></div>
     <div><dt>Density</dt><dd>${number(foam.densityKgM3,1)} kg/m³</dd></div>
     <div><dt>Firmness</dt><dd>${esc(firmnessText(foam))}</dd></div>
    </dl>
    </details>
   </article>`;
  }).join('');
 }

 function finite(value){
  return value!==null&&value!==''&&Number.isFinite(Number(value));
 }

 function value(value,digits=1,suffix=''){
  return finite(value)?`${number(Number(value),digits)}${suffix}`:'—';
 }

 function scaled(value,factor){
  return finite(value)?Number(value)*factor:null;
 }

 function resultRow(label,main,detail=''){
  return `<div class="result-row"><dt>${esc(label)}</dt><dd><strong>${esc(main)}</strong>${detail?` <small>(${esc(detail)})</small>`:''}</dd></div>`;
 }

 function foamShape(index,thicknessMm,color){
  // Simple sample blocks until the external foam geometry is available.
  const depth=Math.max(5,Math.min(24,thicknessMm));
  return `<svg class="foam-shape" viewBox="0 0 440 190" aria-hidden="true" focusable="false">
   <defs><linearGradient id="foam-surface-${index}" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="${color}"/><stop offset="1" stop-color="${color}" stop-opacity=".8"/></linearGradient></defs>
   <path d="M55 80 L220 138 V${138+depth} L55 ${80+depth} Z" fill="${color}" fill-opacity=".7" stroke="${color}"/>
   <path d="M220 138 L385 80 V${80+depth} L220 ${138+depth} Z" fill="${color}" fill-opacity=".5" stroke="${color}"/>
   <path d="M55 80 L220 22 L385 80 L220 138 Z" fill="url(#foam-surface-${index})" stroke="${color}" stroke-width="1"/>
  </svg>`;
 }

 function renderLayerResponse(components){
  return `<figure class="foam-response" aria-label="Foam layers and impact response">${layers.map((layer,index)=>{
   const component=components.find(item=>Number(item.layer)===index+1)||{};
   return `<div class="foam-response-layer" data-response-layer="${index+1}">
    ${foamShape(index,layer.thicknessMm,layer.color)}
    <div class="response-callout">
     <h3 class="response-title">${esc(layerPosition(index))}<span>${number(layer.thicknessMm,0)} mm</span></h3>
     <dl class="response-values">
      <div><dt>Compressed to</dt><dd>${value(component.remaining_mm,1,' mm')}</dd></div>
      <div><dt>Compression work</dt><dd>${value(component.work_j,1,' J')}</dd></div>
     </dl>
    </div>
   </div>`;
  }).join('')}</figure>`;
 }

 function renderResults(){
  if(!result){
   $('results').innerHTML='<p class="empty-state">Results will appear after simulation.</p>';
   return;
  }
  if(result.status==='error'){
   $('results').innerHTML=`<p class="result-status result-status--error">${esc(result.message||result.reason||'The simulation could not be completed.')}</p>`;
   return;
  }
  const metrics=result.metrics||{};
  const earlyMs=finite(metrics.early_time_s)?number(metrics.early_time_s*1000,1):'10';
  const earlyForce=finite(metrics.early_force_n)?metrics.early_force_n:metrics.force_at_early_time_n;
  const loadingWindow=finite(metrics.loading_rate_window_s)?`${number(metrics.loading_rate_window_s*1000,1)} ms window`:'';
  const thicknessDetail=[value(metrics.maximum_glove_compression_percent,1,'% compressed'),value(metrics.minimum_glove_thickness_mm,1,' mm remaining')].filter(item=>item!=='—').join(', ');
  const summaryRows=[
   resultRow('Peak force',value(scaled(metrics.peak_force_n,.001),2,' kN')),
   resultRow('Force at 5 ms',value(scaled(metrics.force_at_5ms_n,.001),2,' kN')),
   resultRow(`Force by ${earlyMs} ms`,value(scaled(earlyForce,.001),2,' kN'),value(metrics.early_force_percent_of_peak,1,'% of peak')),
   resultRow('Time to peak',value(scaled(metrics.time_to_peak_s,1000),2,' ms')),
   resultRow(`Energy remaining at ${earlyMs} ms`,value(metrics.kinetic_energy_at_early_time_j,1,' J'),value(metrics.kinetic_energy_at_early_time_percent,1,'%')),
   resultRow('10–90% loading rate',value(scaled(metrics.loading_rate_10_90_n_s,1e-6),2,' kN/ms')),
   resultRow('Peak loading rate',value(scaled(metrics.peak_loading_rate_n_s,1e-6),2,' kN/ms'),loadingWindow),
   resultRow('Loading impulse',value(metrics.loading_impulse_n_s,2,' N s')),
   resultRow('Maximum glove compression',value(metrics.maximum_glove_compression_mm,1,' mm'),thicknessDetail)
  ].join('');
  const components=Array.isArray(metrics.components)?metrics.components.filter(component=>component.role==='glove'):[];
  $('results').innerHTML=`${result.status==='incomplete'?`<p class="result-status">${esc(result.reason||'Simulation range ended before peak force.')}</p>`:''}<dl class="result-list">${summaryRows}</dl>${renderLayerResponse(components)}<p class="sample-weight"><span>Total sample weight (30 × 30 mm)</span><strong>${value(metrics.foam_sample_weight_g,2,' g')}</strong></p>`;
 }

 function linePath(points,x,y){
  return points.map((point,index)=>`${index?'L':'M'}${x(point.x).toFixed(2)},${y(point.y).toFixed(2)}`).join(' ');
 }

 function chartMarkup(series,rows,axes){
  const width=940,height=390,pad={left:58,right:58,top:32,bottom:64};
  const plotWidth=width-pad.left-pad.right,plotHeight=height-pad.top-pad.bottom;
  const endTime=Math.max(...rows.map(row=>Number(row.time_s)||0),.001);
  const leftMax=Math.max(...series.filter(item=>item.axis==='left').flatMap(item=>item.points.map(point=>point.y)),1);
  const rightMax=Math.max(...series.filter(item=>item.axis==='right').flatMap(item=>item.points.map(point=>point.y)),1);
  const x=value=>pad.left+(value/endTime)*plotWidth;
  const yLeft=value=>pad.top+plotHeight-(value/leftMax)*plotHeight;
  const yRight=value=>pad.top+plotHeight-(value/rightMax)*plotHeight;
  const ticks=[0,.25,.5,.75,1];
  const xLabels=ticks.map(tick=>`<text x="${x(endTime*tick)}" y="${height-36}" text-anchor="middle">${number(endTime*tick*1000,1)}</text>`).join('');
  const yLabels=ticks.map(tick=>`<text x="${pad.left-9}" y="${yLeft(leftMax*tick)+4}" text-anchor="end">${number(leftMax*tick,1)}</text><text x="${width-pad.right+9}" y="${yRight(rightMax*tick)+4}">${number(rightMax*tick,1)}</text>`).join('');
  const axisTitles=`<text class="chart-axis-title" x="${pad.left}" y="16">${esc(axes.left)}</text><text class="chart-axis-title" x="${width-pad.right}" y="16" text-anchor="end">${esc(axes.right)}</text><text class="chart-axis-title" x="${width/2}" y="${height-8}" text-anchor="middle">Time (ms)</text>`;
  const paths=series.map(item=>`<path class="chart-line" stroke="${item.color}" d="${linePath(item.points,x,item.axis==='right'?yRight:yLeft)}"/>`).join('');
  const early=Number(result?.metrics?.early_time_s)||.01;
  const marker=early<=endTime?`<line class="chart-marker" x1="${x(early)}" y1="${pad.top}" x2="${x(early)}" y2="${pad.top+plotHeight}"/><text x="${x(early)+5}" y="${pad.top+13}">${number(early*1000,1)} ms</text>`:'';
  const legend=series.map(item=>`<span class="legend-item"><i class="swatch" style="--c:${item.color}" aria-hidden="true"></i>${esc(item.label)}</span>`).join('');
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc($('graph-view').selectedOptions[0].textContent)} over impact time"><line class="chart-axis" x1="${pad.left}" y1="${pad.top+plotHeight}" x2="${width-pad.right}" y2="${pad.top+plotHeight}"/><line class="chart-axis" x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${pad.top+plotHeight}"/><line class="chart-axis" x1="${width-pad.right}" y1="${pad.top}" x2="${width-pad.right}" y2="${pad.top+plotHeight}"/>${axisTitles}${xLabels}${yLabels}${paths}${marker}</svg><div class="chart-legend">${legend}</div>`;
 }

 function renderGraph(){
  const rows=Array.isArray(result?.trace)?result.trace.filter(row=>finite(row.time_s)):[];
  if(rows.length<2){
   $('main-chart').innerHTML='<p class="empty-state">The impact trace will appear here.</p>';
   $('graph-caption').textContent='';
   return;
  }
  let series;
  let axes;
  if($('graph-view').value==='work'){
   axes={left:'Glove work (J)',right:'Speed (m/s)'};
   series=[
    {label:'Glove work',axis:'left',color:'#f3c75c',points:rows.map(row=>({x:Number(row.time_s),y:Number(row.glove_work_j)||0}))},
    {label:'Speed',axis:'right',color:'#67d4e8',points:rows.map(row=>({x:Number(row.time_s),y:Number(row.speed_m_s)||0}))}
   ];
   $('graph-caption').textContent='Glove work and striking speed over impact time.';
  }else{
   axes={left:'Remaining thickness (%)',right:'Force (kN)'};
   const totalThickness=layers.reduce((sum,layer)=>sum+layer.thicknessMm,0);
   const layerSeries=layers.map((layer,index)=>({
    label:layerPosition(index),axis:'left',color:layer.color,
    points:rows.map(row=>({x:Number(row.time_s),y:100*row.layers.slice(0,index+1).reduce((sum,item)=>sum+(Number(item.remaining_mm)||0),0)/totalThickness}))
   }));
   series=[...layerSeries,{label:'Force',axis:'right',color:'#ff995c',points:rows.map(row=>({x:Number(row.time_s),y:(Number(row.force_n)||0)/1000}))}];
   $('graph-caption').textContent='Layer curves show cumulative remaining thickness relative to the starting stack.';
  }
  $('main-chart').innerHTML=chartMarkup(series,rows,axes);
 }

 function commitResult(nextResult){
  result=nextResult;
  renderResults();
  renderGraph();
  $('results').removeAttribute('aria-busy');
  $('main-chart').removeAttribute('aria-busy');
 }

 function renderPending(){
  result=null;
  $('results').setAttribute('aria-busy','true');
  $('main-chart').setAttribute('aria-busy','true');
  if(!$('results').hasChildNodes())$('results').innerHTML='<p class="empty-state">Calculating…</p>';
  if(!$('main-chart').hasChildNodes())$('main-chart').innerHTML='<p class="empty-state">Building the impact trace…</p>';
 }

 async function runSimulation(){
  const requestNumber=++calculation;
  message('');
  const request=getRequest();
  renderPending();
  try{
   await new Promise(resolve=>setTimeout(resolve,0));
   const payload=globalThis.FoamSimulation.simulateFrontend(request,catalog);
   if(requestNumber!==calculation)return;
   commitResult(payload);
  }catch(error){
   if(requestNumber!==calculation)return;
   commitResult({status:'error',message:error.message||'Simulation unavailable.'});
  }
 }

 function getRequest(){
  const impact=readImpact();
  return {
   mass_kg:impact.mass,
   speed_m_s:impact.speed,
   layers:layers.map((layer,index)=>({layer:index+1,foam_id:layer.foamId,thickness_mm:layer.thicknessMm})),
   target:{...target}
  };
 }

 function update(){
  renderImpact();
  renderLayers();
  runSimulation();
 }

 $('impact-level').addEventListener('input',()=>{
  renderImpact();
  runSimulation();
 });
 $('preset-buttons').addEventListener('click',event=>{
  const button=event.target.closest('[data-preset]');
  if(!button)return;
  activePreset=button.dataset.preset;
  layers=layersFromPreset(activePreset);
  update();
 });
 $('layers').addEventListener('change',event=>{
  const card=event.target.closest('[data-layer]');
  const field=event.target.dataset.field;
  if(!card||!field)return;
  const layer=layers.find(item=>item.id===card.dataset.layer);
  if(field==='foamId')layer.foamId=event.target.value;
  if(field==='thicknessMm'){
   const thickness=Number(event.target.value);
   if(!Number.isInteger(thickness)||thickness<=0){message('Use a positive whole number of millimetres.');renderLayers();return;}
   layer.thicknessMm=thickness;
  }
  activePreset=null;
  update();
 });
 $('graph-view').addEventListener('change',()=>{if(result)renderGraph();});

 update();
})();
