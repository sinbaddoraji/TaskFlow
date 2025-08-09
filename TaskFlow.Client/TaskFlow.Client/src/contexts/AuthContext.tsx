import React, { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { authService } from '../services/authService';
import type { User, LoginRequest, RegisterRequest } from '../services/authService';
import { AuthContext } from './auth';
import type { AuthContextType } from './auth';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!user;

  useEffect(() => {
    // Check if user is already logged in
    const initializeAuth = async () => {
      try {
        const currentUser = authService.getCurrentUser();
        
        if (currentUser) {
          // Set the user from localStorage first
          setUser(currentUser);
          
          // Then try to refresh the token in the background to validate the session
          try {
            const authResponse = await authService.refreshToken();
            // Update user data if refresh succeeds
            if (authResponse && authResponse.user) {
              setUser(authResponse.user);
            }
          } catch (error) {
            console.log('Session refresh failed, attempting re-authentication');
            // Don't clear auth immediately - let the user stay logged in
            // The interceptor will handle 401s and redirect if needed
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginRequest): Promise<{ requiresMfa?: boolean; mfaToken?: string }> => {
    const authResponse = await authService.login(credentials);
    
    if (authResponse.requiresMfa) {
      return {
        requiresMfa: true,
        mfaToken: authResponse.mfaToken,
      };
    }
    
    setUser(authResponse.user);
    return {};
  };

  const register = async (userData: RegisterRequest): Promise<void> => {
    const authResponse = await authService.register(userData);
    setUser(authResponse.user);
  };

  const verifyMfa = async (mfaToken: string, code?: string, backupCode?: string): Promise<void> => {
    const authResponse = await authService.verifyMfa(mfaToken, code, backupCode);
    setUser(authResponse.user);
  };

  const logout = async (revokeAllTokens = false): Promise<void> => {
    await authService.logout(revokeAllTokens);
    setUser(null);
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      logout();
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    verifyMfa,
    logout,
    isAuthenticated,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};