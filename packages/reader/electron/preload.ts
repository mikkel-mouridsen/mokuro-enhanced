import { contextBridge, ipcRenderer } from 'electron';

export interface BulkImportItem {
  path: string;
  type: 'cbz' | 'mokuro' | 'images';
  mangaTitle: string;
  volumeNumber: number;
  fileName: string;
}

export interface ElectronAPI {
  openFileDialog: () => Promise<string | null>;
  openFolderDialog: () => Promise<string | null>;
  readDirectory: (dirPath: string) => Promise<string[]>;
  checkYomitanInstalled: () => Promise<boolean>;
  installYomitan: () => Promise<{ success: boolean; message: string }>;
  getAppPath: (name: string) => Promise<string>;
  // Yomitan APIs
  sendYomitanEvent: (state: boolean) => void;
  openYomitanSettings: () => Promise<void>;
  checkYomitanLoaded: () => Promise<boolean>;
  getYomitanExtensionId: () => Promise<string | null>;
  // Bulk Import APIs
  scanDirectoryForManga: (dirPath: string, recursive: boolean) => Promise<BulkImportItem[]>;
  readFileAsBuffer: (filePath: string) => Promise<Uint8Array>;
  createMokuroZip: (folderPath: string) => Promise<Uint8Array>;
  createImagesZip: (folderPath: string) => Promise<Uint8Array>;
}

const electronAPI: ElectronAPI = {
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  openFolderDialog: () => ipcRenderer.invoke('open-folder-dialog'),
  readDirectory: (dirPath: string) => ipcRenderer.invoke('read-directory', dirPath),
  checkYomitanInstalled: () => ipcRenderer.invoke('check-yomitan-installed'),
  installYomitan: () => ipcRenderer.invoke('install-yomitan'),
  getAppPath: (name: string) => ipcRenderer.invoke('get-app-path', name),
  // Yomitan APIs
  sendYomitanEvent: (state: boolean) => {
    ipcRenderer.send('yomitan-event', state);
  },
  openYomitanSettings: () => ipcRenderer.invoke('open-yomitan-settings'),
  checkYomitanLoaded: () => ipcRenderer.invoke('check-yomitan-loaded'),
  getYomitanExtensionId: () => ipcRenderer.invoke('get-yomitan-extension-id'),
  // Bulk Import APIs
  scanDirectoryForManga: (dirPath: string, recursive: boolean) => 
    ipcRenderer.invoke('scan-directory-for-manga', dirPath, recursive),
  readFileAsBuffer: (filePath: string) => 
    ipcRenderer.invoke('read-file-as-buffer', filePath),
  createMokuroZip: (folderPath: string) => 
    ipcRenderer.invoke('create-mokuro-zip', folderPath),
  createImagesZip: (folderPath: string) => 
    ipcRenderer.invoke('create-images-zip', folderPath),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

