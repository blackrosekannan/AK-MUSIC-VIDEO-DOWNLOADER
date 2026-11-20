// AK MUSIC & VIDEO DOWNLOADER - Windows desktop shell
const { app, BrowserWindow, dialog, shell } = require('electron');
const { spawn } = require('node:child_process');
const path = require('node:path');
const http = require('node:http');
const net = require('node:net');
const fs = require('node:fs');

let PORT = Number(process.env.PORT || 8787);
let BASE = `http://127.0.0.1:${PORT}`;
let backend = null;
let mainWindow = null;
let quitting = false;
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();
app.on('second-instance', () => {
  if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); }
});

function reserveLocalPort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const port = probe.address().port;
      probe.close((err) => err ? reject(err) : resolve(port));
    });
  });
}

function checkHealth() {
  return new Promise((resolve) => {
    const req = http.get(`${BASE}/api/health`, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try { resolve(res.statusCode === 200 && JSON.parse(body).ok === true); }
        catch { resolve(false); }
      });
    });
    req.setTimeout(1200, () => req.destroy());
    req.on('error', () => resolve(false));
  });
}

async function waitForBackend() {
  for (let i = 0; i < 40; i++) {
    if (await checkHealth()) return;
    if (backend && backend.exitCode !== null) throw new Error(`Backend stopped (exit ${backend.exitCode}).`);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Local media service did not start within 20 seconds on port ${PORT}. Check the application files and Windows security software.`);
}

async function startBackend() {
  PORT = await reserveLocalPort();
  BASE = `http://127.0.0.1:${PORT}`;
  const root = app.getAppPath();
  const dataDir = path.join(app.getPath('userData'), 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  // Child Node cannot reliably read JavaScript from inside app.asar.
  // electron-builder unpacks server.js and node_modules for the backend.
  const unpackedRoot = root.endsWith('app.asar') ? root + '.unpacked' : root;
  const serverFile = path.join(unpackedRoot, 'server.js');
  const publicDir = path.join(root, 'public');
  if (!fs.existsSync(serverFile)) throw new Error(`Backend entry point not found: ${serverFile}`);
  if (!fs.existsSync(publicDir)) throw new Error(`UI files not found: ${publicDir}`);
  backend = spawn(process.execPath, [serverFile], {
    // app.asar is a virtual archive, not a valid OS working directory.
    // Run the child from the real unpacked directory so Windows can spawn it.
    cwd: unpackedRoot,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', PORT: String(PORT), AK_DATA_DIR: dataDir, AK_PUBLIC_DIR: publicDir }
  });
  let logs = '';
  backend.stdout.on('data', (d) => logs = (logs + d.toString()).slice(-6000));
  backend.stderr.on('data', (d) => logs = (logs + d.toString()).slice(-6000));
  backend.on('error', (error) => {
    logs = (logs + `\nBackend spawn error: ${error.message}`).slice(-6000);
    if (!quitting) {
      dialog.showErrorBox('AK Downloader backend could not start', `${error.message}\n\n${logs.slice(-3500)}`);
      app.quit();
    }
  });
  backend.on('exit', (code) => {
    if (!quitting && mainWindow && !mainWindow.isDestroyed()) {
      dialog.showErrorBox('AK Downloader service stopped', `Exit code: ${code}\n\n${logs.slice(-3500)}`);
      app.quit();
    }
  });
  await waitForBackend();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 850, minWidth: 850, minHeight: 620,
    title: 'AK MUSIC & VIDEO DOWNLOADER',
    icon: path.join(app.getAppPath(), 'icon.ico'),
    backgroundColor: '#0b1220',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  // Keep the desktop shell on its own loopback origin. External links may
  // open in the user's browser, but must never navigate the application window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const target = new URL(url);
      if (target.protocol === 'https:' && !target.username && !target.password) {
        shell.openExternal(target.href);
      }
    } catch {}
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, targetUrl) => {
    try {
      const target = new URL(targetUrl);
      const local = new URL(BASE);
      if (target.origin !== local.origin) event.preventDefault();
    } catch {
      event.preventDefault();
    }
  });
  mainWindow.webContents.on('will-redirect', (event, targetUrl) => {
    try {
      const target = new URL(targetUrl);
      const local = new URL(BASE);
      if (target.origin !== local.origin) event.preventDefault();
    } catch {
      event.preventDefault();
    }
  });
  // The application does not require browser permissions such as camera,
  // microphone, geolocation, or notifications to perform local media tasks.
  mainWindow.webContents.session.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  mainWindow.webContents.session.setPermissionCheckHandler(() => false);
  mainWindow.loadURL(BASE);
}

app.whenReady().then(async () => {
  if (!gotLock) return;
  try { await startBackend(); createWindow(); }
  catch (error) {
    dialog.showErrorBox('AK Downloader could not start', `${error.message}\n\nInstall Node.js 22.13+ and retry. FFmpeg is bundled in the Windows installer build.`);
    app.quit();
  }
});

app.on('before-quit', () => {
  quitting = true;
  if (backend && backend.exitCode === null) backend.kill();
});
app.on('window-all-closed', () => app.quit());
