"""Browser smoke test of the v2.1 forever-athlete curve journey (docs/SPEC.md "v2.1 (f)").

Usage: python3 tests/smoke_v21.py [base-url]   (no URL: serves the repo root on a free local port)
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
BACKUP = ROOT / 'fixtures' / 'backup-schema1.json'
ZONES = ['power', 'sprint', 'ana', 'vo2', 'thr', 'aer', 'hike']
AGE_GRADE_LABEL = 'age-graded %, not a percentile'
HIKE_LABEL = 'observed effort, no published norms'


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


def restore_and_migrate(page, url: str, clicked: list) -> None:
    """Restore an old (schema 1) backup, then pass the forced-backup migration card."""
    page.goto(url + '/#/history')
    page.set_input_files('#imp', str(BACKUP))
    clicked.append('restore backup-schema1.json')
    card = page.locator('#migrate-card')
    expect(card).to_be_visible()
    expect(page.locator('#btn-migrate-continue')).to_be_disabled()
    page.goto(url + '/#/curve')
    expect(card).to_be_visible()                                   # blocks every route until migrated
    with page.expect_download() as dl:
        page.click('#btn-migrate-backup')
    old = json.loads(pathlib.Path(dl.value.path()).read_text())
    assert len(old['data']['assessments']) == 2, 'pre-migration backup holds the old data'
    expect(page.locator('#btn-migrate-continue')).to_be_enabled()
    page.click('#btn-migrate-continue')
    clicked.append('Download backup + Continue')
    assert storage(page).get('lmx.schema') == '2'


def check_rescored_curve(page, url: str) -> None:
    """Seven zones + pillar; v1 scores kept for thr/ana; three zones with no data; stale program flagged."""
    page.goto(url + '/#/curve')
    for zone in ZONES + ['pillar']:
        expect(page.locator('.zcard[data-zone=%s]' % zone)).to_have_count(1)
    assert page.locator('.zcard').count() == 8
    expect(page.locator('.zcard[data-zone=thr] .score')).to_have_text('60')
    expect(page.locator('.zcard[data-zone=ana] .score')).to_have_text('60')
    expect(page.locator('.zcard[data-zone=thr]')).to_contain_text('age-graded')
    for zone in ('sprint', 'aer', 'hike'):
        expect(page.locator('.zcard[data-zone=%s]' % zone)).to_contain_text('not tested')
    expect(page.locator('.zcard[data-zone=pillar]')).to_contain_text('push-ups')
    expect(page.locator('.zcard[data-zone=pillar]')).to_contain_text('grip')
    page.goto(url + '/#/program')
    expect(page.locator('#program-stale')).to_be_visible()


def enter_sprint_and_hike(page, url: str, clicked: list) -> None:
    """Enter a hand-timed 60 m and a hike on top of the pre-filled last test."""
    page.goto(url + '/#/assess')
    page.fill('#sprintS', '8.20')
    page.select_option('#sprintTiming', 'hand')
    page.fill('#hikeKm', '12')
    page.fill('#hikeAscent', '900')
    page.fill('#hikeLoad', '0')
    page.fill('#hikeMoving', '3:30:00')
    page.click('#btn-score')
    clicked.append('enter 60 m 8.20 (hand) + hike 12 km/900 m/3:30 + Score my curve')
    expect(page.locator('.zcard[data-zone=sprint] .score')).to_have_text('81')
    expect(page.locator('.zcard[data-zone=sprint] .age-grade-label')).to_have_text(AGE_GRADE_LABEL)
    expect(page.locator('.zcard[data-zone=hike] .observed-label')).to_have_text(HIKE_LABEL)
    expect(page.locator('.zcard[data-zone=hike]')).to_contain_text('at or above guidebook pace')
    assert page.locator('.observed-dot').count() == 1, 'hike drawn hollow on the curve'
    expect(page.locator('#targets tr[data-metric=sprint]')).to_contain_text('trend only')
    expect(page.locator('#targets tr[data-metric=hikeMinutes]')).to_be_visible()


def main() -> None:
    """Run the v2.1 journey end to end and print SMOKE-OK with what was clicked."""
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
        page.goto(url + '/#/assess')
        assert storage(page).get('lmx.schema') == '2', 'a fresh browser starts on schema 2 with no migration card'
        expect(page.locator('#migrate-card')).to_have_count(0)
        restore_and_migrate(page, url, clicked)
        check_rescored_curve(page, url)
        enter_sprint_and_hike(page, url, clicked)
        page.click('#btn-gen')
        clicked.append('Regenerate program')
        expect(page.locator('#today-title')).to_be_visible()
        page.goto(url + '/#/program')
        expect(page.locator('#program-stale')).to_have_count(0)
        assert page.locator('.wk').count() == 12
        page.reload()
        clicked.append('reload')
        page.goto(url + '/#/curve')
        expect(page.locator('.zcard[data-zone=sprint] .score')).to_have_text('81')
        page.goto(url + '/#/history')
        expect(page.locator('#hist tbody tr')).to_have_count(3)
        with page.expect_download() as dl:
            page.click('#btn-export')
        backup = json.loads(pathlib.Path(dl.value.path()).read_text())
        assert backup['data']['schema'] == 2, backup['data'].get('schema')
        clicked.append('Export backup')
        assert not errors, errors
        browser.close()
    if server:
        server.shutdown()
    print('SMOKE-OK', url, 'clicked:', ' -> '.join(clicked))


if __name__ == '__main__':
    main()
