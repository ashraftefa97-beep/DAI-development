const PAGE_SOURCE = 'dai-web';
const EXT_SOURCE = 'dai-side-browser-extension';

function markReady() {
  try {
    const root = document.documentElement;
    if (root) root.setAttribute('data-dai-side-browser-extension', '1.2.0');
  } catch {}

  try {
    document.dispatchEvent(new CustomEvent('dai-side-browser-ready', {
      detail: { version: '1.2.0' }
    }));
  } catch {}

  try {
    window.postMessage({
      source: EXT_SOURCE,
      type: 'READY',
      version: '1.2.0'
    }, window.location.origin);
  } catch {}
}

markReady();
if (!document.documentElement) {
  document.addEventListener('DOMContentLoaded', markReady, { once: true });
}

window.addEventListener('message', async (event) => {
  if (event.source !== window) return;
  if (event.origin !== window.location.origin) return;

  const message = event.data || {};
  if (message.source !== PAGE_SOURCE) return;

  if (message.type === 'DAI_SIDE_BROWSER_PING') {
    markReady();
    window.postMessage({
      source: EXT_SOURCE,
      type: 'READY',
      version: '1.2.0',
      requestId: message.requestId || ''
    }, window.location.origin);
    return;
  }

  if (message.type === 'DAI_SIDE_BROWSER_OPEN') {
    const url = String(message.url || '').trim();
    let result = { ok: false, code: 'BRIDGE_OPEN_FAILED', message: 'تعذر فتح الرابط.' };

    try {
      result = await chrome.runtime.sendMessage({
        type: 'DAI_SIDE_BROWSER_OPEN',
        url,
        screen: {
          left: Number.isFinite(screen.availLeft) ? screen.availLeft : 0,
          top: Number.isFinite(screen.availTop) ? screen.availTop : 0,
          width: screen.availWidth || window.outerWidth || 1280,
          height: screen.availHeight || window.outerHeight || 800
        }
      });
    } catch (error) {
      result = {
        ok: false,
        code: 'BRIDGE_RUNTIME_ERROR',
        message: String(error?.message || error || 'تعذر فتح الرابط.')
      };
    }

    window.postMessage({
      source: EXT_SOURCE,
      type: 'DAI_SIDE_BROWSER_RESULT',
      requestId: message.requestId || '',
      result
    }, window.location.origin);
  }

  if (message.type === 'DAI_SIDE_BROWSER_CLOSE') {
    try {
      const result = await chrome.runtime.sendMessage({
        type: 'DAI_SIDE_BROWSER_CLOSE'
      });
      window.postMessage({
        source: EXT_SOURCE,
        type: 'DAI_SIDE_BROWSER_RESULT',
        requestId: message.requestId || '',
        result
      }, window.location.origin);
    } catch (error) {
      window.postMessage({
        source: EXT_SOURCE,
        type: 'DAI_SIDE_BROWSER_RESULT',
        requestId: message.requestId || '',
        result: {
          ok: false,
          code: 'BRIDGE_CLOSE_ERROR',
          message: String(error?.message || error || '')
        }
      }, window.location.origin);
    }
  }
});
