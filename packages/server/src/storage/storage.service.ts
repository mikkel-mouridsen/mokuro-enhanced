import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly storageType: string;
  private readonly storagePath: string;

  constructor(private configService: ConfigService) {
    this.storageType = this.configService.get('STORAGE_TYPE', 'local');
    this.storagePath = this.configService.get(
      'STORAGE_PATH',
      './uploads',
    );

    // Create storage directory if it doesn't exist
    if (this.storageType === 'local') {
      this.ensureStorageDirectory();
    }
  }

  private async ensureStorageDirectory() {
    try {
      if (!existsSync(this.storagePath)) {
        await fs.mkdir(this.storagePath, { recursive: true });
        this.logger.log(`Created storage directory: ${this.storagePath}`);
      }
    } catch (error) {
      this.logger.error('Failed to create storage directory', error);
      throw error;
    }
  }

  /**
   * Save a file to storage
   */
  async saveFile(
    file: Express.Multer.File,
    destinationPath: string,
  ): Promise<string> {
    if (this.storageType === 'local') {
      return this.saveFileLocal(file, destinationPath);
    }
    // TODO: Add S3 support
    throw new Error(`Storage type ${this.storageType} not implemented`);
  }

  /**
   * Save file to local storage
   */
  private async saveFileLocal(
    file: Express.Multer.File,
    destinationPath: string,
  ): Promise<string> {
    const fullPath = path.join(this.storagePath, destinationPath);
    const directory = path.dirname(fullPath);

    // Ensure directory exists
    if (!existsSync(directory)) {
      await fs.mkdir(directory, { recursive: true });
    }

    // Write file
    await fs.writeFile(fullPath, file.buffer);
    this.logger.log(`Saved file to: ${fullPath}`);

    return fullPath;
  }

  /**
   * Save buffer to storage
   */
  async save(relativePath: string, buffer: Buffer): Promise<string> {
    if (this.storageType === 'local') {
      const fullPath = path.join(this.storagePath, relativePath);
      const directory = path.dirname(fullPath);

      // Ensure directory exists
      if (!existsSync(directory)) {
        await fs.mkdir(directory, { recursive: true });
      }

      // Write file
      await fs.writeFile(fullPath, buffer);
      this.logger.log(`Saved buffer to: ${fullPath}`);

      return fullPath;
    }
    throw new Error(`Storage type ${this.storageType} not implemented`);
  }

  /**
   * Create a directory
   */
  async createDirectory(directoryPath: string): Promise<string> {
    if (this.storageType === 'local') {
      const fullPath = path.join(this.storagePath, directoryPath);
      if (!existsSync(fullPath)) {
        await fs.mkdir(fullPath, { recursive: true });
      }
      return fullPath;
    }
    throw new Error(`Storage type ${this.storageType} not implemented`);
  }

  /**
   * Copy a file or directory
   */
  async copy(sourcePath: string, destinationPath: string): Promise<void> {
    if (this.storageType === 'local') {
      const fullDestPath = path.join(this.storagePath, destinationPath);
      const destDir = path.dirname(fullDestPath);

      if (!existsSync(destDir)) {
        await fs.mkdir(destDir, { recursive: true });
      }

      await fs.copyFile(sourcePath, fullDestPath);
      return;
    }
    throw new Error(`Storage type ${this.storageType} not implemented`);
  }

  /**
   * Get storage root path
   */
  getStorageRoot(): string {
    return this.storagePath;
  }

  /**
   * Get full path for a file
   */
  getFullPath(relativePath: string): string {
    if (this.storageType === 'local') {
      return path.join(this.storagePath, relativePath);
    }
    throw new Error(`Storage type ${this.storageType} not implemented`);
  }

  /**
   * Get URL for accessing a file
   */
  getFileUrl(relativePath: string): string {
    if (this.storageType === 'local') {
      // For local storage, we'll serve files through the API
      const baseUrl = this.configService.get('API_BASE_URL', 'http://localhost:3000');
      return `${baseUrl}/files/${relativePath}`;
    }
    // TODO: For S3, return the S3 URL
    throw new Error(`Storage type ${this.storageType} not implemented`);
  }

  /**
   * Read a file
   */
  async readFile(relativePath: string): Promise<Buffer> {
    if (this.storageType === 'local') {
      const fullPath = path.join(this.storagePath, relativePath);
      return fs.readFile(fullPath);
    }
    throw new Error(`Storage type ${this.storageType} not implemented`);
  }

  /**
   * Check if file exists
   */
  async fileExists(relativePath: string): Promise<boolean> {
    if (this.storageType === 'local') {
      const fullPath = path.join(this.storagePath, relativePath);
      return existsSync(fullPath);
    }
    throw new Error(`Storage type ${this.storageType} not implemented`);
  }

  /**
   * Delete a file or directory
   */
  async delete(relativePath: string): Promise<void> {
    if (this.storageType === 'local') {
      const fullPath = path.join(this.storagePath, relativePath);
      if (existsSync(fullPath)) {
        await fs.rm(fullPath, { recursive: true, force: true });
        this.logger.log(`Deleted: ${fullPath}`);
      }
      return;
    }
    throw new Error(`Storage type ${this.storageType} not implemented`);
  }

  /**
   * Delete a directory
   */
  async deleteDirectory(relativePath: string): Promise<void> {
    return this.delete(relativePath);
  }

  /**
   * Move a file or directory
   */
  async move(sourcePath: string, destinationPath: string): Promise<void> {
    if (this.storageType === 'local') {
      const fullSourcePath = path.join(this.storagePath, sourcePath);
      const fullDestPath = path.join(this.storagePath, destinationPath);
      
      this.logger.log(`🔍 Move operation: ${fullSourcePath} -> ${fullDestPath}`);
      
      if (!existsSync(fullSourcePath)) {
        this.logger.error(`❌ Source path does not exist: ${fullSourcePath}`);
        throw new Error(`Source path does not exist: ${fullSourcePath}`);
      }

      this.logger.log(`✅ Source exists, checking destination directory...`);
      
      const destDir = path.dirname(fullDestPath);
      if (!existsSync(destDir)) {
        this.logger.log(`📁 Creating destination directory: ${destDir}`);
        await fs.mkdir(destDir, { recursive: true });
      }

      this.logger.log(`🚀 Performing rename/move...`);
      await fs.rename(fullSourcePath, fullDestPath);
      this.logger.log(`✅ Successfully moved: ${fullSourcePath} -> ${fullDestPath}`);
      
      // Verify the move
      if (existsSync(fullDestPath)) {
        this.logger.log(`✅ Verified: Destination exists at ${fullDestPath}`);
      } else {
        this.logger.error(`❌ CRITICAL: Move appeared to succeed but destination doesn't exist!`);
      }
      
      return;
    }
    throw new Error(`Storage type ${this.storageType} not implemented`);
  }

  /**
   * Move a directory
   */
  async moveDirectory(sourcePath: string, destinationPath: string): Promise<void> {
    return this.move(sourcePath, destinationPath);
  }
}

