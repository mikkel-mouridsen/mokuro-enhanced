import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppSettingsState, AppSettings } from './models';

// Default backend endpoint - can be overridden by environment variable or user settings
const DEFAULT_BACKEND_ENDPOINT = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// Load settings from localStorage
const loadAppSettings = (): AppSettings => {
  try {
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      return {
        backendEndpoint: parsed.backendEndpoint || DEFAULT_BACKEND_ENDPOINT,
        serverMode: parsed.serverMode || 'cloud',
        standaloneServerEnabled: parsed.standaloneServerEnabled || false,
      };
    }
  } catch (error) {
    console.error('Failed to load app settings from localStorage:', error);
  }
  
  return {
    backendEndpoint: DEFAULT_BACKEND_ENDPOINT,
    serverMode: 'cloud',
    standaloneServerEnabled: false,
  };
};

// Save settings to localStorage
const saveAppSettings = (settings: AppSettings): void => {
  try {
    localStorage.setItem('appSettings', JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save app settings to localStorage:', error);
  }
};

const initialState: AppSettingsState = {
  settings: loadAppSettings(),
  isLoading: false,
  error: null,
};

const appSettingsSlice = createSlice({
  name: 'appSettings',
  initialState,
  reducers: {
    setBackendEndpoint: (state, action: PayloadAction<string>) => {
      state.settings.backendEndpoint = action.payload;
      saveAppSettings(state.settings);
    },
    
    setServerMode: (state, action: PayloadAction<'cloud' | 'standalone' | 'offline'>) => {
      state.settings.serverMode = action.payload;
      
      // Auto-set backend endpoint based on mode
      if (action.payload === 'standalone') {
        state.settings.backendEndpoint = 'http://localhost:3000';
      }
      
      saveAppSettings(state.settings);
    },
    
    setStandaloneServerEnabled: (state, action: PayloadAction<boolean>) => {
      state.settings.standaloneServerEnabled = action.payload;
      saveAppSettings(state.settings);
    },
    
    updateAppSettings: (state, action: PayloadAction<Partial<AppSettings>>) => {
      state.settings = { ...state.settings, ...action.payload };
      saveAppSettings(state.settings);
    },
    
    resetAppSettings: (state) => {
      state.settings = {
        backendEndpoint: DEFAULT_BACKEND_ENDPOINT,
        serverMode: 'cloud',
        standaloneServerEnabled: false,
      };
      saveAppSettings(state.settings);
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
      if (action.payload) {
        state.error = null;
      }
    },
    
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setBackendEndpoint,
  setServerMode,
  setStandaloneServerEnabled,
  updateAppSettings,
  resetAppSettings,
  setError,
  setLoading,
  clearError,
} = appSettingsSlice.actions;

export default appSettingsSlice.reducer;

