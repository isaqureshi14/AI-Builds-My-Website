const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = 'C:\\Users\\isata\\.gemini\\antigravity\\brain\\0af9773b-53f3-498b-b25c-891f27256395\\screenshots';

async function run() {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
        fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }

    const browser = await puppeteer.launch({
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        headless: 'new',
        defaultViewport: { width: 1440, height: 1080 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    console.log('1. Navigating to Home...');
    await page.goto('http://127.0.0.1:8000/', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_home_intake.png'), fullPage: false });
    console.log('Saved 01_home_intake.png');

    console.log('2. Triggering Disambiguation modal demo...');
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const disambigBtn = btns.find(b => b.textContent.includes('Test Disambiguation Demo'));
        if (disambigBtn) disambigBtn.click();
    });

    await page.waitForSelector('h2', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_disambiguation_modal.png'), fullPage: false });
    console.log('Saved 02_disambiguation_modal.png');

    console.log('3. Clicking Resolve & Generate Website...');
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const resolveBtn = btns.find(b => b.textContent.includes('Resolve & Generate Website'));
        if (resolveBtn) resolveBtn.click();
    });

    // Wait for redirect to /editor/
    console.log('Waiting for generation and navigation to editor...');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 });
    console.log('Current URL:', page.url());
    await new Promise(r => setTimeout(r, 1500));

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_editor_desktop.png'), fullPage: false });
    console.log('Saved 03_editor_desktop.png');

    console.log('4. Switching to Mobile view in editor...');
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const mobileBtn = btns.find(b => b.textContent.includes('Mobile'));
        if (mobileBtn) mobileBtn.click();
    });
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_editor_mobile.png'), fullPage: false });
    console.log('Saved 04_editor_mobile.png');

    console.log('5. Publishing live site...');
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const publishBtn = btns.find(b => b.textContent.includes('Publish Live'));
        if (publishBtn) publishBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_editor_published.png'), fullPage: false });
    console.log('Saved 05_editor_published.png');

    // Get live site slug
    const liveSiteUrl = await page.evaluate(() => {
        const link = document.querySelector('a[href*="/sites/"]');
        return link ? link.getAttribute('href') : null;
    });

    console.log('Live site link:', liveSiteUrl);
    if (liveSiteUrl) {
        console.log('Navigating to live public site...');
        await page.goto(liveSiteUrl.startsWith('http') ? liveSiteUrl : `http://127.0.0.1:8000${liveSiteUrl}`, {
            waitUntil: 'networkidle2'
        });
        await new Promise(r => setTimeout(r, 1000));
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_public_site.png'), fullPage: false });
        console.log('Saved 06_public_site.png');
    }

    await browser.close();
    console.log('All browser verification steps completed successfully!');
}

run().catch(err => {
    console.error('Browser test failed:', err);
    process.exit(1);
});
