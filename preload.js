const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    getConfig: () => ipcRenderer.invoke('get-config'),
    saveConfig: (config) => ipcRenderer.invoke('save-config', config),
    setEnvVar: (name, value) => ipcRenderer.invoke('set-env-var', { name, value }),
    getEnvVar: (name) => ipcRenderer.invoke('get-env-var', name),
})
