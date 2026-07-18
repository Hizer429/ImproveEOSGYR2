const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // --- File Handling (Allows the renderer to trigger dialogs and file reads) ---
    openFile: () => ipcRenderer.invoke('dialog:openFile'),
    readCsvFile: (path) => ipcRenderer.invoke('read-csv-file', path),
    saveCsv: (content) => ipcRenderer.invoke('save-csv', content),
    getTrailersByFC: (request) => ipcRenderer.invoke('fcids:getTrailersByFC', request),
    
    // --- Utility (System interactions) ---
    writeToClipboard: (text) => ipcRenderer.invoke('write-to-clipboard', text),
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    getDisplayMetrics: () => ipcRenderer.invoke('get-display-metrics'),
    onDisplayMetricsChanged: (callback) => {
        const listener = (_event, metrics) => callback(metrics);
        ipcRenderer.on('display-metrics-changed', listener);
        return () => ipcRenderer.removeListener('display-metrics-changed', listener);
    },
});
