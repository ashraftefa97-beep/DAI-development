const SESSION_KEY = 'daiNativeSplitSession';

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

async function safeGetTab(tabId) {
  if (!Number.isInteger(tabId)) return null;
  try { return await chrome.tabs.get(tabId); }
  catch { return null; }
}

async function currentSplitPartner(hostTab) {
  const splitId = Number(hostTab?.splitViewId ?? -1);
  if (!hostTab?.id || splitId < 0) return null;

  try {
    const tabs = await chrome.tabs.query({ windowId: hostTab.windowId });
    return tabs.find((tab) =>
      tab.id !== hostTab.id &&
      Number(tab.splitViewId ?? -1) === splitId
    ) || null;
  } catch {
    return null;
  }
}

function nativeSplitAvailable() {
  return typeof chrome?.tabs?.createSplit === 'function';
}

async function openNativeSplit(url, sender) {
  const safe = safeUrl(url);
  if (!safe) {
    return { ok: false, code: 'INVALID_URL', message: 'الرابط غير صالح.' };
  }

  const hostTab = sender?.tab;
  if (!hostTab?.id || !Number.isInteger(hostTab.windowId)) {
    return { ok: false, code: 'NO_HOST_TAB', message: 'تعذر تحديد تاب ضي.' };
  }

  if (!nativeSplitAvailable()) {
    return {
      ok: false,
      code: 'NATIVE_SPLIT_UNAVAILABLE',
      message: 'المتصفح الحالي لا يتيح التحكم البرمجي في Split View. الميزة تحتاج Chrome 155 أو أحدث.'
    };
  }

  // Reuse the right-side split tab if DAI is already split.
  const partner = await currentSplitPartner(hostTab);
  if (partner?.id) {
    try {
      await chrome.tabs.update(partner.id, { url: safe, active: true });
      await storageSet({
        hostTabId: hostTab.id,
        sideTabId: partner.id,
        splitViewId: hostTab.splitViewId
      });
      return {
        ok: true,
        mode: 'native-split',
        reused: true,
        splitViewId: hostTab.splitViewId,
        sideTabId: partner.id
      };
    } catch {}
  }

  // Preferred API: create a new tab directly in a native split with DAI.
  try {
    const created = await chrome.tabs.create({
      windowId: hostTab.windowId,
      index: hostTab.index + 1,
      url: safe,
      active: true,
      splitWithTabId: hostTab.id
    });

    const freshHost = await safeGetTab(hostTab.id);
    const freshSide = created?.id ? await safeGetTab(created.id) : null;
    const splitViewId = Number(
      freshHost?.splitViewId ??
      freshSide?.splitViewId ??
      -1
    );

    await storageSet({
      hostTabId: hostTab.id,
      sideTabId: created?.id,
      splitViewId
    });

    return {
      ok: true,
      mode: 'native-split',
      reused: false,
      splitViewId,
      sideTabId: created?.id
    };
  } catch (createError) {
    // Compatibility path for implementations exposing createSplit() but not
    // splitWithTabId on tabs.create yet.
    let created = null;
    try {
      created = await chrome.tabs.create({
        windowId: hostTab.windowId,
        index: hostTab.index + 1,
        url: safe,
        active: true
      });

      if (!created?.id) throw new Error('SIDE_TAB_NOT_CREATED');

      const splitViewId = await chrome.tabs.createSplit([
        hostTab.id,
        created.id
      ]);

      await storageSet({
        hostTabId: hostTab.id,
        sideTabId: created.id,
        splitViewId
      });

      return {
        ok: true,
        mode: 'native-split',
        reused: false,
        splitViewId,
        sideTabId: created.id
      };
    } catch (splitError) {
      if (created?.id) {
        try { await chrome.tabs.remove(created.id); } catch {}
      }
      return {
        ok: false,
        code: 'NATIVE_SPLIT_FAILED',
        message: String(
          splitError?.message ||
          createError?.message ||
          'تعذر إنشاء Split View.'
        ).slice(0, 260)
      };
    }
  }
}

async function closeNativeSplit(sender) {
  const session = await storageGet();
  const hostTab = sender?.tab;

  if (!nativeSplitAvailable()) {
    await storageSet(null);
    return { ok: true };
  }

  let splitViewId = Number(session?.splitViewId ?? -1);

  if (splitViewId < 0 && hostTab?.id) {
    const freshHost = await safeGetTab(hostTab.id);
    splitViewId = Number(freshHost?.splitViewId ?? -1);
  }

  if (splitViewId >= 0 && typeof chrome.tabs.unsplit === 'function') {
    try { await chrome.tabs.unsplit(splitViewId); } catch {}
  }

  if (session?.sideTabId) {
    try { await chrome.tabs.remove(session.sideTabId); } catch {}
  }

  await storageSet(null);
  return { ok: true };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'DAI_SIDE_BROWSER_OPEN') {
    openNativeSplit(message.url, sender)
      .then(sendResponse)
      .catch((error) => sendResponse({
        ok: false,
        code: 'NATIVE_SPLIT_ERROR',
        message: String(error?.message || error || 'تعذر فتح الرابط.')
      }));
    return true;
  }

  if (message?.type === 'DAI_SIDE_BROWSER_CLOSE') {
    closeNativeSplit(sender)
      .then(sendResponse)
      .catch((error) => sendResponse({
        ok: false,
        code: 'NATIVE_SPLIT_CLOSE_ERROR',
        message: String(error?.message || error || '')
      }));
    return true;
  }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const session = await storageGet();
  if (!session) return;

  if (tabId === session.sideTabId || tabId === session.hostTabId) {
    await storageSet(null);
  }
});
