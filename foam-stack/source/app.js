/* UI for shared foam mechanics with rigid and moving bag targets. */
'use strict';
(() => {
 const M=FoamModel,I=ImpactModel,$=id=>document.getElementById(id);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const nf=(v,n=1)=>Number.isFinite(v)?v.toLocaleString('en-CA',{minimumFractionDigits:n,maximumFractionDigits:n}):'n/a';
 let layers=M.recipe('canonicalMedium'),config=M.clone(M.DEFAULT_CONFIG),impact=I.impactSpec('gentle'),recipe='canonicalMedium',result=null;
 let target=I.targetSpec({mode:'padded',thicknessMm:25}),bagSettings=I.targetSpec({mode:'bag',...I.BAG});
 let graph='force',graphLayer='whole';
 const fieldIds=['rateScale','tailPower','ret','firmness'];
 function options(values,selected){return values.map(([v,t])=>`<option value="${esc(v)}" ${v===selected?'selected':''}>${esc(t)}</option>`).join('');}
 function message(s){$('error').hidden=!s;$('error').textContent=s||'';}
 function update(){message('');try{
  result=I.calculate(layers,config,impact,true,{target});renderSettings();renderLayers();renderSelections();renderResult();renderReferenceChecks();drawMain();renderAudits();
 }catch(e){result=null;message(e.message);$('results').innerHTML='<p class="muted">Check the inputs to calculate the stack.</p>';$('reference-checks').textContent='Check the layer inputs to calculate the reference tests.';$('main-chart').innerHTML='';$('material-chart').innerHTML='';$('graph-caption').hidden=true;$('rapid-sensitivity').textContent='Check the inputs to compare loading curves.';$('bag-sensitivity').textContent='Check the inputs to compare bag firmness.';}finally{window.dispatchEvent(new Event('foam-stack-changed'));}}
 function renderSettings(){
  const bag=target.mode==='bag',inspecting=false;
  const descriptions={
   gentle:'A gentler adult punch, with 30% less energy than the adult reference.',
   adult:'A straight punch based on the average punch mass and speed measured in untrained adults.',
   olympic:'A harder punch based on the average punch mass and speed measured in Olympic boxers.',
   commercial3:'A machine test that hits the glove at the speed of a weight dropped from 3 metres.',
   commercial5:'A faster machine test, hitting the glove at about 10 metres per second to represent a 5-metre drop.',
   test3:'Inspecting the automatic 3 joule SATRA model check, using the fixed 2.5 kg test mass and rigid target.',
   test10:'Inspecting the automatic 10 joule SATRA model check, using the fixed 2.5 kg test mass and rigid target.',
   custom:'A custom impact using the mass and speed entered in Methodology.'
  };
  $('target').value=target.mode==='bag'?'bag':'eva'+target.thicknessMm;$('bag-settings').hidden=!bag;
  $('bag-mass').value=bagSettings.mass;$('bag-diameter').value=bagSettings.radius*200;
  const firmness=$('bag-stiffness');firmness.querySelector('[data-custom]')?.remove();
  if(![20000,40000,80000].includes(bagSettings.stiffness)){const option=new Option('Custom ('+nf(bagSettings.stiffness/1000,1)+' kN/m)',bagSettings.stiffness);option.dataset.custom='true';firmness.add(option);}
  firmness.value=bagSettings.stiffness;
  $('target-description').textContent=bag?'A hanging bag that can compress and move during the hit.':`A fixed plate covered with ${target.thicknessMm} mm of EVA75 foam, following the target padding in the glove study.`;
  if(!$('impact-buttons').children.length)$('impact-buttons').innerHTML=I.PRESETS.filter(p=>p.limit===null).map(p=>`<button data-impact="${p.id}" class="${impact.id===p.id?'active':''}" aria-pressed="${impact.id===p.id}" aria-describedby="impact-description">${p.id==='commercial3'?'Glove study (3 m)':p.id==='commercial5'?'Glove study (5 m)':p.label}</button>`).join('');
  for(const button of $('impact-buttons').children){const active=button.dataset.impact===impact.id;button.classList.toggle('active',active);button.setAttribute('aria-pressed',active);}
  $('impact-description').textContent=descriptions[impact.id]||descriptions.custom;
  $('impact-details').innerHTML=[['Impact energy (J)',nf(impact.energy,1)],['Effective mass (kg)',nf(impact.mass,2)],['Speed at contact (m/s)',nf(impact.speed,2)]].map(([label,value])=>`<div><dt>${label}</dt><dd>${value}</dd></div>`).join('');
  if(!$('recipe-buttons').children.length)$('recipe-buttons').innerHTML=M.PROFILES.filter(([id])=>id!=='unpadded').map(([id,label])=>`<button data-recipe="${id}" class="${recipe===id?'active':''}" aria-pressed="${recipe===id}">${label}</button>`).join('');
  for(const button of $('recipe-buttons').children){const active=button.dataset.recipe===recipe;button.classList.toggle('active',active);button.setAttribute('aria-pressed',active);}
  $('recipe-note').textContent=recipe==='custom'?'Custom composition. Choose a preset to replace these layers.':'Each preset fills the complete stack. Edit the individual layers below.';
  const total=layers.reduce((sum,l)=>sum+l.h,0),input=$('total-thickness');
  input.value=Number(total.toFixed(3));input.min=Math.ceil(Math.max(...layers.map(l=>.5*total/l.h))*1000)/1000;input.max=Math.floor(Math.min(...layers.map(l=>100*total/l.h))*1000)/1000;
  $('thickness-note').textContent='Changing the total scales all layer thicknesses in the same proportions.';
  $('graph').value=graph;$('result-heading').textContent=inspecting?'Reference result':'Results';$('analysis-heading').textContent=inspecting?nf(impact.energy,0)+' J graphs':'Impact graphs';
  for(const id of fieldIds)$(id).value=config[id];$('mass').value=impact.mass;$('speed').value=impact.speed;
  const legacy=config.speedModel==='slow';
  $('loading-baseline-note').textContent=legacy?'Imported slow-test curve retained. The current result still uses that saved loading curve.':'Rapid baseline used for foam impacts. Slow-test data calibrate the material inputs.';
  $('use-rapid-baseline').hidden=!legacy;
 }
 function renderLayers(){
  $('layers').innerHTML=layers.length?layers.map((l,i)=>`<article class="layer" data-layer="${esc(l.id)}" style="--c:${l.color}"><div class="layer-head"><input aria-label="Layer name" data-k="name" value="${esc(l.name)}"><div class="tools"><button class="icon" data-action="up" aria-label="Move ${esc(l.name)} outward" ${!i?'disabled':''}>↑</button><button class="icon" data-action="down" aria-label="Move ${esc(l.name)} inward" ${i===layers.length-1?'disabled':''}>↓</button><button class="icon" data-action="delete" aria-label="Remove ${esc(l.name)}" ${layers.length===1?'disabled':''}>×</button></div></div><div class="layer-fields"><label class="wide">Material<select data-k="grade">${options(Object.entries(M.MATERIALS).map(([k,v])=>[k,v.label]),l.grade)}</select></label><label>Thickness (mm)<input data-k="h" type="number" min="0.5" max="100" step="any" value="${Number(l.h.toFixed(3))}"></label><label>${l.mode==='ILD'?'25% firmness (lbf)':'25% pressure (kPa)'}<input data-k="a" type="number" min="0.1" step="any" value="${l.a}"></label><label>Density (lb/ft³)<input data-k="rho" type="number" min="0.1" max="15" step="any" value="${nf(l.rho,3).replace(/,/g,'')}"></label></div><details><summary>Deeper support & material reference${l.edited?' · edited':''}</summary><div class="extra"><label>${l.mode==='ILD'?'65% / 25% firmness ratio':'50% pressure (kPa)'}<input data-k="b" type="number" step="0.1" placeholder="Not known" value="${l.b??''}"></label><label>Reference curve<select data-k="prior">${options(Object.entries(M.PRIORS).filter(([k,v])=>v.family===l.family).map(([k,v])=>[k,v.label]),l.prior)}</select></label><p class="source">${esc(l.note)} ${l.source?`<a href="${esc(l.source)}" target="_blank" rel="noopener">Supplier</a>`:''}${l.edited?' Entered values have been edited; they may no longer match this supplier.':''}</p></div></details></article>`).join(''):'<p class="empty-stack">Rigid striker with no foam. Hand tissue is not modeled.</p>';
  $('add-layer').disabled=layers.length>=8;
 }
 function normalizeGraph(value){
  const mapped={layers:'force',target:'force',compression:'force',speed:'work',decel:'force',impulse:'force'}[value]||value;
  return ['force','work'].includes(mapped)?mapped:'force';
 }
 function renderSelections(){
  graph=normalizeGraph(graph);$('graph').value=graph;$('graph').disabled=false;
  if(graphLayer!=='whole'&&!layers.some(l=>l.id===graphLayer))graphLayer='whole';
  $('graph-layer').innerHTML=options([['whole',layers.length?'Whole stack':'Reference contact'],...layers.map(l=>[l.id,l.name])],graphLayer);$('graph-layer-label').hidden=!layers.length;
 }
 function limitStatus(r){
  const label=r.pass===null?'Model range reached':r.F===r.limit?'At 2 kN':r.pass?'Below 2 kN':'Above 2 kN';
  const detail=r.pass===null?'Peak unresolved':r.F===r.limit?'At the reference limit':`${r.peakIsLowerBound?'At least ':''}${nf(Math.abs(r.marginPct),1)}% ${r.pass?'below':'above'} the reference limit`;
  return `<div class="verdict-row"><strong class="${r.pass===null?'muted':r.pass?'pass-text':'fail-text'}">${label}</strong><span>${detail}</span></div>`;
 }
 function renderEarlyMetric(r){
  const early=r.earlyLoading,available=early?.available;
  const bands=[{max:50,label:'Gradual buildup',range:'&lt; 50%'},{max:70,label:'Moderate buildup',range:'50&ndash;&lt;70%'},{max:85,label:'Sharp buildup',range:'70&ndash;85%'},{max:Infinity,label:'Very sharp buildup',range:'&gt; 85%'}];
  const band=available?bands.find((b,i)=>i===2?early.peakPercent<=b.max:early.peakPercent<b.max):null;
  let explanation=early?.peakBefore10?`Peak reached before 10 ms, at ${nf(early.sampleTimeSeconds*1000,2)} ms. The percentage uses this earlier peak.`:'Force reached by 10 ms as a percentage of the peak. Read alongside peak force and time to peak.';
  if(!available){
   if(early?.reason==='window-not-covered')explanation=r.loadingComplete?`Peak occurs at ${nf(r.trace.time*1000,2)} ms. Force at exactly 10 ms is not modeled.`:`The calculation ends at ${nf(r.trace.time*1000,2)} ms, before the 10 ms sample.`;
   else if(early?.reason==='peak-unresolved')explanation='Force at 10 ms is known, but the peak is unresolved. A percentage needs the actual peak.';
   else explanation='A valid force history and a resolved peak are required.';
  }
  const guide=bands.map(b=>`<tr><td>${b.range}</td><td>${b.label}</td></tr>`).join('');
  return `<div id="early-loading-metric" class="metric ${available?'':'metric-unavailable'}"><div class="label">Force reached by 10 ms</div><div class="value">${available?nf(early.peakPercent,1)+'<span class="unit">%</span>':'Not available'}</div><div class="sub">${band?`<p class="loading-interpretation"><strong>${band.label}</strong></p>`:''}<p>${explanation}</p>${available?`<p>${nf(early.sampleForceN/1000,2)} kN at ${nf(early.sampleTimeSeconds*1000,2)} ms &divide; ${nf(r.F/1000,2)} kN peak.</p>`:''}<details id="early-impact-guide" class="metric-guide"><summary>How to read this percentage</summary><table><thead><tr><th>Of peak reached by 10 ms</th><th>Loading description</th></tr></thead><tbody>${guide}</tbody></table><p>Illustrative descriptions, not calibrated measures of feel. A sharper response may be preferred for feedback; a gradual response for cushioning. Neither is a quality rating. An earlier peak is 100%. A lower percentage can also result from a higher later peak.</p><a href="#early-impact-method" class="method-link">Definition and limits</a></details></div></div>`;
 }
 function renderEnergyMetric(r){
  const energy=r.energyAt10ms,available=energy?.available;
  let explanation='Kinetic energy still available for compression, relative to its initial value.';
  if(!available)explanation=energy?.reason==='peak-before-10ms'?'Peak reached before 10 ms. Energy at 10 ms is unknown because rebound is not modeled.':energy?.reason==='window-not-covered'?'The model range ends before 10 ms. Energy at 10 ms is unresolved.':'A valid energy history through 10 ms is required.';
  return `<div id="energy-at-10ms-metric" class="metric ${available?'':'metric-unavailable'}"><div class="label">Impact kinetic energy remaining at 10 ms</div><div class="value">${available?nf(energy.percent,1)+'<span class="unit">%</span>':'Not available'}</div><div class="sub"><p>${explanation}</p>${available?`<p>${nf(energy.energyJ,2)} J remaining of ${nf(energy.initialEnergyJ,2)} J initially.</p>`:''}<details class="metric-guide"><summary>How to read this percentage</summary><p>Lower means more motion has already been converted into compression work; higher means more loading may lie ahead. Neither is automatically better. Read alongside peak force and time to peak.</p><p>For a moving bag, this uses fist–bag relative motion and excludes shared forward movement. Compression work includes stored energy; this is not a measure of permanent energy dissipation.</p><a href="#energy-at-10ms-method" class="method-link">Definition and limits</a></details></div></div>`;
 }
 function renderTimeMetric(r){
  const limited=!r.loadingComplete,ms=r.trace.time*1000;
  const bands=[{label:'Abrupt buildup',range:'&lt; 10 ms'},{label:'Quick buildup',range:'10&ndash;&lt;12 ms'},{label:'Moderate buildup',range:'12&ndash;18 ms'},{label:'Gradual buildup',range:'&gt; 18 ms'}];
  const band=limited?null:bands[ms<10?0:ms<12?1:ms<=18?2:3];
  const guide=bands.map(b=>`<tr><td>${b.range}</td><td>${b.label}</td></tr>`).join('');
  return `<div id="time-to-peak-metric" class="metric"><div class="label">${limited?'Time reached':'Time to peak'}</div><div class="value">${nf(ms,1)}<span class="unit">ms</span></div><div class="sub">${band?`<p class="loading-interpretation"><strong>${band.label}</strong></p>`:''}<p>${limited?'Time from first contact to the model limit. Peak time is unresolved.':'Time for force to build to its peak. Longer means loading is spread over more time.'}</p><details id="time-to-peak-guide" class="metric-guide"><summary>How to read this time</summary><table><thead><tr><th>Time to peak</th><th>Loading description</th></tr></thead><tbody>${guide}</tbody></table><p>Illustrative descriptions of force buildup. Longer or shorter is a preference, not a quality rating. Compare the same impact and target, alongside peak force and the 10 ms percentage.</p><a href="#time-to-peak-method" class="method-link">Definition and limits</a></details></div></div>`;
 }
 function renderResult(){
  const r=result,bag=target.mode==='bag',limited=!r.loadingComplete,limit=r.limit,foamWork=r.fw??r.W;
  const status=limit!==null?limitStatus(r):'';
  const rows=layers.map((l,i)=>`<tr><td><i class="dot" style="background:${l.color}"></i>${esc(l.name)}</td><td>${nf(r.es[i]*100,0)}%</td><td>${nf(r.ws[i],1)} J</td></tr>`).join('');
  const breakdown=layers.length?`<div class="breakdown"><table><caption>Foam layers at ${limited?'the model limit':'peak force'}</caption><thead><tr><th>Layer</th><th>Compression</th><th>Work</th></tr></thead><tbody>${rows}</tbody></table></div><div class="workbar" aria-label="Loading work by foam layer">${layers.map((l,i)=>`<span style="width:${foamWork>0?100*r.ws[i]/foamWork:0}%;background:${l.color}" title="${esc(l.name)}: ${nf(r.ws[i],2)} J"></span>`).join('')}</div>`:'';
  const speed=r.trace.rows.at(-1).v,speedExplanation=limited?'Fist speed when the calculation reaches its range limit. Full compression is unresolved.':bag?'Fist and bag move together at peak force. This speed does not indicate foam bottoming out.':'The fist reaches zero speed at maximum compression against the fixed target.';
  $('results').innerHTML=`${status}<div class="metrics"><div id="peak-force-metric" class="metric"><div class="label">${limited?'Force reached':'Peak force'}</div><div class="value">${nf(r.F/1000,r.F<1000?3:2)}<span class="unit">kN</span></div><div class="sub"><p>${limited?'Force at the model limit. The peak has not been resolved.':'Maximum force transmitted to the striker.'}</p></div></div>${renderEarlyMetric(r)}${renderTimeMetric(r)}${renderEnergyMetric(r)}<div id="impulse-metric" class="metric"><div class="label">${limited?'Impulse so far':'Impulse'}</div><div class="value">${nf(r.trace.impulse,2)}<span class="unit">Ns</span></div><p class="sub">${limited?'Contact force accumulated up to the model limit. The loading phase is incomplete.':'Contact force accumulated through first compression: the momentum delivered during loading.'} Rebound is not included.</p></div></div>
  <div class="secondary-metrics"><div id="foam-weight-metric" class="metric"><div class="label">Foam weight</div><div class="value">${nf(r.foamWeightG,2)}<span class="unit">g</span></div><p class="sub">Foam only, for a 30 &times; 30 mm square at the specified layer thicknesses.</p></div><div class="metric"><div class="label">${limited?'Speed at model limit':'Fist speed at peak'}</div><div class="value">${nf(speed,2)}<span class="unit">m/s</span></div><p class="sub">${speedExplanation}</p></div></div>${breakdown}${config.speedModel==='slow'?'<p class="tiny">Imported slow-test curve &middot; <a href="#loading-baseline-note" class="method-link">Review loading baseline</a></p>':''}`;
 }
 function renderReferenceChecks(){
  const el=$('reference-checks');
  try{
   const checks=I.referenceChecks(layers,config);
   el.innerHTML='<div class="satra-summary"><span>SATRA model checks</span>'+checks.map(c=>`<span data-reference="${c.id}">${c.id==='test3'?'3 J':'10 J'}: <strong class="${c.pass===null?'muted':c.pass?'pass-text':'fail-text'}">${c.status}</strong></span>`).join('')+'</div><p class="tiny"><a href="#satra-method" class="method-link">Test assumptions</a></p>';
  }catch(e){el.textContent='Reference checks unavailable: '+e.message;}
 }
 function nice(v){if(!(v>0))return 1;const base=10**Math.floor(Math.log10(v)),q=v/base*(1-1e-12);return (q<=1?1:q<=2?2:q<=2.5?2.5:q<=5?5:10)*base;}
 function tidy(v){const scale=Math.abs(v)>=1000?1000:1;return (v/scale).toLocaleString('en-CA',{maximumSignificantDigits:4})+(scale===1000?'k':'');}
 function axisMax(value){const step=nice(value/4);return Math.max(step,Math.ceil(value/step-1e-12)*step);}
 function chart(id,series,o={}){
  const el=$(id),w=Math.max(300,el.clientWidth||700),h=w<500?280:335,L=w<500?65:78,R=o.y2label?(w<500?65:78):19,T=20,B=49,pw=w-L-R,ph=h-T-B;
  const all=series.flatMap(s=>s.data).filter(d=>Number.isFinite(d.x)),valid=all.filter(d=>Number.isFinite(d.y));if(!all.length){el.innerHTML='<p class="tiny">No values in this range.</p>';return;}
  const xmin=o.xmin??Math.min(0,...all.map(d=>d.x)),xmax=o.xmax??axisMax(Math.max(...all.map(d=>d.x))),ymin=o.ymin??0,ymax=o.ymax??axisMax(Math.max(0,...valid.map(d=>d.y))||1),sx=x=>L+(x-xmin)/(xmax-xmin)*pw,sy=y=>T+ph-(y-ymin)/(ymax-ymin)*ph;
  const y2max=o.y2max??100,sy2=y=>T+ph-y/y2max*ph;
  let svg=`<svg viewBox="0 0 ${w} ${h}" role="group" aria-label="${esc(o.title||o.ylabel+' against '+o.xlabel)}"><defs><clipPath id="clip-${id}"><rect x="${L}" y="${T}" width="${pw}" height="${ph}"/></clipPath></defs><text class="axis-label-y" transform="translate(14 ${T+ph/2}) rotate(-90)" text-anchor="middle" fill="#63716a" font-size="12">${esc(o.ylabel||'')}</text>`;
  if(o.y2label){
   svg+=`<text class="axis-label-y2" transform="translate(${w-14} ${T+ph/2}) rotate(90)" text-anchor="middle" fill="#63716a" font-size="12">${esc(o.y2label)}</text>`;
   for(let i=0;i<=4;i++)svg+=`<text x="${w-R+9}" y="${sy2(i*y2max/4)+4}" fill="#63716a" font-size="11">${tidy(i*y2max/4)}</text>`;
  }
  for(const band of o.bands||[]){const x1=Math.max(xmin,band.from),x2=Math.min(xmax,band.to);if(x2>x1)svg+=`<rect x="${sx(x1)}" y="${T}" width="${sx(x2)-sx(x1)}" height="${ph}" fill="#f0eee7"/><text x="${Math.min(w-R-4,sx(x2)-5)}" y="${T+14}" text-anchor="end" fill="#8c8373" font-size="10">${esc(band.label||'')}</text>`;}
  for(let i=0;i<=4;i++){const y=ymin+(ymax-ymin)*i/4,yp=sy(y);svg+=`<line x1="${L}" x2="${w-R}" y1="${yp}" y2="${yp}" stroke="#e4e8e1"/><text x="${L-9}" y="${yp+4}" text-anchor="end" fill="#63716a" font-size="11">${tidy(y)}</text>`;const x=xmin+(xmax-xmin)*i/4,xp=sx(x);svg+=`<text x="${xp}" y="${h-B+20}" text-anchor="middle" fill="#63716a" font-size="11">${tidy(x)}</text>`;}
  svg+=`<text x="${L+pw/2}" y="${h-4}" text-anchor="middle" fill="#63716a" font-size="12">${esc(o.xlabel||'')}</text><g clip-path="url(#clip-${id})">`;
  const stacked=series.filter(s=>s.stacked||o.stacked);
  const stackTotals=stacked.length?stacked[0].data.map(()=>0):null;
  const stackValid=stacked.length?stacked[0].data.map((p,i)=>Number.isFinite(p.x)&&stacked.every(s=>s.data[i]?.x===p.x&&Number.isFinite(s.data[i]?.y))):null;
  for(const s of [...stacked,...series.filter(s=>!stacked.includes(s))]){
   const seriesY=s.axis==='right'?sy2:sy;
   let d='',pen=false;
   if(s.stacked||o.stacked){
    const lower=stackTotals.slice();
    s.data.forEach((p,i)=>{if(stackValid[i])stackTotals[i]+=p.y;});
    let start=0;
    while(start<s.data.length){
     if(!stackValid[start]){start++;continue;}
     let end=start;
     while(end+1<s.data.length&&stackValid[end+1])end++;
     d='';for(let i=start;i<=end;i++)d+=(i===start?'M':'L')+sx(s.data[i].x).toFixed(2)+','+seriesY(stackTotals[i]).toFixed(2);
     const upperPath=d;
     for(let i=end;i>=start;i--)d+='L'+sx(s.data[i].x).toFixed(2)+','+seriesY(lower[i]).toFixed(2);
     svg+=`<path class="area" data-series="${esc(s.name)}" d="${d}Z" fill="${s.color}" fill-opacity="1"/><path class="series-line" data-series="${esc(s.name)}" d="${upperPath}" fill="none" stroke="${s.color}" stroke-width="1.5"/>`;
     start=end+1;
    }
   }else{
    for(const p of s.data){if(Number.isFinite(p.x)&&Number.isFinite(p.y)){d+=(pen?'L':'M')+sx(p.x).toFixed(2)+','+seriesY(p.y).toFixed(2);pen=true;}else pen=false;}
    if(s.dots)svg+=s.data.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)).map(p=>`<circle cx="${sx(p.x)}" cy="${seriesY(p.y)}" r="4" fill="white" stroke="${s.color||'#2c6250'}" stroke-width="2"/>`).join('');
    else svg+=`<path class="series-line" data-series="${esc(s.name)}" d="${d}" fill="none" stroke="${s.color||'#2c6250'}" stroke-width="${s.width||2.8}" ${s.dash?'stroke-dasharray="6 4"':''} stroke-linejoin="round"/>`;
   }
  }
  for(const line of o.hlines||[]){const lineY=line.axis==='right'?sy2:sy;if(line.y>=(line.axis==='right'?0:ymin)&&line.y<=(line.axis==='right'?y2max:ymax)){svg+=`<line x1="${L}" x2="${w-R}" y1="${lineY(line.y)}" y2="${lineY(line.y)}" stroke="#a6503c" stroke-width="1.5" stroke-dasharray="6 4"/><text x="${w-R-5}" y="${lineY(line.y)-6}" text-anchor="end" fill="#974937" font-size="11">${esc(line.label)}</text>`;}}
  for(const m of o.markers||[]){const markerY=m.axis==='right'?sy2:sy;if(m.x>=xmin&&m.x<=xmax&&m.y>=(m.axis==='right'?0:ymin)&&m.y<=(m.axis==='right'?y2max:ymax)){const end=sx(m.x)>L+pw*.6;svg+=`<circle cx="${sx(m.x)}" cy="${markerY(m.y)}" r="4" fill="${m.color||'#2c6250'}" stroke="white" stroke-width="1.5"/>`;if(m.label)svg+=`<text x="${sx(m.x)+(end?-8:8)}" y="${Math.max(T+13,markerY(m.y)-10)}" text-anchor="${end?'end':'start'}" fill="#475d50" font-size="11">${esc(m.label)}</text>`;}}
  svg+=`</g><line class="hoverline" x1="${L}" x2="${L}" y1="${T}" y2="${T+ph}" stroke="#95a495" stroke-dasharray="3 4" visibility="hidden"/><rect class="hitbox" x="${L}" y="${T}" width="${pw}" height="${ph}" fill="transparent" tabindex="0" role="slider" aria-label="Read chart values" aria-orientation="horizontal" aria-valuemin="${xmin}" aria-valuemax="${xmax}" aria-valuenow="${xmin}"/></svg>`;
  const labelled=series.filter(s=>s.name),legend=labelled.length>1?labelled.map(s=>`<span><i class="line ${s.stacked||o.stacked?'fill-key':''}" style="border-color:${s.color||'#2c6250'};background-color:${s.stacked||o.stacked?s.color:'transparent'};${s.dash?'border-top-style:dashed':''}"></i>${esc(s.name)}</span>`).join(''):'';
  el.innerHTML=`<div class="legend" ${legend?'':'hidden'}>${legend}</div>${svg}<div class="readout"></div>`;el.dataset.ymax=ymax;el.dataset.y2max=y2max;el.dataset.xmin=xmin;el.dataset.xmax=xmax;
  const box=el.querySelector('.hitbox'),sv=el.querySelector('svg'),read=el.querySelector('.readout'),hover=el.querySelector('.hoverline');
  const primary=(series.find(s=>!s.dots&&s.data.some(p=>Number.isFinite(p.x)))||series[0]).data.filter(p=>Number.isFinite(p.x));
  let initial=primary.length-1;
  if(Number.isFinite(o.initialX))for(let i=0;i<primary.length;i++)if(Math.abs(primary[i].x-o.initialX)<Math.abs(primary[initial].x-o.initialX))initial=i;
  let current=initial;
  box.setAttribute('aria-valuemin',primary[0].x);box.setAttribute('aria-valuemax',primary.at(-1).x);
  function valueAt(data,x){
   if(!data.length||x<data[0].x||x>data.at(-1).x)return null;
   const next=data.findIndex(p=>p.x>=x);if(next<0)return null;
   const b=data[next];if(b.x===x)return Number.isFinite(b.y)?b.y:null;
   const a=data[next-1];if(!a||!Number.isFinite(a.y)||!Number.isFinite(b.y))return null;
   return a.y+(b.y-a.y)*(x-a.x)/(b.x-a.x);
  }
  function show(index){
   current=Math.max(0,Math.min(primary.length-1,index));const closest=primary[current];
   const values=series.filter(s=>!s.dots).map(s=>({name:s.name,unit:s.unit??o.yunit,value:valueAt(s.data,closest.x)}));
   const xtext=`${nf(closest.x,2)} ${o.xunit||''}`;
   read.innerHTML=`<span class="readout-x">${esc(xtext)}</span>`+values.map(s=>`<span>${s.name?esc(s.name)+': ':''}<strong>${Number.isFinite(s.value)?nf(s.value,2)+' '+esc(s.unit||''):'Unresolved'}</strong></span>`).join('');
   hover.setAttribute('x1',sx(closest.x));hover.setAttribute('x2',sx(closest.x));hover.setAttribute('visibility','visible');
   box.setAttribute('aria-valuenow',closest.x);box.setAttribute('aria-valuetext',[...read.children].map(span=>span.textContent).join(', '));
  }
  function point(ev){const rect=sv.getBoundingClientRect(),xx=(ev.clientX-rect.left)*w/rect.width,x=xmin+(xx-L)/pw*(xmax-xmin);let nearest=0;for(let i=1;i<primary.length;i++)if(Math.abs(primary[i].x-x)<Math.abs(primary[nearest].x-x))nearest=i;show(nearest);}
  box.addEventListener('pointermove',point);box.addEventListener('click',point);box.addEventListener('pointerleave',()=>show(initial));
  box.addEventListener('keydown',ev=>{const index=ev.key==='Home'?0:ev.key==='End'?primary.length-1:ev.key==='ArrowLeft'?current-1:ev.key==='ArrowRight'?current+1:null;if(index!==null){ev.preventDefault();show(index);}});
  box.addEventListener('focus',()=>show(current));show(current);
 }
 function drawMain(){
  if(!result)return;
  const r=result,rows=r.trace.rows,series=[],markers=[],forceColor='#2456a6',thicknessColor='#475d50';
  let o={xlabel:'Time (ms)',xmax:axisMax(r.trace.time*1000),xunit:'ms'},caption='';
  if(graph==='force'){
   series.push({name:'Force',color:forceColor,axis:'right',unit:'kN',data:rows.map(z=>({x:z.t*1000,y:z.F/1000}))});
   const thickness=r.comp.defs.reduce((sum,d)=>sum+d.h,0);
   r.comp.defs.forEach((d,i)=>series.push({name:d.l.name,color:d.l.color,unit:'%',stacked:true,data:rows.map(z=>({x:z.t*1000,y:(1-z.es[i])*d.h/thickness*100}))}));
   series.push({name:'Stack',color:thicknessColor,unit:'%',width:2,data:rows.map(z=>({x:z.t*1000,y:r.comp.defs.reduce((sum,d,i)=>sum+(1-z.es[i])*d.h,0)/thickness*100}))});
   markers.push({axis:'right',color:forceColor,x:r.trace.time*1000,y:r.F/1000,label:r.loadingComplete?'Peak':'Model range'});
   o={...o,ylabel:'Thickness remaining (%)',ymax:100,y2label:'Force (kN)',y2max:axisMax(Math.max(r.limit?r.limit/1000*1.1:0,r.F/1000*1.05)),yunit:'%',hlines:r.limit?[{axis:'right',y:r.limit/1000,label:'2 kN limit'}]:[]};
  }
  if(graph==='force')caption='This test shows how the glove compresses during the selected hit. Read force on the right: a higher line means more force, and a later peak means the force builds more slowly. The coloured bands show the foam layers getting thinner. Read their combined height on the left as a percentage of the original stack thickness.';
  if(graph==='force'&&Number.isFinite(r.earlyLoading?.forceAt10N)){markers.push({axis:'right',x:10,y:r.earlyLoading.forceAt10N/1000,label:'10 ms',color:forceColor});caption+=' The 10 ms marker shows the force one hundredth of a second after contact.';}
  if(graph==='work'){
   series.push({name:'Foam work',color:forceColor,data:rows.map(z=>({x:z.t*1000,y:z.fw??z.W}))});
   o={...o,ylabel:'Foam work (J)',yunit:'J',ymax:axisMax(Math.max(...series.flatMap(s=>s.data.map(z=>z.y)))*1.02)};
   series.push({name:'Fist speed',color:thicknessColor,axis:'right',unit:'m/s',data:rows.map(z=>({x:z.t*1000,y:z.v}))});
   o={...o,y2label:'Speed (m/s)',y2max:axisMax(Math.max(r.speed,...rows.map(z=>z.v))*1.02)};
   caption='This test shows how the hit slows as the foam compresses. Read energy on the left: a rising line means more energy has gone into compressing the foam. Read fist speed on the right: a falling line means the fist is slowing down.';
  }
  if(!r.loadingComplete)caption=(caption?caption+' ':'')+'The calculation stops before the peak, so the full hit is not shown.';
  chart('main-chart',series,{...o,markers});$('graph-caption').textContent=caption;$('graph-caption').hidden=!caption;
 }
 function drawMaterialCurve(){
  if(!result||!$('methodology').open)return;
  const r=result,rows=r.trace.rows,series=[],markers=[];let o,caption;
  if(graphLayer==='whole'){
   series.push({data:rows.map(z=>({x:z.delta*1000,y:z.F/1000}))});
   markers.push({x:r.delta*1000,y:r.F/1000,label:r.loadingComplete?'Peak':'Model range'});
   o={xlabel:'Compression (mm)',ylabel:'Force (kN)',xmax:r.total,ymax:axisMax(Math.max(r.limit?r.limit/1000*1.1:0,r.F/1000*1.05)),xunit:'mm',yunit:'kN',hlines:r.limit?[{y:r.limit/1000,label:'2 kN limit'}]:[]};
   caption=r.unpadded?'Force versus compression of the synthetic contact layer.':'Force versus central foam shortening. Target deformation and hand give are excluded from this horizontal axis.';
  }else{
   const i=layers.findIndex(l=>l.id===graphLayer),l=layers[i],d=r.comp.defs[i],slow=M.materialCurve(l,config.tailPower,550,'slow');
   const maxe=Math.min(d.cv.cap-.00001,Math.max(.84,r.es[i]*1.001));
   series.push({name:config.speedModel==='slow'?'Imported slow-test curve':'Rapid baseline',color:l.color,data:Array.from({length:241},(_,j)=>({x:maxe*j/240*100,y:d.cv.pressure(maxe*j/240)*d.scale/1000}))},
    {name:'Slow-test calibration',color:'#88978c',dash:true,data:Array.from({length:241},(_,j)=>({x:maxe*j/240*100,y:slow.pressure(maxe*j/240)/1000}))},
    {name:'Entered points',color:'#637269',dots:true,data:slow.anchors.map(a=>({x:a[0]*100,y:a[1]/1000}))});
   markers.push({x:r.es[i]*100,y:r.centerP/1000,color:l.color,label:'At centre'});
   o={xlabel:'Strain (%)',ylabel:'Pressure (kPa)',xmax:100,ymax:axisMax(r.centerP/1000*1.08),xunit:'%',yunit:'kPa',initialX:r.es[i]*100,bands:[{from:d.cv.join*100,to:100,label:'Extrapolated'}]};
   caption='Shared pressure scale across layers. Entered supplier points calibrate the slow-test curve; shading marks the extrapolated tail.';
  }
  chart('material-chart',series,{...o,markers});$('material-caption').textContent=caption;
 }
 function renderRapidSensitivity(){
  if(!result||!$('methodology').open)return;
  const el=$('rapid-sensitivity');
  if(result.unpadded){el.innerHTML='<p>The synthetic reference is unaffected by foam loading assumptions.</p>';return;}
  try{
   const rapidConfig={...config,speedModel:'fast'},baseline=config.speedModel==='fast'?result:I.calculate(layers,rapidConfig,impact,false,{target,loadingDurationMs:0}),ramp=I.calculate(layers,rapidConfig,impact,false,{target,loadingDurationMs:20});
   const delta=baseline.loadingComplete&&ramp.loadingComplete?100*(ramp.F/baseline.F-1):null,unresolved=target.mode==='bag'?'Unresolved':'Not stopped';
   const change=delta===null?'Not resolved':`${nf(Math.abs(delta),1)}% ${delta<0?'lower':delta>0?'higher':'change'}`;
   el.innerHTML=`<table><caption>Current stack · ${esc(impact.label)}</caption><thead><tr><th>Loading assumption</th><th>Peak force (N)</th><th>Change from rapid</th></tr></thead><tbody><tr><td>Rapid baseline</td><td>${baseline.loadingComplete?nf(baseline.F,0):unresolved}</td><td>—</td></tr><tr><td>20 ms ramp</td><td>${ramp.loadingComplete?nf(ramp.F,0):unresolved}</td><td>${change}</td></tr></tbody></table><p class="tiny">Same stack, target and impact. Calibrated PU/latex loading-curve sensitivity; EVA is unchanged. These scenarios are not confidence bounds.</p>`;
  }catch(e){el.textContent='Loading-curve comparison unavailable: '+e.message;}
 }
 function renderBagSensitivity(){
  const el=$('bag-sensitivity');
  if(target.mode!=='bag'){el.textContent='Select Heavy bag to inspect bag firmness sensitivity.';return;}
  if(!result||!$('methodology').open)return;
  try{
   const checks=[.5,1,2].map(scale=>({stiffness:target.stiffness*scale,r:scale===1?result:I.calculate(layers,config,impact,false,{target:{...target,stiffness:target.stiffness*scale}})}));
   el.innerHTML='<table><caption>Bag firmness sensitivity</caption><thead><tr><th>Firmness (kN/m)</th><th>Peak force (kN)</th><th>Bag compression (mm)</th></tr></thead><tbody>'+checks.map(({stiffness,r})=>`<tr><td>${nf(stiffness/1000,1)}</td><td>${r.loadingComplete?nf(r.F/1000,2):'Unresolved'}</td><td>${r.loadingComplete?nf(r.xt*1000,1):'Unresolved'}</td></tr>`).join('')+'</tbody></table><p class="tiny">Half, current and double the assumed firmness; other inputs are fixed. These scenarios are not confidence bounds.</p>';
  }catch(e){el.textContent='Bag firmness comparison unavailable: '+e.message;}
 }
 function renderAudits(){const r=result,foamWork=r.fw??r.W;
  $('hand-spring-audit').textContent=r.handSpring?`At ${r.loadingComplete?'peak force':'the model limit'}: ${nf(r.xh*1000,2)} mm of hand give and ${nf(r.hw,2)} J stored in the spring.`:'The selected mechanical impact uses a rigid striker without the Hand Spring.';
  renderRapidSensitivity();renderBagSensitivity();drawMaterialCurve();
  if(r.unpadded){
   $('impact-data').textContent=`${impact.label}: ${nf(r.mass,4)} kg, ${nf(r.speed,4)} m/s, ${nf(r.E,4)} J.`;
   $('rate-audit').textContent='Fixed synthetic linear contact law; independent of foam material/rate controls.';
   $('evidence-audit').textContent='Reference stiffness is an explicit numerical assumption, not supplier or tissue data.';
   $('material-data').innerHTML='<p>Reference: 1 mm thick, pressure = 5 GPa × compression strain. All reference parameters stay fixed when the glove is edited.</p>';
   $('verification').textContent=`Energy residual: ${nf(Math.abs(r.W+r.endK-r.E-r.gravityWork),9)} J. Impulse integration difference: ${nf(r.trace.impulseError*100,5)}%. Compression: ${nf(r.delta*1000,4)} mm. ${r.loadingComplete?'Peak force':'Force reached'}: ${nf(r.F,1)} N.`;
   return;
  }
  $('impact-data').innerHTML=`${esc(impact.label)}: ${nf(r.mass,4)} kg, ${nf(r.speed,4)} m/s, ${nf(r.E,4)} J. Gravity remains ${nf(r.gravity,5)} m/s² during contact.`;
  $('rate-audit').textContent=`Current loading curve: ${config.speedModel==='fast'?'rapid baseline':'imported slow-test curve'}. Stress multiplier: ${nf(config.rateScale,2)}; it scales stresses in both sensitivity cases.`;
  $('evidence-audit').textContent=`${nf(r.supplierWork/foamWork*100,1)}% of foam work lies within entered supplier strain ranges; ${nf(r.familyWork/foamWork*100,1)}% within family-reference strain ranges. ${nf(r.extendedShare*100,1)}% uses the tail extension.`;
  $('material-data').innerHTML='<table><thead><tr><th>Layer</th><th>Density</th><th>Entered pressure points</th><th>Family reference</th></tr></thead><tbody>'+layers.map(l=>`<tr><td>${esc(l.name)} · ${nf(l.h,1)} mm${l.source?` <a href="${esc(l.source)}" target="_blank" rel="noopener">supplier</a>`:''}</td><td>${nf(l.rho,2)} lb/ft³</td><td>${M.materialAnchors(l).map(a=>`${nf(a[0]*100,0)}%: ${nf(a[1]/1000,2)} kPa`).join('<br>')}</td><td>${esc(M.PRIORS[l.prior].label)}</td></tr>`).join('')+'</tbody></table>';
  $('verification').innerHTML=`Energy residual: <b>${nf(Math.abs(r.W+r.endK-r.E-r.gravityWork),9)} J</b>. Force-time integration versus momentum balance: <b>${nf(r.trace.impulseError*100,5)}%</b> difference. Projected contacted area: <b>${nf(r.area*1e4,2)} cm²</b>. Central pressure: <b>${nf(r.centerP/1000,1)} kPa</b>.`;
 }
 function loadState(data){
  const v=M.importState(data),nextTarget=I.targetSpec(data.version>=13&&data.target&&data.target.mode!=='rigid'?data.target:{mode:'padded',thicknessMm:25});
  M.scaleThickness(v.layers,v.layers.reduce((sum,l)=>sum+l.h,0));
  let nextImpact;
  if(data.version>=9&&data.impact){nextImpact=I.impactSpec(data.impact);}
  else if(data.mode==='standard'){nextImpact=I.impactSpec(data.standardEnergy===10?'test10':'test3');}
  else{const known=I.PRESETS.find(p=>p.id===data.hit&&Math.abs(p.mass-v.config.mass)<1e-7&&Math.abs(p.speed-v.config.speed)<1e-7);nextImpact=known?I.impactSpec(known.id):I.impactSpec({mass:v.config.mass,speed:v.config.speed,gravity:M.G});}
  // Legacy reference-trace views return to the study default.
  if(nextImpact.limit!==null)nextImpact=I.impactSpec('gentle');
  layers=v.layers;config=v.config;target=nextTarget;impact=nextImpact;
  if(target.mode==='bag')bagSettings={...target};
  recipe=data.version>=12?(data.recipe||'custom'):'custom';
  config.targetMode='rigid';config.mass=impact.mass;config.speed=impact.speed;
  if(data.view){graph=normalizeGraph(data.view.graph);graphLayer=data.view.graphLayer||'whole';}
  update();
 }
 function getState(){return {version:13,layers:M.clone(layers),config:M.clone(config),target:{...target},impact:M.clone(impact),recipe,view:{graph,graphLayer}};}
 $('impact-buttons').addEventListener('click',e=>{const b=e.target.closest('[data-impact]');if(!b)return;impact=I.impactSpec(b.dataset.impact);config.mass=impact.mass;config.speed=impact.speed;update();});
 $('target').addEventListener('change',()=>{try{const value=$('target').value;target=I.targetSpec(value==='bag'?bagSettings:{mode:'padded',thicknessMm:value==='eva50'?50:25});if(impact.limit!==null){impact=I.impactSpec('gentle');config.mass=impact.mass;config.speed=impact.speed;}update();}catch(e){renderSettings();message(e.message);}});
 for(const id of ['bag-mass','bag-stiffness','bag-diameter'])$(id).addEventListener('change',()=>{try{
  const mass=Number($('bag-mass').value),diameter=Number($('bag-diameter').value),stiffness=Number($('bag-stiffness').value);
  if(!Number.isFinite(mass)||mass<10||mass>100)throw Error('Choose a bag mass between 10 and 100 kg.');
  if(!Number.isFinite(diameter)||diameter<25||diameter>80)throw Error('Choose a bag diameter between 25 and 80 cm.');
  if(![20000,40000,80000].includes(stiffness)&&stiffness!==bagSettings.stiffness)throw Error('Choose a listed bag firmness.');
  bagSettings=I.targetSpec({mode:'bag',mass,stiffness,radius:diameter/200});if(target.mode==='bag')target={...bagSettings};update();
 }catch(e){renderSettings();message(e.message);}});
 $('total-thickness').addEventListener('change',()=>{try{layers=M.scaleThickness(layers,Number($('total-thickness').value));update();}catch(e){renderSettings();message(e.message);}});
 $('recipe-buttons').addEventListener('click',e=>{const b=e.target.closest('[data-recipe]');if(!b)return;try{
  const next=M.scaleThickness(M.recipe(b.dataset.recipe),layers.reduce((sum,l)=>sum+l.h,0));layers=next;recipe=b.dataset.recipe;update();
 }catch(e){message(e.message);}});
 $('layers').addEventListener('change',e=>{const card=e.target.closest('[data-layer]'),k=e.target.dataset.k;if(!card||!k)return;const i=layers.findIndex(l=>l.id===card.dataset.layer),l=layers[i];if(k==='grade')layers[i]=M.layer(e.target.value,l.h,l.name,l.id,l.color);else if(k==='name')l.name=e.target.value;else if(k==='prior'){l.prior=e.target.value;l.edited=true;}else{if(k==='h'&&(!Number.isFinite(Number(e.target.value))||Number(e.target.value)<.5||Number(e.target.value)>100)){renderLayers();message('Keep each layer between 0.5 and 100 mm thick.');return;}l[k]=k==='b'&&e.target.value===''?null:Number(e.target.value);l.edited=true;}recipe='custom';update();});
 $('layers').addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;const i=layers.findIndex(l=>l.id===b.closest('[data-layer]').dataset.layer);if(b.dataset.action==='delete'){if(layers.length===1)return;layers.splice(i,1);}else{const j=i+(b.dataset.action==='up'?-1:1);[layers[i],layers[j]]=[layers[j],layers[i]];}recipe='custom';update();});
 $('add-layer').onclick=()=>{if(layers.length>=8)return;layers.push(M.layer('hd36',5,'Additional layer','layer-'+Date.now(),M.COLORS.find(color=>!layers.some(l=>l.color===color))||M.COLORS[layers.length%M.COLORS.length]));recipe='custom';update();};
 for(const id of fieldIds)$(id).addEventListener('change',()=>{config[id]=Number($(id).value);update();});
 $('use-rapid-baseline').onclick=()=>{config.speedModel='fast';update();};
 for(const id of ['mass','speed'])$(id).addEventListener('change',()=>{try{impact=I.impactSpec({mass:Number($('mass').value),speed:Number($('speed').value),gravity:M.G});config.mass=impact.mass;config.speed=impact.speed;update();}catch(e){$('mass').value=impact.mass;$('speed').value=impact.speed;message(e.message);}});
 $('graph').onchange=()=>{graph=$('graph').value;renderSelections();drawMain();};$('graph-layer').onchange=()=>{graphLayer=$('graph-layer').value;drawMaterialCurve();};
 $('methodology').addEventListener('toggle',()=>{if($('methodology').open){renderRapidSensitivity();renderBagSensitivity();drawMaterialCurve();}});
 document.addEventListener('click',e=>{if(e.target.closest('.method-link'))$('methodology').open=true;});
 let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{drawMain();drawMaterialCurve();},140);});
 window.foamApp={getState,getStudyBag:()=>({...bagSettings}),getResult:()=>result,setState:loadState,redraw:()=>{drawMain();drawMaterialCurve();}};
 config.targetMode='rigid';config.mass=impact.mass;config.speed=impact.speed;update();
})();
