/**
 * Bulk Import Service - Client-side directory scanning and file uploading
 * This runs in the Electron app with access to the local filesystem
 */

import { libraryApi } from '../api/library.api';

export interface BulkImportItem {
  path: string;
  type: 'cbz' | 'mokuro' | 'images';
  mangaTitle: string;
  volumeNumber: number;
  fileName: string;
}

export interface BulkImportResult {
  found: number;
  queued: number;
  skipped: number;
  failed: number;
  items: Array<{
    path: string;
    type: 'cbz' | 'mokuro' | 'images';
    mangaTitle: string;
    volumeNumber: number;
    status: 'queued' | 'skipped' | 'failed';
    volumeId?: string;
    error?: string;
  }>;
}

export interface BulkImportProgress {
  current: number;
  total: number;
  currentFile: string;
  status: string;
}

export class BulkImportService {
  /**
   * Check if electron API is available
   */
  private checkElectronAPI() {
    if (!window.electronAPI || !window.electronAPI.scanDirectoryForManga) {
      throw new Error('File system access not available. This feature requires the desktop app.');
    }
  }

  /**
   * Scan a directory for importable manga files
   */
  async scanDirectory(
    directoryPath: string,
    recursive: boolean = false
  ): Promise<BulkImportItem[]> {
    this.checkElectronAPI();
    
    try {
      const items = await window.electronAPI.scanDirectoryForManga(directoryPath, recursive);
      return items;
    } catch (error) {
      console.error('Error scanning directory:', error);
      throw error;
    }
  }

  /**
   * Create a zip file from a folder and .mokuro file
   */
  private async createMokuroZip(item: BulkImportItem): Promise<Blob> {
    this.checkElectronAPI();
    const buffer = await window.electronAPI.createMokuroZip(item.path);
    // Convert Uint8Array to ArrayBuffer for Blob
    return new Blob([buffer.buffer as ArrayBuffer], { type: 'application/zip' });
  }

  /**
   * Create a CBZ file from a folder of images
   */
  private async createImagesZip(item: BulkImportItem): Promise<Blob> {
    this.checkElectronAPI();
    const buffer = await window.electronAPI.createImagesZip(item.path);
    // Convert Uint8Array to ArrayBuffer for Blob
    return new Blob([buffer.buffer as ArrayBuffer], { type: 'application/x-cbz' });
  }

  /**
   * Read a CBZ file as a Blob
   */
  private async readCbzFile(filePath: string): Promise<Blob> {
    this.checkElectronAPI();
    const buffer = await window.electronAPI.readFileAsBuffer(filePath);
    // Convert Uint8Array to ArrayBuffer for Blob
    return new Blob([buffer.buffer as ArrayBuffer], { type: 'application/x-cbz' });
  }

  /**
   * Bulk import items with progress tracking
   */
  async bulkImport(
    items: BulkImportItem[],
    options: {
      mangaTitleOverride?: string;
      onProgress?: (progress: BulkImportProgress) => void;
    } = {}
  ): Promise<BulkImportResult> {
    const result: BulkImportResult = {
      found: items.length,
      queued: 0,
      skipped: 0,
      failed: 0,
      items: [],
    };

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const mangaTitle = options.mangaTitleOverride || item.mangaTitle;

      // Report progress
      if (options.onProgress) {
        options.onProgress({
          current: i + 1,
          total: items.length,
          currentFile: item.fileName,
          status: 'uploading',
        });
      }

      try {
        let file: File;
        let fileName: string;

        console.log(`Processing ${item.type}: ${item.fileName}`);

        // Prepare the file based on type
        if (item.type === 'cbz') {
          console.log(`Reading CBZ file: ${item.path}`);
          const blob = await this.readCbzFile(item.path);
          console.log(`CBZ file read successfully, size: ${blob.size} bytes`);
          fileName = item.fileName;
          file = new File([blob], fileName, { type: 'application/x-cbz' });
        } else if (item.type === 'mokuro') {
          console.log(`Creating mokuro zip for: ${item.path}`);
          const blob = await this.createMokuroZip(item);
          console.log(`Mokuro zip created, size: ${blob.size} bytes`);
          fileName = `${item.fileName}.zip`;
          file = new File([blob], fileName, { type: 'application/zip' });
        } else if (item.type === 'images') {
          console.log(`Creating images zip for: ${item.path}`);
          const blob = await this.createImagesZip(item);
          console.log(`Images zip created, size: ${blob.size} bytes`);
          fileName = `${item.fileName}.cbz`;
          file = new File([blob], fileName, { type: 'application/x-cbz' });
        } else {
          throw new Error(`Unknown item type: ${item.type}`);
        }

        console.log(`Uploading ${fileName} (${file.size} bytes)`);

        // Upload the file using existing APIs
        let volume;
        if (item.type === 'cbz' || item.type === 'images') {
          volume = await libraryApi.uploadCbz(file, {
            mangaTitle,
            volumeNumber: item.volumeNumber,
          });
        } else {
          volume = await libraryApi.uploadVolume(file, {
            mangaTitle,
            volumeNumber: item.volumeNumber,
          });
        }
        
        console.log(`Upload successful, volume ID: ${volume.id}`);

        result.queued++;
        result.items.push({
          path: item.path,
          type: item.type,
          mangaTitle,
          volumeNumber: item.volumeNumber,
          status: 'queued',
          volumeId: volume.id,
        });
      } catch (error: any) {
        console.error(`Failed to import ${item.fileName}:`, error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          response: error.response?.data,
        });
        result.failed++;
        result.items.push({
          path: item.path,
          type: item.type,
          mangaTitle,
          volumeNumber: item.volumeNumber,
          status: 'failed',
          error: error.response?.data?.message || error.message || 'Upload failed',
        });
      }
    }

    return result;
  }
}

export const bulkImportService = new BulkImportService();

