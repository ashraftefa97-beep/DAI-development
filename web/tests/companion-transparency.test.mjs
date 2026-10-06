import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, ResourceLoader } from 'jsdom';

const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
const modeScript = readFileSync(new URL('../public/window-mode.js', import.meta.url), 'utf8');
const page = readFileSync(new URL('../github.html', import.meta.url), 'utf8');
const transparent = 'rgba(0, 0, 0, 0)';

function fixture(search = '') {
  const dom = new JSDOM('<html><head></head><body><div id="root"></div></body></html>', {
    url: 'https://example.invalid/DAI-development/' + search,
    runScripts: 'outside-only',
  });
  const style = dom.window.document.createElement('style');
  style.textContent = css;
  dom.window.document.head.append(style);
  return dom;
}

test('the deployed page selects companion mode from a blocking head script before app startup', async () => {
  class Scripts extends ResourceLoader {
    fetch(url) {
      if (url.endsWith('/window-mode.js')) {
        return Promise.resolve(Buffer.from(modeScript + '\nwindow.modeInHead = document.currentScript.parentNode.tagName === "HEAD";'));
      }
      return null;
    }
  }
  const dom = new JSDOM(page, {
    url: 'https://example.invalid/DAI-development/?companion=1',
    resources: new Scripts(), runScripts: 'dangerously',
  });
  try {
    await new Promise(resolve => dom.window.addEventListener('load', resolve, { once: true }));
    assert.equal(dom.window.document.documentElement.dataset.daiWindow, 'companion');
    assert.equal(dom.window.modeInHead, true);
    const script = dom.window.document.querySelector('script[src="./window-mode.js"]');
    assert.equal(script.hasAttribute('async'), false);
    assert.equal(script.hasAttribute('defer'), false);
    assert.ok(page.indexOf('./window-mode.js') < page.indexOf('/src/github-main.tsx'));
  } finally { dom.window.close(); }
});

test('companion document stays transparent during bootstrap and after theme switches', () => {
  const dom = fixture('?companion=1');
  const { document } = dom.window;
  const root = document.getElementById('root');
  const assertClear = element => assert.equal(dom.window.getComputedStyle(element).backgroundColor, transparent, element.tagName + ' must not cover the desktop');
  try {
    dom.window.eval(modeScript);
    for (const theme of ['dark', 'light', 'dark']) {
      document.documentElement.dataset.daiTheme = theme;
      for (const content of ['', '<main class="auth-shell"></main>', '<main class="dai-companion-shell"><button class="dai-companion-face"><canvas class="dai-canvas"></canvas></button></main>']) {
        root.innerHTML = content;
        [document.documentElement, document.body, root, ...root.querySelectorAll('main, button, canvas')].forEach(assertClear);
        assert.equal(dom.window.getComputedStyle(document.body).minWidth, '0', 'the 310px native window must not inherit the main app 320px minimum');
      }
    }
  } finally { dom.window.close(); }
});

test('normal app and intro pages keep their theme backgrounds', () => {
  for (const query of ['', '?intro=1', '?companion=0']) {
    const dom = fixture(query);
    try {
      for (const theme of ['dark', 'light']) {
        dom.window.document.documentElement.dataset.daiTheme = theme;
        const before = dom.window.getComputedStyle(dom.window.document.body).backgroundColor;
        dom.window.eval(modeScript);
        assert.equal(dom.window.document.documentElement.dataset.daiWindow, 'main');
        assert.equal(dom.window.getComputedStyle(dom.window.document.body).backgroundColor, before);
        assert.equal(dom.window.getComputedStyle(dom.window.document.body).minWidth, '320px');
      }
    } finally { dom.window.close(); }
  }
});

test('cached HTML still receives the mode initializer from the app entry bundle', () => {
  const entry = readFileSync(new URL('../src/github-main.tsx', import.meta.url), 'utf8');
  assert.match(entry, /import ['"]\.\.\/public\/window-mode\.js['"]/);
});
