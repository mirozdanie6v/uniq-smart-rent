from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess
import time

root = Path(__file__).resolve().parents[1]
dist = root / 'dist'
assert (dist / 'index.html').exists(), 'Build dist is missing'

server = subprocess.Popen(
    ['python', '-m', 'http.server', '8766', '--bind', '127.0.0.1', '--directory', str(dist)],
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
)

try:
    time.sleep(0.5)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
        for width, height in [(390, 844), (1440, 900)]:
            context = browser.new_context(viewport={'width': width, 'height': height}, locale='ru-RU')
            page = context.new_page()
            page.route(
                '**/api/fleet-overrides',
                lambda route: route.fulfill(
                    status=200,
                    content_type='application/json',
                    body='{"vehicles":[],"persisted":false}',
                ),
            )
            page.goto('http://127.0.0.1:8766/', wait_until='networkidle')

            page.locator('[data-role="owner"]').click()
            page.wait_for_timeout(80)
            customers_nav = page.locator('[data-go="customers"]')
            assert customers_nav.count() >= 1, 'Owner CRM navigation is missing'
            customers_nav.last.click()
            page.wait_for_timeout(120)

            assert page.locator('.crm-page').count() == 1
            assert page.get_by_text('Клиентская база UNIQ.', exact=True).count() == 1
            assert page.locator('.crm-row').count() >= 70
            assert page.get_by_text('VIP', exact=True).count() >= 1
            assert page.get_by_text('Повторные', exact=True).count() >= 1
            assert page.get_by_text('Неактивные', exact=True).count() >= 1

            search = page.get_by_label('Поиск клиентов')
            search.fill('Алексей Морозов')
            page.wait_for_timeout(60)
            assert page.locator('.crm-row').count() >= 1
            assert page.get_by_text('Алексей Морозов', exact=True).count() >= 1
            search.fill('')

            page.get_by_role('button', name='VIP', exact=True).click()
            page.wait_for_timeout(60)
            visible_rows = page.locator('.crm-row')
            assert visible_rows.count() >= 1
            assert visible_rows.count() < 72

            page.get_by_role('button', name='Все', exact=True).click()
            page.wait_for_timeout(60)
            row = page.locator('.crm-row').first
            row.click()
            page.wait_for_timeout(60)
            assert page.locator('.crm-detail.open').count() == 1
            assert page.get_by_text('КАРТОЧКА КЛИЕНТА', exact=True).count() == 1
            assert page.get_by_text('Контакты и аренды', exact=True).count() == 1

            note = page.locator('.crm-edit-field textarea')
            note.fill('Stage 6 CRM QA')
            assert note.input_value() == 'Stage 6 CRM QA'
            assert page.evaluate("JSON.parse(localStorage.getItem('uniq-stage6-crm-overrides-v1') || '{}')")

            if width == 390:
                assert not page.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth')

            context.close()
        browser.close()
finally:
    server.terminate()
    server.wait(timeout=5)
