// scripts/verify-world.js
// Automated verification script using Edge DevTools Protocol over native WebSocket in Node.js

import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const USER_DATA_DIR = path.join(os.tmpdir(), 'edge-toonchat-test');
const DEBUG_PORT = 9222;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('Starting Edge in headless mode with debugging port ' + DEBUG_PORT + '...');
  
  const edgeProcess = spawn(
    EDGE_PATH,
    [
      '--headless=new',
      `--remote-debugging-port=${DEBUG_PORT}`,
      `--user-data-dir=${USER_DATA_DIR}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--hide-scrollbars',
      'http://localhost:3001/world?enter=true',
    ],
    { stdio: 'ignore' }
  );

  let targets = null;
  for (let i = 0; i < 20; i++) {
    await delay(500);
    try {
      const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`);
      if (res.ok) {
        targets = await res.json();
        break;
      }
    } catch {
      // wait
    }
  }

  if (!targets || targets.length === 0) {
    console.error('Could not connect to Edge debugger');
    edgeProcess.kill();
    process.exit(1);
  }

  const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
  console.log('Connected to target:', pageTarget.title, pageTarget.url);

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

  await new Promise((resolve) => (ws.onopen = resolve));
  console.log('WebSocket connection opened to CDP');

  let idCounter = 1;
  const pendingRequests = new Map();

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pendingRequests.has(msg.id)) {
      const { resolve, reject } = pendingRequests.get(msg.id);
      pendingRequests.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
  };

  function sendCommand(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      pendingRequests.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  // Enable needed domains
  await sendCommand('Page.enable');
  await sendCommand('Runtime.enable');
  await sendCommand('Log.enable');

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Runtime.consoleAPICalled') {
      console.log('BROWSER CONSOLE:', msg.params.type, msg.params.args.map((a) => a.value || a.description));
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      console.error('BROWSER EXCEPTION:', msg.params.exceptionDetails);
    }
    if (msg.id && pendingRequests.has(msg.id)) {
      const { resolve, reject } = pendingRequests.get(msg.id);
      pendingRequests.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
  };

  console.log('Navigating to http://localhost:3001/world?enter=true...');
  await sendCommand('Page.navigate', { url: 'http://localhost:3001/world?enter=true' });

  // Wait until WorldCanvas is mounted
  console.log('Waiting for React root and WorldCanvas to mount...');
  for (let i = 0; i < 30; i++) {
    const check = await sendCommand('Runtime.evaluate', {
      expression: 'Boolean(document.querySelector("[role=\'region\']"))',
      returnByValue: true,
    });
    if (check.result?.value === true) {
      console.log('WorldCanvas successfully mounted!');
      break;
    }
    await delay(500);
  }

  // Let animation loop run for 3 seconds to gather rich performance metrics
  console.log('Running animation loop to measure frame timing...');
  await delay(3000);

  // 1. Check Console Errors
  const consoleEval = await sendCommand('Runtime.evaluate', {
    expression: 'window.__errors || []',
    returnByValue: true,
  });
  console.log('Console errors check:', consoleEval.result?.value || []);

  // 2. Query Measured Performance Metrics from window.__TOONCHAT_WORLD_PERF__
  const perfResult = await sendCommand('Runtime.evaluate', {
    expression: 'window.__TOONCHAT_WORLD_PERF__ ? window.__TOONCHAT_WORLD_PERF__.getMetrics() : null',
    returnByValue: true,
  });

  console.log('=== REAL MEASURED WORLD PERFORMANCE ===');
  console.log(JSON.stringify(perfResult.result?.value, null, 2));

  // 3. Test walking: click path at x: 450, y: 400
  console.log('Simulating mouse click to walk on cobblestone path...');
  await sendCommand('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: 450,
    y: 400,
    button: 'left',
    clickCount: 1,
  });
  await sendCommand('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: 450,
    y: 400,
    button: 'left',
    clickCount: 1,
  });

  await delay(1200);

  // 4. Capture responsive screenshots across the 5 widths
  const viewports = [
    { width: 1440, height: 900, name: 'screenshot_1440.png' },
    { width: 1024, height: 768, name: 'screenshot_1024.png' },
    { width: 768, height: 1024, name: 'screenshot_768.png' },
    { width: 390, height: 844, name: 'screenshot_390.png' },
    { width: 360, height: 740, name: 'screenshot_360.png' },
  ];

  const screenshotsDir = path.join(process.cwd(), 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  for (const vp of viewports) {
    console.log(`Setting viewport: ${vp.width}x${vp.height}...`);
    await sendCommand('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: vp.width < 768,
    });
    await delay(1200);

    const shot = await sendCommand('Page.captureScreenshot', { format: 'png' });
    const filePath = path.join(screenshotsDir, vp.name);
    fs.writeFileSync(filePath, Buffer.from(shot.data, 'base64'));
    console.log(`Saved screenshot: ${filePath} (${fs.statSync(filePath).size} bytes)`);
  }

  // 5. Test Place Switch to Cozy Cafe
  console.log('Testing place switch to Cozy Cafe...');
  await sendCommand('Runtime.evaluate', {
    expression: 'window.location.href = "http://localhost:3001/world?place=cafe&enter=true"',
  });
  await delay(3000);

  const cafeShot = await sendCommand('Page.captureScreenshot', { format: 'png' });
  const cafePath = path.join(screenshotsDir, 'screenshot_cafe.png');
  fs.writeFileSync(cafePath, Buffer.from(cafeShot.data, 'base64'));
  console.log(`Saved cafe screenshot: ${cafePath}`);

  // 6. Test Place Switch to Town Plaza
  console.log('Testing place switch to Town Plaza...');
  await sendCommand('Runtime.evaluate', {
    expression: 'window.location.href = "http://localhost:3001/world?place=plaza&enter=true"',
  });
  await delay(3000);

  const plazaShot = await sendCommand('Page.captureScreenshot', { format: 'png' });
  const plazaPath = path.join(screenshotsDir, 'screenshot_plaza.png');
  fs.writeFileSync(plazaPath, Buffer.from(plazaShot.data, 'base64'));
  console.log(`Saved plaza screenshot: ${plazaPath}`);

  // 7. Test World Landing Screen
  console.log('Testing World Landing Screen...');
  await sendCommand('Runtime.evaluate', {
    expression: 'window.location.href = "http://localhost:3001/world"',
  });
  await delay(2500);

  const landingShot = await sendCommand('Page.captureScreenshot', { format: 'png' });
  const landingPath = path.join(screenshotsDir, 'screenshot_landing.png');
  fs.writeFileSync(landingPath, Buffer.from(landingShot.data, 'base64'));
  console.log(`Saved landing screenshot: ${landingPath}`);

  ws.close();
  edgeProcess.kill();
  console.log('All automated browser tests completed successfully!');
}

main().catch((err) => {
  console.error('Test script error:', err);
  process.exit(1);
});
