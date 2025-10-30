import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { YomitanState, YomitanStatus } from './models';

const initialState: YomitanState = {
  status: {
    isInstalled: false,
    isEnabled: false,
  },
  installing: false,
  error: null,
};

const yomitanSlice = createSlice({
  name: 'yomitan',
  initialState,
  reducers: {
    setYomitanStatus: (state, action: PayloadAction<YomitanStatus>) => {
      state.status = action.payload;
    },
    setInstalling: (state, action: PayloadAction<boolean>) => {
      state.installing = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    toggleYomitan: (state) => {
      state.status.isEnabled = !state.status.isEnabled;
    },
  },
});

export const { setYomitanStatus, setInstalling, setError, toggleYomitan } = yomitanSlice.actions;

export default yomitanSlice.reducer;

