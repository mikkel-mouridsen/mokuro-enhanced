import apiClient from './api-client';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface User {
  id: string;
  username: string;
  profilePicture: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateUserRequest {
  password?: string;
}

class AuthApi {
  /**
   * Register a new user
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    return response.data;
  }

  /**
   * Login with username and password
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', data);
    return response.data;
  }

  /**
   * Get current user profile
   */
  async getProfile(): Promise<User> {
    const response = await apiClient.get<User>('/users/me');
    return response.data;
  }

  /**
   * Update user profile
   */
  async updateProfile(data: UpdateUserRequest): Promise<User> {
    const response = await apiClient.patch<User>('/users/me', data);
    return response.data;
  }

  /**
   * Upload profile picture
   */
  async uploadProfilePicture(file: File): Promise<User> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<User>('/users/me/profile-picture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  /**
   * Delete user account
   */
  async deleteAccount(): Promise<void> {
    await apiClient.delete('/users/me');
  }
}

export const authApi = new AuthApi();

