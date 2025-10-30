import { createAsyncThunk } from '@reduxjs/toolkit';
import { setMangas, setVolumes, setLoading, setError } from './library.slice';
import { LibraryService } from '../services/LibraryService';

// Fetch all manga in the library
export const fetchLibraryMangas = createAsyncThunk(
  'library/fetchMangas',
  async (_, { dispatch }) => {
    try {
      dispatch(setLoading(true));
      const mangas = await LibraryService.getLibraryMangas();
      dispatch(setMangas(mangas));
      return mangas;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch library';
      dispatch(setError(errorMessage));
      throw error;
    }
  }
);

// Fetch volumes for a specific manga
export const fetchMangaVolumes = createAsyncThunk(
  'library/fetchVolumes',
  async (mangaId: string, { dispatch }) => {
    try {
      dispatch(setLoading(true));
      const volumes = await LibraryService.getMangaVolumes(mangaId);
      dispatch(setVolumes({ mangaId, volumes }));
      return volumes;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch volumes';
      dispatch(setError(errorMessage));
      throw error;
    }
  }
);

// Open a volume for reading
export const openVolume = createAsyncThunk(
  'library/openVolume',
  async ({ mangaId, volumeId }: { mangaId: string; volumeId: string }, { dispatch }) => {
    try {
      // This will eventually trigger the reader to open
      // For now, we just mark it as being read
      const volumeData = await LibraryService.getVolumeData(mangaId, volumeId);
      return volumeData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to open volume';
      dispatch(setError(errorMessage));
      throw error;
    }
  }
);

