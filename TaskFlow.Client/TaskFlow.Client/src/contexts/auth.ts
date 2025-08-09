import { createContext } from 'react';
import type { User, LoginRequest, RegisterRequest } from '../services/authService';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginRequest) => Promise<{ requiresMfa?: boolean; mfaToken?: string }>;
  register: (userData: RegisterRequest) => Promise<void>;
  verifyMfa: (mfaToken: string, code?: string, backupCode?: string) => Promise<void>;
  logout: (revokeAllTokens?: boolean) => Promise<void>;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);