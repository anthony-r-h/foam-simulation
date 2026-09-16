'use strict';
const fs=require('fs'),M=require('./engine.js'),I=require('./impact_engine.js');
const data=JSON.parse(fs.readFileSync(__dirname+'/screen_v12.json'));
const base=data.rows.filter(r=>r.total===40);
const lo=Math.min(...base.map(r=>r.feel10N)),hi=Math.max(...base.map(r=>r.feel10N));
const edges=Array.from({length:4},(_,i)=>lo*Math.pow(hi/lo,i/3));
const ids=['canonicalSoft','canonicalMedium','canonicalFirm'],labels=['Soft','Medium','Firm'];
const selection=ids.map((id,i)=>{
 const eligible=base.filter(r=>r.feel10N>=edges[i]-1e-8&&r.feel10N<=edges[i+1]+1e-8&&r.tests.test10.resolved);
 const row=eligible.slice().sort((a,b)=>Math.abs(a.tests.test10.forceN-b.tests.test10.forceN)>1e-7?a.tests.test10.forceN-b.tests.test10.forceN:a.thicknesses[2]-b.thicknesses[2]||Math.abs(a.thicknesses[3]-3)-Math.abs(b.thicknesses[3]-3)||a.id.localeCompare(b.id))[0];
 const make=h=>row.grades.map((g,j)=>M.layer(g,h[j],['Outer contact','Main padding','Support backing','Hand comfort'][j],'layer-'+j,M.COLORS[j]));
 const sensitivity=[-5,0,5].map(delta=>{const h=row.thicknesses.slice();h[1]+=delta;const s=make(h);const r=I.calculate(s,M.DEFAULT_CONFIG,'test10',true);return {mainChangeMm:delta,totalMm:h.reduce((a,b)=>a+b,0),thicknesses:h,forceN:r.F,resolved:r.hasStopped,stopMs:r.trace.time*1000};});
 return {...row,candidateId:row.id,id,label:labels[i],firmnessBandN:[edges[i],edges[i+1]],eligibleCount:eligible.length,mainOnlySensitivity:sensitivity};
});
const audit={...data.meta,selectionBasis:'At 40 mm, divide slow 10 mm indentation force into three equal log-width bands. Within each band select the lowest resolved 10 J peak. Numerically equal forces tie-break on thinner backing, comfort closest to 3 mm, then deterministic ID (same-grade adjacent layers can be merged). These are standard-load design references, not globally optimal gloves. Adult/commercial unresolved results never enter the peak ranking.',why40mm:'A common thickness separates material and distribution effects from simply adding bulk. 35 and 45 mm stacks are also screened, and selected builds receive a separate one-variable thickness check.',edgesN:edges,selection};
fs.writeFileSync(__dirname+'/preset_selection_v12.json',JSON.stringify(audit,null,2));
console.log(JSON.stringify(audit.selection.map(s=>({name:s.label,grades:s.grades,h:s.thicknesses,feelN:s.feel10N,forceN:s.tests.test10.forceN,thicknessEffect:s.mainOnlySensitivity})),null,2));
