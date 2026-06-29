const { app, BrowserWindow, ipcMain, dialog, clipboard, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 900,
        height: 1150,
        minWidth: 900,
        minHeight: 700,
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
