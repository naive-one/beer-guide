"""Optional UI regression on a real local HTTP origin with native localStorage.
Start npm run preview before running; BEER_URL overrides the test origin.
"""
from pathlib import Path
import json, os
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'tests'/'screenshots'; OUT.mkdir(exist_ok=True)
checks=[]
def ok(name):checks.append(name);print('PASS',name)
TOTAL=len(json.loads((ROOT/'data/beers.json').read_text())['beers'])
def mount(page):
 page.goto(os.environ.get('BEER_URL','http://127.0.0.1:8080'),wait_until='networkidle')
 page.evaluate('scrollTo(0,0)');page.wait_for_function('!!window.BeerFrontier')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/home/ubuntu/.local/bin/chromium'),headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1,accept_downloads=True)
 page.set_default_timeout(5000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));mount(page)
 assert page.locator('.beer-card').count()==TOTAL
 assert page.locator('#scatter [data-point]').count()==TOTAL
 assert page.locator('#all-index button').count()==TOTAL
 assert page.locator('#chart-table tbody tr').count()==TOTAL
 assert page.locator('#show-more').is_hidden();ok('all cards + map entries + index buttons + table rows, no pagination')
 a=page.evaluate('window.BeerFrontier.getAnalysis()');assert len(a['eligible'])==21 and len(a['frontier'])==7 and a['best'] is None and len(a['bestByCohort'])==3;ok('21 evidence-qualified records, 7 independent-platform frontier nodes, no mixed-platform winner')
 assert page.locator('#stat-rated').inner_text()=='35' and page.locator('#stat-prices').inner_text()=='30';ok('coverage counters match dataset')
 page.screenshot(path=str(OUT/'v1.2.0-desktop-home.png'))
 page.locator('#explore').scroll_into_view_if_needed();page.screenshot(path=str(OUT/'v1.2.0-desktop-map.png'))
 # Open every dataset record, even those with no exact quote or rating.
 for id in page.evaluate('window.BEER_DATA.beers.map(x=>x.id)'):
  page.evaluate('(id)=>document.querySelector(`#all-index [data-open="${id}"]`).click()',id)
  assert page.locator('#beer-dialog').evaluate('(e)=>e.open')
  text=page.locator('#dialog-content').inner_text()
  assert '价格证据与原包装' in text and '选购预算' in text and '评分出处与版本' in text
  page.keyboard.press('Escape')
 ok('all detail dialogs contain evaluations, quote status, budget guidance and score provenance')
 assert '评分未知' in page.locator('#scatter [data-point="augerta"]').get_attribute('aria-label')
 assert '非市场价' in page.locator('#scatter [data-point="vitus"]').get_attribute('aria-label')
 assert '相关版本' in page.locator('#scatter [data-point="asahi"]').get_attribute('aria-label');ok('unknown score, editorial budget, and related-version score have distinct accessible labels')
 page.locator('#map-mode').select_option('evidence');assert page.locator('#scatter [data-point]').count()==21 and page.locator('.beer-card').count()==TOTAL
 page.locator('#map-mode').select_option('all');ok('evidence-only chart toggle does not hide the other cards')
 page.locator('#score-platform').select_option('Untappd');assert page.locator('.beer-card').count()==1;assert page.evaluate('window.BeerFrontier.getAnalysis().best')=='pang'
 page.locator('#show-all').click();assert page.locator('.beer-card').count()==TOTAL;ok('platform filter and restore-all button')
 page.locator('#min-ratings').select_option('100');assert 'salt' not in page.evaluate('window.BeerFrontier.getAnalysis().eligible');assert page.locator('.beer-card').count()==TOTAL;ok('comment count never masquerades as rating sample size')
 page.locator('#reset-filters').click();page.locator('.advanced summary').click();page.locator('#historic').uncheck();assert 'kingsue' not in page.evaluate('window.BeerFrontier.getAnalysis().eligible');assert page.locator('[data-point]').count()==TOTAL;ok('historical exclusion changes calculation, not full-view visibility')
 page.locator('#reset-filters').click();page.locator('#mode').select_option('style');assert 'guinness' in page.evaluate('window.BeerFrontier.getAnalysis().frontier');ok('same-style frontiers retain distinct styles')
 page.locator('#reset-filters').click();page.locator('#budget').fill('4');page.locator('#budget').press('Tab');page.locator('#library-mode').select_option('budget');assert 0<page.locator('.beer-card').count()<TOTAL;ok('budget library filter supports quoted prices and explicitly identified budget conditions')
 page.locator('#show-all').click();page.locator('#search').fill('维森原味');assert page.locator('.beer-card').count()==1;page.locator('#beer-grid [data-open="weihen"]').click()
 page.locator('#edit-total').fill('72');page.locator('#edit-qty').fill('6');page.locator('#edit-volume').fill('500');page.locator('#price-form button[type=submit]').click()
 assert 'weihen' in page.evaluate('window.BeerFrontier.getAnalysis().frontier');assert page.evaluate('window.BeerFrontier.getState().overrides.weihen.total')==72;ok('actual quote overrides ambiguous source and recalculates frontier')
 page.locator('#personal-score').fill('4.8');page.locator('[data-save-score="weihen"]').click();page.keyboard.press('Escape');mount(page)
 assert page.evaluate('window.BeerFrontier.getState().personalScores.weihen')==4.8;ok('personal quote and score serialize and round-trip using native localStorage after reload')
 page.locator('#score-mode').select_option('personal');assert page.evaluate('window.BeerFrontier.getAnalysis().eligible')==['weihen'];assert page.locator('[data-point]').count()==TOTAL;ok('personal mode does not backfill missing personal scores with community scores')
 page.locator('#reset-filters').click()
 for id in ['paulaner','weihen','pang']:page.locator(f'#beer-grid [data-save="{id}"]').click()
 page.locator('#beer-grid [data-save="kingsue"]').click();assert page.evaluate('window.BeerFrontier.getState().shortlist.length')==3
 page.locator('#nav-shortlist').click();assert page.locator('.compare-cell').count()==3;page.keyboard.press('Escape');ok('three-item comparison cap and dialog')
 page.locator('#toggle-table').click();assert page.locator('#chart-table').is_visible();ok('accessible complete data table')
 page.locator('#toggle-sources').click();assert page.locator('.source-item').count()==83;assert page.locator('a[target="_blank"]:not([rel="noopener noreferrer"])').count()==0;ok('all 83 source links and safe external-link attributes')
 with page.expect_download() as event:page.locator('#export-data').click()
 target=OUT/'v1.2.0-personal-roundtrip.json';event.value.save_as(str(target));assert json.loads(target.read_text())['overrides']['weihen']['total']==72;ok('personal JSON export produces expected contents')
 page.on('dialog',lambda d:d.accept());page.locator('#import-file').set_input_files(str(target));page.wait_for_timeout(100);assert page.evaluate('window.BeerFrontier.getState().personalScores.weihen')==4.8;ok('personal JSON import validates and restores records')
 # Fresh screenshots and responsive width checks; clear personal test state.
 page.evaluate('localStorage.clear()');mount(page)
 page.evaluate('scrollTo(0,document.querySelector("#library").offsetTop-25)');page.screenshot(path=str(OUT/'v1.2.0-desktop-library.png'))
 page.evaluate('document.querySelector(`#all-index [data-open="asahi"]`).click()');page.screenshot(path=str(OUT/'v1.2.0-desktop-detail.png'));page.keyboard.press('Escape')
 for width in [390,768,1440]:
  page.set_viewport_size({'width':width,'height':844 if width==390 else 1000});page.wait_for_timeout(130)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
  assert page.locator('.beer-card').count()==TOTAL and page.locator('[data-point]').count()==TOTAL
  if width==390:
   page.evaluate('scrollTo(0,0)');page.screenshot(path=str(OUT/'v1.2.0-mobile-home.png'))
   page.locator('#chart-wrap').scroll_into_view_if_needed();page.screenshot(path=str(OUT/'v1.2.0-mobile-map.png'))
 ok('390/768/1440px responsive layouts retain all entries with no page horizontal overflow')
 assert not errors,errors;ok('no JavaScript runtime errors across all exercised flows')
 browser.close()
report={'version':'1.2.0','checkedAt':'2026-09-27','checksPassed':len(checks),'checks':checks,'jsErrors':errors,'limitations':['Verified on a local HTTP origin with native localStorage, not a deployed production site.','Screenshots captured; visual review is a separate independent review, not an automated pixel assertion.','No Cloudflare account or deployment changed.']}
(ROOT/'docs/v1.2.0-UI-TEST-REPORT.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('ALL',len(checks),'UI CHECKS PASSED')
