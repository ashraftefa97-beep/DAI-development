const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

const APP_URL = process.env.DAI_WEB_URL || 'https://ashraftefa97-beep.github.io/DAI-development/';
const ALLOWED_ORIGIN = new URL(APP_URL).origin;
const SUPABASE_ORIGIN = 'https://buenonmbyudjhpedmoqk.supabase.co';
const SUPABASE_PUBLISHABLE_KEY =
  process.env.DAI_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_uo9ZnHKtD-aDpE_zSJTaJg_inIzQ_Gt';
let mainWindow = null;
let desktopEntitlement = {
  token: '',
  plan: 'standard',
  owner: false,
  checkedAt: 0,
};

const actionWindows = new Map();
function actionAllowed(event, max = 30) {
  const key = String(event.sender?.id || 'renderer');
  const now = Date.now();
  const current = actionWindows.get(key) || { start: now, count: 0 };
  if (now - current.start >= 10000) {
    current.start = now;
    current.count = 0;
  }
  current.count++;
  actionWindows.set(key, current);
  return current.count <= max;
}

function safeProgramQuery(value) {
  const query = String(value || '').trim().slice(0, 80);
  if (!query) return '';
  if (/[\\/:*"<>|;&`$\r\n]/.test(query)) return '';
  if (/^(?:https?|file|shell|ms-settings|javascript):/i.test(query)) return '';
  return query;
}

function safeExternalUrl(value) {
  try {
    const url = new URL(String(value || ''));
    if (!['https:', 'http:'].includes(url.protocol)) return '';
    if (url.username || url.password) return '';
    return url.toString();
  } catch {
    return '';
  }
}

const trustedExternalHosts = new Set([
  'youtube.com',
  'www.youtube.com',
  'google.com',
  'www.google.com',
  'mail.google.com',
  'web.whatsapp.com',
]);

function externalHostTrusted(value) {
  try {
    return trustedExternalHosts.has(new URL(value).hostname.toLowerCase());
  } catch {
    return false;
  }
}

function senderAllowed(event) {
  try {
    const url = event.senderFrame?.url || event.sender?.getURL?.() || '';
    return new URL(url).origin === ALLOWED_ORIGIN;
  } catch {
    return false;
  }
}

async function verifyEntitlement(token) {
  const clean = String(token || '').trim();
  if (clean.length < 60) {
    desktopEntitlement = { token: '', plan: 'standard', owner: false, checkedAt: Date.now() };
    return { ok: false, plan: 'standard', owner: false, message: 'جلسة الحساب غير صالحة.' };
  }

  try {
    const response = await fetch(SUPABASE_ORIGIN + '/functions/v1/entitlement', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + clean,
        apikey: SUPABASE_PUBLISHABLE_KEY,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      desktopEntitlement = { token: '', plan: 'standard', owner: false, checkedAt: Date.now() };
      return { ok: false, plan: 'standard', owner: false, message: 'تعذر التحقق من خطة الحساب.' };
    }

    const plan = payload?.plan === 'professional' ? 'professional' : 'standard';
    const owner = Boolean(payload?.owner);
    desktopEntitlement = { token: clean, plan, owner, checkedAt: Date.now() };
    return { ok: true, plan, owner };
  } catch {
    return {
      ok: false,
      plan: desktopEntitlement.plan,
      owner: desktopEntitlement.owner,
      message: 'تعذر الاتصال بخدمة التحقق من الخطة.',
    };
  }
}

async function requireProfessional(event) {
  if (!senderAllowed(event)) return { ok: false, message: 'غير مسموح.' };
  if (!desktopEntitlement.token) {
    return { ok: false, message: 'الميزة دي محتاجة DAI Professional وتسجيل دخول صالح.' };
  }

  if (Date.now() - desktopEntitlement.checkedAt > 5 * 60 * 1000) {
    const refreshed = await verifyEntitlement(desktopEntitlement.token);
    if (!refreshed.ok) return { ok: false, message: refreshed.message || 'تعذر التحقق من الخطة.' };
  }

  if (desktopEntitlement.plan !== 'professional') {
    return { ok: false, message: 'الميزة دي متاحة في DAI Professional فقط.' };
  }
  return { ok: true };
}

function ps(script, env = {}) {
  return new Promise((resolve) => {
    const child = spawn(
      'powershell.exe',
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { windowsHide: true, env: { ...process.env, ...env } },
    );
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += String(chunk); });
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    child.on('error', (error) => resolve({ ok: false, message: error.message }));
    child.on('close', (code) => resolve({
      ok: code === 0,
      message: (stdout || stderr || ('exit ' + code)).trim(),
    }));
  });
}

async function openApp(target) {
  const query = safeProgramQuery(target);
  if (!query) return { ok: false, message: 'اسم البرنامج غير صالح أو غير مسموح.' };
  const script = [
    "$ErrorActionPreference='Stop'",
    "$q=$env:DAI_TARGET",
    "$app=Get-StartApps | Where-Object { $_.Name -like ('*'+$q+'*') } | Select-Object -First 1",
    "if($app){",
    "  Start-Process explorer.exe -ArgumentList ('shell:AppsFolder\\'+$app.AppID)",
    "  Write-Output ('فتحت '+$app.Name)",
    "  exit 0",
    "}",
    "Write-Error ('ملقتش برنامج مسجل باسم '+$q)",
    "exit 2"
  ].join('\n');
  return ps(script, { DAI_TARGET: query });
}

async function focusApp(target) {
  const query = safeProgramQuery(target);
  if (!query) return { ok: false, message: 'اسم البرنامج غير صالح أو غير مسموح.' };
  const script = [
    "$ErrorActionPreference='Stop'",
    "$q=$env:DAI_TARGET",
    "$p=Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and ($_.ProcessName -like ('*'+$q+'*') -or $_.MainWindowTitle -like ('*'+$q+'*')) } | Select-Object -First 1",
    "if(!$p){ Write-Error ('مش لاقية نافذة مفتوحة باسم '+$q); exit 2 }",
    "$w=New-Object -ComObject WScript.Shell",
    "[void]$w.AppActivate($p.Id)",
    "Write-Output ('ركزت على '+$p.ProcessName)"
  ].join('\n');
  return ps(script, { DAI_TARGET: query });
}

async function closeApp(target) {
  const query = safeProgramQuery(target);
  if (!query) return { ok: false, message: 'اسم البرنامج غير صالح أو غير مسموح.' };
  const script = [
    "$ErrorActionPreference='Stop'",
    "$q=$env:DAI_TARGET",
    "$p=Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and ($_.ProcessName -like ('*'+$q+'*') -or $_.MainWindowTitle -like ('*'+$q+'*')) } | Select-Object -First 1",
    "if(!$p){ Write-Error ('مش لاقية برنامج مفتوح باسم '+$q); exit 2 }",
    "if(!$p.CloseMainWindow()){ Write-Error 'البرنامج رفض الإغلاق العادي'; exit 3 }",
    "Write-Output ('قفلت '+$p.ProcessName)"
  ].join('\n');
  return ps(script, { DAI_TARGET: query });
}

const mediaCodes = {
  next: 0xB0,
  previous: 0xB1,
  stop: 0xB2,
  playPause: 0xB3,
  mute: 0xAD,
  volumeDown: 0xAE,
  volumeUp: 0xAF,
};

async function mediaKey(key) {
  const code = mediaCodes[key];
  if (!code) return { ok: false, message: 'أمر الميديا غير معروف.' };
  const script = [
    "Add-Type @'",
    "using System;",
    "using System.Runtime.InteropServices;",
    "public class DAIKeys {",
    "  [DllImport(\"user32.dll\")]",
    "  public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);",
    "}",
    "'@",
    "[DAIKeys]::keybd_event(" + code + ",0,0,[UIntPtr]::Zero)",
    "Start-Sleep -Milliseconds 30",
    "[DAIKeys]::keybd_event(" + code + ",0,2,[UIntPtr]::Zero)",
    "Write-Output 'تم'"
  ].join('\n');
  return ps(script);
}

const shortcuts = {
  space: ' ',
  enter: '{ENTER}',
  escape: '{ESC}',
  left: '{LEFT}',
  right: '{RIGHT}',
  up: '{UP}',
  down: '{DOWN}',
  pageUp: '{PGUP}',
  pageDown: '{PGDN}',
  home: '{HOME}',
  end: '{END}',
  fullscreen: '{F11}',
  find: '^f',
  address: '^l',
};

async function sendShortcut(name) {
  const keys = shortcuts[name];
  if (!keys) return { ok: false, message: 'الاختصار ده مش مسموح.' };
  const script = [
    "$w=New-Object -ComObject WScript.Shell",
    "$w.SendKeys($env:DAI_KEYS)",
    "Write-Output 'تم'"
  ].join('\n');
  return ps(script, { DAI_KEYS: keys });
}

async function listRunningApps() {
  const script = [
    "$ErrorActionPreference='Stop'",
    "$items=Get-Process | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 30 ProcessName,MainWindowTitle",
    "$items | ConvertTo-Json -Compress"
  ].join('\n');
  const result = await ps(script);
  if (!result.ok) return { ok: false, message: 'تعذر قراءة البرامج المفتوحة.' };
  try {
    const parsed = JSON.parse(result.message || '[]');
    const rows = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
    const apps = rows.map((row) => ({
      name: String(row?.ProcessName || '').slice(0, 80),
      title: String(row?.MainWindowTitle || '').slice(0, 180),
    })).filter((row) => row.name);
    return { ok: true, apps };
  } catch {
    return { ok: true, apps: [] };
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 880,
    minHeight: 620,
    backgroundColor: '#101321',
    title: 'DAI AI',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.loadURL(APP_URL);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      if (new URL(url).origin === ALLOWED_ORIGIN) return { action: 'allow' };
    } catch {}
    const safeUrl = safeExternalUrl(url);
    if (safeUrl) void shell.openExternal(safeUrl);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    try {
      const origin = new URL(url).origin;
      if (origin !== ALLOWED_ORIGIN && origin !== SUPABASE_ORIGIN) {
        event.preventDefault();
        const safeUrl = safeExternalUrl(url);
        if (safeUrl) void shell.openExternal(safeUrl);
      }
    } catch {
      event.preventDefault();
    }
  });

  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    let allowed = false;
    try {
      allowed =
        new URL(webContents.getURL()).origin === ALLOWED_ORIGIN &&
        permission === 'media';
    } catch {}
    callback(allowed);
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  ipcMain.handle('dai:capabilities', (event) => {
    if (!senderAllowed(event)) return { ok: false };
    const professional = desktopEntitlement.plan === 'professional';
    return {
      ok: true,
      platform: process.platform,
      plan: desktopEntitlement.plan,
      owner: desktopEntitlement.owner,
      requiresProfessional: true,
      actions: professional
        ? ['openApp','focusApp','closeApp','media','shortcut','openExternal','pickAndOpenFile','startup','runningApps']
        : [],
    };
  });

  ipcMain.handle('dai:set-session', async (event, token) => {
    if (!senderAllowed(event)) return { ok: false, plan: 'standard', message: 'غير مسموح.' };
    return verifyEntitlement(token);
  });

  ipcMain.handle('dai:clear-session', (event) => {
    if (!senderAllowed(event)) return false;
    desktopEntitlement = { token: '', plan: 'standard', owner: false, checkedAt: Date.now() };
    return true;
  });

  ipcMain.handle('dai:execute', async (event, action) => {
    const access = await requireProfessional(event);
    if (!access.ok) return access;
    if (!actionAllowed(event)) return { ok: false, message: 'طلبات محلية كتير بسرعة. حاول بعد لحظة.' };
    const type = String(action?.type || '');

    if (type === 'openApp') return openApp(action.target);
    if (type === 'focusApp') return focusApp(action.target);
    if (type === 'closeApp') {
      const target = safeProgramQuery(action.target);
      if (!target || !mainWindow) return { ok: false, message: 'اسم البرنامج غير صالح.' };
      const answer = await dialog.showMessageBox(mainWindow, {
        type: 'warning',
        title: 'تأكيد الإغلاق',
        message: 'ضي هتقفل برنامج ' + target,
        detail: 'الإغلاق ممكن يوقف شغل غير محفوظ داخل البرنامج.',
        buttons: ['إلغاء', 'إغلاق البرنامج'],
        defaultId: 0,
        cancelId: 0,
        noLink: true,
      });
      if (answer.response !== 1) return { ok: false, message: 'المستخدم ألغى إغلاق البرنامج.' };
      return closeApp(target);
    }
    if (type === 'media') return mediaKey(String(action.key || ''));
    if (type === 'shortcut') return sendShortcut(String(action.key || ''));

    if (type === 'openExternal') {
      const url = safeExternalUrl(action.url);
      if (!url) return { ok: false, message: 'الرابط غير صحيح أو غير مسموح.' };

      if (!externalHostTrusted(url)) {
        if (!mainWindow) return { ok: false, message: 'تعذر تأكيد فتح الرابط.' };
        const parsed = new URL(url);
        const answer = await dialog.showMessageBox(mainWindow, {
          type: 'question',
          title: 'تأكيد فتح الرابط',
          message: 'ضي عايزة تفتح موقع خارجي',
          detail: parsed.hostname + '\n\nافتح الموقع ده؟',
          buttons: ['إلغاء', 'فتح الموقع'],
          defaultId: 0,
          cancelId: 0,
          noLink: true,
        });
        if (answer.response !== 1) return { ok: false, message: 'المستخدم ألغى فتح الرابط.' };
      }

      await shell.openExternal(url);
      return { ok: true, message: 'فتحت الرابط.' };
    }

    return { ok: false, message: 'الأمر المحلي غير معروف.' };
  });

  ipcMain.handle('dai:pick-file', async (event) => {
    const access = await requireProfessional(event);
    if (!access.ok || !mainWindow) return access.ok ? { ok: false, message: 'تعذر فتح نافذة الملفات.' } : access;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'اختار ملف تفتحه ضي',
      properties: ['openFile'],
      filters: [
        { name: 'Media', extensions: ['mp4','mkv','mov','avi','mp3','wav','m4a','flac','aac'] },
        { name: 'Documents and images', extensions: ['pdf','txt','png','jpg','jpeg','webp'] },
      ],
    });
    if (result.canceled || !result.filePaths[0]) return { ok: false, canceled: true };
    const error = await shell.openPath(result.filePaths[0]);
    if (error) return { ok: false, message: error };
    return { ok: true, message: 'فتحت الملف.' };
  });

  ipcMain.handle('dai:get-startup', async (event) => {
    const access = await requireProfessional(event);
    if (!access.ok) return false;
    return app.getLoginItemSettings().openAtLogin;
  });

  ipcMain.handle('dai:set-startup', async (event, enabled) => {
    const access = await requireProfessional(event);
    if (!access.ok) return false;
    app.setLoginItemSettings({ openAtLogin: Boolean(enabled) });
    return app.getLoginItemSettings().openAtLogin;
  });

  ipcMain.handle('dai:running-apps', async (event) => {
    const access = await requireProfessional(event);
    if (!access.ok) return access;
    return listRunningApps();
  });

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
