'use strict';
const fs=require('fs'),M=require('./engine.js'),I=require('./impact_engine.js');
const outer=['soft','hd36','latex','ev30'],core=['soft','hd36','lux','qualux','latex','ev30','ev50'],back=['ev30','ev50'];
const rows=[],alloc=[];
for(const total of (process.argv[2]?[Number(process.argv[2])]:[35,40,45]))for(const a of [6,9,12])for(const b of [4,8,12])for(const c of [2,3,4]){const h=[a,total-a-b-c,b,c];if(h[1]>=10&&h[1]<=31)alloc.push(h);}
const config=M.DEFAULT_CONFIG;let n=0,start=Date.now();
for(const h of alloc)for(const a of outer)for(const b of core)for(const d of back){
 const g=[a,b,d,'soft'],s=g.map((x,i)=>M.layer(x,h[i],['Outer contact','Main padding','Support backing','Hand comfort'][i],'layer-'+i,M.COLORS[i]));
 const slow=I.compile(s,{...config,speedModel:'slow'});
 const row={id:g.join('/')+'@'+h.join('/'),grades:g,thicknesses:h,total:h.reduce((a,b)=>a+b,0),feel4N:slow.state(.004).F,feel10N:slow.state(.010).F,feel20N:slow.state(.020).F,tests:{}};
 for(const hit of I.PRESETS){const r=I.quick(s,config,hit.id);row.tests[hit.id]={forceN:r.limited?null:r.F,forceReachedN:r.F,resolved:!r.limited,leftMm:r.left,energyJ:r.E,workJ:r.W};}
 rows.push(row);if(++n%1000===0)console.log(n,'rows',((Date.now()-start)/1000).toFixed(1),'s');
}
const meta={candidateCount:rows.length,thicknessDistributions:alloc.length,materialCombinations:56,impactCases:rows.length*I.PRESETS.length,dimensions:{totalMm:[35,40,45],outerMm:[6,9,12],backingMm:[4,8,12],comfortMm:[2,3,4],mainMm:'Remainder, constrained to 10–31 mm'},elapsedSeconds:(Date.now()-start)/1000};
fs.writeFileSync(__dirname+'/screen_v12'+(process.argv[2]?'_'+process.argv[2]:'')+'.json',JSON.stringify({meta,rows}));console.log(JSON.stringify(meta,null,2));
