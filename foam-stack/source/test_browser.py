import argparse
import csv
import json
import math
import os
import re
from pathlib import Path
import shutil
from urllib.parse import urlsplit


def browser_path(playwright, requested):
 if requested:
  candidate=Path(requested).expanduser()
  if not candidate.is_file():
   raise SystemExit(f'Browser executable not found: {candidate}')
  return str(candidate)
 candidates=[Path(playwright.chromium.executable_path)]
 for name in ['chromium', 'chromium-browser', 'google-chrome', 'microsoft-edge']:
  found=shutil.which(name)
  if found:
   candidates.append(Path(found))
 for directory in ['PROGRAMFILES', 'PROGRAMFILES(X86)', 'LOCALAPPDATA']:
  base=os.environ.get(directory)
  if base:
   candidates.extend(Path(base)/relative for relative in [
    'Microsoft/Edge/Application/msedge.exe',
    'Google/Chrome/Application/chrome.exe',
   ])
 candidates.extend([
  Path('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
  Path('/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'),
 ])
 for candidate in candidates:
  if candidate.is_file():
   return str(candidate)
 raise SystemExit('No Chromium browser found. Pass --browser with an installed Chromium, Chrome, or Edge executable.')


parser=argparse.ArgumentParser(description='Check Glove Foam Mechanics offline or in its hosted app frame.')
parser.add_argument('--url', help='Homepage URL containing the simulator iframe; omit for standalone offline checks.')
parser.add_argument('--browser', help='Path to a Chromium, Chrome, or Edge executable; otherwise detect an installed browser.')
parser.add_argument('--output', type=Path, help='Directory for the report and screenshots.')
args=parser.parse_args()
try:
 from playwright.sync_api import sync_playwright
except ModuleNotFoundError as exc:
 raise SystemExit('These browser checks require the Python Playwright package.') from exc

project=Path(__file__).resolve().parents[2]
mode='hosted' if args.url else 'standalone'
root=args.output or project/'output/playwright'/f'foam-{mode}'
(root/'preview').mkdir(parents=True,exist_ok=True)
checks=[]
def ck(q,label):
 assert q,label
 checks.append(label)

def clone(value):
 return json.loads(json.dumps(value))

def state(page):
 return page.evaluate('foamApp.getState()')

def restore(page,value):
 page.evaluate('x=>foamApp.setState(x)',value)
 page.wait_for_function('foamApp.getResult() && document.querySelector("#main-chart svg")')

def change(page,selector,value):
 page.locator(selector).focus()
 page.locator(selector).fill(str(value))
 page.locator(selector).press('Tab')

def select_impact(page,impact_id):
 page.click('[data-impact="'+impact_id+'"]')

def metric_value(text,name,unit):
 match=re.search(re.escape(name)+r':\s*(-?[\d,]+(?:\.\d+)?)\s*'+re.escape(unit),text)
 return None if match is None else float(match.group(1).replace(',',''))

def check_reference_cards(page,label):
 expected=page.evaluate('''() => {
  const s=foamApp.getState();
  return ['test3','test10'].map(id=>{
   const r=ImpactModel.calculate(s.layers,s.config,id,false);
   return {id,force:r.F,display:r.F.toLocaleString('en-CA',{minimumFractionDigits:0,maximumFractionDigits:0}),complete:r.loadingComplete,verdict:r.pass===null?'Unresolved':r.pass?'Pass':'Fail',mass:r.mass,energy:r.E};
  });
 }''')
 ck(page.locator('#reference-checks [data-reference]').count()==2,label+' displays both automatic SATRA checks')
 for r in expected:
  text=page.locator('[data-reference="'+r['id']+'"]').inner_text()
  ck(re.search(r'\b'+r['verdict']+r'\b',text) is not None,label+' '+r['id']+' verdict matches the fixed apparatus')
  ck(re.fullmatch(r'(3|10) J:\s*(Pass|Fail|Unresolved)',text) is not None,label+' '+r['id']+' is a status-only summary without force values')
  ck(r['mass']==2.5 and math.isclose(r['energy'],3 if r['id']=='test3' else 10,abs_tol=1e-12),label+' '+r['id']+' uses its specified mass and energy')
 ck('model checks' in page.locator('#reference-checks').inner_text().lower(),label+' verdicts are identified as model checks')
 ck(page.locator('#reference-checks button,[data-inspect-test]').count()==0,label+' automatic checks have no inspection controls')
 return expected

def check_loading_comparison(page,label):
 expected=page.evaluate('''() => {
  const s=foamApp.getState();
  return [0,20].map(loadingDurationMs=>{
   const r=ImpactModel.calculate(s.layers,{...s.config,speedModel:'fast'},s.impact,false,{loadingDurationMs,target:s.target});
   return {complete:r.loadingComplete,display:r.F.toLocaleString('en-CA',{minimumFractionDigits:0,maximumFractionDigits:0})};
  });
 }''')
 rows=page.locator('#rapid-sensitivity tbody tr')
 ck(rows.count()==2,label+' compares the rapid baseline with the 20 ms ramp')
 for i,r in enumerate(expected):
  value=rows.nth(i).locator('td').nth(1).inner_text()
  ck(value==r['display'] if r['complete'] else value in ['Unresolved','Not stopped'],label+' displays correct force or unresolved status')
 ck(('%' in rows.nth(1).locator('td').nth(2).inner_text())==all(r['complete'] for r in expected),label+' percentage comparison requires both peaks to resolve')

def check_keyboard(page,label,chart_id='main-chart'):
 hitbox=page.locator('#'+chart_id+' .hitbox');readout=page.locator('#'+chart_id+' .readout')
 endpoint=readout.inner_text()
 ck(bool(endpoint.strip()),label+' values are visible without hovering')
 hitbox.focus();hitbox.press('Home');start=readout.inner_text();first_value=float(hitbox.get_attribute('aria-valuenow'))
 ck(start!=endpoint,label+' Home selects the first sample')
 hitbox.press('ArrowRight')
 ck(float(hitbox.get_attribute('aria-valuenow'))>first_value,label+' ArrowRight advances the sample')
 hitbox.press('ArrowLeft')
 ck(readout.inner_text()==start,label+' ArrowLeft returns to the previous sample')
 hitbox.press('End')
 ck(float(hitbox.get_attribute('aria-valuenow'))==float(hitbox.get_attribute('aria-valuemax')),label+' End selects the final sample')
 ck(', ' in hitbox.get_attribute('aria-valuetext'),label+' accessible readout separates its values')

def check_compression(page,label):
 page.select_option('#graph','force')
 expected=page.evaluate("() => {const r=foamApp.getResult();return r.comp.defs.map((d,i)=>({name:d.l.name,value:100*(1-r.trace.rows.at(-1).es[i])*d.h/r.comp.defs.reduce((sum,d)=>sum+d.h,0)}));}")
 ck(page.locator('#main-chart .axis-label-y').inner_text()=='Thickness remaining (%)',label+' labels the left percentage axis')
 ck(page.locator('#main-chart .axis-label-y2').inner_text()=='Force (kN)',label+' labels the right force axis')
 ck(page.locator('#main-chart .legend').evaluate('(el) => getComputedStyle(el).justifyContent')=='center',label+' centers the legend')
 force_color=page.locator('#main-chart path[data-series="Force"]').get_attribute('stroke')
 stack_color=page.locator('#main-chart path[data-series="Stack"]').get_attribute('stroke')
 ck(force_color!=stack_color,label+' distinguishes force and stack colors')
 page.select_option('#graph','work')
 ck(page.locator('#main-chart path[data-series="Foam work"]').get_attribute('stroke')==force_color,label+' energy matches force color')
 ck(page.locator('#main-chart path[data-series="Fist speed"]').get_attribute('stroke')==stack_color,label+' speed matches stack color')
 page.select_option('#graph','force')
 ck(page.locator('#main-chart .legend > span').all_inner_texts()==['Force']+[d['name'] for d in expected]+['Stack'],label+' combines force and remaining layer thickness')
 text=page.locator('#main-chart .readout').inner_text()
 for d in expected:
  shown=metric_value(text,d['name'],'%')
  ck(shown is not None and math.isclose(shown,d['value'],abs_tol=.0051),label+' remaining thickness readout matches strain')
 geometry=page.evaluate(r'''() => {
  const el=document.querySelector('#main-chart'),box=el.querySelector('.hitbox'),r=foamApp.getResult();
  const height=+box.getAttribute('height'),bottom=+box.getAttribute('y')+height;
  const bands=[...el.querySelectorAll('path.area')],total=r.comp.defs.reduce((sum,d)=>sum+d.h,0);
  return bands.length===r.comp.defs.length && bands.every((path,i)=>{
   const points=[...path.getAttribute('d').matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)],count=r.trace.rows.length;
   return path.getAttribute('d').endsWith('Z') && r.trace.rows.every((row,j)=>{
    const upper=Number(points[j][2]),lower=Number(points[2*count-1-j][2]);
    const expected=100*r.comp.defs.slice(0,i+1).reduce((sum,d,k)=>sum+(1-row.es[k])*d.h,0)/total;
    return Math.abs((bottom-upper)/height*100-expected)<.01 && Math.abs((lower-upper)/height*100-100*(1-row.es[i])*r.comp.defs[i].h/total)<.01;
   });
  });
 }''')
 ck(geometry,label+' stacked bands sum to overall thickness on the percentage axis throughout loading')
 page.locator('#main-chart .hitbox').press('Home')
 ck(math.isclose(metric_value(page.locator('#main-chart .readout').inner_text(),'Stack','%'),100),label+' overall stack starts at 100 percent remaining')


def check_main_graphs(page,label):
 has_hand=page.evaluate('!!foamApp.getResult().handSpring')
 scales=[]
 for graph,ylabel in [('force','Force (kN)'),('work','Foam work (J)')]:
  page.select_option('#graph',graph)
  ck(page.locator('#main-chart svg').count()==1 and 'NaN' not in page.locator('#main-chart').inner_html(),label+' '+graph+' renders finite coordinates')
  axis=page.locator('#main-chart .axis-label-y')
  ck(axis.text_content()==ylabel and 'rotate(-90)' in axis.get_attribute('transform'),label+' '+graph+' labels the vertical axis beside the plot')
  scales.append(page.locator('#main-chart').get_attribute('data-xmax'))
  ck(('2 kN limit' in page.locator('#main-chart svg').text_content())==(graph=='force' and page.evaluate('foamApp.getResult().limit!==null')),label+' '+graph+' uses a threshold only for SATRA inspection')
 ck(len(set(scales))==1,label+' graph views share the same time scale')
 page.select_option('#graph','work')
 shown=metric_value(page.locator('#main-chart .readout').inner_text(),'Foam work','J')
 ck(shown is not None and math.isclose(shown,page.evaluate('foamApp.getResult().trace.rows.at(-1).fw'),abs_tol=.0051),label+' Energy reports work into glove foam')
 ck(page.locator('#main-chart path.series-line').count()==2 and 'Hand spring energy' not in page.locator('#main-chart').inner_text(),label+' Energy and speed show foam work and fist speed without hand energy')
 ck('Bag work' not in page.locator('#main-chart').inner_text() and 'Kinetic energy' not in page.locator('#main-chart').inner_text(),label+' Energy excludes target and kinetic-energy bookkeeping')
 caption=page.locator('#graph-caption').inner_text()
 ck('energy has gone into compressing the foam' in caption,label+' Energy does not imply permanent dissipation')
 ck(page.locator('#main-chart .axis-label-y2').inner_text()=='Speed (m/s)',label+' speed labels the right axis')
 shown=metric_value(page.locator('#main-chart .readout').inner_text(),'Fist speed','m/s')
 ck(shown is not None and math.isclose(shown,page.evaluate('foamApp.getResult().trace.rows.at(-1).v'),abs_tol=.0051),label+' Speed shows fist speed at final modeled compression')
 ck(page.locator('#main-chart .legend > span').all_inner_texts()==['Foam work','Fist speed'] and 'Bag:' not in page.locator('#main-chart .readout').inner_text(),label+' combined chart identifies foam work and fist speed')
 check_compression(page,label)
 page.select_option('#graph','force');check_keyboard(page,label+' Force')
 complete=page.evaluate('foamApp.getResult().loadingComplete')
 force_label='Peak force' if complete else 'Force reached'
 ck(page.locator('#peak-force-metric .label').inner_text()==force_label,label+' force metric distinguishes peaks from unresolved endpoints')
 ck('Hand Spring' not in page.locator('#results').inner_text(),label+' results keep model assumptions in Methodology')
 ck(page.locator('#hand-spring-audit').evaluate('(el)=>!!el.closest("#methodology")'),label+' hand diagnostics live in Methodology')
 if has_hand:
  ck('hand give' in page.locator('#hand-spring-audit').text_content(),label+' Methodology retains current hand diagnostics')
 ck(('Peak' in page.locator('#main-chart svg').text_content())==complete,label+' Force marks a peak only when loading resolves')
 if not complete:
  ck('Model range' in page.locator('#main-chart svg').text_content() and 'calculation stops before the peak' in page.locator('#graph-caption').inner_text(),label+' incomplete trace identifies its model limit')

def check_card_layout(page,label):
 selectors=['#impact-card','#target-card','#layers-card','#results-card','.analysis','#parameter-study']
 boxes=[page.locator(selector).bounding_box() for selector in selectors]
 ck(all(boxes[i+1]['y']>=boxes[i]['y']+boxes[i]['height']-1 for i in range(len(boxes)-1)),label+' cards stack vertically with Results before Impact graphs')
 ck(max(box['x'] for box in boxes)-min(box['x'] for box in boxes)<2,label+' cards share a consistent left edge')
 ck(not page.evaluate('document.documentElement.scrollWidth>innerWidth'),label+' page has no horizontal overflow')

def check_early_loading(page,label,available,completed):
 data=page.evaluate('''() => {
  const r=foamApp.getResult(),rows=r.trace.rows,sampleSeconds=.01;
  const i=rows.findIndex(row=>row.t>=sampleSeconds);
  let force=null;
  if(i>=0){
   const b=rows[i],a=rows[Math.max(0,i-1)];
   force=b.t===sampleSeconds?b.F:a.F+(b.F-a.F)*(sampleSeconds-a.t)/(b.t-a.t);
  }
  return {early:r.earlyLoading,peakSeconds:r.trace.time,peakForce:r.F,complete:r.loadingComplete,interpolatedForce:force,impulse:r.trace.impulse};
 }''')
 early=data['early'];covered=data['peakSeconds']>=.01;metric=page.locator('#early-loading-metric')
 ck(early['available']==available and data['complete']==completed,label+' has the expected ratio availability and peak status')
 ck(early['sampleSeconds']==.01,label+' samples force at exactly 10 ms')
 ck(math.isclose(early['coveredSeconds'],min(.01,data['peakSeconds']),abs_tol=1e-12),label+' reports actual time coverage')
 ck(metric.locator('.label').inner_text()=='Force reached by 10 ms',label+' identifies the sampled force rather than an average')
 shown=metric.locator('.value').inner_text();match=re.search(r'([\d,]+(?:\.\d+)?)\s*%',shown)
 if covered:
  ck(math.isclose(early['forceAt10N'],data['interpolatedForce'],rel_tol=1e-10,abs_tol=1e-8),label+' force matches independent interpolation of the trace at 10 ms')
 else:
  ck(early['forceAt10N'] is None,label+' does not extrapolate force beyond the modeled trace')
 if available:
  ck(math.isclose(early['peakPercent'],100*early['sampleForceN']/data['peakForce'],rel_tol=1e-10),label+' ratio uses the resolved peak as denominator')
  ck(match is not None and math.isclose(float(match.group(1).replace(',','')),early['peakPercent'],abs_tol=.51),label+' displayed percentage matches force divided by peak force')
  pct=early['peakPercent']
  descriptor='Gradual buildup' if pct<50 else 'Moderate buildup' if pct<70 else 'Sharp buildup' if pct<=85 else 'Very sharp buildup'
  ck(metric.locator('.loading-interpretation').inner_text()==descriptor,label+' loading description matches the calculated percentage band')
  ck(math.isclose(early['sampleTimeSeconds'],min(.01,data['peakSeconds']),abs_tol=1e-12),label+' rising-phase sample caps at an earlier resolved peak')
  if early['peakBefore10']:ck(early['peakPercent']==100 and 'Peak reached before 10 ms' in metric.inner_text(),label+' early peak is explicitly identified as 100%')
 else:
  ck(early['peakPercent'] is None and 'Not available' in shown and match is None,label+' unavailable ratios remain null rather than becoming zero or lower-bound percentages')
  explanation=metric.locator('.sub').inner_text().lower()
  ck('10 ms' in explanation and ('peak' in explanation if covered else 'not modeled' in explanation or 'before' in explanation),label+' explains the missing time sample or resolved peak')
  ck(metric.locator('.loading-interpretation').count()==0,label+' unavailable ratio gets no loading-speed classification')
 impulse=page.locator('#impulse-metric')
 ck(impulse.locator('.label').inner_text()==('Impulse' if completed else 'Impulse so far'),label+' impulse label distinguishes complete loading from a truncated trace')
 impulse_match=re.search(r'([\d,]+(?:\.\d+)?)\s*Ns',impulse.locator('.value').inner_text())
 ck(impulse_match is not None and math.isclose(float(impulse_match.group(1).replace(',','')),data['impulse'],abs_tol=.0051),label+' loading impulse displays the computed value in Ns')
 page.select_option('#graph','force')
 marker=page.evaluate('''() => {
  const el=document.querySelector('#main-chart'),label=[...el.querySelectorAll('svg text')].find(t=>t.textContent==='10 ms');
  if(!label)return null;
  const circle=label.previousElementSibling,box=el.querySelector('.hitbox');
  return {cx:+circle.getAttribute('cx'),cy:+circle.getAttribute('cy'),left:+box.getAttribute('x'),top:+box.getAttribute('y'),width:+box.getAttribute('width'),height:+box.getAttribute('height'),xmax:+el.dataset.xmax,ymax:+el.dataset.y2max};
 }''')
 ck((marker is not None)==covered,label+' Force marks 10 ms whenever that time is modeled')
 if marker:
  expected_x=marker['left']+10/marker['xmax']*marker['width']
  expected_y=marker['top']+marker['height']*(1-data['interpolatedForce']/1000/marker['ymax'])
  ck(math.isclose(marker['cx'],expected_x,abs_tol=.011) and math.isclose(marker['cy'],expected_y,abs_tol=.011),label+' marker sits at exact 10 ms and its interpolated force')
 ck('First 10 ms' not in page.locator('#main-chart svg').text_content(),label+' does not retain the old averaging-window band')
 return data

with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path=browser_path(pw,args.browser),headless=True)
 browser_page=browser.new_page(viewport={'width':1440,'height':1000})
 browser_page.set_default_timeout(20000)
 errors=[];requests=[];simulator_requests=[]
 def record_request(request):
  requests.append(request.url)
  if request.frame.parent_frame is not None:simulator_requests.append(request.url)
 browser_page.on('pageerror',lambda e:errors.append(str(e)))
 browser_page.on('request',record_request)
 if args.url:
  browser_page.goto(args.url,wait_until='networkidle')
  iframe=browser_page.locator('iframe[title="Glove Foam Mechanics"]')
  ck(iframe.count()==1,'homepage embeds one titled Glove Foam Mechanics iframe')
  iframe.wait_for(state='visible');page=iframe.element_handle().content_frame()
  ck(page is not None,'homepage simulator frame loads')
 else:
  page=browser_page
  page.set_content((project/'public/foam-stack/foam_stack_builder_v12.html').read_text(encoding='utf-8'),wait_until='load')
 page.wait_for_function('window.foamApp && document.querySelector("#main-chart svg")')
 initial=state(page)
 ck(page.locator('h1').inner_text()=='Glove Foam Mechanics','title describes the application')
 ck('Skinny Fists' not in page.locator('body').inner_text(),'obsolete branding is absent')
 ck(page.locator('#composition-explorer,[id^="explorer-"],[data-apply-composition]').count()==0,'Composition explorer and its controls are absent')
 ck(page.locator('#save,#load,#load-file,#export-trace,[data-recipe="unpadded"],#rig-note,#change,[id^="sweep-"]:not(script)').count()==0,'removed persistence reference and change-one-thing controls are absent')
 ck(page.locator('#recipe-buttons button').all_inner_texts()==['Soft','Medium','Firm'],'three composition presets remain')
 ck('presets' in page.locator('#presets-label').inner_text().lower(),'preset controls are labeled as layer presets')
 ck(page.locator('#impact-buttons button').count()==5,'five described impact scenarios remain')
 ck(page.locator('#impact-buttons [data-impact="test3"],#impact-buttons [data-impact="test10"]').count()==0,'SATRA tests remain automatic outcomes')
 ck(page.locator('#impact-card #target').count()==0 and page.locator('#target-card #target').count()==1,'Impact and Target have separate cards')
 ck(page.locator('#impact-details dt').all_inner_texts()==['Impact energy (J)','Effective mass (kg)','Speed at contact (m/s)'],'impact details spell out quantities and units')
 ck(page.locator('#impact-details dd').count()==3 and len(page.locator('#impact-description').inner_text())>40,'impact details include a readable scenario description')
 ck(not page.locator('#methodology').get_attribute('open'),'Methodology starts collapsed')
 ck(initial['impact']['id']=='gentle' and math.isclose(initial['impact']['energy'],53.8916455,rel_tol=1e-10),'default strike retains mass speed and energy')
 ck(initial['config']['speedModel']=='fast','default impact uses rapid foam loading')
 ck(initial['target']=={'mode':'padded','thicknessMm':25},'default target is the study 25 mm EVA mat')
 ck(page.locator('#target option').evaluate_all('(nodes)=>nodes.map(n=>n.value)')==['eva25','eva50','bag'],'target selector has exactly two EVA mats and the bag')
 ck(page.locator('#parameter-study').is_visible(),'parameter study follows the impact graphs')
 current_study=page.evaluate('foamApp.getStudy()')
 if current_study is None:
  ck('7,910' in page.locator('#study-status').inner_text(),'new protocol explains the test count before a run')
  ck(page.locator('#study-chart').count()==0 and page.locator('#download-study').is_hidden(),'historical rankings are withheld')
 else:
  ck(page.evaluate('FoamSweep.isCurrentStudy(foamApp.getStudy())'),'saved baseline matches the current protocol')

 ck(page.locator('#graph option').all_text_contents()==['Force & thickness analysis','Energy & speed'],'main graph menu has two combined views')
 ck(page.locator('#graph option').evaluate_all('(nodes)=>nodes.every(n=>!n.disabled&&!n.hidden)'),'four views are available for a rigid target')
 ck(page.locator('#graph-layer').evaluate('(el)=>!!el.closest("#methodology")'),'calibration graphs remain in Methodology')
 check_card_layout(page,'desktop initial');check_reference_cards(page,'initial')
 check_main_graphs(page,'initial 25 mm EVA')
 ck('Bag compression' not in page.locator('#results').inner_text() and 'Bag movement' not in page.locator('#results').inner_text(),'Results focus on glove rather than target travel')
 ck(all(len(text)>30 for text in page.locator('#results .metric .sub').all_inner_texts()),'headline metrics include explanations')
 ck(page.locator('#results .metrics > .metric').count()==4,'Results has four headline metrics')
 ck(page.locator('#results .secondary-metrics').count()==1,'secondary results remain grouped below headline metrics')
 ck(page.locator('#early-average-metric,#j10-result').count()==0,'old average-force and J10 outputs are removed')
 ck('J10' not in page.locator('#results').text_content() and '10 ms average' not in page.locator('#results').text_content(),'Results contains no stale early-impulse or average-force labels')
 fixed_checks=page.locator('#reference-checks').inner_text()
 for hit in ['gentle','adult','olympic','commercial3','commercial5']:
  select_impact(page,hit)
  ck(len(page.locator('#impact-description').inner_text())>40,hit+' has an experiment description')
  ck(page.locator('#reference-checks').inner_text()==fixed_checks,hit+' leaves fixed SATRA apparatus unchanged')
  has_hand=hit in ['gentle','adult','olympic']
  ck(page.evaluate('!!foamApp.getResult().handSpring')==has_hand and page.locator('#impact-note').count()==0,hit+' retains hand mechanics without cluttering the impact heading')
  if hit=='commercial3':check_main_graphs(page,'mechanical commercial impact')
 restore(page,initial)
 for recipe in ['canonicalSoft','canonicalMedium','canonicalFirm']:
  page.click('[data-recipe="'+recipe+'"]')
  ck(page.locator('.layer').count()==4 and math.isclose(sum(l['h'] for l in state(page)['layers']),40,abs_tol=1e-9),recipe+' loads a complete 40 mm composition')
  ck(page.locator('[data-recipe="'+recipe+'"]').get_attribute('aria-pressed')=='true',recipe+' selection is visible')
  ck(page.locator('#total-thickness').evaluate('(el)=>!el.validity.stepMismatch'),recipe+' total thickness remains a valid numeric input')
  for hit in ['gentle','adult','olympic','commercial3','commercial5']:
   select_impact(page,hit)
   mechanics=page.evaluate('''() => {const s=foamApp.getState(),r=foamApp.getResult(),direct=ImpactModel.quick(s.layers,s.config,s.impact,{target:s.target});return {id:r.impact.id,F:r.F,expected:direct.F,m:r.mass,v:r.speed,E:r.E};}''')
   ck(mechanics['id']==hit and math.isclose(mechanics['F'],mechanics['expected'],rel_tol=1e-10),recipe+'/'+hit+' uses selected shared mechanics')
   ck(math.isclose(.5*mechanics['m']*mechanics['v']**2,mechanics['E'],rel_tol=1e-12) and not page.locator('#error').is_visible(),recipe+'/'+hit+' has consistent energy and no input error')
 restore(page,initial)
 ck(math.isclose(page.evaluate('ImpactModel.calculate(FoamModel.recipe("canonicalMedium"),FoamModel.DEFAULT_CONFIG,"test10",false).F'),1032.659403426487,rel_tol=1e-9),'backend Medium 10 J SATRA rapid-force regression is unchanged')
 check_main_graphs(page,'25 mm EVA study target')
 weight=page.evaluate('({actual:foamApp.getResult().foamWeightG,expected:FoamModel.stackWeightGrams(foamApp.getState().layers)})')
 ck(math.isclose(weight['actual'],weight['expected'],rel_tol=1e-12) and '1.71' in page.locator('#foam-weight-metric .value').inner_text(),'Foam weight displays the independent 30 mm square specimen estimate')
 ck('30 \u00d7 30 mm' in page.locator('#foam-weight-metric .sub').inner_text(),'weight explanation specifies the specimen footprint')
 ck('Fist speed at peak' in page.locator('#results').inner_text(),'completed loading reports fist speed at peak')

 # Scaling and preset application preserve the chosen total and material inputs.
 restore(page,initial);change(page,'#total-thickness',52);expanded=state(page)
 ck(math.isclose(sum(l['h'] for l in expanded['layers']),52,abs_tol=1e-9),'total thickness sets requested total')
 ck(all(math.isclose(l['h']/old['h'],1.3,rel_tol=1e-12) for l,old in zip(expanded['layers'],initial['layers'])),'total thickness scales every layer proportionally')
 ck(all(all(l[k]==old[k] for k in old if k!='h') for l,old in zip(expanded['layers'],initial['layers'])),'total thickness preserves material parameters')
 page.click('[data-recipe="canonicalSoft"]')
 ck(math.isclose(sum(l['h'] for l in state(page)['layers']),52,abs_tol=1e-9),'another preset preserves chosen total thickness')
 page.locator('#total-thickness').fill('53')
 page.click('[data-recipe="canonicalFirm"]')
 page.wait_for_function('foamApp.getState().recipe==="canonicalFirm"')
 ck(math.isclose(sum(l['h'] for l in state(page)['layers']),53,abs_tol=1e-9),'editing total then clicking a preset commits both actions on the first click')
 change(page,'#total-thickness',52)
 valid=state(page);force=page.evaluate('foamApp.getResult().F')
 for invalid in [0,1,1000]:
  change(page,'#total-thickness',invalid)
  ck(state(page)==valid and page.evaluate('foamApp.getResult().F')==force,'invalid total '+str(invalid)+' preserves valid composition and result')
  ck(page.locator('#error').is_visible() and math.isclose(float(page.locator('#total-thickness').input_value()),52,abs_tol=1e-9),'invalid total '+str(invalid)+' rolls back with an explanation')
 restore(page,initial);change(page,'.layer [data-k="h"] >> nth=0',7)
 ck(math.isclose(float(page.locator('#total-thickness').input_value()),41,abs_tol=1e-9),'individual layer editing updates total thickness: '+str([(l['h'],l['name']) for l in state(page)['layers']])+'; displayed '+page.locator('#total-thickness').input_value())
 ck(state(page)['recipe']=='custom','editing marks composition custom')
 preserved=state(page)['layers'];select_impact(page,'adult')
 ck(state(page)['layers']==preserved,'impact changes preserve edited layers')
 restore(page,initial)
 for _ in range(3):page.locator('.layer [data-action="delete"]').last.click()
 ck(page.locator('.layer').count()==1 and page.locator('.layer [data-action="delete"]').is_disabled(),'final foam layer cannot be deleted')
 restore(page,initial)

 # Target selection preserves the foam and incident impact.
 page.select_option('#target','bag');bag_state=state(page)
 ck(bag_state['target']=={'mode':'bag','mass':41,'stiffness':40000,'radius':.21},'bag defaults use documented mass size and assumed response')
 ck(bag_state['layers']==initial['layers'] and bag_state['impact']==initial['impact'],'target selection preserves foam and strike')
 ck(page.locator('#bag-settings').is_visible() and 'assumption' in page.locator('#bag-settings').inner_text(),'bag firmness is an explicit assumption')
 ck(page.evaluate('foamApp.getResult().loadingComplete && !foamApp.getResult().hasStopped'),'bag loading resolves while fist continues moving')
 ck('Fist speed at peak' in page.locator('#results').inner_text() and 'does not indicate foam bottoming out' in page.locator('#results').inner_text(),'bag speed is interpreted as speed at peak compression')
 ck('Bag compression' not in page.locator('#results').inner_text(),'bag deformation stays outside headline results')
 check_reference_cards(page,'bag');check_main_graphs(page,'bag')

 # Bag inputs are bounded and firmness is a predictable choice.
 ck(page.locator('#bag-stiffness').evaluate('(el)=>el.tagName')=='SELECT' and page.locator('#bag-stiffness option').all_text_contents()==['Softer','Medium','Firmer'],'bag has three firmness settings')
 ck(page.locator('#bag-mass').get_attribute('min')=='10' and page.locator('#bag-mass').get_attribute('max')=='100','bag mass has bounded inputs')
 ck(page.locator('#bag-diameter').get_attribute('min')=='25' and page.locator('#bag-diameter').get_attribute('max')=='80','bag diameter uses bounded centimetre inputs')
 baseline=page.evaluate('foamApp.getResult().F');change(page,'#bag-mass',20)
 ck(state(page)['target']['mass']==20 and page.evaluate('foamApp.getResult().F')<baseline,'lighter bag changes moving-target calculation')
 page.select_option('#bag-stiffness','80000');change(page,'#bag-diameter',50)
 ck(state(page)['target']['stiffness']==80000 and state(page)['target']['radius']==.25,'bag controls convert to intended SI values')
 ck(state(page)['impact']==bag_state['impact'],'target settings preserve strike mass and speed')
 valid_bag=state(page)
 for selector,value in [('#bag-mass',9),('#bag-mass',101),('#bag-diameter',24),('#bag-diameter',81)]:
  change(page,selector,value)
  ck(state(page)==valid_bag and page.locator('#error').is_visible(),selector+' out-of-range input preserves valid setup')
 restore(page,valid_bag);page.select_option('#graph','work');page.select_option('#target','eva25')
 ck(page.locator('#graph').input_value()=='work' and page.locator('#bag-settings').is_hidden(),'Speed remains available for rigid target')
 page.select_option('#target','bag')
 ck(state(page)['target']==valid_bag['target'],'switching targets retains bag settings')
 page.select_option('#target','eva50')
 ck(state(page)['target']=={'mode':'padded','thicknessMm':50} and page.evaluate('foamApp.getResult().gravity===0 && foamApp.getResult().limit===null'),'50 mm target uses matched horizontal study mechanics')
 check_main_graphs(page,'50 mm EVA study target')
 ck(page.locator('#reference-checks').inner_text()==fixed_checks,'switching between all study targets preserves passive SATRA statuses')
 legacy_rigid=clone(initial);legacy_rigid['target']={'mode':'rigid'};restore(page,legacy_rigid)
 ck(state(page)['target']=={'mode':'padded','thicknessMm':25},'legacy bare-rigid target restores as the 25 mm study mat')
 for legacy_target in [{'mode':'rigid'},bag_state['target']]:
  legacy_test=clone(initial);legacy_test['target']=legacy_target;legacy_test['impact']=page.evaluate('ImpactModel.impactSpec("test10")');restore(page,legacy_test)
  ck(state(page)['impact']['id']=='gentle' and page.evaluate('foamApp.getResult().limit===null'),'legacy SATRA trace restores a study impact without a misleading apparatus description')

 # Methodology and compatibility checks retain scientific and parameter coverage.
 restore(page,bag_state);page.locator('#methodology').evaluate('(el)=>el.open=true')
 page.wait_for_function('document.querySelectorAll("#rapid-sensitivity tbody tr").length===2')
 check_loading_comparison(page,'bag methodology')
 ck(page.locator('#bag-sensitivity tbody tr').count()==3,'Methodology retains bag-response sensitivity')
 ck(page.locator('#methodology math').count()>15 and page.locator('#methodology math mfrac').count()>0,'Methodology renders equations and fractions offline')
 hand_equation=page.locator('#hand-spring-method + p + .equation math')
 ck(hand_equation.count()>0 and 'kN/mm' in hand_equation.inner_text(),'Methodology renders the hand stiffness and its equations')
 ck(page.locator('#methodology .katex-error').count()==0,'equations have no rendering errors')
 ck('reordering layers' in page.locator('#methodology').inner_text(),'Methodology discloses lack of layer-order effects')
 ck(page.locator('#material-data tbody tr').count()==len(bag_state['layers']),'material data follows current stack')
 old_main=page.locator('#main-chart').inner_html();scales=[]
 for l in bag_state['layers']:
  page.select_option('#graph-layer',l['id']);scales.append(page.locator('#material-chart').get_attribute('data-ymax'))
 ck(len(set(scales))==1,'material curves share pressure scale')
 ck('Slow-test calibration' in page.locator('#material-chart').inner_text(),'material graph distinguishes calibration from rapid response')
 ck(page.locator('#main-chart').inner_html()==old_main,'material-curve selection leaves impact graph unchanged')
 ck(page.evaluate('''() => [...document.querySelectorAll('a[href^="#"]')].every(a=>document.getElementById(a.getAttribute('href').slice(1)))'''),'in-page methodology links resolve')
 checks_before=page.locator('#reference-checks').inner_text();change(page,'#mass',4);change(page,'#speed',5)
 ck(page.evaluate('foamApp.getResult().mass===4 && foamApp.getResult().speed===5 && foamApp.getResult().E===50 && foamApp.getResult().gravity===0'),'custom bag impact preserves energy identity')
 ck(page.locator('#reference-checks').inner_text()==checks_before,'custom strike leaves fixed SATRA checks unchanged')
 custom_valid=state(page);custom_force=page.evaluate('foamApp.getResult().F')
 for selector in ['#mass','#speed']:
  change(page,selector,0)
  ck(state(page)==custom_valid and page.evaluate('foamApp.getResult().F')==custom_force and page.locator('#error').is_visible(),selector+' invalid input rolls back without changing result')
 restore(page,custom_valid)
 check_loading_comparison(page,'custom impact sensitivity')
 restore(page,bag_state);change(page,'#rateScale',1.2)
 ck(page.evaluate('foamApp.getState().config.rateScale')==1.2,'foam stress multiplier updates the current material calculation')
 check_reference_cards(page,'changed foam response')
 check_loading_comparison(page,'changed foam sensitivity')
 slow=clone(bag_state);slow['config']['speedModel']='slow';restore(page,slow)
 ck(state(page)['config']['speedModel']=='slow' and page.locator('#use-rapid-baseline').is_visible(),'internal restoration retains existing slow curve')
 page.click('#use-rapid-baseline')
 ck(state(page)['config']['speedModel']=='fast' and state(page)['layers']==slow['layers'],'explicit rapid-baseline action preserves layers')
 restore(page,bag_state);valid=state(page);valid_force=page.evaluate('foamApp.getResult().F')
 for label,modify in [('empty layers',lambda s:s.update(layers=[])),('invalid loading',lambda s:s['config'].update(speedModel='unknown')),('invalid bag',lambda s:s['target'].update(stiffness=0))]:
  invalid=clone(valid);modify(invalid)
  error=page.evaluate('''s=>{try{foamApp.setState(s);return null;}catch(e){return e.message;}}''',invalid)
  ck(bool(error) and state(page)==valid and page.evaluate('foamApp.getResult().F')==valid_force,label+' restoration rejects invalid state without changing result')
 for old,new in [('layers','force'),('target','force'),('compression','force'),('decel','force'),('impulse','force'),('speed','work')]:
  legacy=clone(valid);legacy['view']['graph']=old;legacy['view']['sweep']={'obsolete':True};restore(page,legacy);now=state(page)
  ck(now['view']['graph']==new and 'sweep' not in now['view'],old+' graph normalizes to supported view')
  ck(all(now[key]==valid[key] for key in ['layers','config','impact','target']),old+' graph normalization preserves physical inputs')

 # Domain limits never become physical bottoming or resolved peaks.
 thin=clone(initial);thin['layers']=[{**initial['layers'][0],'h':.5,'a':.1}];thin['recipe']='custom';restore(page,thin)
 ck(page.evaluate('foamApp.getResult().loadingComplete && foamApp.getResult().hw>0'),'thin foam and the hand spring can resolve the human strike together')
 outcomes=check_reference_cards(page,'thin foam')
 ck(all(r['verdict']=='Unresolved' for r in outcomes),'thin foam cannot claim false SATRA passes from the human hand spring')
 short_truncated=clone(thin);short_truncated['impact']={'mass':20,'speed':30,'gravity':0};restore(page,short_truncated)
 ck(not page.evaluate('foamApp.getResult().loadingComplete'),'high-energy thin-foam impact still reaches the material range')
 ck(page.locator('#results .metrics > .metric .label').first.inner_text()=='Force reached','unresolved Results show force reached')
 ck('Speed at model limit' in page.locator('#results').inner_text(),'unresolved Results identify speed measurement point')
 check_main_graphs(page,'high-energy thin foam')
 guarded=clone(bag_state);guarded['impact']={'mass':20,'speed':30,'gravity':0};restore(page,guarded)
 ck(not page.evaluate('foamApp.getResult().loadingComplete') and page.evaluate('foamApp.getResult().trace.rows.at(-1).relativeV>0'),'bag range limit retains unresolved closing speed')
 ck('Force reached' in page.locator('#results').inner_text(),'bag range limit does not claim peak force')

 # The rising-phase percentage caps at an early peak, retaining raw F10 only when covered.
 # A covered force sample remains plottable when a later peak is unresolved.
 restore(page,initial)
 check_early_loading(page,'default 25 mm EVA early loading',True,True)
 restore(page,bag_state)
 first_sample=check_early_loading(page,'default bag early loading',True,True)
 firmer=clone(bag_state);firmer['target']['stiffness']=80000;restore(page,firmer)
 changed_sample=check_early_loading(page,'firmer bag early loading',True,True)
 ck(not math.isclose(first_sample['peakSeconds'],changed_sample['peakSeconds'],rel_tol=1e-4) and first_sample['early']['sampleSeconds']==changed_sample['early']['sampleSeconds'],'changing peak time does not change the 10 ms sample time')
 ck(not math.isclose(first_sample['early']['peakPercent'],changed_sample['early']['peakPercent'],rel_tol=1e-4),'early-loading percentage responds to changes in the force curve and peak')
 short_complete=clone(initial)
 short_complete['layers']=[{**initial['layers'][1],'h':4}]
 short_complete['recipe']='custom';short_complete['impact']={'mass':.1,'speed':.5,'gravity':0}
 restore(page,short_complete)
 check_early_loading(page,'short completed compression',True,True)
 restore(page,short_truncated)
 check_early_loading(page,'short truncated compression',False,False)
 long_truncated=clone(bag_state)
 long_truncated['target']={'mode':'bag','mass':41,'stiffness':20000,'radius':.125}
 long_truncated['impact']={'mass':10,'speed':5,'gravity':0}
 restore(page,long_truncated)
 check_early_loading(page,'long unresolved compression',False,False)
 ck('Not available' in page.locator('#early-loading-metric .value').inner_text(),'an unresolved force bound never becomes the percentage denominator')
 restore(page,bag_state)
 ck(page.locator('#results .metrics > .metric .label').all_inner_texts()==['Peak force','Force reached by 10 ms','Time to peak','Impulse'],'resolved headline metrics follow the requested four-item order')
 ck('Foam thickness left' not in page.locator('#results .secondary-metrics').inner_text() and 'Fist speed at peak' in page.locator('#results .secondary-metrics').inner_text(),'secondary results retain fist speed and omit thickness left')
 ck(page.locator('#impulse-metric .unit').inner_text()=='Ns','rendered impulse uses Ns')
 guide=page.locator('#early-impact-guide');guide.evaluate('(el)=>el.open=true')
 guide_rows=guide.locator('tbody tr').evaluate_all('(rows)=>rows.map(row=>[...row.querySelectorAll("td")].map(td=>td.textContent.trim()))')
 ranges=[cells[0].replace(' ','').replace('%','').replace('\u2013','-').replace('\u2014','-') for cells in guide_rows]
 ck(ranges==['<50','50-<70','70-85','>85'],'early-loading guide shows four non-overlapping percentage ranges')
 ck(all(len(cells)>=2 and len(cells[1])>3 for cells in guide_rows),'each guide range includes a loading-speed description')
 guide_text=guide.inner_text().lower()
 ck('illustrative' in guide_text and re.search(r'not.{0,35}calibrated',guide_text) is not None,'guide identifies descriptive bands as illustrative and uncalibrated')
 ck(not re.search(r'child|elite|pain|injur|safe',guide.locator('tbody').inner_text(),re.I),'guide assigns no unsupported athlete or injury categories')
 guide.evaluate('(el)=>el.open=false')
 page.locator('#methodology').evaluate('(el)=>el.open=true')
 early_equations=page.locator('#methodology math').all_text_contents()
 ck(any('F' in text and '10' in text and '100' in text for text in early_equations),'Methodology renders the force-at-10-ms percentage as MathML')
 ck(page.locator('#methodology .katex-error').count()==0,'new early-loading equations have no rendering errors')

 # Capture revised cards and charts at desktop and phone widths.
 restore(page,bag_state)
 for size,viewport in [('desktop',{'width':1440,'height':1000}),('mobile',{'width':390,'height':844})]:
  browser_page.set_viewport_size(viewport);browser_page.wait_for_timeout(200)
  page.locator('#methodology').evaluate('(el)=>el.open=false');page.select_option('#graph','force')
  check_card_layout(page,size+' bag')
  browser_page.screenshot(path=str(root/'preview'/('flow_'+size+'.png')),full_page=True)
  for selector,name in [('#impact-card','impact'),('#target-card','target'),('#layers-card','layers'),('#results-card','results'),('#parameter-study','study')]:
   page.locator(selector).screenshot(path=str(root/'preview'/(name+'_'+size+'.png')))
  ck(page.locator('#peak-force-guide').count()==0,size+' peak-force context guide is removed')
  styles=page.locator('#results .metric:not(.metric-unavailable) .value').evaluate_all('(els)=>els.map(el=>({size:getComputedStyle(el).fontSize,color:getComputedStyle(el).color}))')
  ck(len({item['size'] for item in styles})==1 and len({item['color'] for item in styles})==1,size+' result values use consistent size and color')
  page.locator('#early-impact-guide').evaluate('(el)=>el.open=true')
  ck(not page.evaluate('document.documentElement.scrollWidth>innerWidth') and page.locator('#early-impact-guide').evaluate('(el)=>el.scrollWidth<=el.clientWidth+1'),size+' early-loading interpretation guide fits without horizontal scrolling')
  page.locator('#early-loading-metric').screenshot(path=str(root/'preview'/('early_impact_'+size+'.png')))
  page.locator('#early-impact-guide').evaluate('(el)=>el.open=false')
  for graph in ['force','work']:
   page.select_option('#graph',graph)
   ck(not page.evaluate('document.documentElement.scrollWidth>innerWidth'),size+' '+graph+' fits page width')
   page.locator('.analysis').screenshot(path=str(root/'preview'/(graph+'_'+size+'.png')))
  ck(page.locator('#reference-checks').evaluate('(el)=>el.scrollWidth<=el.clientWidth+1'),size+' reference outcomes fit without horizontal scrolling')
  page.locator('#methodology').evaluate('(el)=>el.open=true');page.locator('#bag-method').scroll_into_view_if_needed()
  ck(page.locator('#bag-method math').count()>0 and not page.evaluate('document.documentElement.scrollWidth>innerWidth'),size+' bag equations render within page')
  browser_page.screenshot(path=str(root/'preview'/('methodology_'+size+'.png')))
 # A genuine Worker run produces a numbered, reproducible CSV; cancellation leaves the simulator responsive.
 browser_page.set_viewport_size({'width':1440,'height':1000});restore(page,bag_state)
 page.locator('#methodology').evaluate('(el)=>el.open=false')
 page.evaluate('window.showSaveFilePicker = undefined')
 with browser_page.expect_download(timeout=120000) as download_info:
  page.evaluate('''() => {const plan=FoamSweep.createPlan();plan.designs=plan.designs.slice(0,1);plan.caseCount=plan.scenarios.length*plan.targets.length;foamApp.runStudy(plan);}''')
 download=download_info.value;csv_path=root/'study_single_case.csv';download.save_as(csv_path)
 with csv_path.open(encoding='utf-8-sig',newline='') as handle:study_rows=list(csv.DictReader(handle))
 ck(len(study_rows)==1 and {int(r['test_number']) for r in study_rows}=={1},'worker CSV contains one distinctly numbered test')
 ck(len({r['test_id'] for r in study_rows})==1 and {r['target_id'] for r in study_rows}=={'eva50'},'worker CSV uses only 50 mm EVA75 with fixed assumptions')
 ck(all(float(r['impact_mass_kg'])==2.597 and float(r['impact_speed_m_per_s'])==7.7 and float(r['gravity_m_per_s2'])==0 for r in study_rows),'worker holds the adult horizontal impact fixed')
 ck(all(float(r['sample_width_mm'])==30 and float(r['sample_height_mm'])==30 and float(r['foam_sample_weight_g'])>0 for r in study_rows),'worker CSV identifies the independent specimen weight')
 ck(all(r['target_inputs_json'] and r['contact_geometry_json'] and r['solver_settings_json'] and r['early_loading_definition'] for r in study_rows),'worker CSV records target geometry solver and early-loading definition')
 ck(all(r['status'] in ['resolved','unresolved'] and not r['error_message'] for r in study_rows),'worker records unresolved cases without calculation errors')
 ck(all(r['study_id']=='fr50-eva50-v1' and float(r['hand_spring_stiffness_N_per_m'])==1e6 for r in study_rows),'worker CSV identifies the current study and fixed hand assumption')
 for row in study_rows:
  force=float(row['force_reached_N']);hand_give=float(row['hand_compression_mm'])/1000;hand_work=float(row['hand_spring_work_J'])
  ck(math.isclose(force,1e6*hand_give,rel_tol=1e-8) and math.isclose(hand_work,.5*1e6*hand_give**2,rel_tol=1e-8),row['test_id']+' CSV separates hand deflection and stored energy consistently')
  energy=float(row['impact_energy_J'])
  if row['target_mode']=='bag':energy*=float(row['target_mass_kg'])/(float(row['impact_mass_kg'])+float(row['target_mass_kg']))
  work=float(row['foam_loading_work_J'])+float(row['target_loading_work_J'])+hand_work+float(row['relative_kinetic_energy_left_J'])
  ck(math.isclose(work,energy,rel_tol=1e-8),row['test_id']+' CSV balances foam, target and hand work against available relative energy')
 ck(all(float(r['target_tail_power'])==2 and float(r['target_stress_multiplier'])==1 for r in study_rows),'worker holds target calibration fixed across glove assumptions')
 ck(not page.evaluate('foamApp.studyRunning()') and page.locator('#run-study').is_enabled() and page.locator('#download-study').is_visible(),'completed worker restores controls and permits CSV download again')
 ck(page.evaluate('foamApp.getStudy().evaluatedCases')==1 and '1' in page.locator('#study-analysis').inner_text(),'worker completion displays its actual analysis')
 ck(page.evaluate('FoamSweep.isCurrentStudy(foamApp.getStudy())') and 'Hand Spring:' in page.locator('#study-analysis').inner_text(),'new analysis discloses the hand assumption and replaces the historical study')
 ck(page.locator('#study-chart svg').count()==1 and 'NaN' not in page.locator('#study-chart').inner_html(),'study comparison plot renders finite output')
 for axis in ['peak','weight','early','time','remaining','energy']:
  page.select_option('#study-x-axis',axis);page.select_option('#study-y-axis',axis)
  ck('NaN' not in page.locator('#study-chart').inner_html() and 'Infinity' not in page.locator('#study-chart').inner_html(),'finite scatter axes: '+axis)
 page.select_option('#study-x-axis','weight');page.select_option('#study-y-axis','peak')
 point=page.locator('#study-chart [data-study-design]').first
 point.focus();point.press('Enter')
 ck(page.locator('#study-selected h3').inner_text().startswith('Test '),'selected point shows its stable test code')
 ck(page.locator('#study-layer-name tbody tr').count()==4,'selected point lists all four ordered layers')
 ck(page.locator('#study-selected > .table-wrap > table:not(#study-layer-name) tbody tr').count()==1,'keyboard selection exposes the design on 50 mm EVA75')
 for size,viewport in [('desktop',{'width':1440,'height':1000}),('mobile',{'width':390,'height':844})]:
  browser_page.set_viewport_size(viewport);browser_page.wait_for_timeout(200)
  page.locator('#parameter-study').screenshot(path=str(root/'preview'/('completed_study_'+size+'.png')))
  restore(page,short_complete);page.locator('#early-loading-metric').screenshot(path=str(root/'preview'/('early_peak_'+size+'.png')))
  ck(not page.evaluate('document.documentElement.scrollWidth>innerWidth'),size+' study and early-peak results fit page width')
 previous_study=page.evaluate('foamApp.getStudy()');page.click('#run-study')
 page.wait_for_function('foamApp.studyRunning()')
 ck(page.locator('#cancel-study').is_visible() and page.locator('#run-study').is_disabled(),'running study exposes cancellation and prevents a duplicate run')
 page.click('[data-impact="adult"]')
 ck(state(page)['impact']['id']=='adult' and page.locator('#main-chart svg').count()==1,'main simulator remains responsive while the worker runs')
 page.click('#cancel-study');page.wait_for_function('!foamApp.studyRunning()')
 ck(page.evaluate('foamApp.getStudy()')==previous_study and 'cancelled' in page.locator('#study-status').inner_text().lower(),'cancellation retains the last completed analysis')
 ck(page.locator('#run-study').is_enabled() and page.locator('#cancel-study').is_hidden(),'cancellation restores study controls')
 ck(not errors,'no JavaScript runtime errors')
 if args.url:
  ck(not browser_page.evaluate('document.documentElement.scrollWidth>innerWidth'),'hosted mobile page has no horizontal overflow')
  expected_origin=urlsplit(args.url)
  ck(all(url.startswith('blob:') or (urlsplit(url).scheme==expected_origin.scheme and urlsplit(url).netloc==expected_origin.netloc) for url in simulator_requests),'hosted simulator and worker make no external requests')
 else:
  ck(all(url.startswith('blob:') for url in requests),'standalone simulator and worker work without network requests')
 browser.close()
(root/'browser_checks_v12.json').write_text(json.dumps({'status':'passed','mode':mode,'url':args.url,'count':len(checks),'checks':checks,'errors':errors},indent=2),encoding='utf-8')
print('PASS',len(checks),mode,'browser checks; report:',root/'browser_checks_v12.json')

