"""Browser smoke test of the v2 import journey (docs/SPEC.md "v2 acceptance").

Usage: python3 tests/smoke_v2.py [base-url]   (no URL: serves the repo root on a free local port)
"""
import functools
import http.server
import json
import pathlib
import socketserver
import sys
import threading

from playwright.sync_api import expect, sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
FIXTURES = ROOT / 'fixtures'
RAW_MARKERS = ['Activity ID', 'Workout Name', 'Ridge hike', 'Track 1500 hard', 'Commute ride', 'comma decimal']
EXPECTED_MUST_TEST = ['z4', 'z3', 'z2', 'z1']   # nearest on the curve to a weakest proxy in z5..z7
REAL_FIVE_K = '22:30'


def serve_repo() -> tuple:
    """Serve the repo root on a free port in a daemon thread; return (url, server)."""
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
    handler.log_message = lambda *args: None
    server = socketserver.TCPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return 'http://127.0.0.1:%d' % server.server_address[1], server


def storage(page) -> dict:
    """Return every localStorage entry as a dict."""
    return page.evaluate('Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)]))')


def import_both(page, clicked: list) -> None:
    """Fill the profile and import the two fixture files on #/import."""
    page.fill('#imp-age', '44')
    page.select_option('#imp-sex', 'M')
    page.fill('#imp-bw', '84')
    page.click('#btn-imp-profile')
    clicked.append('save profile')
    page.set_input_files('#file-strong', str(FIXTURES / 'strong-sample.csv'))
    expect(page.locator('#e1rm-table tbody tr').first).to_be_visible()
    page.set_input_files('#file-strava', str(FIXTURES / 'strava-sample.csv'))
    clicked.append('import Strong CSV + Strava CSV')


def check_placements(page) -> None:
    """Three labelled proxy cards, e1RM table, unmapped bucket, four must-test prompts in order."""
    cards = page.locator('.proxy-card')
    expect(cards).to_have_count(3)
    for zone, band in (('z6', '±8%'), ('z7', '±5%'), ('z5', '±20%')):
        label = page.locator('.proxy-card[data-zone=%s] .proxy-label' % zone)
        expect(label).to_have_text('Estimated from your log, %s, provisional until tested' % band)
    assert page.locator('.proxy-dot').count() == 3, 'hollow proxy points on the curve'
    assert page.locator('#e1rm-table tbody tr').count() == 4
    for lift in ('squat', 'bench', 'trapbar', 'ohp'):
        expect(page.locator('#e1rm-table tr[data-lift=%s]' % lift)).to_have_count(1)
    expect(page.locator('#unmapped li')).to_have_count(2)
    expect(page.locator('#unmapped')).to_contain_text('Bicep Curl (Dumbbell)')
    order = page.eval_on_selector_all('#must-test li', 'els => els.map(e => e.dataset.zone)')
    assert order == EXPECTED_MUST_TEST, order
    for li in page.locator('#must-test li').all():
        expect(li).to_contain_text('Not estimable from a log: test this')
    expect(page.locator('#weakest-proxy')).to_be_visible()


def check_no_raw(page) -> None:
    """localStorage holds only lmx.* keys, small derived summaries, no raw CSV text."""
    data = storage(page)
    assert data and all(k.startswith('lmx.') for k in data), list(data)
    for key in ('lmx.import.strong', 'lmx.import.strava', 'lmx.import.meta'):
        assert key in data, key
    blob = json.dumps(data)
    for marker in RAW_MARKERS:
        assert marker not in blob, 'raw CSV text stored: ' + marker
    assert len(blob) < 60000, len(blob)


def enter_real_threshold(page, clicked: list) -> str:
    """Enter one real 5K test and return the block-targets table HTML."""
    page.goto(page.url.split('#')[0] + '#/curve')
    expect(page.locator('#targets')).to_have_count(0)
    expect(page.locator('#app')).to_contain_text('Block targets come only from real tests')
    page.goto(page.url.split('#')[0] + '#/assess')
    page.fill('#fiveKS', REAL_FIVE_K)
    page.click('#btn-score')
    clicked.append('enter real 5K %s + Score my curve' % REAL_FIVE_K)
    expect(page.locator('#targets')).to_be_visible()
    expect(page.locator('.zcard[data-zone=z6] .proxy-label')).to_have_count(0)
    expect(page.locator('.zcard[data-zone=z5] .proxy-label')).to_have_count(1)
    expect(page.locator('.zcard[data-zone=z7] .proxy-label')).to_have_count(1)
    return page.locator('#targets').inner_html() + '|' + page.locator('#composite').inner_text()


def main() -> None:
    """Run the v2 journey end to end and print SMOKE-OK with what was clicked."""
    server = None
    url = sys.argv[1].rstrip('/') if len(sys.argv) > 1 else None
    if not url:
        url, server = serve_repo()
    clicked = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(accept_downloads=True)
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('dialog', lambda d: d.accept())
        page.goto(url + '/#/import')
        import_both(page, clicked)
        check_placements(page)
        page.reload()
        clicked.append('reload')
        check_placements(page)
        check_no_raw(page)
        with_import = enter_real_threshold(page, clicked)
        page.goto(url + '/#/import')
        expect(page.locator('.proxy-card[data-zone=z6] .proxy-label')).to_have_count(0)
        expect(page.locator('.proxy-card[data-zone=z6]')).to_contain_text('Replaced by your real test')
        meta = json.loads(storage(page)['lmx.import.meta'])
        assert meta['used'] is True and meta['firstRealTestAfterImport'], meta
        page.goto(url + '/#/history')
        expect(page.locator('#import-flag')).to_contain_text('first real test after import')
        with page.expect_download() as dl:
            page.click('#btn-export')
        backup = json.loads(pathlib.Path(dl.value.path()).read_text())
        assert backup['data']['importMeta']['used'] is True, backup['data'].get('importMeta')
        clicked.append('Export backup')
        page.goto(url + '/#/import')
        page.click('#btn-clear-import')
        clicked.append('Clear import')
        assert 'lmx.import.strava' not in storage(page)
        page.goto(url + '/#/curve')
        without_import = page.locator('#targets').inner_html() + '|' + page.locator('#composite').inner_text()
        assert with_import == without_import, 'block targets changed with the import'
        assert not errors, errors
        browser.close()
    if server:
        server.shutdown()
    print('SMOKE-OK', url, 'clicked:', ' -> '.join(clicked))


if __name__ == '__main__':
    main()
