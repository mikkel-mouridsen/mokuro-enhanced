import axios from 'axios';
import { ReaderSettings } from '../store/models';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
  const response = await axios.get(`${API_URL}/user-settings`, {
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
  const response = await axios.put(
    `${API_URL}/user-settings`,
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
  const response = await axios.delete(`${API_URL}/user-settings`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    params: { profile },
  });
  return response.data;
}

