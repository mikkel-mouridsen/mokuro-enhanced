import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SettingsState, ReaderSettings } from './models';

const initialState: SettingsState = {
  settings: {
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
  },
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    updateSettings: (state, action: PayloadAction<Partial<ReaderSettings>>) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    resetSettings: (state) => {
      state.settings = initialState.settings;
    },
  },
});

export const { updateSettings, resetSettings } = settingsSlice.actions;

export default settingsSlice.reducer;

