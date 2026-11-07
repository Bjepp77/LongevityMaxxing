"""Browser smoke test of the v1 acceptance journey. Usage: python3 tests/smoke.py <base-url>"""
import sys
from playwright.sync_api import sync_playwright, expect

URL = sys.argv[1].rstrip('/') if len(sys.argv) > 1 else 'http://localhost:3000'
TESTS = {'#age': '44', '#bw': '84', '#jumpCm': '220', '#liftKg': '140', '#liftReps': '5', '#hangS': '75', '#gripKg': '50',
         '#anaS': '1:12', '#pushups': '30', '#row2kS': '7:15', '#fiveKS': '25:00', '#z2Min': '90'}


def main() -> None:
    """Run: enter 7 tests -> curve, composite, targets -> program -> today's dose -> log -> reload persists."""
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(URL + '/#/assess')
        assert 'noindex' in page.locator('meta[name=robots]').get_attribute('content')
        for sel, val in TESTS.items():
            page.fill(sel, val)
        page.click('#btn-score')
        expect(page.locator('#curve-svg')).to_be_visible()
        expect(page.locator('#target-line')).to_have_count(1)
        composite = page.locator('#composite').inner_text()
        assert composite.isdigit(), composite
        assert page.locator('.zcard').count() == 8   # seven zones + the Strength pillar
        expect(page.locator('#weakest')).to_contain_text('Weakest zones')
        assert page.locator('#targets tbody tr').count() >= 8
        page.screenshot(path='/tmp/lmx-curve.png', full_page=True)
        page.click('#btn-gen')
        expect(page.locator('#today-title')).to_contain_text('today')
        first = page.locator('.session').first
        expect(first.locator('ul.dose li').first).to_be_visible()
        dose = first.locator('ul.dose').inner_text()
        assert 'kg' in dose or 'min' in dose, dose
        first.locator('input[name=actual]').fill('smoke test set')
        first.locator('input[name=rpe]').fill('7')
        first.locator('button[type=submit]').click()
        expect(page.locator('.session').first).to_contain_text('logged')
        page.screenshot(path='/tmp/lmx-today.png', full_page=True)
        page.reload()
        expect(page.locator('.session').first).to_contain_text('logged')
        page.goto(URL + '/#/program')
        assert page.locator('.wk').count() == 12
        page.goto(URL + '/#/history')
        expect(page.locator('#hist tbody tr')).to_have_count(1)
        expect(page.locator('#logt')).to_contain_text('smoke test set')
        keys = page.evaluate('Object.keys(localStorage)')
        assert keys and all(k.startswith('lmx.') for k in keys), keys
        assert not errors, errors
        browser.close()
    print('SMOKE-OK', URL, 'composite', composite)


if __name__ == '__main__':
    main()
