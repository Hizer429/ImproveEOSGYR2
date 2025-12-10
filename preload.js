const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // --- File Handling (Allows the renderer to trigger dialogs and file reads) ---
    openFile: () => ipcRenderer.invoke('dialog:openFile'),
    readCsvFile: (path) => ipcRenderer.invoke('read-csv-file', path),
    
    // --- Utility (System interactions) ---
    writeToClipboard: (text) => ipcRenderer.invoke('write-to-clipboard', text),
    getAppVersion: () => ipcRenderer.invoke('get-app-version'), 
});