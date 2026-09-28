"""Real supplemental records agree across cards, chart and details; edge fixtures stay in memory."""
import os
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/home/ubuntu/.local/bin/chromium'),headless=True,args=['--no-sandbox'])
    page=browser.new_page()
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(os.environ.get('BEER_URL','http://127.0.0.1:8080'),wait_until='networkidle')
    import re
    active=page.evaluate('BEER_DATA.catalogScope.activeIds')
    assert len(active)==40
    forbidden=re.compile(r'用户榜单|原始榜单|原清单|主观档位|夯档|顶级|人上人|NPC|拉完了')
    def no_ranking(text):
        assert not forbidden.search(text),text
    no_ranking(page.locator('body').inner_text())
    assert page.locator('.tier-badge, .tier-detail, #ranking, #tier-filter').count()==0
    for beer_id in active:
        card=page.locator(f'.beer-card[data-beer-id="{beer_id}"]')
        priced_no_guide=page.evaluate('(id)=>{const b=BEER_DATA.beers.find(b=>b.id===id);return !!b.quote&&!b.purchaseGuide}',beer_id)
        if priced_no_guide:
            assert '暂无已核验报价' not in card.inner_text()
            assert '价格、规格与评价待补' not in card.inner_text()
        card.locator('[data-open]').click()
        no_ranking(page.locator('#dialog-content').inner_text())
        page.keyboard.press('Escape')
    page.locator('#score-platform').select_option('Untappd')
    assert 'Untappd' in page.locator('#chart-subtitle').inner_text()
    for beer_id in ['weihen','asahi','snow']:
        record=page.evaluate('(id)=>BEER_DATA.beers.find(b=>b.id===id).communityRatings.find(r=>r.platform==="Untappd")',beer_id)
        assert record
        card=page.locator(f'.beer-card[data-beer-id="{beer_id}"]')
        assert card.locator('.card-rating').inner_text().startswith(f'{record["value"]:.2f}')
        if beer_id!='weihen':
            assert '相关版' in card.locator('.number-labels').inner_text()
            assert '含相关版本' in card.locator('.community-scores summary').inner_text()
            assert beer_id not in page.evaluate('BeerFrontier.getAnalysis().eligible')
        else:
            assert '相关版' not in card.locator('.number-labels').inner_text()
        plotted=page.locator(f'#scatter [data-point="{beer_id}"]')
        assert 'Untappd' in plotted.get_attribute('aria-label')
        assert f'{record["value"]:.2f}' in plotted.get_attribute('aria-label')
        card.locator('[data-open]').click()
        for row in page.locator('#dialog-content .community-rating').all():
            assert re.search(r'核对：\d{4}-\d{2}-\d{2}',row.inner_text())
            assert '评分' in row.inner_text() or '评论' in row.inner_text()
            assert '匹配版本' in row.inner_text() or '相关版本' in row.inner_text()
            for link in row.locator('a').all():
                assert re.match(r'https?://',link.get_attribute('href'))
        assert record['checkedAt'] in page.locator('#dialog-content').inner_text()
        page.keyboard.press('Escape')
    page.locator('#score-mode').select_option('personal')
    assert page.evaluate('BeerFrontier.getAnalysis().eligible')==[]
    assert page.locator('.card-rating').all_inner_texts()==['未评分']*40
    assert '我的口味评分' in page.locator('#chart-subtitle').inner_text()
    page.locator('#reset-filters').click()
    assert page.locator('.beer-card').count()==40
    assert set(page.locator('.beer-card').evaluate_all('(rows)=>rows.map(r=>r.dataset.beerId)'))==set(active)
    baseline=page.evaluate('BeerFrontier.getAnalysis()')
    page.evaluate('''()=>{const b=BEER_DATA.beers.find(b=>b.id==='paulaner');
      b.communityRatings=[{platform:'Fixture',scale:5,value:0,count:0,countType:'reviews',sourceId:b.rating.sourceId,checkedAt:'2026-09-28',note:'相关版本示例',evidenceFile:'test.json',match:'matched'}];}''')
    page.locator('#reset-filters').click()
    assert page.evaluate('BeerFrontier.getAnalysis()')==baseline
    assert page.locator('#score-platform option[value="all"]').inner_text()=='默认评分'
    page.locator('#score-platform').select_option('Fixture')
    assert page.locator('.beer-card').count()==1
    assert page.locator('.card-rating').inner_text().startswith('0.00')
    assert '0.00/5' in page.locator('#chart-table').text_content()
    assert page.locator('#scatter [data-point="paulaner"]').get_attribute('data-platform')=='Fixture'
    page.locator('.community-scores summary').click()
    assert '0条评论' in page.locator('.community-scores').inner_text()
    page.locator('.beer-card [data-open]').click()
    assert '2026-09-28' in page.locator('#dialog-content').inner_text()
    assert page.locator('#dialog-content .community-rating a').count()>0
    page.keyboard.press('Escape')
    page.locator('#min-ratings').select_option('100')
    assert page.evaluate('BeerFrontier.getAnalysis().eligible')==[]
    page.evaluate("BEER_DATA.beers.find(b=>b.id==='paulaner').communityRatings[0].match='related'")
    page.locator('#min-ratings').select_option('0')
    assert page.evaluate('BeerFrontier.getAnalysis().eligible')==[]
    assert '相关版' in page.locator('#chart-table').text_content()
    page.locator('#score-mode').select_option('personal')
    assert page.evaluate('BeerFrontier.getAnalysis().eligible')==[]
    assert not errors,errors
    browser.close()
print('PASS supplemental platform discovery, zero, dates, links, review counts and related isolation')
