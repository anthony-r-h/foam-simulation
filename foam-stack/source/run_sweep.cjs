'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),S=require('./sweep.js');
const {Worker,isMainThread,parentPort,workerData}=require('worker_threads');
if(!isMainThread){
 const plan=S.createPlan();plan.createdAt=workerData.createdAt;
 let batch=[];
 for(let index=workerData.start;index<workerData.end;index+=workerData.stride||1){
  batch.push({index,row:S.calculateCase(plan,index)});
  if(batch.length===25){parentPort.postMessage(batch);batch=[];}
 }
 if(batch.length)parentPort.postMessage(batch);
}else{
const args=process.argv.slice(2),outputIndex=args.indexOf('--output');
const output=path.resolve(outputIndex<0?path.join(__dirname,'..','analysis'):args[outputIndex+1]);
const limitIndex=args.indexOf('--limit'),requestedLimit=limitIndex<0?Infinity:Number(args[limitIndex+1]);
const workersIndex=args.indexOf('--workers'),workerCount=workersIndex<0?1:Number(args[workersIndex+1]);
if(!(requestedLimit===Infinity||Number.isInteger(requestedLimit)&&requestedLimit>0))throw Error('Use a positive --limit.');
if(!Number.isInteger(workerCount)||workerCount<1||workerCount>8)throw Error('Use one to eight workers.');
fs.mkdirSync(output,{recursive:true});
const plan=S.createPlan(),limit=Math.min(plan.caseCount,requestedLimit),rows=[],start=Date.now(),workers=[];
// Archive the exact executable model and full plan before any calculations.
const sourceNames=['engine.js','impact_engine.js','sweep.js','run_sweep.cjs','package.json'];
const sourceDir=path.join(output,'source');fs.mkdirSync(sourceDir,{recursive:true});
const sources=Object.fromEntries(sourceNames.map(name=>{
 const data=fs.readFileSync(path.join(__dirname,name));fs.writeFileSync(path.join(sourceDir,name),data);
 return [name,crypto.createHash('sha256').update(data).digest('hex')];
}));
const {createdAt,...definition}=plan;
const manifest={studyId:S.STUDY_ID,studyName:S.STUDY_NAME,createdAt,designCount:plan.designs.length,caseCount:plan.caseCount,roleAssignmentCount:plan.roleAssignmentCount,roleThicknessPatternCount:plan.roleThicknessPatternCount,planSha256:crypto.createHash('sha256').update(JSON.stringify(definition)).digest('hex'),sources,nodeVersion:process.version,platform:process.platform,architecture:process.arch};
fs.writeFileSync(path.join(output,'study-manifest.json'),JSON.stringify(manifest,null,2));
fs.writeFileSync(path.join(output,'adult-parameter-study-plan.json'),JSON.stringify(plan));
console.log(JSON.stringify(manifest));
if(args.includes('--plan-only'))process.exit(0);
const csvPath=path.join(output,'adult-parameter-study.csv'),fd=fs.openSync(csvPath,'w');
let received=0,written=0,errorCount=0,nextProgress=500;
function accept(batch){
 for(const {index,row} of batch){rows[index]=row;received++;if(row.status==='error')errorCount++;}
 while(rows[written]){fs.writeSync(fd,S.csvRow(rows[written])+'\r\n');rows[written]=S.compactRow(rows[written]);written++;}
 if(received>=nextProgress||received===limit){console.log(JSON.stringify({completed:received,total:limit,elapsedSeconds:Math.round((Date.now()-start)/1000),errors:errorCount}));nextProgress=received+500;}
}
async function main(){try{
 fs.writeSync(fd,S.csvHeader()+'\r\n');
 if(workerCount===1){for(let index=0;index<limit;index++)accept([{index,row:S.calculateCase(plan,index)}]);}
 else{
  
  await Promise.all(Array.from({length:workerCount},(_,i)=>new Promise((resolve,reject)=>{
   const worker=new Worker(__filename,{workerData:{createdAt:plan.createdAt,start:i,end:limit,stride:workerCount}});workers.push(worker);
   worker.on('message',accept);worker.on('error',reject);worker.on('exit',code=>code===0?resolve():reject(Error('Study worker exited with code '+code)));
  })));
 }
}catch(error){await Promise.all(workers.map(worker=>worker.terminate()));throw error;}finally{fs.closeSync(fd);}
const summary=S.summarize(plan,rows);
summary.elapsedSeconds=(Date.now()-start)/1000;
const scoring=S.scoreStudy(summary);
fs.writeFileSync(path.join(output,'adult-parameter-study-rankings.csv'),S.rankingCsv(summary,scoring));
fs.writeFileSync(path.join(output,'adult-parameter-study-scoring.json'),JSON.stringify(scoring,null,2));
fs.writeFileSync(path.join(output,'adult-parameter-study-summary.json'),JSON.stringify(summary,null,2));

if(summary.complete&&!summary.errorCount){
 const shortlist=summary.targetSummaries.flatMap(t=>t.baselineLeaders.map(d=>d.id));
 const selected=[...new Set([...shortlist,...summary.robustFrontier.slice(0,20)])];
 const refinedPlan={...plan,numerics:{...plan.numerics,nr:48,nt:40,resolution:1100,steps:480}};
 const refinement=selected.map(id=>{const index=plan.designs.findIndex(d=>d.id===id),fine=S.calculateCase(refinedPlan,index),coarse=rows[index];return {designId:id,status:fine.status,coarsePeakN:coarse.peak_force_N,finePeakN:fine.peak_force_N,peakChangePercent:fine.peak_force_N&&coarse.peak_force_N?100*(fine.peak_force_N/coarse.peak_force_N-1):null};});
 fs.writeFileSync(path.join(output,'adult-parameter-study-refinement.json'),JSON.stringify({numerics:refinedPlan.numerics,scope:'Lowest five peaks and first twenty frontier designs; other near ties unverified',results:refinement},null,2));
 fs.writeFileSync(path.join(__dirname,'study_baseline.json'),JSON.stringify(summary));
}
console.log(JSON.stringify({csv:csvPath,summary:path.join(output,'adult-parameter-study-summary.json'),...Object.fromEntries(['evaluatedCases','resolvedCount','unresolvedCount','errorCount','robustFrontierCount','elapsedSeconds'].map(key=>[key,summary[key]]))}));
if(summary.errorCount)process.exitCode=1;
}
main().catch(error=>{console.error(error);process.exitCode=1;});
}
