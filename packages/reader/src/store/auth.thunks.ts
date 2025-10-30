import { AppDispatch } from './store';
import { authApi, LoginRequest, RegisterRequest, UpdateUserRequest } from '../api/auth.api';
import { setLoading, setError, loginSuccess, logout, updateUser } from './auth.slice';

/**
 * Register a new user
 */
export const registerUser = (data: RegisterRequest) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const response = await authApi.register(data);
    dispatch(loginSuccess({
      user: response.user,
      token: response.access_token,
    }));
  } catch (error: any) {
    const message = error.response?.data?.message || 'Registration failed';
    dispatch(setError(message));
    throw error;
  }
};

/**
 * Login with username and password
 */
export const loginUser = (data: LoginRequest) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const response = await authApi.login(data);
    dispatch(loginSuccess({
      user: response.user,
      token: response.access_token,
    }));
  } catch (error: any) {
    const message = error.response?.data?.message || 'Login failed';
    dispatch(setError(message));
    throw error;
  }
};

/**
 * Fetch current user profile
 */
export const fetchUserProfile = () => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const user = await authApi.getProfile();
    dispatch(updateUser(user));
    dispatch(setLoading(false));
  } catch (error: any) {
    dispatch(setError('Failed to fetch profile'));
    dispatch(logout());
    throw error;
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = (data: UpdateUserRequest) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const user = await authApi.updateProfile(data);
    dispatch(updateUser(user));
    dispatch(setLoading(false));
  } catch (error: any) {
    const message = error.response?.data?.message || 'Update failed';
    dispatch(setError(message));
    throw error;
  }
};

/**
 * Upload profile picture
 */
export const uploadProfilePicture = (file: File) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const user = await authApi.uploadProfilePicture(file);
    dispatch(updateUser(user));
    dispatch(setLoading(false));
  } catch (error: any) {
    const message = error.response?.data?.message || 'Upload failed';
    dispatch(setError(message));
    throw error;
  }
};

/**
 * Delete user account
 */
export const deleteUserAccount = () => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    await authApi.deleteAccount();
    dispatch(logout());
  } catch (error: any) {
    const message = error.response?.data?.message || 'Delete failed';
    dispatch(setError(message));
    throw error;
  }
};

/**
 * Logout user
 */
export const logoutUser = () => (dispatch: AppDispatch) => {
  dispatch(logout());
};

