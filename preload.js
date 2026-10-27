const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('kazioApi', {
  getInitialData: () => ipcRenderer.invoke('get-initial-data'),
  saveDraft: (data) => ipcRenderer.invoke('save-draft', data),
  submitChallenge: (data) => ipcRenderer.invoke('submit-challenge', data),
  logViolation: (data) => ipcRenderer.invoke('log-violation', data),
  exitApp: () => ipcRenderer.invoke('exit-app'),
  onViolationDetected: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('violation-detected', subscription);
    return () => ipcRenderer.removeListener('violation-detected', subscription);
  }
});
