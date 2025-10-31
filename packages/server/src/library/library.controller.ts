import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  ParseUUIDPipe,
  Query,
  Logger,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { LibraryService } from './library.service';
import { CreateMangaDto } from './dto/create-manga.dto';
import { UploadVolumeDto } from './dto/upload-volume.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('library')
@Controller('library')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LibraryController {
  private readonly logger = new Logger(LibraryController.name);

  constructor(private readonly libraryService: LibraryService) {}

  // ==================== MANGA ENDPOINTS ====================

  @Get('manga')
  @ApiOperation({ summary: 'Get all manga in library' })
  async getAllManga(@Request() req) {
    const mangas = await this.libraryService.findAllManga(req.user.userId);
    
    // Add processing count to each manga
    return Promise.all(mangas.map(async (manga) => {
      const processingCount = manga.volumes
        ? manga.volumes.filter(v => v.status === 'processing').length
        : 0;
      
      return {
        ...manga,
        processingCount,
      };
    }));
  }

  @Get('manga/:id')
  @ApiOperation({ summary: 'Get manga by ID' })
  async getMangaById(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.libraryService.findMangaById(id, req.user.userId);
  }

  @Post('manga')
  @ApiOperation({ summary: 'Create a new manga' })
  async createManga(@Body() createMangaDto: CreateMangaDto, @Request() req) {
    return this.libraryService.createManga(createMangaDto, req.user.userId);
  }

  // ==================== VOLUME ENDPOINTS ====================

  @Get('manga/:mangaId/volumes')
  @ApiOperation({ summary: 'Get all volumes for a manga' })
  async getVolumesByMangaId(@Param('mangaId', ParseUUIDPipe) mangaId: string) {
    const volumes = await this.libraryService.findVolumesByMangaId(mangaId);
    
    // Ensure all volume fields are included in response (status, processingMessage, etc.)
    return volumes;
  }

  @Get('volumes/:id')
  @ApiOperation({ summary: 'Get volume by ID' })
  async getVolumeById(@Param('id', ParseUUIDPipe) id: string) {
    return this.libraryService.findVolumeById(id);
  }

  @Post('volumes/upload')
  @ApiOperation({ summary: 'Upload a pre-processed mokuro volume (zip file)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        mangaTitle: {
          type: 'string',
          description: 'Optional: Manga title (auto-detected if not provided)',
        },
        volumeNumber: {
          type: 'number',
          description: 'Optional: Volume number (auto-detected if not provided)',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadVolume(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadVolumeDto: UploadVolumeDto,
    @Request() req,
  ) {
    this.logger.log('Received volume upload request');

    if (!file) {
      throw new Error('No file uploaded');
    }

    return this.libraryService.processUploadedVolume(
      file,
      req.user.userId,
      uploadVolumeDto.mangaTitle,
      uploadVolumeDto.volumeNumber,
    );
  }

  // ==================== PAGE ENDPOINTS ====================

  @Get('volumes/:volumeId/pages')
  @ApiOperation({ summary: 'Get all pages for a volume' })
  async getPagesByVolumeId(@Param('volumeId', ParseUUIDPipe) volumeId: string) {
    return this.libraryService.findPagesByVolumeId(volumeId);
  }

  @Post('pages/:pageId/mark-read')
  @ApiOperation({ summary: 'Mark a page as read' })
  async markPageAsRead(@Param('pageId', ParseUUIDPipe) pageId: string) {
    const page = await this.libraryService.markPageAsRead(pageId);
    // Update volume progress
    await this.libraryService.updateVolumeProgress(page.volumeId);
    return page;
  }
}

