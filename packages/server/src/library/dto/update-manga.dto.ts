import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MangaStatus } from '../entities/manga.entity';

export class UpdateMangaDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  author?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: MangaStatus, required: false })
  @IsOptional()
  @IsEnum(MangaStatus)
  status?: MangaStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  coverUrl?: string;
}

