"""Version ambiguity UI regression with deterministic local dataset injection."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
data=json.loads((ROOT/'data/beers.json').read_text())
beer=next(b for b in data['beers'] if b['id']=='dream')
note='当前芒果酸艾尔未确认与6%果汁酸浑浊IPA为同一版本。'
beer['quote']={**(beer['quote'] or {}),'total':696,'quantity':24,'volumeMl':500,'ambiguous':True,'variantNote':note,'historical':False,'priceBasis':'taobao-displayed-snapshot','selectedSku':'芒果酸艾尔500ml×24'}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/home/ubuntu/.local/bin/chromium'),headless=True,args=['--no-sandbox'])
 page=browser.new_page()
 page.route('**/data/data.js',lambda route:route.fulfill(content_type='text/javascript',body='window.BEER_DATA='+json.dumps(data)+';'))
 page.goto(os.environ.get('BEER_URL','http://127.0.0.1:8080'),wait_until='networkidle')
 assert 'dream' not in page.evaluate('BeerFrontier.getAnalysis().eligible')
 page.evaluate('document.querySelector(`#all-index [data-open="dream"]`).click()')
 text=page.locator('#dialog-content').inner_text()
 assert note in text, 'Missing product version caution'
 assert '版本未确认' in text
 assert '¥696.00' in text and '¥29.00' in text
 page.keyboard.press('Escape')
 assert '版本未确认' in page.locator('.beer-card').filter(has=page.locator('[data-open="dream"]')).inner_text()
 page.locator('.advanced summary').click()
 page.locator('#ambiguous').check()
 assert 'dream' in page.evaluate('BeerFrontier.getAnalysis().eligible')
 page.locator('#ambiguous').uncheck()
 assert 'dream' not in page.evaluate('BeerFrontier.getAnalysis().eligible')
 browser.close()
print('PASS observed variant price, concise caution and explicit scenario toggle')
