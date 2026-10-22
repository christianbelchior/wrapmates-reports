const { app, BrowserWindow, shell, Menu, session, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36';
const INTERNAL = /^https:\/\/([a-z0-9-]+\.)*(claude\.ai|anthropic\.com|claudeusercontent\.com|accounts\.google\.com|appleid\.apple\.com)\//i;

function isInternal(url) {
  return url.startsWith('file:') || url.startsWith('about:') || INTERNAL.test(url);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1320,
    height: 880,
    minWidth: 760,
    minHeight: 520,
    title: 'WrapMates Reports',
    backgroundColor: '#0E1634',
    icon: path.join(__dirname, 'build', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      webviewTag: true,
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  mainWin = win;
  win.webContents.on('did-finish-load', () => sendState(lastState));
}

// ---------- Updates ----------
let mainWin = null;
let lastState = { phase: 'idle' };
let blocking = false;
function sendState(s) {
  lastState = s;
  if (mainWin && !mainWin.isDestroyed()) mainWin.webContents.send('update-state', s);
}
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.on('checking-for-update', () => { if (!blocking) sendState({ phase: 'checking' }); });
autoUpdater.on('update-not-available', () => { blocking = false; sendState({ phase: 'current', version: app.getVersion() }); });
autoUpdater.on('update-available', (info) => { blocking = true; sendState({ phase: 'downloading', version: info.version, percent: 0 }); });
autoUpdater.on('download-progress', (p) => { sendState({ phase: 'downloading', version: lastState.version, percent: Math.round(p.percent || 0) }); });
autoUpdater.on('update-downloaded', (info) => { blocking = true; sendState({ phase: 'ready', version: info.version }); });
autoUpdater.on('error', (err) => {
  // A failed check while offline does not lock the app; a failed download of a known update does.
  sendState({ phase: blocking ? 'failed' : 'check-failed', version: lastState.version, message: String((err && err.message) || err).slice(0, 200) });
});
function checkNow() {
  if (!app.isPackaged) return Promise.resolve(null);
  return autoUpdater.checkForUpdates().catch(() => null);
}
ipcMain.handle('update-check', () => checkNow());
ipcMain.handle('update-install', () => { setImmediate(() => autoUpdater.quitAndInstall(true, true)); });
ipcMain.handle('app-version', () => app.getVersion());
ipcMain.handle('reset-profile', async (_e, who) => {
  if (!['mark', 'christian', 'alessandro'].includes(who)) return false;
  await session.fromPartition('persist:claude-' + who).clearStorageData();
  return true;
});

// ---------- What each person may open inside the app ----------
// Only the report pages and the Claude sign-in pages are allowed. Claude chats, history,
// new conversations, projects and settings are blocked for everyone.
const REPORTS = {
  mark: ['RGxBZmiPZEz6eTkfYpQGBu'],
  alessandro: ['Lo97ucJmpYc6D4Wab8qte5'],
  christian: ['RGxBZmiPZEz6eTkfYpQGBu', 'Vc4yAizv2Nytwv6GaqNsD6', 'Lo97ucJmpYc6D4Wab8qte5'],
};
const AUTH_PATHS = [/^\/login(\/|$|\?)/, /^\/logout(\/|$)/, /^\/magic-link/, /^\/api\//, /^\/oauth/, /^\/sso/, /^\/verify/, /^\/auth/, /^\/onboarding/];
function whoFor(contents) {
  for (const who of Object.keys(REPORTS)) {
    if (contents.session === session.fromPartition('persist:claude-' + who)) return who;
  }
  return null;
}
function allowedInWebview(url, who) {
  let u;
  try { u = new URL(url); } catch { return false; }
  if (u.protocol === 'about:') return true;
  if (u.hostname === 'accounts.google.com') return true; // the app shows "use email" instead
  if (u.hostname !== 'claude.ai') return /(^|\.)claudeusercontent\.com$/.test(u.hostname) || /(^|\.)anthropic\.com$/.test(u.hostname);
  const path = u.pathname;
  if (AUTH_PATHS.some((re) => re.test(path))) return true;
  const m = path.match(/^\/(?:code\/)?artifact\/([A-Za-z0-9_-]+)/);
  if (m) return who === 'christian' || (REPORTS[who] || []).includes(m[1]);
  if (who === 'christian' && /^\/code\/artifacts\/?$/.test(path)) return true; // "All reports" gallery
  return false; // chats, history, new conversation, projects, settings…
}
const homes = new Map();
const pendingSrc = [];
function goHome(contents) {
  const home = homes.get(contents.id);
  if (home) setImmediate(() => { if (!contents.isDestroyed()) contents.loadURL(home); });
}

app.on('web-contents-created', (_e, contents) => {
  contents.on('will-attach-webview', (_ev, webPreferences, params) => {
    delete webPreferences.preload;
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
    pendingSrc.push(params.src);
  });
  contents.on('did-attach-webview', (_ev, wc) => { homes.set(wc.id, pendingSrc.shift()); });

  const isWv = () => contents.getType() === 'webview';
  // Links to Gmail, WhatsApp, phone numbers etc. open in the normal browser / apps.
  contents.setWindowOpenHandler(({ url }) => {
    if (isWv()) {
      const who = whoFor(contents);
      if (allowedInWebview(url, who)) contents.loadURL(url);
      else if (!/^https:\/\/([a-z0-9-]+\.)*claude\.ai\//i.test(url)) shell.openExternal(url);
      return { action: 'deny' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });
  contents.on('will-navigate', (e, url) => {
    if (isWv()) {
      if (!allowedInWebview(url, whoFor(contents))) {
        e.preventDefault();
        if (!/^https:\/\/([a-z0-9-]+\.)*claude\.ai\//i.test(url) && !isInternal(url)) shell.openExternal(url);
        else goHome(contents);
      }
      return;
    }
    if (!url.startsWith('file:')) { e.preventDefault(); shell.openExternal(url); }
  });
  {
    contents.on('will-redirect', (e, url, _inPlace, isMainFrame) => {
      if (isWv() && isMainFrame && !allowedInWebview(url, whoFor(contents))) { e.preventDefault(); goHome(contents); }
    });
    contents.on('did-navigate-in-page', (_e2, url, isMainFrame) => {
      if (isWv() && isMainFrame && !allowedInWebview(url, whoFor(contents))) goHome(contents);
    });
    contents.on('did-navigate', (_e3, url) => {
      if (isWv() && !allowedInWebview(url, whoFor(contents))) goHome(contents);
    });
  }
});

app.whenReady().then(() => {
  for (const who of ['mark', 'christian', 'alessandro']) session.fromPartition('persist:claude-' + who).setUserAgent(CHROME_UA);
  createWindow();
  checkNow();
  setInterval(checkNow, 30 * 60 * 1000);
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
