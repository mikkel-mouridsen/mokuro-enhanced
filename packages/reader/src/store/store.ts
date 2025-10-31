import { configureStore } from '@reduxjs/toolkit';
import readerReducer from './reader.slice';
import yomitanReducer from './yomitan.slice';
import settingsReducer from './settings.slice';
import uiReducer from './ui.slice';
import libraryReducer from './library.slice';
import authReducer from './auth.slice';
import appSettingsReducer from './app-settings.slice';

export const store = configureStore({
  reducer: {
    reader: readerReducer,
    yomitan: yomitanReducer,
    settings: settingsReducer,
    ui: uiReducer,
    library: libraryReducer,
    auth: authReducer,
    appSettings: appSettingsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Allow non-serializable values for file paths, etc.
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

