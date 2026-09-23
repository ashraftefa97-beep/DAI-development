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

async function getSession() {
  const stored = await chrome.storage.session.get(SESSION_KEY);
  return stored?.[SESSION_KEY] || null;
}

async function setSession(value) {
  if (!value) {
    await chrome.storage.session.remove(SESSION_KEY);
    return;
  }
  await chrome.storage.session.set({ [SESSION_KEY]: value });
}

async function safeGetWindow(id) {
  if (!Number.isInteger(id)) return null;
  try {
    return await chrome.windows.get(id, { populate: true });
  } catch {
    return null;
  }
}

async function restoreHost(session) {
  if (!session?.hostWindowId || !session?.originalHost) return;
  const host = await safeGetWindow(session.hostWindowId);
  if (!host) return;

  const original = session.originalHost;
  try {
    await chrome.windows.update(session.hostWindowId, {
      state: 'normal',
      left: original.left,
      top: original.top,
      width: original.width,
      height: original.height,
      focused: true
    });
    if (original.state === 'maximized') {
      await chrome.windows.update(session.hostWindowId, { state: 'maximized' });
    }
  } catch {}
}

function splitBounds(screenInfo) {
  const left = Number(screenInfo?.left || 0);
  const top = Number(screenInfo?.top || 0);
  const width = Math.max(1000, Number(screenInfo?.width || 1440));
  const height = Math.max(680, Number(screenInfo?.height || 900));

  const hostWidth = Math.floor(width * 0.5);
  return {
    host: { left, top, width: hostWidth, height },
    side: { left: left + hostWidth, top, width: width - hostWidth, height }
  };
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

async function openSideBrowser(url, sender, screenInfo) {
  const safe = safeUrl(url);
  if (!safe) return { ok: false, message: 'الرابط غير صالح.' };

  const hostWindowId = sender?.tab?.windowId;
  if (!Number.isInteger(hostWindowId)) {
    return { ok: false, message: 'تعذر تحديد نافذة ضي.' };
  }

  const host = await safeGetWindow(hostWindowId);
  if (!host) return { ok: false, message: 'نافذة ضي غير متاحة.' };

  let session = await getSession();
  if (session?.sideWindowId) {
    const existingSide = await safeGetWindow(session.sideWindowId);
    if (existingSide && session.hostWindowId === hostWindowId) {
      const bounds = splitBounds(screenInfo);
      await chrome.windows.update(hostWindowId, {
        state: 'normal',
        ...bounds.host,
        focused: false
      });
      await chrome.windows.update(session.sideWindowId, {
        state: 'normal',
        ...bounds.side,
        focused: true
      });

      if (await navigateSideWindow(session.sideWindowId, safe)) {
        return { ok: true, reused: true };
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

  const bounds = splitBounds(screenInfo);

  await chrome.windows.update(hostWindowId, {
    state: 'normal',
    ...bounds.host,
    focused: false
  });

  const sideWindow = await chrome.windows.create({
    url: safe,
    type: 'normal',
    state: 'normal',
    focused: true,
    ...bounds.side
  });

  session = {
    hostWindowId,
    sideWindowId: sideWindow.id,
    originalHost
  };
  await setSession(session);

  return { ok: true, reused: false };
}

async function closeSideBrowser(sender) {
  const session = await getSession();
  if (!session) return { ok: true };

  if (session.sideWindowId) {
    try { await chrome.windows.remove(session.sideWindowId); } catch {}
  }
  await restoreHost(session);
  await setSession(null);
  return { ok: true };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'DAI_SIDE_BROWSER_OPEN') {
    openSideBrowser(message.url, sender, message.screen)
      .then(sendResponse)
      .catch((error) => sendResponse({
        ok: false,
        message: String(error?.message || error || 'تعذر فتح الرابط.')
      }));
    return true;
  }

  if (message?.type === 'DAI_SIDE_BROWSER_CLOSE') {
    closeSideBrowser(sender)
      .then(sendResponse)
      .catch(() => sendResponse({ ok: false }));
    return true;
  }
});

chrome.windows.onRemoved.addListener(async (windowId) => {
  const session = await getSession();
  if (!session) return;

  if (windowId === session.sideWindowId) {
    await restoreHost(session);
    await setSession(null);
    return;
  }

  if (windowId === session.hostWindowId) {
    if (session.sideWindowId) {
      try { await chrome.windows.remove(session.sideWindowId); } catch {}
    }
    await setSession(null);
  }
});
