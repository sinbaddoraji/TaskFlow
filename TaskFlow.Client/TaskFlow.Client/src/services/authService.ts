import api from './api';

export interface User {
  id: string;
  email: string;
  name: string;
  profilePicture?: string;
  preferences: UserPreferences;
  createdAt: string;
  isActive: boolean;
}

export interface UserPreferences {
  theme: string;
  timeFormat: string;
  startOfWeek: string;
  notifications: NotificationSettings;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  taskReminders: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  expiresAt: string;
  refreshExpiresAt?: string;
  user: User;
  requiresMfa?: boolean;
  mfaToken?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
  errors?: string[];
}

export const authService = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', credentials);
    
    if (response.data.success && response.data.data) {
      const authData = response.data.data;
      
      if (!authData.requiresMfa) {
        localStorage.setItem('user', JSON.stringify(authData.user));
      }
      
      return authData;
    }
    
    throw new Error(response.data.message || 'Login failed');
  },

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', userData);
    
    if (response.data.success && response.data.data) {
      const authData = response.data.data;
      localStorage.setItem('user', JSON.stringify(authData.user));
      return authData;
    }
    
    throw new Error(response.data.message || 'Registration failed');
  },

  async verifyMfa(mfaToken: string, code?: string, backupCode?: string): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/verify-mfa', {
      mfaToken,
      code,
      backupCode,
    });
    
    if (response.data.success && response.data.data) {
      const authData = response.data.data;
      localStorage.setItem('user', JSON.stringify(authData.user));
      return authData;
    }
    
    throw new Error(response.data.message || 'MFA verification failed');
  },

  async refreshToken(): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/refresh');
    
    if (response.data.success && response.data.data) {
      const authData = response.data.data;
      localStorage.setItem('user', JSON.stringify(authData.user));
      return authData;
    }
    
    throw new Error('Token refresh failed');
  },

  async logout(revokeAllTokens = false): Promise<void> {
    try {
      await api.post('/auth/logout', {
        revokeAllTokens,
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    this.clearAuth();
  },

  clearAuth(): void {
    localStorage.removeItem('user');
  },

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },


  isAuthenticated(): boolean {
    const user = this.getCurrentUser();
    return !!user;
  },
};