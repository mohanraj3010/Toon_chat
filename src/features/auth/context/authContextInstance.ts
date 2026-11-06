import { createContext } from 'react';
import type { AuthSession, AuthUser, LoginInput, RegisterInput } from '../types';

export interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshUser?: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
