const { app, BrowserWindow, ipcMain, dialog, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
// 1. IMPORT AUTO-UPDATER
const { autoUpdater } = require('electron-updater');

// 2. CONFIGURE UPDATER
// This line allows updates without paying $400/year for a certificate (Internal use only)
autoUpdater.verifyUpdateCodeSignature = false;
autoUpdater.autoDownload = false; // We will ask the user first

/**
 * Creates the main Electron window.
 */
function createWindow() {
    const mainWindow = new BrowserWindow({
        // --- WINDOW DIMENSIONS & BEHAVIOR ---
        width: 1200, // Slightly wider for new features
        height: 800,
        minWidth: 900,
        minHeight: 700,
        center: true,
        
        icon: path.join(__dirname, 'assets/icon.png'), // Ensure this path is correct
        webPreferences: {
            nodeIntegration: false, 
            contextIsolation: true, 
            preload: path.join(__dirname, 'preload.js'), 
            devTools: false, // Set to true if you need to debug
        },
    });

    // Removes the default menu bar
    mainWindow.setMenu(null); 
    
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

// =========================================================================
// IPC Handlers (Your Existing Logic)
// =========================================================================

// 1. File Dialog
ipcMain.handle('dialog:openFile', async (event) => { 
    const currentWindow = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(currentWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'CSV Files', extensions: ['csv'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });
    if (result.filePaths && result.filePaths.length > 0) {
        return result.filePaths[0];
    }
    return null;
});

// 2. Get App Version
ipcMain.handle('get-app-version', () => {
    return app.getVersion(); // Simpler way to get version directly from Electron
});

// 3. Read CSV File
ipcMain.handle('read-csv-file', async (event, filePath) => {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return data;
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        throw new Error('❌ Error reading file.');
    }
});

// 4. Clipboard Handler
ipcMain.handle('write-to-clipboard', async (event, text) => {
    clipboard.writeText(text);
});

// =========================================================================
// AUTO-UPDATE LISTENERS (New Feature)
// =========================================================================

// Event: Update Found -> Ask User
autoUpdater.on('update-available', (info) => {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
        dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Update Available',
            message: `A new version (${info.version}) is available. Do you want to download it now?`,
            buttons: ['Yes', 'No']
        }).then((result) => {
            if (result.response === 0) { // User clicked 'Yes'
                autoUpdater.downloadUpdate();
            }
        });
    }
});

// Event: Download Finished -> Install
autoUpdater.on('update-downloaded', () => {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
        dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Update Ready',
            message: 'The update has been downloaded. The app will restart now to install.',
            buttons: ['OK']
        }).then(() => {
            autoUpdater.quitAndInstall();
        });
    }
});

// Error Handling for Updater
autoUpdater.on('error', (err) => {
    console.log('Updater Error:', err);
});

// =========================================================================
// APP LIFECYCLE
// =========================================================================

app.whenReady().then(() => {
    createWindow();

    // Check for updates 2 seconds after launch
    if (app.isPackaged) { // Only check for updates in the built version, not dev
        setTimeout(() => {
            autoUpdater.checkForUpdates();
        }, 2000);
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});