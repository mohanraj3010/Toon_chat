import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../api/supabaseClient';
import { authService } from '../api/authService';
import type { AuthSession, AuthUser, LoginInput, RegisterInput } from '../types';
import { showToast } from '@/shared/ui/Toast';
import { AuthContext } from './authContextInstance';
import { realtimeService } from '@/services/realtime';
import { mediaService } from '@/services/api/mediaService';
import { setActiveToken } from '@/services/api/httpClient';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const currentUserIdRef = useRef<string | null>(null);
  const queryClient = useQueryClient();

  // Sync active token to HTTP client whenever session changes
  useEffect(() => {
    setActiveToken(session?.accessToken || null);
  }, [session?.accessToken]);

  // Clean cache and reset state on logout
  const handlePurgeState = useCallback(() => {
    setActiveToken(null);
    currentUserIdRef.current = null;
    setUser(null);
    setSession(null);
    queryClient.clear(); // Purge all cached queries across the app
    realtimeService.disconnect('USER_LOGOUT', true);
    mediaService.clearCache();
    try {
      // Preserve local registered emulator accounts if present, but destroy all session/token/cached state
      const preservedUsers = localStorage.getItem('toonchat_supabase_auth_users_v1');
      localStorage.clear();
      if (preservedUsers) {
        localStorage.setItem('toonchat_supabase_auth_users_v1', preservedUsers);
      }
      sessionStorage.clear();
    } catch (e) {
      console.error('Failed to clear browser storage:', e);
    }
  }, [queryClient]);

  // Session bootstrap on app load
  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session && isMounted) {
          const fallbackUser: AuthUser = {
            id: data.session.user.id,
            username:
              (data.session.user.user_metadata?.username as string) ||
              data.session.user.email?.split('@')[0] ||
              'ToonCitizen',
            email: data.session.user.email,
            displayName:
              (data.session.user.user_metadata?.displayName as string) ||
              (data.session.user.user_metadata?.username as string) ||
              'Toon Citizen',
            characterBase: (data.session.user.user_metadata?.characterBase as number) || 1,
            status: 'online',
            isActive: true,
            isVerified: Boolean((data.session.user as { email_confirmed_at?: string }).email_confirmed_at ?? true),
            createdAt: data.session.user.created_at || new Date().toISOString(),
          };

          const authUser = await authService.getCurrentUser().catch(() => null);
          const finalUser = authUser || fallbackUser;

          if (isMounted) {
            currentUserIdRef.current = finalUser.id;
            setUser(finalUser);
            setSession({
              accessToken: data.session.access_token,
              refreshToken: data.session.refresh_token,
              expiresAt: data.session.expires_at || 0,
              user: finalUser,
            });
          }
        }
      } catch (err) {
        console.error('Session restoration failed:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initializeAuth();

    // Subscribe to auth state changes from Supabase Auth
    const { data: authSubscription } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted) return;

        if (event === 'SIGNED_OUT' || !newSession) {
          handlePurgeState();
        } else if (newSession) {
          const newUserId = newSession.user.id;
          if (currentUserIdRef.current && currentUserIdRef.current !== newUserId) {
            // User identity changed! Clear caches from previous user
            queryClient.clear();
            mediaService.clearCache();
            realtimeService.disconnect('USER_SWITCH', true);
          }
          currentUserIdRef.current = newUserId;

          const fallbackUser: AuthUser = {
            id: newSession.user.id,
            username:
              (newSession.user.user_metadata?.username as string) ||
              newSession.user.email?.split('@')[0] ||
              'ToonCitizen',
            email: newSession.user.email,
            displayName:
              (newSession.user.user_metadata?.displayName as string) ||
              (newSession.user.user_metadata?.username as string) ||
              'Toon Citizen',
            characterBase: (newSession.user.user_metadata?.characterBase as number) || 1,
            status: 'online',
            isActive: true,
            isVerified: Boolean((newSession.user as { email_confirmed_at?: string }).email_confirmed_at ?? true),
            createdAt: newSession.user.created_at || new Date().toISOString(),
          };

          try {
            const authUser = await authService.getCurrentUser().catch(() => null);
            const finalUser = authUser || fallbackUser;
            if (isMounted) {
              setUser(finalUser);
              setSession({
                accessToken: newSession.access_token,
                refreshToken: newSession.refresh_token,
                expiresAt: newSession.expires_at || 0,
                user: finalUser,
              });
            }
          } catch {
            if (isMounted) {
              setUser(fallbackUser);
              setSession({
                accessToken: newSession.access_token,
                refreshToken: newSession.refresh_token,
                expiresAt: newSession.expires_at || 0,
                user: fallbackUser,
              });
            }
          }
        }
      }
    );

    // Listen for session-expired events from HTTP client
    const handleExpired = () => {
      handlePurgeState();
    };
    window.addEventListener('toonchat:session-expired', handleExpired);

    return () => {
      isMounted = false;
      authSubscription?.subscription?.unsubscribe();
      window.removeEventListener('toonchat:session-expired', handleExpired);
    };
  }, [handlePurgeState, queryClient]);

  const refreshUser = useCallback(async () => {
    try {
      const authUser = await authService.getCurrentUser();
      if (authUser) {
        setUser(authUser);
        setSession((prev) => (prev ? { ...prev, user: authUser } : null));
      }
    } catch (err) {
      console.warn('Failed to refresh user:', err);
    }
  }, []);

  const login = async (input: LoginInput): Promise<void> => {
    // Purge stale queries and cached media from prior session before applying new user
    queryClient.clear();
    mediaService.clearCache();
    const { user: authUser, session: authSession } = await authService.login(input);
    currentUserIdRef.current = authUser.id;
    setActiveToken(authSession.accessToken);
    setUser(authUser);
    setSession(authSession);
    showToast(`Welcome back to Maple Park, ${authUser.displayName}! 👋✨`, 'success');
  };

  const register = async (input: RegisterInput): Promise<void> => {
    // Purge stale queries and cached media from prior session before applying new user
    queryClient.clear();
    mediaService.clearCache();
    const { user: authUser, session: authSession } = await authService.register(input);
    currentUserIdRef.current = authUser.id;
    setActiveToken(authSession.accessToken);
    setUser(authUser);
    setSession(authSession);
    showToast(`Welcome to ToonChat, ${authUser.displayName}! Your cartoon journey begins! 🎉🎈`, 'success');
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      handlePurgeState();
      showToast('Logged out! See you soon in Maple Park 👋✨', 'info');
    }
  };

  const changePassword = async (newPassword: string) => {
    await authService.changePassword(newPassword);
    showToast('Cartoon password changed successfully! 🔒✨', 'success');
  };

  const deleteAccount = async () => {
    try {
      await authService.deleteAccount();
    } finally {
      handlePurgeState();
      showToast('Your cartoon account has been closed. We will miss you! 🥺👋', 'info');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAuthenticated: Boolean(user && session),
        login,
        register,
        logout,
        changePassword,
        deleteAccount,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

