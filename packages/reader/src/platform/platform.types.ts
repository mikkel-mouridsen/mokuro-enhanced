/**
 * Platform detection and types
 */

export enum Platform {
  ELECTRON = 'electron',
  WEB = 'web',
}

export interface BulkImportItem {
  path: string;
  type: 'cbz' | 'mokuro' | 'images';
  mangaTitle: string;
  volumeNumber: number;
  fileName: string;
}

/**
 * Platform-specific API interface
 * Electron provides full file system access and bundled Yomitan
 * Web provides limited functionality (no folder upload, no bundled Yomitan)
 */
export interface IPlatformAPI {
  // Platform detection
  readonly platform: Platform;
  readonly isElectron: boolean;
  readonly isWeb: boolean;

  // File operations (Electron only)
  openFileDialog?: () => Promise<string | null>;
  openFolderDialog?: () => Promise<string | null>;
  readDirectory?: (dirPath: string) => Promise<string[]>;
  scanDirectoryForManga?: (dirPath: string, recursive: boolean) => Promise<BulkImportItem[]>;
  readFileAsBuffer?: (filePath: string) => Promise<Uint8Array>;
  createMokuroZip?: (folderPath: string) => Promise<Uint8Array>;
  createImagesZip?: (folderPath: string) => Promise<Uint8Array>;

  // Yomitan operations (Electron only - bundled Yomitan)
  checkYomitanInstalled?: () => Promise<boolean>;
  installYomitan?: () => Promise<{ success: boolean; message: string }>;
  openYomitanSettings?: () => Promise<void>;
  checkYomitanLoaded?: () => Promise<boolean>;
  getYomitanExtensionId?: () => Promise<string | null>;
  sendYomitanEvent?: (state: boolean) => void;

  // App operations
  getAppPath?: (name: string) => Promise<string>;
}

