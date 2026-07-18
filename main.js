const { app, BrowserWindow, ipcMain, dialog, clipboard, globalShortcut, screen } = require('electron');
const path = require('path');
const fs = require('fs');

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function getDisplayMetrics(window) {
    const display = window
        ? screen.getDisplayMatching(window.getBounds())
        : screen.getDisplayNearestPoint(screen.getCursorScreenPoint());

    return {
        workAreaSize: display.workAreaSize,
        bounds: display.bounds,
        scaleFactor: display.scaleFactor,
    };
}

function getMonitorAwareWindowBounds() {
    const { workAreaSize } = getDisplayMetrics();

    return {
        width: clamp(Math.round(workAreaSize.width * 0.92), 760, 1500),
        height: clamp(Math.round(workAreaSize.height * 0.76), 680, 860),
    };
}

function createWindow() {
    const initialBounds = getMonitorAwareWindowBounds();
    const mainWindow = new BrowserWindow({
        width: initialBounds.width,
        height: initialBounds.height,
        minWidth: 720,
        minHeight: 620,
        center: true,
        icon: path.join(__dirname, 'assets/icon.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            devTools: true,
        },
    });

    mainWindow.setMenu(null);
    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    let displayMetricsTimer = null;
    const sendDisplayMetrics = () => {
        clearTimeout(displayMetricsTimer);
        displayMetricsTimer = setTimeout(() => {
            if (!mainWindow.isDestroyed()) {
                mainWindow.webContents.send('display-metrics-changed', getDisplayMetrics(mainWindow));
            }
        }, 100);
    };

    mainWindow.on('resize', sendDisplayMetrics);
    mainWindow.on('move', sendDisplayMetrics);
}

ipcMain.handle('dialog:openFile', async (event) => {
    const currentWindow = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(currentWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'CSV Files', extensions: ['csv'] },
            { name: 'All Files', extensions: ['*'] },
        ],
    });

    return result.filePaths?.[0] || null;
});

ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.handle('get-display-metrics', (event) => {
    const currentWindow = BrowserWindow.fromWebContents(event.sender);
    return getDisplayMetrics(currentWindow);
});

ipcMain.handle('read-csv-file', async (event, filePath) => {
    try {
        return await fs.promises.readFile(filePath, 'utf8');
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        throw new Error('Error reading file.');
    }
});

ipcMain.handle('write-to-clipboard', async (event, text) => {
    clipboard.writeText(text);
});

ipcMain.handle('save-csv', async (event, fileContent) => {
    const { filePath } = await dialog.showSaveDialog({
        title: 'Save Verified Report',
        defaultPath: 'Verified_EOS_Report.csv',
        filters: [{ name: 'CSV Files', extensions: ['csv'] }],
    });

    if (!filePath) return false;

    await fs.promises.writeFile(filePath, fileContent, 'utf8');
    return true;
});

ipcMain.handle('fcids:getTrailersByFC', async (event, request = {}) => {
    const endpoint = String(request.endpoint || process.env.FC_IDS_API_URL || '').trim();
    const warehouseId = String(request.warehouseId || process.env.FC_IDS_WAREHOUSE_ID || '').trim().toUpperCase();
    const authToken = String(request.authToken || process.env.FC_IDS_AUTH_TOKEN || '').trim();

    if (!endpoint) {
        throw new Error('Missing FC-IDS API endpoint.');
    }
    if (!warehouseId) {
        throw new Error('Missing warehouseId.');
    }

    const headers = {
        'content-type': 'application/json',
        accept: 'application/json',
    };

    if (authToken) {
        headers.authorization = authToken.toLowerCase().startsWith('bearer ') ? authToken : `Bearer ${authToken}`;
    }

    const isDirectWarehouseEndpoint = /getTrailerInfoByFc|getTrailersByFC/i.test(endpoint);
    const requestBody = isDirectWarehouseEndpoint ?
        { warehouseId } :
        {
            operationName: 'getTrailersByFC',
            warehouseId,
            input: { warehouseId },
        };

    const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
    });

    const text = await response.text();
    let payload = null;
    try {
        payload = text ? JSON.parse(text) : null;
    } catch {
        payload = text;
    }

    if (!response.ok) {
        const detail = typeof payload === 'string' ? payload : JSON.stringify(payload);
        throw new Error(`FC-IDS request failed (${response.status}): ${detail || response.statusText}`);
    }

    const trailers = Array.isArray(payload) ? payload :
        Array.isArray(payload?.data) ? payload.data :
        Array.isArray(payload?.trailers) ? payload.trailers :
        Array.isArray(payload?.trailerInfo) ? payload.trailerInfo :
        Array.isArray(payload?.data?.trailers) ? payload.data.trailers :
        Array.isArray(payload?.data?.trailerInfo) ? payload.data.trailerInfo :
        Array.isArray(payload?.getTrailersByFC) ? payload.getTrailersByFC :
        Array.isArray(payload?.data?.getTrailersByFC) ? payload.data.getTrailersByFC :
        Array.isArray(payload?.getTrailerInfoByFc) ? payload.getTrailerInfoByFc :
        Array.isArray(payload?.data?.getTrailerInfoByFc) ? payload.data.getTrailerInfoByFc :
        [];

    return {
        warehouseId,
        count: trailers.length,
        trailers,
        rawShape: payload && typeof payload === 'object' ? Object.keys(payload) : [],
    };
});

function setupAutoUpdater() {
    const { autoUpdater } = require('electron-updater');

    // Internal builds are unsigned, so code signature verification is disabled.
    autoUpdater.verifyUpdateCodeSignature = false;
    autoUpdater.autoDownload = false;

    autoUpdater.on('update-available', (info) => {
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (!mainWindow) return;

        dialog.showMessageBox(mainWindow, {
            type: 'question',
            title: 'Update Available',
            message: `Version ${info.version} is available. Do you want to download it now?`,
            buttons: ['Yes', 'No'],
        }).then((result) => {
            if (result.response !== 0) return;

            dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'Downloading...',
                message: 'The update is downloading in the background.\n\nPlease keep the app open. You will be notified when it is ready to install.',
                buttons: ['OK'],
            });

            autoUpdater.downloadUpdate();
        });
    });

    autoUpdater.on('download-progress', (progressObj) => {
        const win = BrowserWindow.getAllWindows()[0];
        if (win) win.setProgressBar(progressObj.percent / 100);
    });

    autoUpdater.on('update-downloaded', () => {
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (!mainWindow) return;

        mainWindow.setProgressBar(-1);
        dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Update Ready',
            message: 'The update has been downloaded. The app will restart now to install.',
            buttons: ['OK'],
        }).then(() => {
            autoUpdater.quitAndInstall();
        });
    });

    autoUpdater.on('error', (err) => {
        console.log('Updater Error:', err);
    });

    setTimeout(() => {
        autoUpdater.checkForUpdates();
    }, 2000);
}

app.whenReady().then(() => {
    createWindow();

    globalShortcut.register('CommandOrControl+Shift+I', () => {
        const win = BrowserWindow.getAllWindows()[0];
        if (win) win.webContents.toggleDevTools();
    });

    if (app.isPackaged) setupAutoUpdater();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
