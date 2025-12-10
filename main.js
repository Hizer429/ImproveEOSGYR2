const { app, BrowserWindow, ipcMain, dialog, clipboard } = require('electron');
const path = require('path');
const fs = require('fs/promises'); // Use promises for cleaner async file reading

// --- Main Window Creation ---
const createWindow = () => {
    const mainWindow = new BrowserWindow({
        width: 900,
        height: 1180,
        minWidth: 900,
        minHeight: 700,
        // 🛑 FIX: Remove the default menu bar
        autoHideMenuBar: true,
        menu: null,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false, // Security: Keep nodeIntegration off
            contextIsolation: true, // Security: Keep contextIsolation on
        },
    });

    // 🛑 FIX: Use path.join(__dirname, 'index.html') for proper path resolution in packaged apps (Fixes White Screen)
    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    // Open DevTools (optional, for debugging)
    // mainWindow.webContents.openDevTools();
};

app.whenReady().then(() => {
    createWindow();

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


// --- IPC Handlers (The secure communication channels) ---

// 1. Handles the File Open Dialog
ipcMain.handle('dialog:openFile', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'CSV Files', extensions: ['csv'] }]
    });
    if (canceled) {
        return null;
    } else {
        return filePaths[0];
    }
});

// 2. Reads the CSV File Content (Used by both YMS and Dock Dash)
ipcMain.handle('read-csv-file', async (event, filePath) => {
    try {
        // Read the file content as a string
        const data = await fs.readFile(filePath, 'utf8');
        return data;
    } catch (error) {
        console.error("Error reading file:", error);
        // Throw an error that the renderer can catch
        throw new Error(`Failed to read file: ${error.message}`);
    }
});

// 3. Writes text to the system clipboard
ipcMain.handle('write-to-clipboard', (event, text) => {
    clipboard.writeText(text);
});

// 4. Retrieves the application version from package.json
ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});