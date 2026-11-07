const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('wmUpdate', {
  onState: (fn) => ipcRenderer.on('update-state', (_e, s) => fn(s)),
  check: () => ipcRenderer.invoke('update-check'),
  install: () => ipcRenderer.invoke('update-install'),
  version: () => ipcRenderer.invoke('app-version'),
  resetProfile: (who) => ipcRenderer.invoke('reset-profile', who),
});
contextBridge.exposeInMainWorld('wmNav', {
  capture: (id) => ipcRenderer.invoke('nav-capture', id),
  restore: (id, state) => ipcRenderer.invoke('nav-restore', id, state),
  back: (id) => ipcRenderer.invoke('nav-back', id),
});
contextBridge.exposeInMainWorld('wmTasks', {
  get: (id) => ipcRenderer.invoke('tasks-get', id),
  open: (id, client) => ipcRenderer.invoke('tasks-open', id, client),
  done: (id, client, on) => ipcRenderer.invoke('tasks-done', id, client, on !== false),
});
