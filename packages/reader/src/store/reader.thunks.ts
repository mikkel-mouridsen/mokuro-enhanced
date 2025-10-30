import { createAsyncThunk } from '@reduxjs/toolkit';
import { Manga, MangaPage } from './models';
import { setLoading, setError, setCurrentManga } from './reader.slice';
import * as api from '../api/api.client';
import { LibraryService } from '../services/LibraryService';
import { libraryApi } from '../api/library.api';

// Thunk to load a volume from the library
export const loadVolumeFromLibrary = createAsyncThunk(
  'reader/loadVolumeFromLibrary',
  async ({ mangaId, volumeId }: { mangaId: string; volumeId: string }, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setLoading(true));
      dispatch(setError(null));

      // Fetch volume data from library API
      const volume = await libraryApi.getVolumeById(volumeId);
      const manga = await LibraryService.getMangaById(mangaId);

      if (!manga) {
        throw new Error('Manga not found');
      }

      // Fetch pages with OCR data
      const pages = await libraryApi.getVolumePages(volumeId);

      const readerManga: Manga = {
        id: volumeId,
        title: `${manga.title} - Volume ${volume.volumeNumber}`,
        folderPath: `/library/${mangaId}/${volumeId}`,
        pages,
        currentPageIndex: 0,
        totalPages: pages.length,
      };

      dispatch(setCurrentManga(readerManga));
      dispatch(setLoading(false));

      return readerManga;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load volume';
      dispatch(setError(errorMessage));
      dispatch(setLoading(false));
      return rejectWithValue(error);
    }
  }
);

// Thunk to load a local manga folder (original functionality - for opening local files)
export const openMangaFolder = createAsyncThunk(
  'reader/openMangaFolder',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setLoading(true));
      dispatch(setError(null));

      // Use the Electron API to open a folder dialog
      if (window.electron) {
        const result = await window.electron.openMangaFolder();
        if (result) {
          // Process the manga folder and create pages
          const pages: MangaPage[] = result.images.map((imagePath, index) => ({
            id: `page-${index}`,
            path: imagePath,
            index,
            textBlocks: [],
          }));

          const manga: Manga = {
            id: `local-${Date.now()}`,
            title: result.folderName || 'Untitled',
            folderPath: result.folderPath,
            pages,
            currentPageIndex: 0,
            totalPages: pages.length,
          };

          dispatch(setCurrentManga(manga));
          dispatch(setLoading(false));

          return manga;
        }
      }

      dispatch(setLoading(false));
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load manga folder';
      dispatch(setError(errorMessage));
      dispatch(setLoading(false));
      return rejectWithValue(error);
    }
  }
);
