"""Browser smoke tests. Optional: pip install playwright; install a Chromium browser.
Uses an isolated temporary local HTTP server; never contacts external sources.
"""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
import json, os, http.client
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'tests'/'screenshots'; OUT.mkdir(exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/'
checks=[]
# The hosted Chromium has a managed URLBlocklist of '*'. Do not alter it.
# Render the actual standalone HTML through set_content. localStorage is a
# test-only in-memory Storage API double because about:blank is an opaque origin.
# Static HTTP delivery is checked separately below using the standard library.
def mount(page):
 storage = """<script>
 window.__testStorage = window.__testStorage || {};
 Object.defineProperty(window,'localStorage',{configurable:true,value:{
 getItem(k){return Object.prototype.hasOwnProperty.call(window.__testStorage,k)?window.__testStorage[k]:null;},
 setItem(k,v){window.__testStorage[k]=String(v);},
 removeItem(k){delete window.__testStorage[k];},
 clear(){window.__testStorage={};}
 }});
 </script>"""
 html=(ROOT/'standalone.html').read_text(encoding='utf-8').replace('<head>','<head>'+storage,1)
 page.set_content(html,wait_until='load')
 page.evaluate('scrollTo(0,0)')

def ok(name): checks.append(name);print('PASS',name)
try:
 conn=http.client.HTTPConnection('127.0.0.1',server.server_port)
 for asset in ['index.html','styles.css','core.js','app.js','data/data.js','data/beers.json']:
  conn.request('GET','/'+asset);response=conn.getresponse();assert response.status==200;assert len(response.read())>100
 conn.close();ok('local HTTP server serves all six runtime assets (non-browser check)')
 with sync_playwright() as p:
  executable=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium')
  browser=p.chromium.launch(executable_path=executable if Path(executable).exists() else None,headless=True,args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':1440,'height':1120},device_scale_factor=1)
  errors=[];external=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('request',lambda r:external.append(r.url) if not r.url.startswith((url,'data:','blob:')) else None)
  mount(page);page.wait_for_function('window.BeerFrontier !== undefined')
  assert page.locator('#stat-total').inner_text()=='42'
  assert page.evaluate('window.BeerFrontier.getAnalysis().eligible.length')==7
  ok('DOM render and evidence-filtered 7 candidates')
  page.screenshot(path=str(OUT/'desktop-home.png'),full_page=False)
  page.locator('#explore').scroll_into_view_if_needed()
  page.screenshot(path=str(OUT/'desktop-explorer.png'),full_page=False)
  page.locator('#budget').fill('30');page.locator('#budget').press('Tab')
  assert page.evaluate('window.BeerFrontier.getAnalysis().best')=='rochefort8'
  ok('budget updates recommendation')
  page.locator('#mode').select_option('style')
  assert 'guinness' in page.evaluate('window.BeerFrontier.getAnalysis().frontier')
  ok('same-style frontier does not eliminate dry stout by wheat score')
  page.locator('#reset-filters').click()
  page.locator('#search').fill('维森原味')
  page.locator('#beer-grid [data-open="weihen"]').click()
  assert page.locator('#beer-dialog').evaluate('(e)=>e.open')
  assert '版本有歧义' in page.locator('#dialog-content').inner_text()
  page.locator('#edit-total').fill('72');page.locator('#edit-qty').fill('6');page.locator('#edit-volume').fill('500')
  page.locator('#price-form button[type=submit]').click()
  assert 'weihen' in page.evaluate('window.BeerFrontier.getAnalysis().frontier')
  assert page.evaluate('window.BeerFrontier.getAnalysis().best')=='weihen'
  ok('manual quote overrides ambiguous source; frontier recomputes')
  page.locator('#personal-score').fill('4.8');page.locator('[data-save-score="weihen"]').click()
  page.keyboard.press('Escape')
  mount(page);page.wait_for_function('window.BeerFrontier !== undefined')
  assert page.evaluate('window.BeerFrontier.getState().overrides.weihen.total')==72
  ok('Storage-API test double: personal data round-trip on app remount')
  page.locator('#score-mode').select_option('personal')
  assert page.evaluate('window.BeerFrontier.getAnalysis().eligible.length')==1
  ok('personal scores computed separately from community scores')
  page.locator('#reset-filters').click()
  page.locator('#beer-grid [data-save="paulaner"]').click()
  page.locator('#nav-shortlist').click()
  assert page.locator('#compare-dialog').evaluate('(e)=>e.open')
  assert page.locator('#compare-content').inner_text().find('保拉纳')>=0
  page.keyboard.press('Escape');ok('shortlist and comparison dialog')
  page.locator('#toggle-table').click();assert page.locator('#chart-table').is_visible();ok('accessible data table')
  page.locator('#toggle-sources').click();assert page.locator('.source-item').count()==49
  assert page.locator('a[target=_blank]:not([rel="noopener noreferrer"])').count()==0
  ok('all 49 original sources available with safe external links')
  with page.expect_download() as event: page.locator('#export-data').click()
  download=event.value; target=OUT/'personal-test.json';download.save_as(target)
  assert json.loads(target.read_text())['overrides']['weihen']['total']==72
  ok('personal JSON export')
  page.on('dialog',lambda d:d.accept())
  page.locator('#import-file').set_input_files(str(target));page.wait_for_timeout(150)
  assert page.evaluate('window.BeerFrontier.getState().personalScores.weihen')==4.8
  ok('validated personal JSON import')
  # Reset storage for screenshots and small-screen default behavior.
  page.evaluate('localStorage.clear()');mount(page);page.wait_for_function('window.BeerFrontier !== undefined')
  page.locator('#reset-filters').click();page.locator('#unit').select_option('order')
  assert page.evaluate('window.BeerFrontier.getState().budget')==150
  assert page.evaluate('window.BeerFrontier.getAnalysis().best')=='rochefort10'
  ok('whole-order budget uses full pack price')
  page.locator('#reset-filters').click()
  for width in [390,768,1440]:
   page.set_viewport_size({'width':width,'height':844 if width==390 else 1024});mount(page)
   page.wait_for_function('window.BeerFrontier !== undefined')
   assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'),f'Overflow at {width}'
   if width==390:
    page.screenshot(path=str(OUT/'mobile-home.png'))
    page.locator('#explore').scroll_into_view_if_needed();page.screenshot(path=str(OUT/'mobile-explorer.png'))
    page.locator('#search').fill('保拉纳');page.locator('#beer-grid [data-open="paulaner"]').click()
    assert page.locator('#beer-dialog').evaluate('(e)=>e.open')
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
    page.screenshot(path=str(OUT/'mobile-detail.png'));page.keyboard.press('Escape')
   ok(f'responsive layout without horizontal page overflow: {width}px')
  assert not errors,errors;assert not external,external;ok('no JavaScript errors or runtime external network requests')
  local=browser.new_page(viewport={'width':1280,'height':900})
  mount(local);local.wait_for_function('window.BeerFrontier !== undefined')
  assert local.locator('#stat-total').inner_text()=='42';ok('standalone HTML renders with no remote assets (DOM injection; navigation restricted)')
  browser.close()
finally: server.shutdown()
(ROOT/'tests'/'TEST-REPORT.json').write_text(json.dumps({'date':'2026-09-27','browser':'Chromium (headless)','checks':checks,'passed':len(checks),'limitations':'Managed browser blocks all URL navigation. Browser rendering used set_content on actual standalone HTML, with a test-only in-memory localStorage double. Real origin navigation and real browser storage persistence were not validated; HTTP serving verified separately.'},ensure_ascii=False,indent=2),encoding='utf-8')
print('SUCCESS',len(checks),'browser checks')
