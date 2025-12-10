import apiClient from './api-client';
import { ReaderSettings } from '../store/models';

export enum DeviceProfile {
  DESKTOP = 'desktop',
  MOBILE = 'mobile',
}

export interface UserSettingsResponse {
  id: string;
  userId: string;
  profile: DeviceProfile;
  settings: ReaderSettings;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get user settings for a specific profile or all profiles
 */
export async function getUserSettings(
  token: string,
  profile?: DeviceProfile
): Promise<UserSettingsResponse | UserSettingsResponse[]> {
  const params = profile ? { profile } : {};
  const response = await apiClient.get('/user-settings', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    params,
  });
  return response.data;
}

/**
 * Update user settings for a specific profile
 */
export async function updateUserSettings(
  token: string,
  profile: DeviceProfile,
  settings: ReaderSettings
): Promise<UserSettingsResponse> {
  const response = await apiClient.put(
    '/user-settings',
    {
      profile,
      settings,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
}

/**
 * Reset user settings for a specific profile to defaults
 */
export async function resetUserSettings(
  token: string,
  profile: DeviceProfile
): Promise<UserSettingsResponse> {
  const response = await apiClient.delete('/user-settings', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    params: { profile },
  });
  return response.data;
}

