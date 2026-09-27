"""Current catalog isolation and archived personal JSON on real HTTP/native storage."""
import json, os
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/home/ubuntu/.local/bin/chromium'),headless=True,args=['--no-sandbox'])
    page=browser.new_page(accept_downloads=True)
    page.goto(os.environ.get('BEER_URL','http://127.0.0.1:8080'),wait_until='networkidle')
    hidden=page.evaluate('BEER_DATA.beers.filter(b=>!BEER_DATA.catalogScope.activeIds.includes(b.id)).map(b=>({id:b.id,name:b.name}))')
    active=page.evaluate('BEER_DATA.catalogScope.activeIds')
    assert len(active)==40 and len(hidden)==27
    def current_only():
        for selector in ['.beer-card','#all-index [data-open]','#chart-table tbody tr','#scatter [data-point]']:
            assert page.locator(selector).count()==40, selector
        for b in hidden:
            assert page.locator(f'[data-open="{b["id"]}"], [data-point="{b["id"]}"], [data-beer-id="{b["id"]}"]').count()==0
            for selector in ['#beer-grid','#tier-board','#scatter','#all-index','#chart-table','#ladder-content']:
                assert b['name'] not in page.locator(selector).text_content(), (b,selector)
        assert page.locator('#stat-total').inner_text()=='40'
        assert '主库 67 款，27 款归档' in page.locator('#scope-note').inner_text()
    current_only()
    archived=hidden[0]['id']
    personal={'schemaVersion':1,'overrides':{archived:{'total':1,'quantity':1,'volumeMl':500}},'personalScores':{archived:5},'shortlist':[b['id'] for b in hidden[:3]]}
    page.evaluate('(v)=>localStorage.setItem("beer-frontier.personal.v1",JSON.stringify(v))',personal)
    page.reload(wait_until='networkidle')
    assert page.evaluate('BeerFrontier.getState().personalScores')[archived]==5
    assert page.locator('#shortlist-count').inner_text()=='0'
    for id in ['paulaner','weihen','pang']:
        page.locator(f'#beer-grid [data-save="{id}"]').click()
    page.locator('#beer-grid [data-save="kingsue"]').click()
    assert page.locator('#shortlist-count').inner_text()=='3'
    page.locator('#nav-shortlist').click()
    assert page.locator('.compare-cell').count()==3
    assert hidden[0]['name'] not in page.locator('#compare-content').inner_text()
    page.keyboard.press('Escape')
    page.locator('#reset-filters').click();current_only()
    page.locator('#show-all').click();current_only()
    page.locator('#search').fill(hidden[0]['name'])
    assert page.locator('.beer-card').count()==0
    page.locator('#show-all').click();current_only()
    page.locator('#score-mode').select_option('personal')
    assert page.evaluate('BeerFrontier.getAnalysis().eligible')==[]
    page.locator('#reset-filters').click()
    with page.expect_download() as event:page.locator('#export-data').click()
    exported=json.loads(open(event.value.path()).read())
    normalized=page.evaluate('(v)=>BeerCore.validateImport(v,new Set(BEER_DATA.beers.map(b=>b.id)))',personal)
    assert exported['overrides']==normalized['overrides'] and exported['personalScores']==personal['personalScores']
    assert all(b['id'] in exported['shortlist'] for b in hidden[:3])
    page.on('dialog',lambda d:d.accept())
    page.locator('#import-file').set_input_files({'name':'archived.json','mimeType':'application/json','buffer':json.dumps(exported).encode()})
    page.wait_for_function('document.querySelector("#toast").textContent.includes("导入完成")')
    page.reload(wait_until='networkidle');current_only()
    assert page.evaluate('BeerFrontier.getState().overrides')[archived]['total']==1
    assert page.locator('#shortlist-count').inner_text()=='3'
    assert '元 / 件' in page.locator('#budget-unit').inner_text()
    page.locator('#all-index [data-open="heineken-keg"]').click()
    assert '件 ·' in page.locator('.detail-stats').inner_text()
    browser.close()
print('PASS current40/master67 isolation, archive search/reset/frontier exclusion, native persistence, import/export, compare cap and item terminology')
