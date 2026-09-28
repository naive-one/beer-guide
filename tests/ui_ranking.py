"""Verify ranking removal, independent search and preserved archive boundaries."""
import os
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/home/ubuntu/.local/bin/chromium'),headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':1000})
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(os.environ.get('BEER_URL','http://127.0.0.1:8080'),wait_until='networkidle')
    assert page.locator('#ranking, #tier-filter, .tier-badge, a[href="#ranking"]').count()==0
    baseline=page.evaluate('BeerFrontier.getAnalysis()')
    page.locator('#search').fill('纳德')
    assert page.locator('.beer-card[data-beer-id="nadu"]').count()==1
    expected=page.evaluate('BEER_DATA.beers.filter(b=>BEER_DATA.catalogScope.activeIds.includes(b.id) && [b.name,b.english,b.style,...b.tags,...b.aliases].join(" ").toLowerCase().includes("纳德")).map(b=>b.id)')
    assert set(page.locator('.beer-card').evaluate_all('(rows)=>rows.map(r=>r.dataset.beerId)'))==set(expected)
    assert page.evaluate('BeerFrontier.getAnalysis()')==baseline
    page.locator('.beer-card[data-beer-id="nadu"] [data-open]').click()
    assert page.locator('.tier-detail').count()==0
    page.keyboard.press('Escape')
    page.locator('#show-all').click()
    # Missing quote fixture is local and deterministic even after keg research completes.
    page.evaluate("()=>{const b=BEER_DATA.beers.find(b=>b.id==='heineken-keg');b.quote=null;b.purchaseGuide=null;}")
    page.locator('#reset-filters').click()
    assert '价格待补' in page.locator('.beer-card[data-beer-id="heineken-keg"]').inner_text()
    page.locator('#library-mode').select_option('budget')
    assert page.locator('.beer-card[data-beer-id="heineken-keg"]').count()==0
    page.locator('#show-all').click()
    page.locator('#search').fill('纳德')
    assert page.locator('.beer-card[data-beer-id="nadu"]').count()==1
    page.locator('#search').fill('卡罗娜')
    assert page.locator('.beer-card').count()==0, 'archived original-name search cannot restore a beer'
    assert not errors,errors
    browser.close()
print('PASS ranking absent, independent catalog search, unknown price and archived-name search')
