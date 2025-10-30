import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ReaderState, Manga } from './models';

const initialState: ReaderState = {
  currentManga: null,
  recentMangas: [],
  loading: false,
  error: null,
};

const readerSlice = createSlice({
  name: 'reader',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setCurrentManga: (state, action: PayloadAction<Manga | null>) => {
      state.currentManga = action.payload;
      if (action.payload && !state.recentMangas.find((m) => m.id === action.payload!.id)) {
        state.recentMangas.unshift(action.payload);
        if (state.recentMangas.length > 10) {
          state.recentMangas.pop();
        }
      }
    },
    setCurrentPage: (state, action: PayloadAction<number>) => {
      if (state.currentManga) {
        state.currentManga.currentPageIndex = action.payload;
      }
    },
    nextPage: (state) => {
      if (state.currentManga && state.currentManga.currentPageIndex < state.currentManga.totalPages - 1) {
        state.currentManga.currentPageIndex++;
      }
    },
    previousPage: (state) => {
      if (state.currentManga && state.currentManga.currentPageIndex > 0) {
        state.currentManga.currentPageIndex--;
      }
    },
    updatePageTextBlocks: (state, action: PayloadAction<{ pageId: string; textBlocks: any[] }>) => {
      if (state.currentManga) {
        const page = state.currentManga.pages.find((p) => p.id === action.payload.pageId);
        if (page) {
          page.textBlocks = action.payload.textBlocks;
        }
      }
    },
  },
});

export const {
  setLoading,
  setError,
  setCurrentManga,
  setCurrentPage,
  nextPage,
  previousPage,
  updatePageTextBlocks,
} = readerSlice.actions;

export default readerSlice.reducer;

