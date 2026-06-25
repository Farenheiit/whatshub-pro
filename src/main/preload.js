const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('whatshub', {
  listAccounts: () => ipcRenderer.invoke('accounts:list'),
  addAccount: () => ipcRenderer.invoke('accounts:add'),
  renameAccount: (id, name) => ipcRenderer.invoke('accounts:rename', id, name),
  deleteAccount: (id) => ipcRenderer.invoke('accounts:delete', id),
  clearSession: (id) => ipcRenderer.invoke('accounts:clear-session', id),
  getInfo: () => ipcRenderer.invoke('app:get-info')
});
