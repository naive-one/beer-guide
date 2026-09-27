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
    assert page.locator('.platform-chart').count()==3, 'platforms must have separate plots'
    total=page.evaluate('BEER_DATA.beers.length')
    assert page.locator('#scatter [data-point]').count()==total
    assert page.locator('.frontier-key button').count()==7
    assert page.locator('.point-label').count()==0, 'names must not collide over dots'
    for width in [360,390,768,1440]:
        page.set_viewport_size({'width':width,'height':1100})
        page.wait_for_timeout(160)
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), width
        assert page.locator('#scatter [data-point]').count()==total
        for svg in page.locator('.platform-chart svg').all():
            assert svg.evaluate("e=>[...e.querySelectorAll('text')].every(t=>{const r=t.getBBox();return r.x>=0&&r.x+r.width<=e.viewBox.baseVal.width+1})"), 'SVG text clipped'
    def chart_geometry():
        return page.locator('.platform-chart').evaluate_all("""panels=>panels.map(panel=>({
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
    assert chart_geometry()==before_budget, 'budget must preserve every platform scale and point geometry'
    page.locator('#reset-filters').click()
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
    picker.locator('[data-open]').first.click()
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
    assert page.locator('#scatter [data-point]').count()==21
    page.locator('#score-mode').select_option('personal')
    assert page.locator('#chart-empty').is_visible()
    page.locator('#map-mode').select_option('all')
    assert page.locator('#scatter [data-point]').count()==total
    assert page.locator('.platform-chart').count()==0
    assert page.locator('.unplaced-points [data-point]').count()==total
    assert not errors, errors
    browser.close()
print('PASS chart panels, all records, frontier key, all overlap members, dismissal and rerender focus, nulls, budget-invariant scales and geometry and responsive geometry')
