#!/usr/bin/env node
// Drive the running demo app in headless Chrome from a JSON plan: navigate, click, type, eval, screenshot.
//   node cdp-shoot.mjs <plan.json> <outDir> [--base http://localhost:8787] [--port 9333]
// plan.json: [{"go":"/"}, {"wait":2000}, {"click":".home-suggest-card","text":"PowerShell"},
//             {"type":"textarea","value":"hello"}, {"key":"Enter"}, {"waitIdle":".agent-scroll","max":90},
//             {"eval":"document.title","label":"title"}, {"iframeSrc":true}, {"events":true}, {"shot":"home.png"}]
// "events": start recording Sigma postMessage events (printed at the end). "waitIdle": wait until the element's
// text stops changing (agent answers). Chrome path: CHROME env or the macOS default.
import { spawn } from 'node:child_process';
import { writeFileSync, readFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [planPath, outDir] = process.argv.slice(2);
const opt = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
if (!planPath || !outDir) { console.error('usage: node cdp-shoot.mjs <plan.json> <outDir> [--base URL] [--port N]'); process.exit(1); }
const BASE = opt('--base', 'http://localhost:8787'), PORT = Number(opt('--port', 9333));
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
mkdirSync(outDir, { recursive: true });
const plan = JSON.parse(readFileSync(planPath, 'utf8'));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${mkdtempSync(join(tmpdir(), 'cdp-'))}`, '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, id = 0; const pending = new Map();
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJs = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
try {
  for (let i = 0; i < 60 && !ws; i++) {
    try { const t = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((x) => x.type === 'page'); if (t) ws = new WebSocket(t.webSocketDebuggerUrl); } catch {}
    if (!ws) await sleep(250);
  }
  await new Promise((r) => ws.addEventListener('open', r));
  ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: outDir });
  for (const s of plan) {
    if (s.go) { await send('Page.navigate', { url: BASE + s.go }); await sleep(s.wait ?? 1800); continue; }
    if (s.wait) await sleep(s.wait);
    if (s.events) await evalJs(`window.__ev=[]; addEventListener('message', e => { if (String(e.origin).includes('sigmacomputing')) window.__ev.push(e.data && (e.data.type + (e.data.message ? ': ' + e.data.message : ''))); })`);
    if (s.click) console.log('click', s.click, s.text || '', await evalJs(`(() => { const els=[...document.querySelectorAll(${JSON.stringify(s.click)})]; const el=${s.text ? `els.find(e=>e.textContent.includes(${JSON.stringify(s.text)}))` : 'els[0]'}; if(!el) return 'missing'; el.click(); return 'ok'; })()`));
    if (s.type) await evalJs(`(() => { const el=document.querySelector(${JSON.stringify(s.type)}); const set=Object.getOwnPropertyDescriptor(el.__proto__,'value').set; set.call(el, ${JSON.stringify(s.value)}); el.dispatchEvent(new Event('input',{bubbles:true})); })()`);
    if (s.key) { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: s.key, code: s.key, windowsVirtualKeyCode: s.key === 'Enter' ? 13 : 0 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: s.key, code: s.key }); }
    if (s.waitIdle) {
      const t0 = Date.now(); let prev = '', stable = 0;
      for (let i = 0; i < (s.max ?? 90); i++) { await sleep(1000); const t = await evalJs(`document.querySelector(${JSON.stringify(s.waitIdle)})?.innerText || ''`); if (t.length > 50 && t === prev && !/Sleuthing|Thinking|Looking into it|Connecting|Working on it/.test(t)) { if (++stable >= 3) break; } else stable = 0; prev = t; }
      console.log('idle after', Math.round((Date.now() - t0) / 1000), 's');
    }
    if (s.eval) console.log(s.label || 'eval', await evalJs(s.eval));
    if (s.iframeSrc) console.log('iframe src', await evalJs(`[...document.querySelectorAll('iframe')].map(f => f.src.replace(/:jwt=[^&]+/, ':jwt=…')).join('\\n')`));
    if (s.scroll) await evalJs(`(() => { const el=document.querySelector(${JSON.stringify(s.scroll)}); if (el) el.scrollTop=el.scrollHeight; })()`);
    if (s.shot) { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(join(outDir, s.shot), Buffer.from(r.result.data, 'base64')); console.log('saved', s.shot); }
  }
  const ev = await evalJs(`JSON.stringify(window.__ev || [])`); if (ev && ev !== '[]') console.log('sigma events', ev);
} finally { try { ws?.close(); } catch {} chrome.kill(); }
