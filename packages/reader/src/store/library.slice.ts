import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { LibraryState, LibraryManga, MangaVolume } from './library.model';

const initialState: LibraryState = {
  mangas: [],
  volumes: {},
  loading: false,
  error: null,
  selectedMangaId: null,
};

const librarySlice = createSlice({
  name: 'library',
  initialState,
  reducers: {
    setMangas: (state, action: PayloadAction<LibraryManga[]>) => {
      state.mangas = action.payload;
      state.loading = false;
      state.error = null;
    },
    setVolumes: (state, action: PayloadAction<{ mangaId: string; volumes: MangaVolume[] }>) => {
      state.volumes[action.payload.mangaId] = action.payload.volumes;
      state.loading = false;
      state.error = null;
    },
    setSelectedManga: (state, action: PayloadAction<string | null>) => {
      state.selectedMangaId = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearError: (state) => {
      state.error = null;
    },
    updateMangaProgress: (state, action: PayloadAction<{ mangaId: string; unreadCount: number }>) => {
      const manga = state.mangas.find((m) => m.id === action.payload.mangaId);
      if (manga) {
        manga.unreadCount = action.payload.unreadCount;
        manga.lastRead = new Date();
      }
    },
    updateVolumeProgress: (
      state,
      action: PayloadAction<{ mangaId: string; volumeId: string; progress: number; isRead: boolean }>
    ) => {
      const volumes = state.volumes[action.payload.mangaId];
      if (volumes) {
        const volume = volumes.find((v) => v.id === action.payload.volumeId);
        if (volume) {
          volume.progress = action.payload.progress;
          volume.isRead = action.payload.isRead;
        }
      }
    },
  },
});

export const {
  setMangas,
  setVolumes,
  setSelectedManga,
  setLoading,
  setError,
  clearError,
  updateMangaProgress,
  updateVolumeProgress,
} = librarySlice.actions;

export default librarySlice.reducer;

