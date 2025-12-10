import { createAsyncThunk } from '@reduxjs/toolkit';
import { setYomitanStatus, setInstalling, setError } from './yomitan.slice';
import { getPlatformAPI } from '../platform';

// Thunk to check Yomitan installation status
export const checkYomitanStatus = createAsyncThunk(
  'yomitan/checkStatus',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const platformAPI = getPlatformAPI();
      
      // Only check if running in Electron with bundled Yomitan
      if (!platformAPI.isElectron || !platformAPI.checkYomitanInstalled) {
        // On web, assume user has their own Yomitan installed
        dispatch(setYomitanStatus({ isInstalled: false, isEnabled: false }));
        return false;
      }

      const isInstalled = await platformAPI.checkYomitanInstalled();
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
      const platformAPI = getPlatformAPI();
      
      if (!platformAPI.isElectron || !platformAPI.installYomitan) {
        throw new Error('Yomitan installation is only available in the desktop app');
      }

      dispatch(setInstalling(true));
      dispatch(setError(null));

      const result = await platformAPI.installYomitan();

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

