const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');

test('Google login IPC delivers only the session to the main DAI frame without app navigation', async () => {
  const root = path.resolve(__dirname, '..');
  const appUrl = 'https://ashraftefa97-beep.github.io/DAI-development/';
  const handlers = new Map();
  const windows = [];
  const app = Object.assign(new EventEmitter(), { requestSingleInstanceLock: () => true, whenReady: () => Promise.resolve(), quit: () => {} });
  class Window extends EventEmitter {
    constructor() {
      super(); windows.push(this); this.loads = [];
      this.webContents = Object.assign(new EventEmitter(), {
        mainFrame: { url: appUrl }, getURL: () => appUrl,
        setWindowOpenHandler: () => {},
        session: { setPermissionRequestHandler: () => {} },
      });
    }
    isDestroyed() { return false; }
    isMinimized() { return false; }
    show() { this.shown = true; }
    focus() { this.focused = true; }
    loadURL(url) { this.loads.push(url); return Promise.resolve(); }
  }
  const electron = { app, BrowserWindow: Window, ipcMain: { handle: (name, handler) => handlers.set(name, handler) }, shell: { openExternal: async () => {} }, dialog: { showMessageBox: async () => { throw new Error('Direct IPC must not show a legacy reload dialog'); } } };
  let starts = 0;
  let resolveSession;
  const result = new Promise(resolve => { resolveSession = resolve; });
  const oauth = { ...require('../desktop-oauth.cjs'), startGoogleOAuth: async () => { starts++; return { result, cancel: () => {} }; } };
  const mockRequire = name => name === 'electron' ? electron : name === './desktop-oauth.cjs' ? oauth : name === 'node:fs' ? { readFileSync: () => Buffer.from('fixture-font') } : require(name);
  vm.runInNewContext('(function(require,module,__dirname){' + fs.readFileSync(path.join(root, 'main.cjs'), 'utf8') + '\n})', { process, URL, setTimeout, clearTimeout, setInterval, clearInterval, console })(mockRequire, { exports: {} }, root);
  await new Promise(resolve => setImmediate(resolve));
  const win = windows[0];
  const handler = handlers.get('dai:google-login');
  assert.equal(typeof handler, 'function');
  assert.deepEqual(JSON.parse(JSON.stringify(await handler({ sender: win.webContents, senderFrame: { url: appUrl } }))), { ok: false, code: 'oauth_not_allowed' });
  assert.equal(starts, 0, 'same-origin child frames cannot request session delivery');
  const event = { sender: win.webContents, senderFrame: win.webContents.mainFrame };
  const pending = handler(event);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal((await handler(event)).code, 'oauth_busy', 'duplicate attempts do not open a second flow');
  resolveSession({ access_token: 'fixture-access', refresh_token: 'fixture-refresh', expires_in: 3600, token_type: 'bearer', provider_token: 'private-provider-token', user: { email: 'fixture@example.invalid' } });
  assert.deepEqual(JSON.parse(JSON.stringify(await pending)), { ok: true, session: { access_token: 'fixture-access', refresh_token: 'fixture-refresh' } });
  assert.deepEqual(win.loads, [appUrl], 'only initial app load occurs');
  assert.equal(win.shown && win.focused, true);
});
