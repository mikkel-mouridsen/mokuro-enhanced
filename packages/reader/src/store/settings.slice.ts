import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { SettingsState, ReaderSettings, DeviceProfile } from './models';
import { getUserSettings, updateUserSettings, resetUserSettings } from '../api/userSettings';

const getDefaultSettings = (): ReaderSettings => ({
  // Display settings
  darkMode: true,
  pageLayout: 'single',
  readingDirection: 'rtl',
  backgroundColor: '#C4C3D0',
  zoom: 100,
  autoFullscreen: false,
  
  // OCR settings (mokuro-inspired)
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
  
  // Anki integration settings
  ankiScreenshotEnabled: false, // Disabled by default
  ankiScreenshotField: 'Picture', // Common field name in Anki note types
  ankiScreenshotFormat: 'jpeg',
  ankiScreenshotQuality: 0.8,
  ankiConnectUrl: 'http://localhost:8765',
  ankiConnectApiKey: undefined,
});

const getDefaultMobileSettings = (): ReaderSettings => ({
  ...getDefaultSettings(),
  pageLayout: 'single',
  defaultZoomMode: 'fit-to-width',
});

const initialState: SettingsState = {
  settings: getDefaultSettings(),
  currentProfile: DeviceProfile.DESKTOP,
  desktopSettings: getDefaultSettings(),
  mobileSettings: getDefaultMobileSettings(),
  isLoading: false,
  error: null,
};

// Async thunks for settings persistence
export const loadSettings = createAsyncThunk(
  'settings/load',
  async (token: string) => {
    const response = await getUserSettings(token);
    return response;
  }
);

export const saveSettings = createAsyncThunk(
  'settings/save',
  async ({ token, profile, settings }: { token: string; profile: DeviceProfile; settings: ReaderSettings }) => {
    const response = await updateUserSettings(token, profile, settings);
    return response;
  }
);

export const resetProfileSettings = createAsyncThunk(
  'settings/reset',
  async ({ token, profile }: { token: string; profile: DeviceProfile }) => {
    const response = await resetUserSettings(token, profile);
    return response;
  }
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    updateSettings: (state, action: PayloadAction<Partial<ReaderSettings>>) => {
      state.settings = { ...state.settings, ...action.payload };
      
      // Update the profile-specific settings
      if (state.currentProfile === DeviceProfile.DESKTOP) {
        state.desktopSettings = { ...state.desktopSettings, ...action.payload };
      } else {
        state.mobileSettings = { ...state.mobileSettings, ...action.payload };
      }
    },
    switchProfile: (state, action: PayloadAction<DeviceProfile>) => {
      state.currentProfile = action.payload;
      state.settings = action.payload === DeviceProfile.DESKTOP 
        ? state.desktopSettings 
        : state.mobileSettings;
    },
    setProfileSettings: (state, action: PayloadAction<{ profile: DeviceProfile; settings: ReaderSettings }>) => {
      const { profile, settings } = action.payload;
      if (profile === DeviceProfile.DESKTOP) {
        state.desktopSettings = settings;
      } else {
        state.mobileSettings = settings;
      }
      
      // If it's the current profile, update active settings
      if (profile === state.currentProfile) {
        state.settings = settings;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Load settings
      .addCase(loadSettings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadSettings.fulfilled, (state, action) => {
        state.isLoading = false;
        
        // Handle response - it could be a single profile or array of profiles
        const response = action.payload;
        if (Array.isArray(response)) {
          // Multiple profiles returned
          response.forEach((profileSettings) => {
            if (profileSettings.profile === DeviceProfile.DESKTOP) {
              state.desktopSettings = profileSettings.settings;
            } else if (profileSettings.profile === DeviceProfile.MOBILE) {
              state.mobileSettings = profileSettings.settings;
            }
          });
        } else {
          // Single profile returned
          if (response.profile === DeviceProfile.DESKTOP) {
            state.desktopSettings = response.settings;
          } else if (response.profile === DeviceProfile.MOBILE) {
            state.mobileSettings = response.settings;
          }
        }
        
        // Update current settings based on profile
        state.settings = state.currentProfile === DeviceProfile.DESKTOP 
          ? state.desktopSettings 
          : state.mobileSettings;
      })
      .addCase(loadSettings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to load settings';
      })
      // Save settings
      .addCase(saveSettings.fulfilled, (state, action) => {
        const { profile, settings } = action.payload;
        if (profile === DeviceProfile.DESKTOP) {
          state.desktopSettings = settings;
        } else if (profile === DeviceProfile.MOBILE) {
          state.mobileSettings = settings;
        }
        
        // Update current settings if it's the active profile
        if (profile === state.currentProfile) {
          state.settings = settings;
        }
      })
      .addCase(saveSettings.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to save settings';
      })
      // Reset settings
      .addCase(resetProfileSettings.fulfilled, (state, action) => {
        const { profile, settings } = action.payload;
        if (profile === DeviceProfile.DESKTOP) {
          state.desktopSettings = settings;
        } else if (profile === DeviceProfile.MOBILE) {
          state.mobileSettings = settings;
        }
        
        // Update current settings if it's the active profile
        if (profile === state.currentProfile) {
          state.settings = settings;
        }
      });
  },
});

export const { updateSettings, switchProfile, setProfileSettings } = settingsSlice.actions;

export default settingsSlice.reducer;

