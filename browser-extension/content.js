const PAGE_SOURCE = 'dai-web';
const EXT_SOURCE = 'dai-side-browser-extension';

function sendToPage(payload) {
  window.postMessage({ source: EXT_SOURCE, ...payload }, window.location.origin);
}

sendToPage({ type: 'READY' });

window.addEventListener('message', async (event) => {
  if (event.source !== window) return;
  if (event.origin !== window.location.origin) return;

  const message = event.data || {};
  if (message.source !== PAGE_SOURCE) return;

  if (message.type === 'DAI_SIDE_BROWSER_PING') {
    sendToPage({ type: 'READY', requestId: message.requestId || '' });
    return;
  }

  if (message.type === 'DAI_SIDE_BROWSER_OPEN') {
    const url = String(message.url || '').trim();
    let result = { ok: false, message: 'تعذر فتح الرابط.' };

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
        message: String(error?.message || error || 'تعذر فتح الرابط.')
      };
    }

    sendToPage({
      type: 'DAI_SIDE_BROWSER_RESULT',
      requestId: message.requestId || '',
      result
    });
  }

  if (message.type === 'DAI_SIDE_BROWSER_CLOSE') {
    try {
      const result = await chrome.runtime.sendMessage({
        type: 'DAI_SIDE_BROWSER_CLOSE'
      });
      sendToPage({
        type: 'DAI_SIDE_BROWSER_RESULT',
        requestId: message.requestId || '',
        result
      });
    } catch {}
  }
});
