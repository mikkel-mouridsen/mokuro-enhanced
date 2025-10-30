import {
  Controller,
  Get,
  Param,
  Res,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { StorageService } from '../storage/storage.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import * as path from 'path';
import { createReadStream } from 'fs';

@ApiTags('files')
@Controller('files')
export class FilesController {
  constructor(private readonly storageService: StorageService) {}

  @Get('*')
  @ApiOperation({ summary: 'Serve uploaded files (public access)' })
  async serveFile(@Param('0') filePath: string, @Res({ passthrough: true }) res: Response) {
    const exists = await this.storageService.fileExists(filePath);

    if (!exists) {
      throw new NotFoundException('File not found');
    }

    const fullPath = this.storageService.getFullPath(filePath);
    const ext = path.extname(fullPath).toLowerCase();

    // Set content type based on extension
    const contentTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.json': 'application/json',
      '.html': 'text/html',
    };

    res.set({
      'Content-Type': contentTypes[ext] || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000',
    });

    const file = createReadStream(fullPath);
    return new StreamableFile(file);
  }
}

