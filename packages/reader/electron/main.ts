import { app, BrowserWindow, ipcMain, dialog, session, globalShortcut } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;
let yomitanExtension: any = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    backgroundColor: '#1a1a1a',
    show: false,
  });

  // Show window when ready to avoid flickering
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function openYomitanSettings() {
  if (!yomitanExtension) {
    console.error('Yomitan extension not loaded');
    return;
  }

  const yomitanOptionsWin = new BrowserWindow({
    width: 1100,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
    },
  });

  yomitanOptionsWin.removeMenu();
  yomitanOptionsWin.loadURL(`chrome-extension://${yomitanExtension.id}/settings.html`);
  
  // Allow search ctrl F in the settings window
  yomitanOptionsWin.webContents.on('before-input-event', (event, input) => {
    if (input.key.toLowerCase() === 'f' && input.control) {
      yomitanOptionsWin.webContents.send('focus-search');
      event.preventDefault();
    }
  });
  
  yomitanOptionsWin.show();
  
  // Force a repaint to fix blank/transparent window issue
  setTimeout(() => {
    yomitanOptionsWin.setSize(yomitanOptionsWin.getSize()[0], yomitanOptionsWin.getSize()[1]);
    if (yomitanOptionsWin.webContents.invalidate) {
      yomitanOptionsWin.webContents.invalidate();
    }
    yomitanOptionsWin.show();
  }, 500);
}

// App lifecycle
app.whenReady().then(async () => {
  // Load Yomitan extension
  const extPath = isDev 
    ? path.join(__dirname, '../../yomitan') 
    : path.join(process.resourcesPath, 'yomitan');
  
  try {
    yomitanExtension = await session.defaultSession.loadExtension(extPath, { allowFileAccess: true });
    console.log('Yomitan extension loaded:', yomitanExtension.id);
  } catch (e) {
    console.error('Failed to load Yomitan extension:', e);
  }

  // Register global shortcuts
  globalShortcut.register('Alt+Shift+Y', () => {
    openYomitanSettings();
  });

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

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// IPC Handlers
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('open-folder-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('read-directory', async (_, dirPath: string) => {
  try {
    const files = await fs.promises.readdir(dirPath);
    const imageFiles = files.filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
    });
    return imageFiles.map((file) => path.join(dirPath, file));
  } catch (error) {
    console.error('Error reading directory:', error);
    return [];
  }
});

ipcMain.handle('check-yomitan-installed', async () => {
  // Check if Yomitan extension is installed
  const userDataPath = app.getPath('userData');
  const yomitanPath = path.join(userDataPath, 'extensions', 'yomitan', 'manifest.json');
  return fs.existsSync(yomitanPath);
});

ipcMain.handle('install-yomitan', async () => {
  // Simplified Yomitan installation for now
  const userDataPath = app.getPath('userData');
  const extensionsPath = path.join(userDataPath, 'extensions');
  const yomitanPath = path.join(extensionsPath, 'yomitan');

  try {
    await fs.promises.mkdir(yomitanPath, { recursive: true });
    
    // Create a placeholder manifest
    const manifest = {
      name: 'Yomitan',
      version: '1.0.0',
      description: 'Yomitan placeholder',
    };
    
    await fs.promises.writeFile(
      path.join(yomitanPath, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );
    
    return { success: true, message: 'Yomitan installed successfully (placeholder)' };
  } catch (error) {
    return { success: false, message: String(error) };
  }
});

ipcMain.handle('get-app-path', async (_, name: string) => {
  return app.getPath(name as any);
});

// Yomitan event handlers
ipcMain.on('yomitan-event', (_event, state: boolean) => {
  console.log('Yomitan popup state:', state);
  
  // You can add additional logic here if needed
  // For example, preventing window interactions when Yomitan is shown
});

ipcMain.handle('open-yomitan-settings', async () => {
  openYomitanSettings();
});

ipcMain.handle('check-yomitan-loaded', async () => {
  return yomitanExtension !== null;
});

ipcMain.handle('get-yomitan-extension-id', async () => {
  return yomitanExtension?.id || null;
});

