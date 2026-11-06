import { spawn, execSync } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const port = 4173;

async function waitForServer(maxRetries = 30) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${port}/`, (res) => {
          if (res.statusCode >= 200 && res.statusCode < 400) resolve();
          else reject(new Error(`Status ${res.statusCode}`));
        });
        req.on('error', reject);
        req.setTimeout(1000, () => {
          req.destroy();
          reject(new Error('Timeout'));
        });
      });
      console.log(`Preview server ready on 127.0.0.1:${port}!`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  throw new Error('Server did not start in time.');
}

async function main() {
  const isWindows = process.platform === 'win32';
  const npxCmd = isWindows ? 'npx.cmd' : 'npx';

  console.log('Starting preview server...');
  const server = spawn(npxCmd, ['vite', 'preview', '--port', String(port), '--host', '127.0.0.1', '--strictPort'], {
    stdio: 'ignore',
    shell: true,
  });

  try {
    await waitForServer();

    const reportPath = path.resolve('lighthouse_report.json');
    const targetUrl = `http://127.0.0.1:${port}/login`;
    console.log(`Running Lighthouse audit on ${targetUrl}...`);

    const lhArgs = [
      'lighthouse',
      targetUrl,
      '--form-factor=mobile',
      '--screenEmulation.mobile',
      '--screenEmulation.width=390',
      '--screenEmulation.height=844',
      '--screenEmulation.deviceScaleFactor=2',
      '--output=json',
      `--output-path=${reportPath}`,
      '--chrome-flags="--headless=new --disable-gpu --no-sandbox"',
      '--only-categories=performance,accessibility,best-practices,seo',
      '--quiet',
    ];

    execSync(`${npxCmd} ${lhArgs.join(' ')}`, { stdio: 'inherit' });

    if (fs.existsSync(reportPath)) {
      const data = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
      const categories = data.categories;

      console.log('\n=========================================');
      console.log('LIGHTHOUSE MOBILE AUDIT RESULTS');
      console.log('=========================================');
      const scores = {
        Performance: Math.round((categories.performance?.score || 0) * 100),
        Accessibility: Math.round((categories.accessibility?.score || 0) * 100),
        'Best Practices': Math.round((categories['best-practices']?.score || 0) * 100),
        SEO: Math.round((categories.seo?.score || 0) * 100),
      };
      console.table(scores);

      console.log('\nCore Web Vitals & Metrics:');
      const audits = data.audits;
      console.log(`  First Contentful Paint (FCP): ${audits['first-contentful-paint']?.displayValue}`);
      console.log(`  Largest Contentful Paint (LCP): ${audits['largest-contentful-paint']?.displayValue}`);
      console.log(`  Cumulative Layout Shift (CLS): ${audits['cumulative-layout-shift']?.displayValue}`);
      console.log(`  Total Blocking Time (TBT): ${audits['total-blocking-time']?.displayValue}`);
      console.log(`  Speed Index: ${audits['speed-index']?.displayValue}`);
    } else {
      console.error('Lighthouse report file not generated.');
    }
  } finally {
    console.log('Stopping preview server...');
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
  console.error('Audit failed:', err);
  process.exit(1);
});

