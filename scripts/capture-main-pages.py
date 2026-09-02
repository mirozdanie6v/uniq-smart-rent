from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess, time, os

root = Path(__file__).resolve().parents[1]
dist = root / 'dist'
out = root / 'preview' / 'screenshots'
out.mkdir(parents=True, exist_ok=True)

server = subprocess.Popen(
    ['python', '-m', 'http.server', '8770', '--bind', '127.0.0.1', '--directory', str(dist)],
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
)


def snap(page, name):
    page.wait_for_timeout(250)
    page.screenshot(path=str(out / name), full_page=False)

try:
    time.sleep(0.6)
    with sync_playwright() as p:
        launch = {'headless': True, 'args': ['--no-sandbox']}
        executable = os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE')
        if executable:
            launch['executable_path'] = executable
        browser = p.chromium.launch(**launch)
        ctx = browser.new_context(viewport={'width': 1440, 'height': 900}, locale='ru-RU', device_scale_factor=1)
        page = ctx.new_page()
        page.goto('http://127.0.0.1:8770/', wait_until='networkidle')

        snap(page, '01-client-home.png')

        page.locator('[data-go="catalog"]').last.click()
        page.wait_for_timeout(200)
        snap(page, '02-client-catalog.png')

        page.locator('[data-open]').first.click()
        page.wait_for_timeout(200)
        snap(page, '03-client-vehicle.png')

        page.locator('[data-role="employee"]').click()
        page.wait_for_timeout(200)
        snap(page, '04-employee-dashboard.png')

        page.locator('[data-go="requests"]').last.click()
        page.wait_for_timeout(200)
        snap(page, '05-employee-requests.png')

        page.locator('[data-go="fleet"]').last.click()
        page.wait_for_timeout(200)
        snap(page, '06-employee-fleet.png')

        page.locator('[data-role="owner"]').click()
        page.wait_for_timeout(200)
        snap(page, '07-owner-overview.png')

        page.locator('[data-go="system"]').last.click()
        page.wait_for_timeout(200)
        snap(page, '08-owner-system.png')

        ctx.close()
        browser.close()
finally:
    server.terminate()
    server.wait(timeout=5)

print(f'Captured {len(list(out.glob("*.png")))} preview screenshots in {out}')
