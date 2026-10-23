/** Browser acceptance checks without an HTTP server. Requests are fulfilled from dist/. */
import puppeteer from 'puppeteer';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const artifacts = fileURLToPath(new URL('../artifacts/', import.meta.url));
const executablePath = process.env.CHROME_PATH || (process.platform === 'darwin'
  ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  : '/usr/bin/google-chrome');
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.svg':'image/svg+xml', '.glb':'model/gltf-binary', '.json':'application/json' };
let browser;
try {
  browser = await puppeteer.launch({
    executablePath, headless: true, pipe: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    timeout: 20000,
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.setRequestInterception(true);
  page.on('request', async request => {
    const url = new URL(request.url());
    if (url.protocol === 'data:' || url.protocol === 'blob:') { await request.continue(); return; }
    const relative = decodeURIComponent(url.pathname === '/' ? 'index.html' : url.pathname.slice(1));
    const filename = path.resolve(root,relative);
    if (!filename.startsWith(root) || url.hostname !== 'little-studio.test') { await request.abort(); return; }
    try { await request.respond({ status:200,contentType:mime[path.extname(filename)] || 'application/octet-stream', body: await readFile(filename) }); }
    catch { await request.respond({status:404,body:'Not found'}); }
  });
  await page.goto('http://little-studio.test/', { waitUntil:'networkidle0' });
  await page.waitForFunction(() => window.__studio?.isReady(), { timeout:45000 });
  await mkdir(artifacts,{recursive:true});
  await page.screenshot({path:path.join(artifacts,'studio-desktop.png')});
  assert.equal(await page.$eval('#loading',element=>element.hidden),true);
  const stats = await page.evaluate(() => window.__studio.getStats());
  assert.ok(stats.meshes < 100 && stats.triangles > 1000);

  async function select(id) { await page.click('[data-action="objects"]'); await page.click(`.object-option[data-object="${id}"]`); }
  await select('lamp'); await page.click('#object-panel [data-action="lamp"]');
  assert.equal(await page.evaluate(()=>window.__studio.getState().lampOn),false);
  await select('door'); await page.click('#object-panel [data-action="door"]');
  assert.equal(await page.evaluate(()=>window.__studio.getState().doorOpen),true);
  await select('chair'); await page.click('[data-action="spin"]');
  assert.equal(await page.evaluate(()=>window.__studio.getState().chairTurns),1);
  await select('rug'); await page.click('[data-rug="ocean"]');
  assert.equal(await page.evaluate(()=>window.__studio.getState().rug),'ocean');
  await select('monitors'); await page.type('#studio-note','ไอเดียใหม่: a room that responds.');
  assert.equal(await page.evaluate(()=>window.__studio.getState().screenMode),'notes');
  await page.reload({waitUntil:'networkidle0'});
  await page.waitForFunction(()=>window.__studio?.isReady());
  assert.equal(await page.evaluate(()=>window.__studio.getState().notes),'ไอเดียใหม่: a room that responds.');
  assert.equal(await page.evaluate(()=>window.__studio.getState().rug),'ocean');
  await select('computer'); await page.click('#object-panel [data-action="computer"]');
  assert.equal(await page.evaluate(()=>window.__studio.getState().computerOn),false);
  await page.click('#object-panel [data-action="computer"]');
  await select('mug'); await page.click('[data-timer-mode="break"]');
  await page.click('#object-panel [data-action="timer"]');
  assert.ok(await page.evaluate(()=>window.__studio.getState().timer.deadline > Date.now()));
  await page.click('#object-panel [data-action="timer"]');
  assert.equal(await page.evaluate(()=>window.__studio.getState().timer.deadline),null);
  await page.click('[data-action="theme"]');
  assert.equal(await page.$eval('html',element=>element.dataset.theme),'night');
  await page.click('[data-action="close-panel"]');
  await page.click('[data-action="home"]');
  await page.waitForTimeout(800);
  // Exercise raycasting itself, rather than only the accessible object menu.
  await page.click('[data-action="hotspots"]');
  const position = await page.evaluate(()=>window.__studio.project('rug'));
  await page.mouse.click(position.x,position.y);
  assert.equal(await page.$eval('#panel-title',element=>element.textContent),'พรมทอ');
  await page.screenshot({path:path.join(artifacts,'studio-night.png')});
  await page.setViewport({width:390,height:844,deviceScaleFactor:1});
  await page.waitForTimeout(500);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(artifacts,'studio-mobile.png')});
  await page.click('[data-action="close-panel"]');
  await page.click('[data-action="help"]');
  assert.equal(await page.$eval('#help-dialog',element=>element.open),true);
  await page.keyboard.press('Escape');
  assert.equal(await page.$eval('#help-dialog',element=>element.open),false);
  assert.deepEqual(errors,[]);
  console.log('Browser acceptance checks passed.',stats);
} catch(error) {
  console.error('Browser verification did not complete:',error.message);
  process.exitCode=1;
} finally { if (browser) await browser.close(); }
