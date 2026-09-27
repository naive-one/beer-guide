"""Verify the supplied ranking is independent of evidence and personal scores."""
import os
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/home/ubuntu/.local/bin/chromium'),headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':1000})
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(os.environ.get('BEER_URL','http://127.0.0.1:8080'),wait_until='networkidle')
    assert page.locator('#tier-board .tier-row').count()==5, 'all five supplied tiers visible'
    expected=page.evaluate('BEER_DATA.tierList.tiers.flatMap(t=>t.entries)')
    assert page.locator('#tier-board [data-open]').count()==len(expected)
    for entry,button in zip(expected,page.locator('#tier-board [data-open]').all()):
        assert button.get_attribute('data-open')==entry['beerId']
        assert entry['name'] in button.inner_text()
        button.click();assert page.locator('#beer-dialog').evaluate('e=>e.open')
        assert '用户榜单' in page.locator('#dialog-content').inner_text()
        page.keyboard.press('Escape')
    baseline=page.evaluate('BeerFrontier.getAnalysis()')
    for tier in page.evaluate('BEER_DATA.tierList.tiers'):
        page.locator('#tier-filter').select_option(tier['id'])
        assert page.locator('.beer-card').count()==len(tier['entries'])
        assert page.evaluate('BeerFrontier.getAnalysis()')==baseline
    page.locator('#show-all').click()
    assert page.locator('#tier-filter').input_value()=='all'
    pending=page.evaluate('BEER_DATA.beers.find(b=>b.userTier&&!b.quote&&!b.purchaseGuide).id')
    card=page.locator(f'.beer-card[data-beer-id="{pending}"]')
    assert '价格待补' in card.inner_text()
    page.locator('#library-mode').select_option('budget')
    assert page.locator(f'.beer-card[data-beer-id="{pending}"]').count()==0, 'null is not a free item'
    page.locator('#show-all').click()
    page.locator('#search').fill('卡罗娜')
    assert page.locator('.beer-card').count()==1
    assert not errors,errors
    browser.close()
print('PASS complete ranking, every mapped dialog, independent tier filter, unknown price and original-name search')
