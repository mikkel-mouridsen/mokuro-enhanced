import { createAsyncThunk } from '@reduxjs/toolkit';
import { setYomitanStatus, setInstalling, setError } from './yomitan.slice';

// Thunk to check Yomitan installation status
export const checkYomitanStatus = createAsyncThunk(
  'yomitan/checkStatus',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const isInstalled = await window.electronAPI.checkYomitanInstalled();
      dispatch(setYomitanStatus({ isInstalled, isEnabled: isInstalled }));
      return isInstalled;
    } catch (error) {
      dispatch(setError(error instanceof Error ? error.message : 'Unknown error'));
      return rejectWithValue(error);
    }
  }
);

// Thunk to install Yomitan
export const installYomitan = createAsyncThunk(
  'yomitan/install',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setInstalling(true));
      dispatch(setError(null));

      const result = await window.electronAPI.installYomitan();

      if (result.success) {
        dispatch(setYomitanStatus({ isInstalled: true, isEnabled: true }));
      } else {
        throw new Error(result.message);
      }

      dispatch(setInstalling(false));
      return result;
    } catch (error) {
      dispatch(setError(error instanceof Error ? error.message : 'Unknown error'));
      dispatch(setInstalling(false));
      return rejectWithValue(error);
    }
  }
);

