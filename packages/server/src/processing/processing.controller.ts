import {
  Controller,
  Post,
  Get,
  Param,
  UploadedFile,
  UseInterceptors,
  Body,
  UseGuards,
  Request,
  ParseUUIDPipe,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProcessingService } from './processing.service';

class UploadCbzDto {
  mangaTitle?: string;
  volumeNumber?: number;
}

@ApiTags('processing')
@Controller('processing')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProcessingController {
  private readonly logger = new Logger(ProcessingController.name);

  constructor(private readonly processingService: ProcessingService) {}

  @Post('upload-cbz')
  @ApiOperation({ summary: 'Upload a raw CBZ file for processing with mokuro' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'CBZ file to process',
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
  async uploadCbz(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadCbzDto: UploadCbzDto,
    @Request() req,
  ) {
    this.logger.log('Received CBZ upload request');

    if (!file) {
      throw new Error('No file uploaded');
    }

    if (!file.originalname.toLowerCase().endsWith('.cbz')) {
      throw new Error('Only CBZ files are supported');
    }

    return this.processingService.processCbzFile(
      file,
      req.user.userId,
      uploadCbzDto.mangaTitle,
      uploadCbzDto.volumeNumber,
    );
  }

  @Get('status/:volumeId')
  @ApiOperation({ summary: 'Get processing status of a volume' })
  async getStatus(@Param('volumeId', ParseUUIDPipe) volumeId: string) {
    return this.processingService.getVolumeStatus(volumeId);
  }
}

