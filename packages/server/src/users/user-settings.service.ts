import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSettings, DeviceProfile, ReaderSettingsData } from './entities/user-settings.entity';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';

@Injectable()
export class UserSettingsService {
  private readonly logger = new Logger(UserSettingsService.name);

  constructor(
    @InjectRepository(UserSettings)
    private userSettingsRepository: Repository<UserSettings>,
  ) {}

  /**
   * Get default settings for a profile
   */
  private getDefaultSettings(): ReaderSettingsData {
    return {
      // Display settings
      darkMode: true,
      pageLayout: 'single',
      readingDirection: 'rtl',
      backgroundColor: '#C4C3D0',
      zoom: 100,
      autoFullscreen: false,
      
      // OCR settings
      displayOCR: true,
      textBoxBorders: false,
      editableText: false,
      toggleOCRTextBoxes: false,
      fontSize: 'auto',
      
      // Reading settings
      hasCover: false,
      defaultZoomMode: 'fit-to-screen',
      eInkMode: false,
      ctrlToPan: false,
    };
  }

  /**
   * Get user settings for a specific profile, or all profiles
   */
  async getUserSettings(
    userId: string,
    profile?: DeviceProfile,
  ): Promise<UserSettings | UserSettings[]> {
    if (profile) {
      // Get specific profile
      let settings = await this.userSettingsRepository.findOne({
        where: { userId, profile },
      });

      // If settings don't exist, create default ones
      if (!settings) {
        settings = await this.createDefaultSettings(userId, profile);
      }

      return settings;
    } else {
      // Get all profiles
      let allSettings = await this.userSettingsRepository.find({
        where: { userId },
      });

      // Ensure both profiles exist
      const existingProfiles = allSettings.map(s => s.profile);
      const missingProfiles = Object.values(DeviceProfile).filter(
        p => !existingProfiles.includes(p as DeviceProfile)
      );

      // Create missing profiles
      for (const missingProfile of missingProfiles) {
        const newSettings = await this.createDefaultSettings(userId, missingProfile as DeviceProfile);
        allSettings.push(newSettings);
      }

      return allSettings;
    }
  }

  /**
   * Create default settings for a profile
   */
  private async createDefaultSettings(
    userId: string,
    profile: DeviceProfile,
  ): Promise<UserSettings> {
    const defaultSettings = this.getDefaultSettings();
    
    // Customize defaults for mobile
    if (profile === DeviceProfile.MOBILE) {
      defaultSettings.pageLayout = 'single';
      defaultSettings.defaultZoomMode = 'fit-to-width';
    }

    const settings = this.userSettingsRepository.create({
      userId,
      profile,
      settings: defaultSettings,
    });

    return this.userSettingsRepository.save(settings);
  }

  /**
   * Update user settings for a specific profile
   */
  async updateUserSettings(
    userId: string,
    updateDto: UpdateUserSettingsDto,
  ): Promise<UserSettings> {
    let settings = await this.userSettingsRepository.findOne({
      where: { userId, profile: updateDto.profile },
    });

    if (!settings) {
      // Create new settings if they don't exist
      settings = this.userSettingsRepository.create({
        userId,
        profile: updateDto.profile,
        settings: updateDto.settings,
      });
    } else {
      // Update existing settings
      settings.settings = updateDto.settings;
    }

    return this.userSettingsRepository.save(settings);
  }

  /**
   * Delete user settings for a specific profile (reset to defaults)
   */
  async deleteUserSettings(
    userId: string,
    profile: DeviceProfile,
  ): Promise<UserSettings> {
    const settings = await this.userSettingsRepository.findOne({
      where: { userId, profile },
    });

    if (settings) {
      await this.userSettingsRepository.remove(settings);
    }

    // Return default settings
    return this.createDefaultSettings(userId, profile);
  }
}

