"""Synthetic source-scope regression; no research files are changed."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright

data=json.loads((Path(__file__).resolve().parents[1]/'data/beers.json').read_text())
for beer in data['beers']:
    beer['quote']=None
    beer['purchaseGuide']={'ceiling':1,'volumeMl':500,'note':'Synthetic editorial condition'}
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/home/ubuntu/.local/bin/chromium'),headless=True,args=['--no-sandbox'])
    page=browser.new_page()
    page.route('**/data/data.js',lambda route:route.fulfill(content_type='text/javascript',body='window.BEER_DATA='+json.dumps(data)+';'))
    page.goto(os.environ.get('BEER_URL','http://127.0.0.1:8080'),wait_until='networkidle')
    total=len(data['catalogScope']['activeIds'])
    page.locator('.advanced summary').click()
    for scope,personal in [('taobao',False),('all',False),('all',True),('taobao',True)]:
        page.locator('#price-scope').select_option(scope)
        page.locator('#personal-prices').set_checked(personal)
        assert page.locator('.beer-card').count()==total
        assert page.locator('#all-index button').count()==total
        assert page.locator('#chart-table tbody tr').count()==total
        assert page.locator('#scatter [data-point]').count()==total
        assert all('价格待补' in t for t in page.locator('.card-price').all_text_contents())
        assert all('价格待补' in t for t in page.locator('#chart-table tbody tr td:nth-child(2)').all_text_contents())
        assert page.locator('.budget-guide').count()==total
        if scope=='taobao' or personal:
            assert page.locator('.unplaced-points [data-point]').count()==total
        else:
            assert page.locator('#scatter svg [data-point]').count()>0
            assert page.locator('#scatter svg [data-point]').evaluate_all("ps=>ps.every(p=>p.dataset.reference==='true'&&p.getAttribute('aria-label').includes('非市场价'))")
        page.locator('#library-mode').select_option('budget')
        assert page.locator('.beer-card').count()==0, 'editorial conditions are not within-budget purchases'
        page.locator('#library-mode').select_option('all')
    browser.close()
print('PASS scoped missing prices, separate guides, explicit legacy references and quote-only budget filter')
