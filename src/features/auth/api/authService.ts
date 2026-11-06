import { supabase, updateSessionUserMetadata } from './supabaseClient';
import { apiClient, setActiveToken } from '@/services/api/httpClient';
import type { AuthSession, AuthUser, LoginInput, RegisterInput } from '../types';

export interface CurrentUserResponse {
  authenticated: boolean;
  user: {
    id: string;
    username: string;
    email?: string;
    displayName: string;
    avatarUrl?: string;
    status: string;
    vibeText?: string;
    isActive: boolean;
    isVerified: boolean;
    createdAt: string;
  };
  profile: {
    displayName?: string;
    bio: string;
    characterBase: number;
    joinedAt: string;
    avatarUrl?: string;
    status?: string;
    vibeText?: string;
    skinTone?: string;
    hairColor?: string;
    clothingColor?: string;
    favoriteReaction?: string;
    mood?: string;
  };

  avatar?: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

export const authService = {
  /**
   * Registers a new user:
   * 1. Supabase Auth creates the identity and issues the initial session.
   * 2. FastAPI backend atomically provisions User, Profile, and Avatar with the Supabase UUID.
   */
  async register(input: RegisterInput): Promise<{ user: AuthUser; session: AuthSession }> {
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          username: input.username,
          displayName: input.displayName,
          characterBase: input.characterBase,
        },
      },
    });

    if (error || !data.user) {
      throw new Error(error?.message || 'Could not create toon account in Supabase Auth.');
    }

    let sessionData = data.session;
    if (!sessionData) {
      const sessionRes = await supabase.auth.getSession();
      sessionData = sessionRes.data?.session || null;
    }

    const fallbackUser: AuthUser = {
      id: data.user.id,
      username: input.username,
      email: input.email,
      displayName: input.displayName,
      characterBase: input.characterBase,
      status: 'online',
      isActive: true,
      isVerified: Boolean((data.user as { email_confirmed_at?: string }).email_confirmed_at ?? true),
      createdAt: data.user.created_at || new Date().toISOString(),
    };

    let resolvedUser = fallbackUser;

    // Provision application user in FastAPI backend
    try {
      if (sessionData?.access_token) {
        setActiveToken(sessionData.access_token);
      }
      const res = await apiClient.post<CurrentUserResponse>(
        '/auth/register',
        {
          username: input.username,
          displayName: input.displayName,
          characterBase: input.characterBase,
          email: input.email,
        },
        { requiresAuth: true }
      );

      if (res && res.user) {
        resolvedUser = {
          id: res.user.id,
          username: res.user.username,
          email: res.user.email,
          displayName: res.profile?.displayName || res.user.displayName,
          characterBase: res.profile?.characterBase || input.characterBase,
          status: res.user.status || 'online',
          vibeText: res.user.vibeText,
          avatarUrl: res.user.avatarUrl,
          isActive: res.user.isActive ?? true,
          isVerified: res.user.isVerified ?? false,
          createdAt: res.user.createdAt || new Date().toISOString(),
        };

        updateSessionUserMetadata({
          id: resolvedUser.id,
          username: resolvedUser.username,
          displayName: resolvedUser.displayName,
          characterBase: resolvedUser.characterBase,
          status: resolvedUser.status,
          vibeText: resolvedUser.vibeText,
          avatarUrl: resolvedUser.avatarUrl,
        });
      }
    } catch (err: unknown) {
      console.warn('Database user provisioning warning:', err);
    }

    const authSession: AuthSession = {
      accessToken: sessionData?.access_token || '',
      refreshToken: sessionData?.refresh_token || '',
      expiresAt: sessionData?.expires_at || 0,
      user: resolvedUser,
    };

    return { user: resolvedUser, session: authSession };
  },

  /**
   * Signs in user with email and password via Supabase Auth,
   * then fetches the authenticated application profile.
   */
  async login(input: LoginInput): Promise<{ user: AuthUser; session: AuthSession }> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error || !data.user) {
      const errMsg = error?.message?.toLowerCase().includes('fetch failed')
        ? 'Could not connect to authentication service. Check server connection and try again.'
        : error?.message || 'Invalid email or password. Check your details and try again! 🔍';
      throw new Error(errMsg);
    }

    let sessionData = data.session;
    if (!sessionData) {
      const sessionRes = await supabase.auth.getSession();
      sessionData = sessionRes.data?.session || null;
    }

    const fallbackUser: AuthUser = {
      id: data.user.id,
      username:
        (data.user.user_metadata?.username as string) ||
        data.user.email?.split('@')[0] ||
        'ToonCitizen',
      email: data.user.email,
      displayName:
        (data.user.user_metadata?.displayName as string) ||
        (data.user.user_metadata?.username as string) ||
        'Toon Citizen',
      characterBase: (data.user.user_metadata?.characterBase as number) || 1,
      status: 'online',
      isActive: true,
      isVerified: Boolean((data.user as { email_confirmed_at?: string }).email_confirmed_at ?? true),
      createdAt: data.user.created_at || new Date().toISOString(),
    };

    let resolvedUser = fallbackUser;

    // Profile and application user resolution
    try {
      if (sessionData?.access_token) {
        setActiveToken(sessionData.access_token);
      }
      const current = await this.getCurrentUser();
      if (current) {
        resolvedUser = {
          ...current,
          email: current.email || fallbackUser.email,
        };
      } else {
        // Backend user is not yet provisioned in database; auto-provision
        const metadata = data.user.user_metadata || {};
        const username = metadata.username || fallbackUser.username;
        const displayName = metadata.displayName || fallbackUser.displayName;
        const characterBase = metadata.characterBase || fallbackUser.characterBase;

        const res = await apiClient.post<CurrentUserResponse>(
          '/auth/register',
          {
            username,
            displayName,
            characterBase,
            email: input.email,
          },
          { requiresAuth: true }
        );

        if (res && res.user) {
          resolvedUser = {
            id: res.user.id,
            username: res.user.username,
            email: res.user.email,
            displayName: res.profile?.displayName || res.user.displayName,
            characterBase: res.profile?.characterBase || characterBase,
            status: res.user.status || 'online',
            vibeText: res.user.vibeText,
            avatarUrl: res.user.avatarUrl,
            isActive: res.user.isActive ?? true,
            isVerified: res.user.isVerified ?? false,
            createdAt: res.user.createdAt,
          };
        }
      }
    } catch (profileErr: unknown) {
      console.warn('Backend profile fetch/provisioning warning:', profileErr);
    }

    const authSession: AuthSession = {
      accessToken: sessionData?.access_token || '',
      refreshToken: sessionData?.refresh_token || '',
      expiresAt: sessionData?.expires_at || 0,
      user: resolvedUser,
    };

    return { user: resolvedUser, session: authSession };
  },

  /**
   * Signs out of Supabase Auth session and notifies FastAPI.
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout', {}, { requiresAuth: true });
    } catch {
      // Ignore backend logout errors if network unavailable
    }
    await supabase.auth.signOut();
  },

  /**
   * Fetches the current authenticated user bundle from FastAPI.
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    const res = await apiClient.get<CurrentUserResponse>('/me', { requiresAuth: true });
    if (!res || !res.authenticated || !res.user) {
      return null;
    }

    return {
      id: res.user.id,
      username: res.user.username,
      email: res.user.email,
      displayName: res.profile?.displayName || res.user.displayName,
      characterBase: res.profile?.characterBase || 1,
      status: res.user.status || 'online',
      vibeText: res.user.vibeText,
      avatarUrl: res.user.avatarUrl,
      isActive: res.user.isActive ?? true,
      isVerified: res.user.isVerified ?? false,
      createdAt: res.user.createdAt,
    };
  },

  /**
   * Updates password via Supabase Auth identity provider.
   */
  async changePassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) {
      throw new Error(error.message || 'Failed to update password.');
    }
    try {
      await apiClient.post(
        '/auth/password/change',
        {
          currentPassword: '***',
          newPassword,
        },
        { requiresAuth: true }
      );
    } catch {
      // Handled gracefully
    }
  },

  /**
   * Soft-deletes user account and signs out.
   */
  async deleteAccount(): Promise<void> {
    await apiClient.delete('/auth/account', { requiresAuth: true });
    await supabase.auth.signOut();
  },
};
