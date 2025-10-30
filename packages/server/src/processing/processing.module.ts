import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessingService } from './processing.service';
import { ProcessingController } from './processing.controller';
import { Volume } from '../library/entities/volume.entity';
import { Page } from '../library/entities/page.entity';
import { Manga } from '../library/entities/manga.entity';
import { QueueModule } from '../queue/queue.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Volume, Page, Manga]),
    QueueModule,
    StorageModule,
  ],
  controllers: [ProcessingController],
  providers: [ProcessingService],
  exports: [ProcessingService],
})
export class ProcessingModule {}

