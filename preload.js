const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('wmUpdate', {
  onState: (fn) => ipcRenderer.on('update-state', (_e, s) => fn(s)),
  check: () => ipcRenderer.invoke('update-check'),
  install: () => ipcRenderer.invoke('update-install'),
  version: () => ipcRenderer.invoke('app-version'),
  resetProfile: (who) => ipcRenderer.invoke('reset-profile', who),
});
