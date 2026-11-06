import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { realProfileService } from './realProfileService';
import type { UserProfile } from './types';
import { useAuth } from '@/features/auth/context/useAuth';

export const profileKeys = {
  all: ['profile'] as const,
  me: (userId?: string) => [...profileKeys.all, 'me', userId || 'current'] as const,
  user: (username: string) => [...profileKeys.all, 'user', username.toLowerCase()] as const,
};

export const useCurrentProfile = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: profileKeys.me(user?.id),
    queryFn: () => realProfileService.getCurrentProfile(),
    enabled: Boolean(user),
    staleTime: 1000 * 60,
  });
};

export const useUserProfile = (username?: string) => {
  const { user } = useAuth();
  const isMe =
    !username ||
    username.toLowerCase() === 'me' ||
    Boolean(user && user.username.toLowerCase() === username.toLowerCase());

  return useQuery({
    queryKey: isMe ? profileKeys.me(user?.id) : profileKeys.user(username!),
    queryFn: () => {
      if (isMe) {
        return realProfileService.getCurrentProfile();
      }
      return realProfileService.getProfileByUsername(username!);
    },
    enabled: isMe ? Boolean(user) : Boolean(username),
    staleTime: 1000 * 60,
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { user, refreshUser } = useAuth();

  return useMutation({
    mutationFn: (data: Partial<UserProfile>) => realProfileService.updateProfile(data),
    onSuccess: (updated) => {
      // Immediately update cached profile data so UI reflects new values without a round-trip
      queryClient.setQueryData(profileKeys.me(user?.id), updated);
      queryClient.setQueryData(profileKeys.user(updated.username), updated);
      // Invalidate all profile queries so any stale view is refreshed
      queryClient.invalidateQueries({ queryKey: profileKeys.all });
      // Sync the AuthContext user object (top-nav / shell avatar, etc.)
      refreshUser?.();
    },
  });
};

export const useRelationshipMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      username,
      action,
    }: {
      username: string;
      action: 'add' | 'remove' | 'cancel' | 'accept' | 'decline' | 'block' | 'unblock';
    }) => realProfileService.updateRelationship(username, action),
    onSuccess: (updated, variables) => {
      queryClient.setQueryData(profileKeys.user(variables.username), updated);
      queryClient.invalidateQueries({ queryKey: profileKeys.all });
    },
  });
};
