import { spawn, execSync } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUTPUT_DIR = path.resolve('screenshots', 'phase16');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const VIEWPORTS = [
  // Desktop
  { name: 'desktop_1920_feed', width: 1920, height: 1080, route: '/', mobile: false },
  { name: 'desktop_1440_feed', width: 1440, height: 900, route: '/', mobile: false },
  { name: 'desktop_1440_friends', width: 1440, height: 900, route: '/friends', mobile: false },
  { name: 'desktop_1440_groups', width: 1440, height: 900, route: '/groups', mobile: false },
  { name: 'desktop_1280_feed', width: 1280, height: 800, route: '/', mobile: false },
  { name: 'desktop_1024_feed', width: 1024, height: 768, route: '/', mobile: false },

  // Tablet
  { name: 'tablet_820_feed', width: 820, height: 1180, route: '/', mobile: true },
  { name: 'tablet_768_feed', width: 768, height: 1024, route: '/', mobile: true },

  // Mobile
  { name: 'mobile_430_feed', width: 430, height: 932, route: '/', mobile: true },
  { name: 'mobile_390_feed', width: 390, height: 844, route: '/', mobile: true },
  { name: 'mobile_390_friends', width: 390, height: 844, route: '/friends', mobile: true },
  { name: 'mobile_390_groups', width: 390, height: 844, route: '/groups', mobile: true },
  { name: 'mobile_390_settings', width: 390, height: 844, route: '/settings', mobile: true },
  { name: 'mobile_360_feed', width: 360, height: 800, route: '/', mobile: true },
  { name: 'mobile_320_feed', width: 320, height: 568, route: '/', mobile: true },

  // Landscape Phone
  { name: 'phone_landscape_feed', width: 844, height: 390, route: '/', mobile: true },

  // Public screen
  { name: 'login_mobile_390', width: 390, height: 844, route: '/login', mobile: true, unauth: true },
  { name: 'login_desktop_1440', width: 1440, height: 900, route: '/login', mobile: false, unauth: true },
];

const MOCK_SESSION = {
  access_token: 'mock-jwt-token-phase16-audit',
  refresh_token: 'mock-refresh-token-phase16',
  expires_at: Math.floor(Date.now() / 1000) + 86400,
  expires_in: 86400,
  token_type: 'bearer',
  user: {
    id: 'toon-audit-user-001',
    email: 'toonstar@maplepark.com',
    user_metadata: {
      username: 'toonstar',
      displayName: 'Toon Star ✨',
      characterBase: 1,
    },
    app_metadata: {},
    created_at: new Date().toISOString(),
  },
};

async function waitForServer(port, maxRetries = 40) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${port}/`, (res) => {
          if (res.statusCode >= 200 && res.statusCode < 400) resolve();
          else reject(new Error(`Status ${res.statusCode}`));
        });
        req.on('error', reject);
        req.setTimeout(1500, () => {
          req.destroy();
          reject(new Error('Timeout'));
        });
      });
      console.log(`Server responded on port ${port}!`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error('Server did not start in time.');
}

async function main() {
  if (!fs.existsSync(path.resolve('dist', 'index.html'))) {
    console.log('Building project before preview audit...');
    execSync('npm run build', { stdio: 'inherit' });
  } else {
    console.log('Using existing build in dist/...');
  }

  const port = 4173;
  console.log(`Starting vite preview on 127.0.0.1:${port}...`);
  const isWindows = process.platform === 'win32';
  const npxCmd = isWindows ? 'npx.cmd' : 'npx';
  const server = spawn(npxCmd, ['vite', 'preview', '--port', String(port), '--host', '127.0.0.1', '--strictPort'], {
    stdio: 'ignore',
    shell: true,
  });

  let chromeProc = null;

  try {
    await waitForServer(port);

    console.log('Launching Chrome with remote debugging on port 9222...');
    chromeProc = spawn(CHROME_PATH, [
      '--headless=new',
      '--disable-gpu',
      '--remote-debugging-port=9222',
      '--no-first-run',
      '--no-default-browser-check',
      `http://127.0.0.1:${port}/`
    ]);

    await new Promise((r) => setTimeout(r, 2000));

    const listRes = await fetch('http://127.0.0.1:9222/json');
    const tabs = await listRes.json();
    const wsUrl = tabs[0]?.webSocketDebuggerUrl;
    if (!wsUrl) throw new Error('No WebSocket debugging URL found');

    const ws = new globalThis.WebSocket(wsUrl);
    await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }));

    let msgId = 1;
    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        const handler = (evt) => {
          const res = JSON.parse(evt.data.toString());
          if (res.id === id) {
            ws.removeEventListener('message', handler);
            if (res.error) reject(new Error(res.error.message));
            else resolve(res.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await send('Page.enable');
    await send('DOM.enable');

    const auditResults = [];

    for (const vp of VIEWPORTS) {
      console.log(`\nEvaluating [${vp.name}] ${vp.width}x${vp.height} (mobile: ${vp.mobile})...`);

      // 1. Set emulation metrics
      await send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.mobile,
      });

      // 2. Set auth in localStorage if not unauth
      if (vp.unauth) {
        await send('Runtime.evaluate', {
          expression: `localStorage.clear(); sessionStorage.clear();`
        });
      } else {
        await send('Runtime.evaluate', {
          expression: `
            localStorage.setItem('toonchat_supabase_auth_session_v1', ${JSON.stringify(JSON.stringify(MOCK_SESSION))});
          `
        });
      }

      // 3. Navigate
      const url = `http://127.0.0.1:${port}${vp.route}`;
      await send('Page.navigate', { url });

      // Wait for page render / animations to settle
      await new Promise((r) => setTimeout(r, 1200));

      // 4. Verify horizontal overflow and scrollbars
      const checkRes = await send('Runtime.evaluate', {
        expression: `
          (() => {
            const docWidth = document.documentElement.clientWidth;
            const scrollWidth = document.documentElement.scrollWidth;
            const bodyScrollWidth = document.body.scrollWidth;
            const hasHorizontalScroll = scrollWidth > docWidth || bodyScrollWidth > docWidth;
            
            // Find any overflowing elements
            const overflowing = [];
            document.querySelectorAll('*').forEach(el => {
              const r = el.getBoundingClientRect();
              if (r.right > docWidth + 1 && r.width > 0) {
                overflowing.push({
                  tag: el.tagName,
                  id: el.id,
                  class: (el.className || '').toString().slice(0, 50),
                  width: Math.round(r.width),
                  right: Math.round(r.right),
                  overflowBy: Math.round(r.right - docWidth)
                });
              }
            });

            return {
              clientWidth: docWidth,
              scrollWidth,
              hasHorizontalScroll,
              overflowCount: overflowing.length,
              topOverflow: overflowing.slice(0, 3)
            };
          })()
        `,
        returnByValue: true
      });

      const metrics = checkRes?.result?.value;
      const status = metrics?.hasHorizontalScroll ? '⚠️ OVERFLOW' : '✓ CLEAN';
      console.log(`  Status: ${status} (client: ${metrics?.clientWidth}px, scroll: ${metrics?.scrollWidth}px)`);
      if (metrics?.overflowCount > 0) {
        console.warn(`  Found ${metrics.overflowCount} overflowing elements:`, metrics.topOverflow);
      }

      // 5. Capture screenshot
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      const outPath = path.join(OUTPUT_DIR, `${vp.name}.png`);
      fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
      const stats = fs.statSync(outPath);
      console.log(`  Saved screenshot: ${vp.name}.png (${Math.round(stats.size / 1024)} KB)`);

      auditResults.push({
        name: vp.name,
        width: vp.width,
        height: vp.height,
        route: vp.route,
        status,
        overflowCount: metrics?.overflowCount || 0,
        file: `${vp.name}.png`,
        sizeKB: Math.round(stats.size / 1024)
      });
    }

    console.log('\n=========================================');
    console.log('RESPONSIVE AUDIT SUMMARY');
    console.log('=========================================');
    console.table(auditResults);

    ws.close();
  } finally {
    if (chromeProc) {
      try {
        if (isWindows) execSync(`taskkill /pid ${chromeProc.pid} /T /F`, { stdio: 'ignore' });
        else chromeProc.kill();
      } catch {}
    }
    console.log('Terminating preview server...');
    if (isWindows) {
      try {
        execSync(`taskkill /pid ${server.pid} /T /F`, { stdio: 'ignore' });
      } catch {}
    } else {
      server.kill('SIGTERM');
    }
  }
}

main().catch((err) => {
  console.error('Audit script failed:', err);
  process.exit(1);
});
