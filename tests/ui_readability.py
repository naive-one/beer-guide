"""Keep overlap controls outside plotting area and mobile labels readable."""
import os
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/home/ubuntu/.local/bin/chromium'),headless=True,args=['--no-sandbox'])
    page=b.new_page(viewport={'width':390,'height':844})
    page.goto(os.environ.get('BEER_URL','http://127.0.0.1:8080'),wait_until='networkidle')
    page.locator('#price-scope').select_option('all')
    assert page.locator('.shared-chart svg [data-cluster]').count()==0, 'overlap chooser controls must not obscure data points'
    assert page.locator('.cluster-controls [data-cluster]').count()>0
    assert page.locator('.shared-chart svg .point-number').count()==0, 'move dense numbers into the frontier list'
    assert page.locator('.shared-chart .axis-text').first.evaluate('e=>parseFloat(getComputedStyle(e).fontSize)')>=12
    assert page.locator('.frontier-key strong').first.evaluate('e=>parseFloat(getComputedStyle(e).fontSize)')>=12
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    b.close()
print('PASS uncluttered mobile plot, separate overlap chooser and readable labels')
