import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppSettingsState, AppSettings } from './models';

// Default backend endpoint - can be overridden by environment variable or user settings
const DEFAULT_BACKEND_ENDPOINT = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// Load from localStorage if available
const loadBackendEndpoint = (): string => {
  try {
    const savedEndpoint = localStorage.getItem('backendEndpoint');
    return savedEndpoint || DEFAULT_BACKEND_ENDPOINT;
  } catch (error) {
    console.error('Failed to load backend endpoint from localStorage:', error);
    return DEFAULT_BACKEND_ENDPOINT;
  }
};

// Save to localStorage
const saveBackendEndpoint = (endpoint: string): void => {
  try {
    localStorage.setItem('backendEndpoint', endpoint);
  } catch (error) {
    console.error('Failed to save backend endpoint to localStorage:', error);
  }
};

const initialState: AppSettingsState = {
  settings: {
    backendEndpoint: loadBackendEndpoint(),
  },
  isLoading: false,
  error: null,
};

const appSettingsSlice = createSlice({
  name: 'appSettings',
  initialState,
  reducers: {
    setBackendEndpoint: (state, action: PayloadAction<string>) => {
      state.settings.backendEndpoint = action.payload;
      saveBackendEndpoint(action.payload);
    },
    
    updateAppSettings: (state, action: PayloadAction<Partial<AppSettings>>) => {
      state.settings = { ...state.settings, ...action.payload };
      
      // Save backend endpoint if it was updated
      if (action.payload.backendEndpoint) {
        saveBackendEndpoint(action.payload.backendEndpoint);
      }
    },
    
    resetAppSettings: (state) => {
      state.settings = {
        backendEndpoint: DEFAULT_BACKEND_ENDPOINT,
      };
      saveBackendEndpoint(DEFAULT_BACKEND_ENDPOINT);
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
  updateAppSettings,
  resetAppSettings,
  setError,
  setLoading,
  clearError,
} = appSettingsSlice.actions;

export default appSettingsSlice.reducer;

