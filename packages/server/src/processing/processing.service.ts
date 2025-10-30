import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Volume, VolumeStatus } from '../library/entities/volume.entity';
import { Page } from '../library/entities/page.entity';
import { Manga, MangaStatus } from '../library/entities/manga.entity';
import { QueueService, ProgressUpdate } from '../queue/queue.service';
import { StorageService } from '../storage/storage.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ProcessingService {
  private readonly logger = new Logger(ProcessingService.name);

  constructor(
    @InjectRepository(Volume)
    private volumeRepository: Repository<Volume>,
    @InjectRepository(Page)
    private pageRepository: Repository<Page>,
    @InjectRepository(Manga)
    private mangaRepository: Repository<Manga>,
    private queueService: QueueService,
    private storageService: StorageService,
  ) {}

  /**
   * Process uploaded CBZ file
   */
  async processCbzFile(
    file: Express.Multer.File,
    userId: string,
    mangaTitle?: string,
    volumeNumber?: number,
  ): Promise<Volume> {
    this.logger.log('Processing CBZ file...');

    // Generate job ID
    const jobId = uuidv4();

    // Extract manga title and volume number from filename if not provided
    const filename = file.originalname.replace(/\.cbz$/i, '');
    const detectedTitle = mangaTitle || this.extractMangaTitle(filename);
    const detectedVolumeNumber = volumeNumber !== undefined ? volumeNumber : this.extractVolumeNumber(filename);

    this.logger.log(`Detected: ${detectedTitle} Volume ${detectedVolumeNumber}`);

    // Find or create manga
    let manga = await this.mangaRepository.findOne({
      where: { title: detectedTitle, userId },
    });

    if (!manga) {
      manga = this.mangaRepository.create({
        title: detectedTitle,
        userId,
        status: MangaStatus.ONGOING,
      });
      manga = await this.mangaRepository.save(manga);
    }

    if (!manga) {
      throw new Error('Failed to create or find manga');
    }

    // Check if volume already exists
    let volume = await this.volumeRepository.findOne({
      where: {
        mangaId: manga.id,
        volumeNumber: detectedVolumeNumber,
      },
    });

    if (volume) {
      // Update existing volume
      volume.status = VolumeStatus.PROCESSING;
      volume.progress = 0;
    } else {
      // Create new volume
      volume = this.volumeRepository.create({
        mangaId: manga.id,
        volumeNumber: detectedVolumeNumber,
        title: `Volume ${detectedVolumeNumber}`,
        status: VolumeStatus.PROCESSING,
        progress: 0,
      });
    }

    volume = await this.volumeRepository.save(volume);

    // Save CBZ file to storage
    const cbzPath = `manga/${manga.id}/cbz/volume-${detectedVolumeNumber}.cbz`;
    await this.storageService.saveFile(file, cbzPath);

    // Set output path for mokuro file
    const outputPath = `manga/${manga.id}/volume-${detectedVolumeNumber}/volume.mokuro`;
    const fullCbzPath = path.join(this.storageService.getStorageRoot(), cbzPath);
    const fullOutputPath = path.join(this.storageService.getStorageRoot(), outputPath);

    // Add job to queue
    await this.queueService.addJob({
      jobId,
      volumeId: volume.id,
      cbzPath: fullCbzPath,
      outputPath: fullOutputPath,
      userId,
      mangaTitle: detectedTitle,
      volumeNumber: detectedVolumeNumber,
    });

    this.logger.log(`Job ${jobId} created for volume ${volume.id}`);

    // Store job ID in volume metadata
    volume.metadata = {
      ...volume.metadata,
      jobId,
    };
    await this.volumeRepository.save(volume);

    return volume;
  }

  /**
   * Handle progress updates from worker
   */
  @OnEvent('mokuro.progress')
  async handleProgressUpdate(update: ProgressUpdate) {
    this.logger.debug(`Progress update received: ${update.jobId} - ${update.progress}%`);

    // Find volume by job ID
    const volume = await this.volumeRepository.findOne({
      where: {
        metadata: {
          jobId: update.jobId,
        } as any,
      },
    });

    if (!volume) {
      this.logger.warn(`Volume not found for job ${update.jobId}`);
      return;
    }

    // Update volume progress
    volume.progress = update.progress;

    if (update.status === 'completed') {
      this.logger.log(`Job ${update.jobId} completed, finalizing volume ${volume.id}`);
      await this.finalizeVolume(volume, update.jobId);
    } else if (update.status === 'failed') {
      this.logger.error(`Job ${update.jobId} failed: ${update.message}`);
      volume.status = VolumeStatus.FAILED;
      await this.volumeRepository.save(volume);
    } else {
      await this.volumeRepository.save(volume);
    }
  }

  /**
   * Finalize volume after processing
   */
  private async finalizeVolume(volume: Volume, jobId: string) {
    try {
      // Get job result
      const result = await this.queueService.getJobResult(jobId);

      if (!result || !result.success) {
        throw new Error('Job result not found or failed');
      }

      // Read mokuro data
      const mokuroData = result.mokuroData;

      if (!mokuroData || !mokuroData.pages) {
        throw new Error('Invalid mokuro data structure');
      }

      // Get manga for storage paths
      const manga = await this.mangaRepository.findOne({
        where: { id: volume.mangaId },
      });

      if (!manga) {
        throw new Error('Manga not found');
      }

      // Extract images from CBZ and create pages
      const volumeStoragePath = `manga/${manga.id}/volume-${volume.volumeNumber}`;
      await this.extractAndStoreImages(volume, mokuroData, volumeStoragePath);

      // Update volume
      volume.status = VolumeStatus.COMPLETED;
      volume.progress = 100;
      volume.pageCount = mokuroData.pages.length;
      volume.storagePath = volumeStoragePath;
      
      // Store mokuro metadata in volume
      volume.metadata = {
        ...volume.metadata,
        mokuroVersion: mokuroData.version,
        titleUuid: mokuroData.title_uuid,
        volumeUuid: mokuroData.volume_uuid,
      };

      await this.volumeRepository.save(volume);

      this.logger.log(`Volume ${volume.id} finalized successfully`);
    } catch (error) {
      this.logger.error(`Error finalizing volume ${volume.id}:`, error);
      volume.status = VolumeStatus.FAILED;
      await this.volumeRepository.save(volume);
    }
  }

  /**
   * Extract images from CBZ and store with mokuro data
   */
  private async extractAndStoreImages(
    volume: Volume,
    mokuroData: any,
    volumeStoragePath: string,
  ) {
    const AdmZip = require('adm-zip');
    const manga = await this.mangaRepository.findOne({
      where: { id: volume.mangaId },
    });

    if (!manga) {
      throw new Error(`Manga not found for volume ${volume.id}`);
    }

    const cbzPath = path.join(
      this.storageService.getStorageRoot(),
      `manga/${manga.id}/cbz/volume-${volume.volumeNumber}.cbz`,
    );

    // Extract CBZ
    const zip = new AdmZip(cbzPath);
    const tempDir = path.join(process.cwd(), 'temp', Date.now().toString());
    await fs.mkdir(tempDir, { recursive: true });

    try {
      zip.extractAllTo(tempDir, true);

      // Process pages
      const pages: Page[] = [];
      
      for (let i = 0; i < mokuroData.pages.length; i++) {
        const pageData = mokuroData.pages[i];
        const imageName = path.basename(pageData.img_path);
        
        // Find the image in temp directory
        const findImage = async (dir: string, name: string): Promise<string | null> => {
          const files = await fs.readdir(dir, { withFileTypes: true });
          
          for (const file of files) {
            const fullPath = path.join(dir, file.name);
            
            if (file.isDirectory()) {
              const found = await findImage(fullPath, name);
              if (found) return found;
            } else if (file.name === name) {
              return fullPath;
            }
          }
          
          return null;
        };

        const sourceImagePath = await findImage(tempDir, imageName);
        
        if (!sourceImagePath) {
          this.logger.warn(`Image not found: ${imageName}`);
          continue;
        }

        // Copy image to storage
        const imageDestPath = `${volumeStoragePath}/${imageName}`;
        await this.storageService.copy(sourceImagePath, imageDestPath);

        // Create page entity
        const page = this.pageRepository.create({
          volumeId: volume.id,
          pageNumber: i + 1,
          imagePath: imageDestPath,
          imageUrl: this.storageService.getFileUrl(imageDestPath),
          textBlocks: {
            blocks: pageData.blocks,
            img_width: pageData.img_width,
            img_height: pageData.img_height,
            version: mokuroData.version,
          },
        });

        pages.push(page);
      }

      // Save all pages
      await this.pageRepository.save(pages);

      // Handle cover image (first page)
      if (pages.length > 0) {
        volume.coverUrl = pages[0].imageUrl;
        
        // Update manga cover if not set
        if (!manga.coverUrl) {
          manga.coverUrl = pages[0].imageUrl;
          await this.mangaRepository.save(manga);
        }
      }
    } finally {
      // Cleanup temp directory
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }

  /**
   * Extract manga title from filename
   */
  private extractMangaTitle(filename: string): string {
    // Remove common patterns like volume numbers, brackets, etc.
    let title = filename
      .replace(/[_-]v?\d+$/i, '') // Remove volume numbers
      .replace(/[_-]volume[_-]?\d+$/i, '')
      .replace(/[_-]vol[_-]?\d+$/i, '')
      .replace(/\[.*?\]/g, '') // Remove bracketed content
      .replace(/\(.*?\)/g, '') // Remove parenthesized content
      .replace(/[_-]+/g, ' ') // Replace underscores/dashes with spaces
      .trim();

    return title || 'Unknown Manga';
  }

  /**
   * Extract volume number from filename
   */
  private extractVolumeNumber(filename: string): number {
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

    return 1; // Default to volume 1
  }

  /**
   * Get volume processing status
   */
  async getVolumeStatus(volumeId: string) {
    const volume = await this.volumeRepository.findOne({
      where: { id: volumeId },
    });

    if (!volume) {
      return null;
    }

    return {
      id: volume.id,
      status: volume.status,
      progress: volume.progress,
      pageCount: volume.pageCount,
    };
  }
}

