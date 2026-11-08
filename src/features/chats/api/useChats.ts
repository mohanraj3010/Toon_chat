import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/context/useAuth';
import {
  conversationService,
  type UIChat,
  type UserSearchItem,
} from './conversationService';

export type { UIChat, UserSearchItem };

export const conversationKeys = {
  all: ['conversations'] as const,
  user: (userId?: string) => [...conversationKeys.all, userId || 'anonymous'] as const,
};

/**
 * Loads active conversations for the authenticated user from the backend database.
 */
export const useConversations = () => {
  const { user, session } = useAuth();
  const token = (session as any)?.access_token || session?.accessToken;

  return useQuery<UIChat[], Error>({
    queryKey: conversationKeys.user(user?.id),
    queryFn: () => conversationService.getConversations(token),
    enabled: Boolean(user),
  });
};

/**
 * Mutation to create or fetch a direct conversation with a target user.
 */
export const useCreateConversation = () => {
  const queryClient = useQueryClient();
  const { user, session } = useAuth();
  const token = (session as any)?.access_token || session?.accessToken;

  return useMutation<UIChat, Error, string>({
    mutationFn: (targetUserId: string) =>
      conversationService.createDirectConversation(targetUserId, token),
    onSuccess: (newChat) => {
      // Invalidate and optimistically populate conversations list
      queryClient.setQueryData<UIChat[]>(conversationKeys.user(user?.id), (old) => {
        if (!old) return [newChat];
        const exists = old.some((c) => c.id === newChat.id);
        if (exists) {
          return old.map((c) => (c.id === newChat.id ? newChat : c));
        }
        return [newChat, ...old];
      });
      queryClient.invalidateQueries({ queryKey: conversationKeys.all });
    },
  });
};

/**
 * Searches users available to start a conversation with.
 */
export const useSearchUsers = (query: string, enabled = true) => {
  const { user, session } = useAuth();
  const token = (session as any)?.access_token || session?.accessToken;

  return useQuery<UserSearchItem[], Error>({
    queryKey: ['users', 'search', query],
    queryFn: () => conversationService.searchUsers(query, token),
    staleTime: 1000 * 30, // 30 seconds
    enabled: Boolean(user && enabled),
  });
};
