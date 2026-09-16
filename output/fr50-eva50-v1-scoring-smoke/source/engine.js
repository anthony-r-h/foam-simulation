/* Material-family curves and legacy stack import. All impacts use impact_engine.js. */
/* Skinny Fists | Foam stack model v7. Offline, dependency-free.
   Compression phase only. Units internally: Pa, m, N, kg, s, J.
   Published reference fits shape the loading law; commercial anchors set scale.
   See methodology.html / the application's methodology section for provenance. */
'use strict';
const FoamModel = (() => {
 const PCF=16.01846337396, IFD=4.44822161526/(50*.0254**2), G=9.80665;
 const clone=x=>JSON.parse(JSON.stringify(x));
 const SOURCES={
  pu:{title:'Alzoubi, Al-Hallaj & Abu-Ayyad (2014), Journal of Solid Mechanics 6(1), 82–97',url:'https://oiccpress.com/jsm/article/download/12454/14012/38722',detail:'Equation 23; Tables 1 and 3. HR 40 kg/m³, PU55 55 kg/m³ and latex 85 kg/m³. Constant 0.0333 s⁻¹; 25 °C; compression through 70%.'},
  eva:{title:'Wu et al. (2023), Polymers 15, 4514',url:'https://doi.org/10.3390/polym15234514',detail:'Equation 16; Table 1. EVA 35 kg/m³; strains through approximately 80%; rates 0.0017, 0.033 and 0.17 s⁻¹. These are not boxing-speed tests.'},
  density:{title:'Chen et al. (2023), Polymers 16, 34',url:'https://doi.org/10.3390/polym16010034',detail:'Supports density- and rate-dependent EVA behaviour. Its denser formulations are contextual evidence, not numerical coefficients imported here.'},
  adult:{title:'Adamec et al. (2021), Biomechanical assessment of various punching techniques',url:'https://doi.org/10.1007/s00414-020-02440-8'},
  olympic:{title:'Walilko et al. (2005), Biomechanics of the head for Olympic boxer punches to the face',url:'https://pubmed.ncbi.nlm.nih.gov/16183766/'},
  glove:{title:'Perkins et al. (2018), commercial Sting glove drop tests',url:'https://www.scirp.org/journal/PaperInformation?PaperID=86314'},
  target:{title:'Ultralon, properties of low-density PE/EVA foams (2022)',url:'https://www.ubuild.co.nz/wp-content/uploads/2022/10/properties-of-low-density-pe-eva-foams-feb-2022.pdf'},
  ifd:{title:'Polyurethane Foam Association, foam testing (2022): IFD and CFD',url:'https://pfa.org/wp-content/uploads/2022/05/InTouchv4.2new.pdf'},
  standard:{title:'SATRA, martial-arts hand-protector testing',url:'https://www.satra.com/spotlight/article.php?id=423'},
  knee:{title:'Li, Magkiriadis & Harrigan (2006), Compressive strain at the onset of densification of cellular solids',url:'https://doi.org/10.1177/0021955X06063519'}
 };
 // Table 3 coefficients converted from MPa to kPa, and MPa*s to kPa*s.
 // The problematic PU85 gamma entry (0.0410 MPa in the paper) is not used.
 // Skeleton densities: PU 1200 kg/m3 follows Alzoubi; latex 920 is assumed.
 // EVA 950 kg/m3 is reported by Chen for other formulations, not Evazote.
 const PRIORS={
  pu55:{label:'Flexible PU · PU55 reference',family:'PU',rho:55,solid:1200,limit:.70,rate:.0333,C:48,K:33,kp:1.6,gamma:2.45,n:4,source:'pu'},
  hr40:{label:'High-resilience PU · HR40 reference',family:'PU',rho:40,solid:1200,limit:.70,rate:.0333,C:130,K:1200,kp:1.8,gamma:14,n:2,source:'pu'},
  latex85:{label:'Latex · 85 kg/m³ reference',family:'Latex',rho:85,solid:920,limit:.70,rate:.0333,C:9,K:100,kp:6.8,gamma:14,n:4,source:'pu'},
  eva35:{label:'Closed-cell EVA · 35 kg/m³ reference',family:'EVA',rho:35,solid:950,limit:.80,rate:.0017,a1:12.9,a2:20,P0:101.325,leak:.19308,source:'eva'}
 };
 const MATERIALS={
  soft:{label:'PU · Soft HR',family:'PU',prior:'hr40',mode:'ILD',rho:2.5,a:10,b:2.7,known:.65,source:'https://foamonline.com/soft-foam/',note:'10 ILD; 2.50 lb/ft³. The listed minimum support factor 2.7 is used as an estimate, not a measured nominal 65% value.'},
  hd36:{label:'PU · HD36-HQ',family:'PU',prior:'pu55',mode:'ILD',rho:2.8,a:35,b:1.9,known:.65,source:'https://canada.foambymail.com/hd36-hq-foam-sheet.html',note:'35 ILD; 2.80 lb/ft³. Listed minimum support factor 1.9 used as an estimate.'},
  lux:{label:'PU · Lux-HQ',family:'PU',prior:'pu55',mode:'ILD',rho:2.8,a:50,b:1.9,known:.65,source:'https://canada.foambymail.com/lux-hq-foam-sheet.html',note:'50 ILD; 2.80 lb/ft³. Listed minimum support factor 1.9 used as an estimate.'},
  qualux:{label:'PU · Qualux Firm',family:'PU',prior:'hr40',mode:'ILD',rho:3.1,a:65,b:2.1,known:.65,source:'https://canada.foambymail.com/qualux-firm-foam-sheet.html',note:'65 ILD; 3.10 lb/ft³. Listed minimum support factor 2.1 used as an estimate.'},
  ev30:{label:'EVA · Evazote EV30',family:'EVA',prior:'eva35',mode:'CFD',rho:30/PCF,a:39,b:100,known:.5,source:'https://www.zotefoams.com/wp-content/uploads/2025/03/PIS-A034-Evazote-EV30.pdf',note:'30 kg/m³; 39 kPa at 25%, 100 kPa at 50% compression.'},
  ev50:{label:'EVA · Evazote EV50',family:'EVA',prior:'eva35',mode:'CFD',rho:50/PCF,a:50,b:116,known:.5,source:'https://www.zotefoams.com/wp-content/uploads/2025/03/PIS-A037-Evazote-EV50.pdf',note:'50 kg/m³; 50 kPa at 25%, 116 kPa at 50% compression.'},
  latex:{label:'Latex · Dunlop 29 ILD',family:'Latex',prior:'latex85',mode:'ILD',rho:4.6,a:29,b:null,known:.25,source:'https://canada.foambymail.com/latex-foam-dunlop-sheet.html',note:'29 ILD; 4.60 lb/ft³. No invented 65% support point; the latex reference shapes the curve after 25%.'},
  customPU:{label:'Custom flexible PU',family:'PU',prior:'pu55',mode:'ILD',rho:2.8,a:35,b:null,known:.25,source:'',note:'User inputs. Leave deeper support blank when it is not known.'},
  customEVA:{label:'Custom EVA',family:'EVA',prior:'eva35',mode:'CFD',rho:3,a:50,b:null,known:.25,source:'',note:'User inputs. Leave the 50% pressure blank when it is not known.'},
  customLatex:{label:'Custom latex',family:'Latex',prior:'latex85',mode:'ILD',rho:4.6,a:29,b:null,known:.25,source:'',note:'User inputs. Leave deeper support blank when it is not known.'}
 };
 const LEGACY_COLORS=['#c89461','#607f84','#9aaca3','#b99883','#8f84aa','#aab6c8','#ad9271','#829b77'];
 const COLORS=['#0072b2','#e69f00','#9b4f96','#009e73','#f0e442','#d55e00','#56b4e9','#754321'];
 function layer(grade,h,name,id,color){return {...clone(MATERIALS[grade]),grade,h,name,id,color:color||COLORS[0]};}
 // v12 material-and-thickness references. Legacy recipe IDs are retained for old saved stacks.
 const CANONICAL={"canonicalSoft": {"label": "Soft", "detail": "Latex / HR PU", "grades": ["latex", "soft", "ev50", "soft"], "thicknesses": [12, 21, 4, 3]}, "canonicalMedium": {"label": "Medium", "detail": "PU / EVA", "grades": ["soft", "ev50", "ev50", "soft"], "thicknesses": [6, 26, 4, 4]}, "canonicalFirm": {"label": "Firm", "detail": "Latex / EVA", "grades": ["latex", "ev50", "ev50", "soft"], "thicknesses": [6, 27, 4, 3]}};
 function recipe(id='middle'){
  if(id==='unpadded')return [];
  if(CANONICAL[id])return CANONICAL[id].grades.map((g,i)=>layer(g,CANONICAL[id].thicknesses[i],['Outer contact','Main padding','Support backing','Hand comfort'][i],'layer-'+i,COLORS[i]));
  const g=id==='eva'?['soft','ev30','ev50','soft']:id==='soft'?['soft','hd36','ev30','soft']:id==='firm'?['hd36','qualux','ev50','soft']:id==='latex'?['soft','latex','ev50','soft']:['soft','lux','ev50','soft'];
  return g.map((grade,i)=>layer(grade,[8,22,7,3][i],['Outer contact','Main padding','Support backing','Hand comfort'][i],'layer-'+i,COLORS[i]));
 }
 const PROFILES=[['canonicalSoft','Soft'],['canonicalMedium','Medium'],['canonicalFirm','Firm'],['unpadded','Rigid striker']];
 const HITS=[
  {id:'gentle',label:'Adult reference (gentle)',mass:2.597,speed:7.7*Math.sqrt(.7),note:'30% less energy than the adult scenario'},
  {id:'adult',label:'Adult reference',mass:2.597,speed:7.7,note:'Untrained-adult study reference'},
  {id:'olympic',label:'Olympic boxer',mass:2.9,speed:9.14,note:'Olympic-boxer study reference'},
  {id:'study',label:'Study drop',mass:3.501,speed:Math.sqrt(2*G*3),note:'3 m drop, 3.046 kg fist + 0.455 kg glove'}
 ];
 const DEFAULT_CONFIG={mass:2.597,speed:7.7,area:60,targetMode:'pad',targetH:25,targetA:55,targetRho:75,targetB:null,targetSource:'eva75',speedModel:'fast',rateScale:1,targetScale:1,tailPower:2,ret:1,firmness:1};
 function validateLoadingDuration(ms){if(!Number.isFinite(ms)||ms<0)throw Error('Loading duration must be a finite nonnegative number of milliseconds.');}
 // Frozen constant-strain-rate ramp sensitivity. No evolving strain-rate state.
 function rapidStiffness(p,ms){if(ms===0)return p.K;const x=(ms/1000)/(p.C/p.K);return x===0?p.K:p.K*(-Math.expm1(-x)/x);}
 function priorValue(id,e,fast=false,loadingDurationMs=0){validateLoadingDuration(loadingDurationMs);const p=PRIORS[id];if(p.family==='EVA')return p.a1*Math.tanh(p.a2*e)+p.P0*(fast?1:1-p.leak)*e/(1-e);if(fast)return rapidStiffness(p,loadingDurationMs)*e+p.kp*e+p.gamma*e*Math.expm1(e)**p.n;return p.C*p.rate*(-Math.expm1(-p.K*e/(p.C*p.rate)))+p.kp*e+p.gamma*e*Math.expm1(e)**p.n;}
 function priorDerivative(id,e,fast=false,loadingDurationMs=0){validateLoadingDuration(loadingDurationMs);const p=PRIORS[id];if(p.family==='EVA'){const t=Math.tanh(p.a2*e);return p.a1*p.a2*(1-t*t)+p.P0*(fast?1:1-p.leak)/(1-e)**2;}const z=Math.expm1(e);return (fast?rapidStiffness(p,loadingDurationMs):p.K*Math.exp(-p.K*e/(p.C*p.rate)))+p.kp+p.gamma*(z**p.n+e*p.n*z**(p.n-1)*Math.exp(e));}
 // IFD / indenter area is a nominal pressure proxy, not a measured uniaxial law.
 function materialAnchors(l){const a=l.mode==='CFD'?l.a*1000:l.a*IFD;return l.b==null?[[.25,a]]:[[.25,a],[l.mode==='CFD'?.5:.65,l.mode==='CFD'?l.b*1000:a*l.b]];}
 function validate(s,c,allowEmpty=false){
  if(!Array.isArray(s)||(!allowEmpty&&!s.length)||s.length>8)throw Error('Use one to eight layers.');
  if(!['fast','slow'].includes(c.speedModel))throw Error('Choose a supported loading curve: fast or slow.');
  for(const k of ['mass','speed','area','rateScale','targetScale','tailPower','ret','firmness'])if(!Number.isFinite(c[k])||c[k]<=0)throw Error('Enter a positive '+k+'.');
  if(c.ret>1||c.tailPower<1||c.tailPower>5||c.rateScale>20||c.targetScale>20)throw Error('Check the model settings.');
  if(!['pad','rigid'].includes(c.targetMode))throw Error('Choose a supported target.');
  if(c.targetMode==='pad'&&(!Number.isFinite(c.targetH)||c.targetH<=0||!(c.targetA>0)||!(c.targetRho>0)))throw Error('Check target thickness, pressure and density.');
  for(const l of s){
   const legacyColor=LEGACY_COLORS.indexOf(l.color);
   if(legacyColor>=0)l.color=COLORS[legacyColor];
   if(!PRIORS[l.prior]||PRIORS[l.prior].family!==l.family)throw Error('Choose a matching material-family reference.');
   for(const k of ['h','a','rho'])if(!Number.isFinite(l[k])||l[k]<=0)throw Error(l.name+': enter positive '+k+'.');
   if(l.rho*PCF>=PRIORS[l.prior].solid*.3)throw Error(l.name+': density is outside this low-density foam model.');
   if(l.b!=null&&(!Number.isFinite(l.b)||l.b<=(l.mode==='ILD'?1:l.a)))throw Error(l.name+': deeper-compression firmness must be larger.');
  }
 }
 function thicknessReason(layers){
  if(!Array.isArray(layers)||layers.length<1||layers.length>8)return 'Use one to eight foam layers.';
  for(let i=0;i<layers.length;i++){
   const l=layers[i];
   if(!Number.isFinite(l.h)||l.h<.5||l.h>100)return (l.name||'Layer '+(i+1))+': keep thickness between 0.5 and 100 mm.';
  }
  return '';
 }
 function scaleThickness(layers,total){
  const reason=thicknessReason(layers);
  if(reason)throw Error(reason);
  if(!Number.isFinite(total)||total<=0)throw Error('Enter a positive total thickness.');
  const factor=total/layers.reduce((sum,l)=>sum+l.h,0);
  const scaled=clone(layers).map(l=>({...l,h:l.h*factor}));
  const invalid=thicknessReason(scaled);
  if(invalid)throw Error(invalid);
  return scaled;
 }
 function stackWeightGrams(layers){
  if(!Array.isArray(layers))throw Error('Provide foam layers to estimate their mass.');
  return layers.reduce((sum,l)=>{
   if(!l||!Number.isFinite(l.h)||l.h<=0||!Number.isFinite(l.rho)||l.rho<=0)throw Error('Foam mass requires positive thickness and density.');
   return sum+l.rho*PCF*.030*.030*l.h;
  },0);
 }
 const cache=new Map();
 function materialCurve(l,tailPower=2,resolution=550,speedModel='slow',loadingDurationMs=0){
  validateLoadingDuration(loadingDurationMs);
  const key=JSON.stringify([l.prior,l.family,l.mode,l.rho,l.a,l.b,tailPower,resolution,speedModel,loadingDurationMs]);if(cache.has(key))return cache.get(key);
  const pr=PRIORS[l.prior],anchors=materialAnchors(l),q1=priorValue(l.prior,.25),q2=anchors.length>1?priorValue(l.prior,anchors[1][0]):null;
  // Constant-area incompressible-skeleton packing limit. Not densification onset.
  const cap=1-l.rho*PCF/pr.solid,join=Math.min(pr.limit,cap-.04),qLast=anchors.length>1?q2:q1;
  function mapped(e){const fast=speedModel==='fast',q=priorValue(l.prior,e,fast,loadingDurationMs);if(anchors.length===1||q<=q1)return {p:anchors[0][1]*q/q1,d:anchors[0][1]*priorDerivative(l.prior,e,fast,loadingDurationMs)/q1};
   const slope=(anchors[1][1]-anchors[0][1])/(q2-q1);return {p:anchors[0][1]+slope*(q-q1),d:slope*priorDerivative(l.prior,e,fast,loadingDurationMs)};}
  const atJoin=mapped(join),L=cap-join;
  function pressure(e){if(e<=join)return mapped(e).p;return atJoin.p+atJoin.d*L/tailPower*(Math.pow(L/(cap-e),tailPower)-1);}
  const eps=[0,...anchors.map(a=>a[0]),join];for(let i=1;i<=resolution;i++)eps.push(join*i/resolution);
  for(let i=1;i<=240;i++)eps.push(cap-L*Math.exp(-9*i/240));
  eps.sort((a,b)=>a-b);const es=eps.filter((v,i)=>v<cap&&(i===0||v-eps[i-1]>1e-12)),ps=es.map(pressure),ws=[0];
  for(let i=1;i<es.length;i++){if(!(ps[i]>ps[i-1]))throw Error('Non-monotone material response.');ws.push(ws[i-1]+(ps[i-1]+ps[i])*(es[i]-es[i-1])/2);}
  // W / pressure reaches a maximum near the useful-stroke / densification transition.
  // It is a response-shape marker, not a safety limit.
  let knee=1,eff=-1;for(let i=1;i<es.length;i++)if(es[i]>.1&&es[i]<Math.min(.92,cap-.01)&&ws[i]/ps[i]>eff){eff=ws[i]/ps[i];knee=i;}
  const out={es,ps,ws,cap,join,knee:es[knee],kneeP:ps[knee],anchors,prior:l.prior,sourceLimit:pr.limit,referenceRho:pr.rho,speedModel,loadingDurationMs,pressure};
  if(cache.size>1800)cache.clear();cache.set(key,out);return out;
 }
 function upper(a,v){let lo=0,hi=a.length;while(lo<hi){let m=(lo+hi)>>1;if(a[m]<=v)lo=m+1;else hi=m;}return lo;}
 function atPressure(cv,p,scale=1){
  const z=Math.max(0,p/scale),j=Math.max(1,upper(cv.ps,z)),i=Math.min(j-1,cv.ps.length-2),p0=cv.ps[i],p1=cv.ps[i+1],e0=cv.es[i],e1=cv.es[i+1];
  if(z>cv.ps.at(-1))throw Error('Compression exceeds the model’s finite packing range.');
  const e=e0+(e1-e0)*(z-p0)/(p1-p0),w=cv.ws[i]+(p0+z)*(e-e0)/2;
  return {e,w:w*scale,de:(e1-e0)/((p1-p0)*scale)};
 }
 function atStrain(cv,e,scale=1){e=Math.max(0,e);if(e>=cv.es.at(-1))throw Error('Strain exceeds the model range.');const j=Math.max(1,upper(cv.es,e)),i=Math.min(j-1,cv.es.length-2),f=(e-cv.es[i])/(cv.es[i+1]-cv.es[i]);return {p:(cv.ps[i]+f*(cv.ps[i+1]-cv.ps[i]))*scale,w:(cv.ws[i]+(cv.ps[i]+cv.ps[i]+f*(cv.ps[i+1]-cv.ps[i]))*(e-cv.es[i])/2)*scale};}
 function variant(stack,id,key,value,donor){const out=clone(stack),l=out.find(l=>l.id===id);if(!l)throw Error('Select a layer.');
  if(key==='transfer'){const d=out.find(l=>l.id===donor);if(!d||d===l)throw Error('Select a different donor layer.');d.h-=value-l.h;l.h=value;if(d.h<.5)throw Error('Keep at least 0.5 mm in the donor layer.');}
  else if(key==='firm'){const f=value/l.a;l.a=value;if(l.mode==='CFD'&&l.b!=null)l.b*=f;}else l[key]=value;return out;}
 function importState(d){
  if(!d||!Array.isArray(d.layers)||(!d.layers.length&&!(d.version>=11)))throw Error('Choose a saved foam-stack JSON file.');
  const layers=d.layers.map((old,i)=>{const grade=MATERIALS[old.grade]?old.grade:old.family==='EVA'?'customEVA':old.family==='Latex'?'customLatex':'customPU';const l={...layer(grade,old.h,old.name||'Layer '+(i+1),old.id||'layer-'+i,old.color||COLORS[i]),...old};
   const legacyColor=LEGACY_COLORS.indexOf(l.color);
   if(legacyColor>=0)l.color=COLORS[legacyColor];
   if(!PRIORS[l.prior]||PRIORS[l.prior].family!==l.family)l.prior=MATERIALS[grade].prior;
   if(d.version<7&&l.family==='Latex')l.b=null;return l;});
  const old=d.config||{},c={...DEFAULT_CONFIG,...old,rateScale:old.rateScale??old.mult??1,targetScale:old.targetScale??old.targetMult??1,tailPower:old.tailPower??2};
  if(d.version<7){c.targetB=null;c.targetRho=75;if(c.targetMode==='spring')c.targetMode='pad';}
  validate(layers,c,layers.length===0);return {layers,config:c};
 }
 return {PCF,IFD,G,SOURCES,PRIORS,MATERIALS,COLORS,CANONICAL,PROFILES,HITS,DEFAULT_CONFIG,clone,layer,recipe,priorValue,priorDerivative,materialAnchors,materialCurve,atPressure,atStrain,variant,validate,scaleThickness,stackWeightGrams,importState,upper};
})();
if(typeof module!=='undefined')module.exports=FoamModel;
