const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

const APP_URL = process.env.DAI_WEB_URL || 'https://ashraftefa97-beep.github.io/DAI-development/';
const ALLOWED_ORIGIN = new URL(APP_URL).origin;
let mainWindow = null;

function senderAllowed(event) {
  try {
    const url = event.senderFrame?.url || event.sender?.getURL?.() || '';
    return new URL(url).origin === ALLOWED_ORIGIN;
  } catch {
    return false;
  }
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
  const query = String(target || '').trim().slice(0, 120);
  if (!query) return { ok: false, message: 'اسم البرنامج ناقص.' };
  const script = [
    "$ErrorActionPreference='Stop'",
    "$q=$env:DAI_TARGET",
    "$app=Get-StartApps | Where-Object { $_.Name -like ('*'+$q+'*') } | Select-Object -First 1",
    "if($app){",
    "  Start-Process explorer.exe -ArgumentList ('shell:AppsFolder\\'+$app.AppID)",
    "  Write-Output ('فتحت '+$app.Name)",
    "  exit 0",
    "}",
    "try { Start-Process $q; Write-Output ('فتحت '+$q); exit 0 } catch {}",
    "Write-Error ('ملقتش برنامج باسم '+$q)",
    "exit 2"
  ].join('\n');
  return ps(script, { DAI_TARGET: query });
}

async function focusApp(target) {
  const query = String(target || '').trim().slice(0, 120);
  if (!query) return { ok: false, message: 'اسم البرنامج ناقص.' };
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
  const query = String(target || '').trim().slice(0, 120);
  if (!query) return { ok: false, message: 'اسم البرنامج ناقص.' };
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
    if (url.startsWith(APP_URL)) return { action: 'allow' };
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    try {
      const origin = new URL(url).origin;
      const supabaseOrigin = 'https://buenonmbyudjhpedmoqk.supabase.co';
      if (origin !== ALLOWED_ORIGIN && origin !== supabaseOrigin) {
        event.preventDefault();
        shell.openExternal(url);
      }
    } catch {
      event.preventDefault();
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  ipcMain.handle('dai:capabilities', (event) => {
    if (!senderAllowed(event)) return { ok: false };
    return {
      ok: true,
      platform: process.platform,
      actions: ['openApp','focusApp','closeApp','media','shortcut','openExternal','pickAndOpenFile'],
    };
  });

  ipcMain.handle('dai:execute', async (event, action) => {
    if (!senderAllowed(event)) return { ok: false, message: 'غير مسموح.' };
    const type = String(action?.type || '');

    if (type === 'openApp') return openApp(action.target);
    if (type === 'focusApp') return focusApp(action.target);
    if (type === 'closeApp') return closeApp(action.target);
    if (type === 'media') return mediaKey(String(action.key || ''));
    if (type === 'shortcut') return sendShortcut(String(action.key || ''));

    if (type === 'openExternal') {
      try {
        const url = new URL(String(action.url || ''));
        if (!['https:', 'http:'].includes(url.protocol)) {
          return { ok: false, message: 'الرابط غير مسموح.' };
        }
        await shell.openExternal(url.toString());
        return { ok: true, message: 'فتحت الرابط.' };
      } catch {
        return { ok: false, message: 'الرابط غير صحيح.' };
      }
    }

    return { ok: false, message: 'الأمر المحلي غير معروف.' };
  });

  ipcMain.handle('dai:pick-file', async (event) => {
    if (!senderAllowed(event) || !mainWindow) return { ok: false, message: 'غير مسموح.' };
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'اختار ملف تفتحه ضي',
      properties: ['openFile'],
      filters: [
        { name: 'Media', extensions: ['mp4','mkv','mov','avi','mp3','wav','m4a','flac','aac'] },
        { name: 'All files', extensions: ['*'] },
      ],
    });
    if (result.canceled || !result.filePaths[0]) return { ok: false, canceled: true };
    const error = await shell.openPath(result.filePaths[0]);
    if (error) return { ok: false, message: error };
    return { ok: true, message: 'فتحت الملف.' };
  });

  ipcMain.handle('dai:get-startup', (event) => {
    if (!senderAllowed(event)) return false;
    return app.getLoginItemSettings().openAtLogin;
  });

  ipcMain.handle('dai:set-startup', (event, enabled) => {
    if (!senderAllowed(event)) return false;
    app.setLoginItemSettings({ openAtLogin: Boolean(enabled) });
    return app.getLoginItemSettings().openAtLogin;
  });

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
