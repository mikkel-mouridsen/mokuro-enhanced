import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Query,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserSettingsService } from './user-settings.service';
import { UpdateUserSettingsDto, GetUserSettingsDto } from './dto/update-user-settings.dto';
import { DeviceProfile } from './entities/user-settings.entity';

@ApiTags('user-settings')
@Controller('user-settings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserSettingsController {
  private readonly logger = new Logger(UserSettingsController.name);

  constructor(private readonly userSettingsService: UserSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user settings for one or all profiles' })
  @ApiQuery({
    name: 'profile',
    enum: DeviceProfile,
    required: false,
    description: 'Specific device profile (desktop or mobile). If not provided, returns all profiles.',
  })
  async getUserSettings(
    @Request() req,
    @Query('profile') profile?: DeviceProfile,
  ) {
    return this.userSettingsService.getUserSettings(req.user.userId, profile);
  }

  @Put()
  @ApiOperation({ summary: 'Update user settings for a specific profile' })
  async updateUserSettings(
    @Request() req,
    @Body() updateDto: UpdateUserSettingsDto,
  ) {
    return this.userSettingsService.updateUserSettings(req.user.userId, updateDto);
  }

  @Delete()
  @ApiOperation({ summary: 'Reset user settings for a specific profile to defaults' })
  @ApiQuery({
    name: 'profile',
    enum: DeviceProfile,
    required: true,
    description: 'Device profile to reset',
  })
  async deleteUserSettings(
    @Request() req,
    @Query('profile') profile: DeviceProfile,
  ) {
    return this.userSettingsService.deleteUserSettings(req.user.userId, profile);
  }
}

