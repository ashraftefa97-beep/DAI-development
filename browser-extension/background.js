const SESSION_KEY = 'daiSideBrowserSession';

function safeUrl(value) {
  try {
    const url = new URL(String(value || ''));
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    if (url.username || url.password) return '';
    return url.toString();
  } catch {
    return '';
  }
}

async function storageGet() {
  try {
    const stored = await chrome.storage.session.get(SESSION_KEY);
    return stored?.[SESSION_KEY] || null;
  } catch {
    const stored = await chrome.storage.local.get(SESSION_KEY);
    return stored?.[SESSION_KEY] || null;
  }
}

async function storageSet(value) {
  try {
    if (!value) await chrome.storage.session.remove(SESSION_KEY);
    else await chrome.storage.session.set({ [SESSION_KEY]: value });
    return;
  } catch {}
  if (!value) await chrome.storage.local.remove(SESSION_KEY);
  else await chrome.storage.local.set({ [SESSION_KEY]: value });
}

async function safeGetWindow(id) {
  if (!Number.isInteger(id)) return null;
  try {
    return await chrome.windows.get(id, { populate: true });
  } catch {
    return null;
  }
}

async function normalizeAndPlace(windowId, bounds, focused) {
  const win = await safeGetWindow(windowId);
  if (!win) throw new Error('WINDOW_NOT_FOUND');

  if (win.state !== 'normal') {
    await chrome.windows.update(windowId, { state: 'normal' });
    await new Promise((resolve) => setTimeout(resolve, 90));
  }

  await chrome.windows.update(windowId, {
    left: Math.round(bounds.left),
    top: Math.round(bounds.top),
    width: Math.round(bounds.width),
    height: Math.round(bounds.height),
    focused: Boolean(focused)
  });

  return await safeGetWindow(windowId);
}

function splitBounds(screenInfo) {
  const left = Number(screenInfo?.left || 0);
  const top = Number(screenInfo?.top || 0);
  const width = Math.max(1100, Number(screenInfo?.width || 1440));
  const height = Math.max(700, Number(screenInfo?.height || 900));
  const hostWidth = Math.floor(width * 0.5);

  return {
    host: { left, top, width: hostWidth, height },
    side: { left: left + hostWidth, top, width: width - hostWidth, height }
  };
}

async function restoreHost(session) {
  if (!session?.hostWindowId || !session?.originalHost) return;
  const host = await safeGetWindow(session.hostWindowId);
  if (!host) return;

  const original = session.originalHost;
  try {
    await normalizeAndPlace(
      session.hostWindowId,
      {
        left: original.left,
        top: original.top,
        width: original.width,
        height: original.height
      },
      true
    );
    if (original.state === 'maximized') {
      await chrome.windows.update(session.hostWindowId, { state: 'maximized' });
    }
  } catch {}
}

async function navigateSideWindow(windowId, url) {
  const side = await safeGetWindow(windowId);
  if (!side) return false;

  const activeTab = side.tabs?.find((tab) => tab.active) || side.tabs?.[0];
  if (!activeTab?.id) return false;

  await chrome.tabs.update(activeTab.id, { url, active: true });
  await chrome.windows.update(windowId, { focused: true });
  return true;
}

function windowSummary(win) {
  if (!win) return null;
  return {
    id: win.id,
    left: win.left,
    top: win.top,
    width: win.width,
    height: win.height,
    state: win.state
  };
}

async function openSideBrowser(url, sender, screenInfo) {
  const safe = safeUrl(url);
  if (!safe) {
    return { ok: false, code: 'INVALID_URL', message: 'الرابط غير صالح.' };
  }

  const hostWindowId = sender?.tab?.windowId;
  if (!Number.isInteger(hostWindowId)) {
    return { ok: false, code: 'NO_HOST_WINDOW', message: 'تعذر تحديد نافذة ضي.' };
  }

  const host = await safeGetWindow(hostWindowId);
  if (!host) {
    return { ok: false, code: 'HOST_WINDOW_MISSING', message: 'نافذة ضي غير متاحة.' };
  }

  const bounds = splitBounds(screenInfo);
  let session = await storageGet();

  if (session?.sideWindowId && session.hostWindowId === hostWindowId) {
    const existingSide = await safeGetWindow(session.sideWindowId);
    if (existingSide) {
      try {
        const placedHost = await normalizeAndPlace(hostWindowId, bounds.host, false);
        const placedSide = await normalizeAndPlace(session.sideWindowId, bounds.side, true);
        const navigated = await navigateSideWindow(session.sideWindowId, safe);

        if (navigated) {
          return {
            ok: true,
            reused: true,
            host: windowSummary(placedHost),
            side: windowSummary(placedSide)
          };
        }
      } catch (error) {
        return {
          ok: false,
          code: 'REUSE_PLACE_FAILED',
          message: String(error?.message || error || 'تعذر تثبيت النوافذ.')
        };
      }
    }
  }

  if (session) {
    await restoreHost(session);
    if (session.sideWindowId) {
      try { await chrome.windows.remove(session.sideWindowId); } catch {}
    }
  }

  const originalHost = {
    left: host.left ?? 0,
    top: host.top ?? 0,
    width: host.width ?? 1200,
    height: host.height ?? 800,
    state: host.state || 'normal'
  };

  try {
    const placedHost = await normalizeAndPlace(hostWindowId, bounds.host, false);

    const sideWindow = await chrome.windows.create({
      url: safe,
      type: 'normal',
      state: 'normal',
      focused: true,
      left: Math.round(bounds.side.left),
      top: Math.round(bounds.side.top),
      width: Math.round(bounds.side.width),
      height: Math.round(bounds.side.height)
    });

    if (!sideWindow?.id) throw new Error('SIDE_WINDOW_NOT_CREATED');

    const placedSide = await normalizeAndPlace(sideWindow.id, bounds.side, true);

    session = {
      hostWindowId,
      sideWindowId: sideWindow.id,
      originalHost
    };
    await storageSet(session);

    return {
      ok: true,
      reused: false,
      host: windowSummary(placedHost),
      side: windowSummary(placedSide)
    };
  } catch (error) {
    try {
      await normalizeAndPlace(hostWindowId, originalHost, true);
    } catch {}

    return {
      ok: false,
      code: 'PLACE_FAILED',
      message: String(error?.message || error || 'تعذر تثبيت المتصفح الجانبي.')
    };
  }
}

async function closeSideBrowser() {
  const session = await storageGet();
  if (!session) return { ok: true };

  if (session.sideWindowId) {
    try { await chrome.windows.remove(session.sideWindowId); } catch {}
  }
  await restoreHost(session);
  await storageSet(null);
  return { ok: true };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'DAI_SIDE_BROWSER_OPEN') {
    openSideBrowser(message.url, sender, message.screen)
      .then(sendResponse)
      .catch((error) => sendResponse({
        ok: false,
        code: 'BACKGROUND_OPEN_ERROR',
        message: String(error?.message || error || 'تعذر فتح الرابط.')
      }));
    return true;
  }

  if (message?.type === 'DAI_SIDE_BROWSER_CLOSE') {
    closeSideBrowser()
      .then(sendResponse)
      .catch((error) => sendResponse({
        ok: false,
        code: 'BACKGROUND_CLOSE_ERROR',
        message: String(error?.message || error || '')
      }));
    return true;
  }
});

chrome.windows.onRemoved.addListener(async (windowId) => {
  const session = await storageGet();
  if (!session) return;

  if (windowId === session.sideWindowId) {
    await restoreHost(session);
    await storageSet(null);
    return;
  }

  if (windowId === session.hostWindowId) {
    if (session.sideWindowId) {
      try { await chrome.windows.remove(session.sideWindowId); } catch {}
    }
    await storageSet(null);
  }
});
