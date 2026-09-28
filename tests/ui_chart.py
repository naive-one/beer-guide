"""Chart regression against real built files and native browser storage.
Run preview first; BEER_URL can point at a local test origin.
"""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/home/ubuntu/.local/bin/chromium'),headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':1100})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(os.environ.get('BEER_URL','http://127.0.0.1:8080'),wait_until='networkidle')
    expect(page.locator('[data-chart-range="focus"]')).to_have_attribute('aria-pressed','true')
    initial_analysis=page.evaluate('BeerFrontier.getAnalysis()')
    assert float(page.locator('.shared-chart').get_attribute('data-xmax'))<60
    offscreen_count=page.locator('.offscreen-points [data-point]').count()
    assert offscreen_count>0
    assert '152.50' in page.locator('.offscreen-points').inner_text()
    entry=page.locator('.offscreen-points [data-point]').first
    entry.focus()
    entry.press('Enter')
    expect(page.locator('#beer-dialog')).to_be_visible()
    page.locator('[data-save-score]').click()  # Rebuild while the offscreen opener owns the dialog.
    page.keyboard.press('Escape')
    expect(entry).to_be_focused()
    for width in [360,390,1440]:
        page.set_viewport_size({'width':width,'height':1100})
        page.wait_for_timeout(160)
        for mode in ['full','focus']:
            control=page.locator(f'[data-chart-range="{mode}"]')
            control.focus()
            control.press('Enter')
            expect(page.locator(f'[data-chart-range="{mode}"]')).to_be_focused()
            assert page.evaluate('BeerFrontier.getAnalysis()')==initial_analysis
            assert page.locator('#scatter svg').count()==1
            assert page.locator('#scatter [data-point]').count()==initial_analysis['displayed']
            plotted=page.locator('#scatter svg [data-point]').evaluate_all('es=>es.map(e=>e.dataset.point)')
            assert set(initial_analysis['frontier'])<=set(plotted)
            assert page.locator('.offscreen-points [data-point]').count()==(0 if mode=='full' else offscreen_count)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert page.locator('#scatter svg').count()==1, 'all platforms must share one plotting SVG'
    assert page.locator('.platform-legend [data-platform]').count()==page.evaluate('BeerCore.chartModel(BeerCore.analyze(BEER_DATA,BeerFrontier.getState()),BeerFrontier.getState()).platforms.length')
    assert page.locator('#scatter svg').get_attribute('data-ymin')=='0'
    assert page.locator('#scatter svg').get_attribute('data-ymax')=='5'
    assert page.evaluate("(()=>{const a=BeerFrontier.getAnalysis();return a.bestByCohort.length>1?a.best===null:a.best===(a.bestByCohort[0]?.id??null)})()")
    assert page.locator('.frontier-path').count()==page.evaluate('BeerCore.chartModel(BeerCore.analyze(BEER_DATA,BeerFrontier.getState()),BeerFrontier.getState()).groups.filter(g=>g.points.length>1).length')
    assert page.locator('.frontier-path').evaluate_all("paths=>paths.every(p=>p.dataset.ids.split(',').every(id=>document.querySelector('g[data-point=\"'+id+'\"]').dataset.platform===p.dataset.platform))")
    assert page.locator('#scatter .axis-price').count()==1
    assert page.locator('#scatter .axis-rating').count()==1
    assert page.locator('#scatter .y-tick').all_text_contents()==['0','1','2','3','4','5']
    page.locator('#score-platform').select_option('Untappd')
    has_points=page.evaluate('BeerCore.chartModel(BeerCore.analyze(BEER_DATA,BeerFrontier.getState()),BeerFrontier.getState()).placed.length>0')
    assert page.locator('#scatter svg').count()==int(has_points)
    assert page.locator('#scatter svg [data-point]').evaluate_all("points=>points.every(p=>p.dataset.platform==='Untappd')")
    assert page.locator('.platform-legend [data-platform]').count()==int(has_points)
    page.locator('#reset-filters').click()
    total=page.evaluate('BeerCore.catalogView(BEER_DATA).beers.length')
    assert page.locator('#scatter [data-point]').count()==total
    assert page.locator('.frontier-key button').count()==page.evaluate('BeerFrontier.getAnalysis().frontier.length')
    assert page.locator('.point-label').count()==0, 'names must not collide over dots'
    for width in [360,390,768,1440]:
        page.set_viewport_size({'width':width,'height':1100})
        page.wait_for_timeout(160)
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), width
        assert page.locator('#scatter [data-point]').count()==total
        for svg in page.locator('.shared-chart svg').all():
            assert svg.evaluate("e=>[...e.querySelectorAll('text')].every(t=>{const r=t.getBBox();return r.x>=0&&r.x+r.width<=e.viewBox.baseVal.width+1})"), 'SVG text clipped'
    def chart_geometry():
        return page.locator('.shared-chart').evaluate_all("""panels=>panels.map(panel=>({
            platform:panel.dataset.platform,
            xmax:panel.dataset.xmax,
            viewBox:panel.querySelector('svg').getAttribute('viewBox'),
            axes:[...panel.querySelectorAll('.axis-text')].map(e=>[e.textContent,e.getAttribute('x'),e.getAttribute('y')]),
            points:[...panel.querySelectorAll('[data-point]')].map(e=>({
                id:e.dataset.point,
                shapes:[...e.querySelectorAll('circle,path')].map(s=>
                    ['cx','cy','r','d'].map(a=>s.getAttribute(a)))
            }))
        }))""")
    before_budget=chart_geometry()
    page.locator('#budget').fill('1000000')
    page.locator('#budget').press('Tab')
    assert chart_geometry()==before_budget, 'budget must preserve shared scale and point geometry'
    page.locator('#reset-filters').click()
    for unit in ['unit','500ml','order']:
        page.locator('#unit').select_option(unit)
        result=page.evaluate('BeerFrontier.getAnalysis()')
        for mode in ['full','focus']:
            page.locator(f'[data-chart-range="{mode}"]').click()
            assert page.evaluate('BeerFrontier.getAnalysis()')==result
            before=chart_geometry()
            page.locator('#budget').fill('1000000')
            page.locator('#budget').press('Tab')
            assert chart_geometry()==before
            page.locator('#budget').fill('20' if unit!='order' else '150')
            page.locator('#budget').press('Tab')
    page.locator('#reset-filters').click()
    # Explicit legacy view exercises the dense overlap interactions.
    page.locator('#price-scope').select_option('all')
    picker=page.locator('#point-picker')
    dialog=page.locator('#beer-dialog')
    names=page.evaluate('Object.fromEntries(BEER_DATA.beers.map(b=>[b.id,b.name]))')
    clusters=page.locator('#scatter [data-cluster]').evaluate_all('nodes=>nodes.map(e=>e.dataset.cluster)')
    assert len(set(clusters))>=2, 'exercise distinct overlap clusters'

    def open_picker(opener, key='Enter'):
        opener.focus()
        opener.press(key)
        expect(picker).to_be_visible()
        expect(picker.locator('[data-open]').first).to_be_focused()

    # Start with the last cluster so Escape cannot accidentally pass by focusing the first.
    for cluster in reversed(clusters):
        opener=page.locator(f'#scatter [data-cluster="{cluster}"]')
        members=cluster.split(',')
        open_picker(opener)
        assert picker.locator('[data-open]').evaluate_all('nodes=>nodes.map(e=>e.dataset.open)')==members
        page.keyboard.press('Escape')
        expect(picker).to_be_hidden()
        expect(opener).to_be_focused()
        open_picker(opener, 'Space')
        picker.locator('[data-dismiss-picker]').click()
        expect(picker).to_be_hidden()
        expect(opener).to_be_focused()
        for index, member in enumerate(members):
            open_picker(opener)
            picker.locator(f'[data-open="{member}"]').click()
            expect(picker).to_be_hidden()
            expect(dialog).to_be_visible()
            expect(page.locator('#dialog-title')).to_have_text(names[member])
            if index%2:
                page.locator('[data-close="beer-dialog"]').click()
            else:
                page.keyboard.press('Escape')
            expect(dialog).not_to_be_visible()
            expect(opener).to_be_focused()

    # A pointer-opened overlapping point must return to that point, not its badge.
    point=page.locator(f'#scatter [data-point="{clusters[-1].split(",")[0]}"]')
    point.dispatch_event('click')
    expect(picker).to_be_visible()
    page.keyboard.press('Escape')
    expect(point).to_be_focused()
    point.dispatch_event('click')
    picker.locator('[data-dismiss-picker]').click()
    expect(point).to_be_focused()
    point.dispatch_event('click')
    # A point's neighbourhood may differ from its cluster button's neighbourhood.
    picker.locator(f'[data-open="{clusters[-1].split(",")[0]}"]').click()
    # Saving a score rebuilds the chart while its detail remains open.
    old_point=point.element_handle()
    page.locator('#personal-score').fill('4')
    page.locator('[data-save-score]').click()
    assert not old_point.evaluate('e=>e.isConnected'), 'must exercise a replaced opener'
    page.keyboard.press('Escape')
    expect(point).to_be_focused()

    opener=page.locator(f'#scatter [data-cluster="{clusters[-1]}"]')
    open_picker(opener)
    picker.locator('[data-open]').first.click()
    old_badge=opener.element_handle()
    page.locator('[data-save-score]').click()
    assert not old_badge.evaluate('e=>e.isConnected')
    page.locator('[data-close="beer-dialog"]').click()
    expect(opener).to_be_focused()
    # A chart rerender while the picker owns focus also restores the replacement badge.
    open_picker(opener)
    old_badge=opener.element_handle()
    page.evaluate('window.dispatchEvent(new Event("resize"))')
    expect(picker).to_be_hidden()
    assert not old_badge.evaluate('e=>e.isConnected')
    expect(opener).to_be_focused()
    # Remove the temporary personal score before checking the empty personal chart.
    open_picker(opener)
    picker.locator('[data-open]').first.click()
    page.locator('#personal-score').fill('')
    page.locator('[data-save-score]').click()
    page.keyboard.press('Escape')
    expect(opener).to_be_focused()
    # If a price edit dissolves the original cluster, its first beer is a safe return target.
    open_picker(opener)
    member=clusters[-1].split(',')[0]
    picker.locator(f'[data-open="{member}"]').click()
    page.locator('#edit-total').fill('999999')
    page.locator('#edit-qty').fill('1')
    page.locator('#edit-volume').fill('500')
    page.locator('#price-form button[type="submit"]').click()
    assert opener.count()==0, 'price edit must dissolve the original cluster'
    page.keyboard.press('Escape')
    fallback=page.locator(f'#scatter [data-point="{member}"]')
    expect(fallback).to_be_focused()
    fallback.press('Enter')
    page.locator('[data-clear-price]').click()
    page.keyboard.press('Escape')
    page.locator('#map-mode').select_option('evidence')
    assert page.locator('#scatter [data-point]').count()==page.evaluate('BeerFrontier.getAnalysis().eligible.length')
    page.locator('#score-mode').select_option('personal')
    assert page.locator('#chart-empty').is_visible()
    page.locator('#map-mode').select_option('all')
    assert page.locator('#scatter [data-point]').count()==total
    assert page.locator('.shared-chart').count()==0
    assert page.locator('.unplaced-points [data-point]').count()==total
    # A real personal score (including zero) uses the same axes, with no community backfill.
    page.locator('#all-index [data-open="paulaner"]').click()
    page.locator('#personal-score').fill('0')
    page.locator('[data-save-score]').click()
    page.keyboard.press('Escape')
    assert page.locator('#scatter svg').count()==1
    assert page.locator('#scatter svg [data-point]').count()==1
    assert page.locator('#scatter .axis-rating').text_content()=='个人评分 / 5'
    assert '社区' not in page.locator('#plot-title').text_content()
    assert page.locator('.unplaced-points [data-point]').count()==total-1
    assert not errors, errors
    browser.close()
print('PASS single shared chart, all records, frontier key, all overlap members, dismissal and rerender focus, nulls, budget-invariant scales and geometry and responsive geometry')

# Deterministic fresh-price fixture supplements incomplete live research without writing data files.
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/home/ubuntu/.local/bin/chromium'),headless=True,args=['--no-sandbox'])
    page=browser.new_page()
    page.goto(os.environ.get('BEER_URL','http://127.0.0.1:8080'),wait_until='networkidle')
    page.evaluate("""()=>{const b=BEER_DATA.beers.find(b=>b.id==='weihen');b.quote={total:99,quantity:24,volumeMl:null,currency:'CNY',priceBasis:'taobao-displayed-snapshot',selectedSku:'测试同款24瓶',checkedAt:'2026-09-27',sourceId:b.rating.sourceId};} """)
    page.locator('#unit').select_option('order')
    assert 'weihen' in page.evaluate('BeerFrontier.getAnalysis().eligible')
    page.locator('#unit').select_option('unit')
    assert page.evaluate("BeerCore.resolve(BEER_DATA.beers.find(b=>b.id==='weihen'),BeerFrontier.getState()).price")==99/24
    page.locator('#all-index [data-open="weihen"]').click()
    text=page.locator('#dialog-content').inner_text()
    assert '容量待补' in text and '测试同款24瓶' in text and '淘宝页面价' in text
    assert 'nullml' not in text and '¥0.00' not in text
    page.keyboard.press('Escape')
    page.locator('#unit').select_option('500ml')
    assert 'weihen' not in page.evaluate('BeerFrontier.getAnalysis().eligible')
    for scope in ['taobao','all']:
        page.locator('#price-scope').select_option(scope)
        assert page.locator('.unplaced-points [data-point="weihen"]').count()==1
        assert '价格待补' in page.locator('.beer-card[data-beer-id="weihen"] .card-price').inner_text()
    browser.close()
print('PASS fresh snapshot fixture: per-unit/order, unknown volume, compact SKU and 500ml exclusion')
