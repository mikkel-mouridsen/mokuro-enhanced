import { IsEnum, IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DeviceProfile, ReaderSettingsData } from '../entities/user-settings.entity';

export class UpdateUserSettingsDto {
  @ApiProperty({
    enum: DeviceProfile,
    description: 'Device profile (desktop or mobile)',
  })
  @IsEnum(DeviceProfile)
  profile: DeviceProfile;

  @ApiProperty({
    description: 'Reader settings data',
    type: 'object',
  })
  @IsObject()
  settings: ReaderSettingsData;
}

export class GetUserSettingsDto {
  @ApiProperty({
    enum: DeviceProfile,
    description: 'Device profile to retrieve',
    required: false,
  })
  @IsOptional()
  @IsEnum(DeviceProfile)
  profile?: DeviceProfile;
}

