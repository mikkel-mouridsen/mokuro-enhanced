import { app, BrowserWindow, ipcMain, dialog, session, globalShortcut } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;
let yomitanExtension: any = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  const iconPath = isDev 
    ? path.join(__dirname, '../../public/assets/icon/icon-512.png')
    : path.join(process.resourcesPath, 'assets/icon/icon-512.png');
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: iconPath,
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
    const htmlPath = path.join(__dirname, '../renderer/index.html');
    console.log('Loading HTML from:', htmlPath);
    console.log('__dirname:', __dirname);
    console.log('File exists:', fs.existsSync(htmlPath));
    
    // Enable dev tools in production for debugging
    mainWindow.webContents.openDevTools();
    
    mainWindow.loadFile(htmlPath).catch(err => {
      console.error('Failed to load HTML:', err);
    });
  }

  // Log any loading errors
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('console-message', (_event, level, message) => {
    console.log(`Console [${level}]:`, message);
  });

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

// Bulk Import IPC Handlers

/**
 * Extract manga title from filename
 */
function extractMangaTitle(filename: string): string {
  let title = filename
    .replace(/[_-]v?\d+$/i, '')
    .replace(/[_-]volume[_-]?\d+$/i, '')
    .replace(/[_-]vol[_-]?\d+$/i, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/[_-]+/g, ' ')
    .trim();

  return title || 'Unknown Manga';
}

/**
 * Extract volume number from filename
 */
function extractVolumeNumber(filename: string): number {
  const patterns = [
    /v(\d+)/i,
    /vol\.?(\d+)/i,
    /volume[_-]?(\d+)/i,
    /(\d+)$/,
  ];

  for (const pattern of patterns) {
    const match = filename.match(pattern);
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  return 1;
}

/**
 * Scan directory for manga files (recursive helper)
 */
async function scanDirectoryForMangaInternal(dirPath: string, recursive: boolean): Promise<any[]> {
  const items: any[] = [];
  const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

  // First pass: Check for pre-processed mokuro (folder + .mokuro file)
  const mokuroFiles = entries.filter(e => e.isFile() && e.name.endsWith('.mokuro'));
  const folders = entries.filter(e => e.isDirectory());

  for (const mokuroFile of mokuroFiles) {
    const folderName = mokuroFile.name.replace('.mokuro', '');
    const matchingFolder = folders.find(f => f.name === folderName);
    
    if (matchingFolder) {
      const mangaTitle = extractMangaTitle(folderName);
      const volumeNumber = extractVolumeNumber(folderName);
      
      items.push({
        path: path.join(dirPath, folderName),
        type: 'mokuro',
        mangaTitle,
        volumeNumber,
        fileName: folderName,
      });
    }
  }

  // Second pass: Check for CBZ files
  for (const entry of entries) {
    if (entry.isFile() && entry.name.toLowerCase().endsWith('.cbz')) {
      const filename = entry.name.replace(/\.cbz$/i, '');
      const mangaTitle = extractMangaTitle(filename);
      const volumeNumber = extractVolumeNumber(filename);
      
      items.push({
        path: path.join(dirPath, entry.name),
        type: 'cbz',
        mangaTitle,
        volumeNumber,
        fileName: entry.name,
      });
    }
  }

  // Third pass: Check for image folders
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const folderPath = path.join(dirPath, entry.name);
      
      // Skip if already matched as mokuro
      const alreadyMatched = items.some(item => item.path === folderPath);
      if (alreadyMatched) continue;

      // Check if folder contains images
      const folderContents = await fs.promises.readdir(folderPath);
      const imageFiles = folderContents.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);
      });

      if (imageFiles.length > 0) {
        const mangaTitle = extractMangaTitle(entry.name);
        const volumeNumber = extractVolumeNumber(entry.name);
        
        items.push({
          path: folderPath,
          type: 'images',
          mangaTitle,
          volumeNumber,
          fileName: entry.name,
        });
      } else if (recursive) {
        // Recurse into subdirectories
        const subItems = await scanDirectoryForMangaInternal(folderPath, recursive);
        items.push(...subItems);
      }
    }
  }

  return items;
}

/**
 * Scan directory for manga files
 */
ipcMain.handle('scan-directory-for-manga', async (_event, dirPath: string, recursive: boolean) => {
  try {
    return await scanDirectoryForMangaInternal(dirPath, recursive);
  } catch (error) {
    console.error('Error scanning directory:', error);
    throw error;
  }
});

/**
 * Read file as buffer
 */
ipcMain.handle('read-file-as-buffer', async (_event, filePath: string) => {
  try {
    const buffer = await fs.promises.readFile(filePath);
    return new Uint8Array(buffer);
  } catch (error) {
    console.error('Error reading file:', error);
    throw error;
  }
});

/**
 * Create zip from mokuro folder and .mokuro file
 */
ipcMain.handle('create-mokuro-zip', async (_event, folderPath: string) => {
  try {
    const AdmZip = require('adm-zip');
    const zip = new AdmZip();
    
    const folderName = path.basename(folderPath);
    const parentDir = path.dirname(folderPath);
    const mokuroFilePath = path.join(parentDir, `${folderName}.mokuro`);
    
    // Check if mokuro file exists
    if (!fs.existsSync(mokuroFilePath)) {
      throw new Error(`Mokuro file not found: ${mokuroFilePath}`);
    }
    
    // Add the .mokuro file
    zip.addLocalFile(mokuroFilePath);
    
    // Add all files from the folder
    zip.addLocalFolder(folderPath, folderName);
    
    const buffer = zip.toBuffer();
    return new Uint8Array(buffer);
  } catch (error) {
    console.error('Error creating mokuro zip:', error);
    throw error;
  }
});

/**
 * Create CBZ from image folder
 */
ipcMain.handle('create-images-zip', async (_event, folderPath: string) => {
  try {
    const AdmZip = require('adm-zip');
    const zip = new AdmZip();
    
    // Read and add all image files
    const files = await fs.promises.readdir(folderPath);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);
    }).sort(); // Sort to maintain order
    
    for (const imageFile of imageFiles) {
      const imagePath = path.join(folderPath, imageFile);
      zip.addLocalFile(imagePath);
    }
    
    const buffer = zip.toBuffer();
    return new Uint8Array(buffer);
  } catch (error) {
    console.error('Error creating images zip:', error);
    throw error;
  }
});

