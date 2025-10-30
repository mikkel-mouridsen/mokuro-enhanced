import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UIState } from './models';

const initialState: UIState = {
  sidebarOpen: true,
  settingsDialogOpen: false,
  fullscreen: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    toggleSettingsDialog: (state) => {
      state.settingsDialogOpen = !state.settingsDialogOpen;
    },
    setSettingsDialogOpen: (state, action: PayloadAction<boolean>) => {
      state.settingsDialogOpen = action.payload;
    },
    toggleFullscreen: (state) => {
      state.fullscreen = !state.fullscreen;
    },
    setFullscreen: (state, action: PayloadAction<boolean>) => {
      state.fullscreen = action.payload;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  toggleSettingsDialog,
  setSettingsDialogOpen,
  toggleFullscreen,
  setFullscreen,
} = uiSlice.actions;

export default uiSlice.reducer;

