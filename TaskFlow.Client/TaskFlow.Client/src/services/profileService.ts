import api from './api';
import type { ApiResponse, UserPreferences } from './authService';

export interface ProfileStatistics {
  totalProjects: number;
  activeTasks: number;
  completedTasks: number;
  overdueTasks: number;
}

export interface ProfileResponse {
  id: string;
  email: string;
  name: string;
  profilePicture?: string;
  bio?: string;
  phone?: string;
  location?: string;
  website?: string;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  statistics: ProfileStatistics;
}

export interface UpdateProfileRequest {
  name: string;
  bio?: string;
  phone?: string;
  location?: string;
  website?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UpdatePreferencesRequest {
  theme?: string;
  timeFormat?: string;
  startOfWeek?: string;
  notifications?: {
    email?: boolean;
    push?: boolean;
    taskReminders?: boolean;
  };
}

export const profileService = {
  async getProfile(): Promise<ProfileResponse> {
    const response = await api.get<ApiResponse<ProfileResponse>>('/profile');
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.message || 'Failed to fetch profile');
  },

  async updateProfile(data: UpdateProfileRequest): Promise<ProfileResponse> {
    const response = await api.put<ApiResponse<ProfileResponse>>('/profile', data);
    
    if (response.data.success && response.data.data) {
      // Update user in localStorage
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedUser = { ...currentUser, ...data, updatedAt: new Date().toISOString() };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      return response.data.data;
    }
    
    throw new Error(response.data.message || 'Failed to update profile');
  },

  async uploadAvatar(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<ApiResponse<string>>('/profile/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    if (response.data.success && response.data.data) {
      // Update user avatar in localStorage
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedUser = { ...currentUser, profilePicture: response.data.data };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      return response.data.data;
    }
    
    throw new Error(response.data.message || 'Failed to upload avatar');
  },

  async changePassword(data: ChangePasswordRequest): Promise<void> {
    const response = await api.put<ApiResponse<boolean>>('/profile/password', data);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to change password');
    }
  },

  async updatePreferences(data: UpdatePreferencesRequest): Promise<ProfileResponse> {
    const response = await api.put<ApiResponse<ProfileResponse>>('/profile/preferences', data);
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.message || 'Failed to update preferences');
  },
};