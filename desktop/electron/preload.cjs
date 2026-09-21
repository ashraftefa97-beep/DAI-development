const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('daiDesktop', {
  isDesktop: true,
  platform: process.platform,
  capabilities: () => ipcRenderer.invoke('dai:capabilities'),
  execute: (action) => ipcRenderer.invoke('dai:execute', action),
  pickAndOpenFile: () => ipcRenderer.invoke('dai:pick-file'),
  getStartup: () => ipcRenderer.invoke('dai:get-startup'),
  setStartup: (enabled) => ipcRenderer.invoke('dai:set-startup', Boolean(enabled)),
});
