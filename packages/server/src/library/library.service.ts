import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
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
import { UpdateMangaDto } from './dto/update-manga.dto';
import { UpdateVolumeDto, MoveVolumeDto } from './dto/update-volume.dto';

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

  async updateManga(id: string, updateDto: UpdateMangaDto, userId: string): Promise<Manga> {
    const manga = await this.findMangaById(id, userId);
    
    // Update fields
    Object.assign(manga, updateDto);
    
    return this.mangaRepository.save(manga);
  }

  async deleteManga(id: string, userId: string): Promise<void> {
    const manga = await this.findMangaById(id, userId);
    
    // Delete all volumes and their files
    const volumes = await this.volumeRepository.find({
      where: { mangaId: id },
    });

    for (const volume of volumes) {
      if (volume.storagePath) {
        try {
          await this.storageService.deleteDirectory(volume.storagePath);
        } catch (error) {
          this.logger.warn(`Failed to delete storage for volume ${volume.id}: ${error.message}`);
        }
      }
    }

    // Delete manga directory if exists
    try {
      await this.storageService.deleteDirectory(`manga/${id}`);
    } catch (error) {
      this.logger.warn(`Failed to delete manga directory: ${error.message}`);
    }

    // Delete from database (cascades to volumes and pages)
    await this.mangaRepository.remove(manga);
    
    this.logger.log(`Deleted manga ${id} with ${volumes.length} volumes`);
  }

  // ==================== VOLUME OPERATIONS ====================

  async findVolumesByMangaId(mangaId: string): Promise<Volume[]> {
    const volumes = await this.volumeRepository.find({
      where: { mangaId },
      order: { volumeNumber: 'ASC' },
    });
    this.logger.log(`📋 Finding volumes for manga ${mangaId}: Found ${volumes.length} volumes`);
    volumes.forEach(v => {
      this.logger.log(`   - Volume ${v.volumeNumber}: ID=${v.id}, MangaID=${v.mangaId}, Path=${v.storagePath}`);
    });
    return volumes;
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

  async updateVolume(id: string, updateDto: UpdateVolumeDto): Promise<Volume> {
    const volume = await this.findVolumeById(id);
    
    // Update fields
    Object.assign(volume, updateDto);
    
    const updatedVolume = await this.volumeRepository.save(volume);
    
    // Update manga stats
    await this.updateMangaStats(volume.mangaId);
    
    return updatedVolume;
  }

  async deleteVolume(id: string): Promise<void> {
    const volume = await this.findVolumeById(id);
    const mangaId = volume.mangaId;
    
    // Delete volume files
    if (volume.storagePath) {
      try {
        await this.storageService.deleteDirectory(volume.storagePath);
      } catch (error) {
        this.logger.warn(`Failed to delete storage for volume ${id}: ${error.message}`);
      }
    }
    
    // Delete from database (cascades to pages)
    await this.volumeRepository.remove(volume);
    
    // Update manga stats
    await this.updateMangaStats(mangaId);
    
    this.logger.log(`Deleted volume ${id}`);
  }

  async moveVolume(id: string, moveDto: MoveVolumeDto): Promise<Volume> {
    const volume = await this.findVolumeById(id);
    const sourceMangaId = volume.mangaId;
    
    // Verify target manga exists
    const targetManga = await this.mangaRepository.findOne({
      where: { id: moveDto.targetMangaId },
    });

    if (!targetManga) {
      throw new NotFoundException(`Target manga with ID ${moveDto.targetMangaId} not found`);
    }

    // Check if volume number conflicts in target manga
    if (moveDto.newVolumeNumber !== undefined) {
      const existingVolume = await this.volumeRepository.findOne({
        where: {
          mangaId: moveDto.targetMangaId,
          volumeNumber: moveDto.newVolumeNumber,
        },
      });

      if (existingVolume) {
        throw new ForbiddenException(
          `Volume number ${moveDto.newVolumeNumber} already exists in target manga`
        );
      }
    }

    // Calculate new volume number
    const newVolumeNumber = moveDto.newVolumeNumber !== undefined 
      ? moveDto.newVolumeNumber 
      : volume.volumeNumber;

    // Move storage files FIRST
    let newStoragePath = volume.storagePath;
    let newCoverUrl = volume.coverUrl;
    
    if (volume.storagePath) {
      newStoragePath = `manga/${moveDto.targetMangaId}/volume-${newVolumeNumber}`;
      try {
        await this.storageService.moveDirectory(volume.storagePath, newStoragePath);
        this.logger.log(`✅ Files moved from ${volume.storagePath} to ${newStoragePath}`);
        
        // Update cover URL if it exists
        if (volume.coverUrl) {
          const coverFileName = path.basename(volume.coverUrl.split('?')[0]); // Remove query params
          const newCoverPath = `${newStoragePath}/${coverFileName}`;
          newCoverUrl = this.storageService.getFileUrl(newCoverPath);
          this.logger.log(`✅ Cover URL updated to: ${newCoverUrl}`);
        }
        
        // Update page URLs
        const pages = await this.pageRepository.find({
          where: { volumeId: id },
        });

        for (const page of pages) {
          const oldPath = page.imagePath;
          const fileName = path.basename(oldPath);
          const newPath = `${newStoragePath}/${fileName}`;
          page.imagePath = newPath;
          page.imageUrl = this.storageService.getFileUrl(newPath);
        }

        await this.pageRepository.save(pages);
        this.logger.log(`✅ Updated ${pages.length} page URLs for moved volume`);
      } catch (error) {
        this.logger.error(`Failed to move storage: ${error.message}`);
        throw error;
      }
    }

    // Now update the volume in database using QueryBuilder for explicit control
    this.logger.log(`🔄 Updating volume ${id} in database...`);
    this.logger.log(`   - Old mangaId: ${volume.mangaId} -> New mangaId: ${moveDto.targetMangaId}`);
    this.logger.log(`   - Old volumeNumber: ${volume.volumeNumber} -> New volumeNumber: ${newVolumeNumber}`);
    this.logger.log(`   - Old storagePath: ${volume.storagePath} -> New storagePath: ${newStoragePath}`);
    this.logger.log(`   - Old coverUrl: ${volume.coverUrl} -> New coverUrl: ${newCoverUrl}`);
    
    await this.volumeRepository
      .createQueryBuilder()
      .update(Volume)
      .set({
        mangaId: moveDto.targetMangaId,
        volumeNumber: newVolumeNumber,
        storagePath: newStoragePath,
        coverUrl: newCoverUrl,
      })
      .where('id = :id', { id })
      .execute();
    
    this.logger.log(`✅ Database update executed`);
    
    // Update stats for both mangas
    await this.updateMangaStats(sourceMangaId);
    await this.updateMangaStats(moveDto.targetMangaId);
    
    // Update target manga cover if it doesn't have one
    if (!targetManga.coverUrl && newCoverUrl) {
      targetManga.coverUrl = newCoverUrl;
      await this.mangaRepository.save(targetManga);
      this.logger.log(`✅ Updated target manga cover URL`);
    }
    
    // Reload the volume from database to ensure we return the updated data
    const movedVolume = await this.volumeRepository.findOne({
      where: { id },
    });
    
    if (!movedVolume) {
      throw new Error(`Failed to reload moved volume ${id}`);
    }
    
    this.logger.log(`✅ Successfully moved volume ${id} from manga ${sourceMangaId} to ${moveDto.targetMangaId}`);
    this.logger.log(`   📊 Reloaded volume data from database:`);
    this.logger.log(`      - mangaId: ${movedVolume.mangaId} (expected: ${moveDto.targetMangaId})`);
    this.logger.log(`      - volumeNumber: ${movedVolume.volumeNumber} (expected: ${newVolumeNumber})`);
    this.logger.log(`      - storagePath: ${movedVolume.storagePath} (expected: ${newStoragePath})`);
    this.logger.log(`      - coverUrl: ${movedVolume.coverUrl}`);
    
    // Verify the move was successful
    if (movedVolume.mangaId !== moveDto.targetMangaId) {
      this.logger.error(`❌ CRITICAL: Volume mangaId was not updated! Still shows: ${movedVolume.mangaId}`);
      throw new Error(`Failed to update volume mangaId to ${moveDto.targetMangaId}`);
    }
    
    this.logger.log(`✅ Volume move verified successfully!`);
    
    return movedVolume;
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

