/**
 * Electron platform implementation
 */

import { IPlatformAPI, Platform, BulkImportItem } from './platform.types';

declare global {
  interface Window {
    electronAPI: {
      openFileDialog: () => Promise<string | null>;
      openFolderDialog: () => Promise<string | null>;
      readDirectory: (dirPath: string) => Promise<string[]>;
      checkYomitanInstalled: () => Promise<boolean>;
      installYomitan: () => Promise<{ success: boolean; message: string }>;
      getAppPath: (name: string) => Promise<string>;
      sendYomitanEvent: (state: boolean) => void;
      openYomitanSettings: () => Promise<void>;
      checkYomitanLoaded: () => Promise<boolean>;
      getYomitanExtensionId: () => Promise<string | null>;
      scanDirectoryForManga: (dirPath: string, recursive: boolean) => Promise<BulkImportItem[]>;
      readFileAsBuffer: (filePath: string) => Promise<Uint8Array>;
      createMokuroZip: (folderPath: string) => Promise<Uint8Array>;
      createImagesZip: (folderPath: string) => Promise<Uint8Array>;
    };
  }
}

/**
 * Electron platform API implementation
 */
export class ElectronPlatform implements IPlatformAPI {
  readonly platform = Platform.ELECTRON;
  readonly isElectron = true;
  readonly isWeb = false;

  constructor() {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }
  }

  // File operations
  async openFileDialog(): Promise<string | null> {
    return window.electronAPI.openFileDialog();
  }

  async openFolderDialog(): Promise<string | null> {
    return window.electronAPI.openFolderDialog();
  }

  async readDirectory(dirPath: string): Promise<string[]> {
    return window.electronAPI.readDirectory(dirPath);
  }

  async scanDirectoryForManga(dirPath: string, recursive: boolean): Promise<BulkImportItem[]> {
    return window.electronAPI.scanDirectoryForManga(dirPath, recursive);
  }

  async readFileAsBuffer(filePath: string): Promise<Uint8Array> {
    return window.electronAPI.readFileAsBuffer(filePath);
  }

  async createMokuroZip(folderPath: string): Promise<Uint8Array> {
    return window.electronAPI.createMokuroZip(folderPath);
  }

  async createImagesZip(folderPath: string): Promise<Uint8Array> {
    return window.electronAPI.createImagesZip(folderPath);
  }

  // Yomitan operations
  async checkYomitanInstalled(): Promise<boolean> {
    return window.electronAPI.checkYomitanInstalled();
  }

  async installYomitan(): Promise<{ success: boolean; message: string }> {
    return window.electronAPI.installYomitan();
  }

  async openYomitanSettings(): Promise<void> {
    return window.electronAPI.openYomitanSettings();
  }

  async checkYomitanLoaded(): Promise<boolean> {
    return window.electronAPI.checkYomitanLoaded();
  }

  async getYomitanExtensionId(): Promise<string | null> {
    return window.electronAPI.getYomitanExtensionId();
  }

  sendYomitanEvent(state: boolean): void {
    window.electronAPI.sendYomitanEvent(state);
  }

  // App operations
  async getAppPath(name: string): Promise<string> {
    return window.electronAPI.getAppPath(name);
  }
}

