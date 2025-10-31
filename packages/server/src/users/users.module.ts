import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { UserSettings } from './entities/user-settings.entity';
import { UserSettingsService } from './user-settings.service';
import { UserSettingsController } from './user-settings.controller';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserSettings]), StorageModule],
  controllers: [UsersController, UserSettingsController],
  providers: [UsersService, UserSettingsService],
  exports: [UsersService, UserSettingsService], // Export for use in other modules
})
export class UsersModule {}

