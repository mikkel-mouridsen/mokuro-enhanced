import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import AdmZip = require('adm-zip');
import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import { Manga, MangaStatus } from './entities/manga.entity';
import { Volume, VolumeStatus } from './entities/volume.entity';
import { Page } from './entities/page.entity';
import { StorageService } from '../storage/storage.service';
import { VolumeUploadedEvent } from './events/volume-uploaded.event';
import { VolumeProcessedEvent } from './events/volume-processed.event';
import { CreateMangaDto } from './dto/create-manga.dto';

@Injectable()
export class LibraryService {
  private readonly logger = new Logger(LibraryService.name);

  constructor(
    @InjectRepository(Manga)
    private mangaRepository: Repository<Manga>,
    @InjectRepository(Volume)
    private volumeRepository: Repository<Volume>,
    @InjectRepository(Page)
    private pageRepository: Repository<Page>,
    private storageService: StorageService,
    private eventEmitter: EventEmitter2,
  ) {}

  // ==================== MANGA OPERATIONS ====================

  async createManga(createMangaDto: CreateMangaDto, userId: string): Promise<Manga> {
    const manga = this.mangaRepository.create({
      ...createMangaDto,
      userId,
    });
    return this.mangaRepository.save(manga);
  }

  async findAllManga(userId: string): Promise<Manga[]> {
    return this.mangaRepository.find({
      where: { userId },
      relations: ['volumes'],
      order: { lastRead: 'DESC' },
    });
  }

  async findMangaById(id: string, userId: string): Promise<Manga> {
    const manga = await this.mangaRepository.findOne({
      where: { id, userId },
      relations: ['volumes'],
    });

    if (!manga) {
      throw new NotFoundException(`Manga with ID ${id} not found`);
    }

    return manga;
  }

  async updateMangaStats(mangaId: string): Promise<void> {
    const volumes = await this.volumeRepository.find({
      where: { mangaId },
    });

    const volumeCount = volumes.length;
    const unreadCount = volumes.filter((v) => !v.isRead).length;

    await this.mangaRepository.update(mangaId, {
      volumeCount,
      unreadCount,
    });
  }

  // ==================== VOLUME OPERATIONS ====================

  async findVolumesByMangaId(mangaId: string): Promise<Volume[]> {
    return this.volumeRepository.find({
      where: { mangaId },
      order: { volumeNumber: 'ASC' },
    });
  }

  async findVolumeById(id: string): Promise<Volume> {
    const volume = await this.volumeRepository.findOne({
      where: { id },
      relations: ['pages', 'manga'],
    });

    if (!volume) {
      throw new NotFoundException(`Volume with ID ${id} not found`);
    }

    return volume;
  }

  // ==================== UPLOAD OPERATIONS ====================

  /**
   * Process uploaded pre-processed mokuro zip file
   */
  async processUploadedVolume(
    file: Express.Multer.File,
    userId: string,
    mangaTitle?: string,
    volumeNumber?: number,
  ): Promise<Volume> {
    this.logger.log('Processing uploaded volume...');

    try {
      // Extract zip to temp directory
      const zip = new AdmZip(file.buffer);
      const tempDir = path.join(process.cwd(), 'temp', Date.now().toString());
      await fs.mkdir(tempDir, { recursive: true });

      zip.extractAllTo(tempDir, true);

      // Find the mokuro file and cover
      const files = await fs.readdir(tempDir);
      const mokuroFile = files.find((f) => f.endsWith('.mokuro'));

      if (!mokuroFile) {
        throw new Error('No .mokuro file found in zip');
      }

      // Read mokuro metadata
      const mokuroPath = path.join(tempDir, mokuroFile);
      const mokuroContent = await fs.readFile(mokuroPath, 'utf-8');
      let mokuroData = JSON.parse(mokuroContent);

      // Check if mokuroData is wrapped in an object
      if (mokuroData && typeof mokuroData === 'object' && !Array.isArray(mokuroData)) {
        // If it's an object with pages array, extract it
        if (Array.isArray(mokuroData.pages)) {
          mokuroData = mokuroData.pages;
        } else if (Array.isArray(mokuroData.data)) {
          mokuroData = mokuroData.data;
        } else {
          this.logger.error('Unexpected mokuro data structure:', Object.keys(mokuroData));
          throw new Error('Invalid mokuro file structure');
        }
      }

      if (!Array.isArray(mokuroData)) {
        throw new Error('Mokuro data is not an array');
      }

      // Determine manga title and volume number from mokuro file if not provided
      const volumeFolderName = mokuroFile.replace('.mokuro', '');
      const detectedTitle = mangaTitle || this.extractMangaTitle(volumeFolderName);
      const detectedVolumeNumber = volumeNumber || this.extractVolumeNumber(volumeFolderName);

      this.logger.log(`Detected: ${detectedTitle} Volume ${detectedVolumeNumber}`);

      // Find or create manga (for this user)
      let manga = await this.mangaRepository.findOne({
        where: { title: detectedTitle, userId },
      });

      if (!manga) {
        manga = await this.createManga({
          title: detectedTitle,
          status: MangaStatus.ONGOING,
        }, userId);
      }

      // Check if volume already exists
      let volume = await this.volumeRepository.findOne({
        where: {
          mangaId: manga.id,
          volumeNumber: detectedVolumeNumber,
        },
      });

      if (volume) {
        this.logger.log('Volume already exists, updating...');
      } else {
        volume = this.volumeRepository.create({
          mangaId: manga.id,
          volumeNumber: detectedVolumeNumber,
          title: `Volume ${detectedVolumeNumber}`,
          status: VolumeStatus.PROCESSING,
        });
        volume = await this.volumeRepository.save(volume);
      }

      // Create storage directory for this volume
      const volumeStoragePath = `manga/${manga.id}/volume-${detectedVolumeNumber}`;
      await this.storageService.createDirectory(volumeStoragePath);

      // Process pages first
      const volumeFolder = path.join(tempDir, volumeFolderName);
      const pages: Page[] = [];
      
      for (const pageData of mokuroData) {
        const imageName = pageData.img_path;
        const sourceImagePath = path.join(volumeFolder, imageName);

        if (!existsSync(sourceImagePath)) {
          this.logger.warn(`Image not found: ${sourceImagePath}`);
          continue;
        }

        // Copy image to storage
        const imageDestPath = `${volumeStoragePath}/${imageName}`;
        await this.storageService.copy(sourceImagePath, imageDestPath);

        // Extract page number from filename (e.g., "001.jpg" -> 1)
        const pageNumber = parseInt(imageName.replace(/\D/g, ''), 10);

        // Create page entity
        const page = this.pageRepository.create({
          volumeId: volume.id,
          pageNumber,
          imagePath: imageDestPath,
          imageUrl: this.storageService.getFileUrl(imageDestPath),
          textBlocks: {
            blocks: pageData.blocks,
            img_width: pageData.img_width,
            img_height: pageData.img_height,
            version: pageData.version,
          },
        });

        pages.push(page);
      }

      // Save all pages
      await this.pageRepository.save(pages);

      // Determine cover URL
      let coverUrl: string | null = null;
      const coverFile = path.join(tempDir, 'cover.jpg');
      
      if (existsSync(coverFile)) {
        // Use separate cover.jpg if it exists
        const coverDestPath = `${volumeStoragePath}/cover.jpg`;
        await this.storageService.copy(coverFile, coverDestPath);
        coverUrl = this.storageService.getFileUrl(coverDestPath);
        this.logger.log(`Using cover.jpg: ${coverUrl}`);
      } else if (pages.length > 0) {
        // Fallback to first page
        coverUrl = pages[0].imageUrl;
        this.logger.log(`No cover.jpg found, using first page as cover: ${coverUrl}`);
      } else {
        this.logger.warn(`No cover and no pages found for volume ${volume.id}`);
      }

      // Update volume
      volume.status = VolumeStatus.COMPLETED;
      volume.pageCount = pages.length;
      volume.storagePath = volumeStoragePath;
      if (coverUrl) {
        volume.coverUrl = coverUrl;
      }
      volume.metadata = {
        totalPages: mokuroData.length,
        processedAt: new Date().toISOString(),
      };

      volume = await this.volumeRepository.save(volume);
      this.logger.log(`Volume saved - ID: ${volume.id}, Cover: ${volume.coverUrl || 'none'}`);

      // Update manga cover if not set
      if (!manga.coverUrl && coverUrl) {
        manga.coverUrl = coverUrl;
        await this.mangaRepository.save(manga);
        this.logger.log(`Manga cover updated - ID: ${manga.id}, Cover: ${manga.coverUrl}`);
      }

      // Update manga stats
      await this.updateMangaStats(manga.id);

      // Clean up temp directory
      await fs.rm(tempDir, { recursive: true, force: true });

      // Emit events
      this.eventEmitter.emit('volume.uploaded', new VolumeUploadedEvent(volume, volumeStoragePath));
      this.eventEmitter.emit('volume.processed', new VolumeProcessedEvent(volume, true));

      this.logger.log(`Successfully processed volume ${volume.id}`);

      return volume;
    } catch (error) {
      this.logger.error('Failed to process volume', error);
      throw error;
    }
  }

  /**
   * Extract manga title from folder name
   * Example: "Dandadan-01" -> "Dandadan"
   */
  private extractMangaTitle(folderName: string): string {
    // Remove volume number patterns
    return folderName
      .replace(/-\d+$/, '') // Remove "-01" pattern
      .replace(/Vol\.\d+/i, '')
      .replace(/Volume\s*\d+/i, '')
      .trim();
  }

  /**
   * Extract volume number from folder name
   * Example: "Dandadan-01" -> 1
   */
  private extractVolumeNumber(folderName: string): number {
    const match = folderName.match(/\d+$/);
    return match ? parseInt(match[0], 10) : 1;
  }

  // ==================== PAGE OPERATIONS ====================

  async findPagesByVolumeId(volumeId: string): Promise<Page[]> {
    return this.pageRepository.find({
      where: { volumeId },
      order: { pageNumber: 'ASC' },
    });
  }

  async markPageAsRead(pageId: string): Promise<Page> {
    const page = await this.pageRepository.findOne({
      where: { id: pageId },
    });

    if (!page) {
      throw new NotFoundException(`Page with ID ${pageId} not found`);
    }

    page.isRead = true;
    return this.pageRepository.save(page);
  }

  async updateVolumeProgress(volumeId: string): Promise<void> {
    const pages = await this.pageRepository.find({
      where: { volumeId },
    });

    const readPages = pages.filter((p) => p.isRead).length;
    const progress = pages.length > 0 ? (readPages / pages.length) * 100 : 0;
    const isRead = progress === 100;

    await this.volumeRepository.update(volumeId, {
      progress,
      isRead,
    });

    // Update manga stats
    const volume = await this.volumeRepository.findOne({
      where: { id: volumeId },
    });

    if (volume) {
      await this.updateMangaStats(volume.mangaId);
      
      // Update manga lastRead date
      await this.mangaRepository.update(volume.mangaId, {
        lastRead: new Date(),
      });
    }
  }
}

