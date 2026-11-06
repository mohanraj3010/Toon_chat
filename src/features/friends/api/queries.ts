import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { realFriendsService } from './realFriendsService';

export const friendsKeys = {
  all: ['friends'] as const,
  list: () => [...friendsKeys.all, 'list'] as const,
  online: () => [...friendsKeys.all, 'online'] as const,
  requests: () => [...friendsKeys.all, 'requests'] as const,
  sent: () => [...friendsKeys.all, 'sent'] as const,
  blocked: () => [...friendsKeys.all, 'blocked'] as const,
  discover: (query: string, interests: string[]) => [...friendsKeys.all, 'discover', query, interests] as const,
};

export const useFriends = () => {
  return useQuery({
    queryKey: friendsKeys.list(),
    queryFn: () => realFriendsService.getFriends(),
  });
};

export const useOnlineFriends = () => {
  return useQuery({
    queryKey: friendsKeys.online(),
    queryFn: () => realFriendsService.getOnlineFriends(),
  });
};

export const useFriendRequests = () => {
  return useQuery({
    queryKey: friendsKeys.requests(),
    queryFn: () => realFriendsService.getFriendRequests(),
  });
};

export const useSentRequests = () => {
  return useQuery({
    queryKey: friendsKeys.sent(),
    queryFn: () => realFriendsService.getSentRequests(),
  });
};

export const useBlockedUsers = () => {
  return useQuery({
    queryKey: friendsKeys.blocked(),
    queryFn: () => realFriendsService.getBlockedUsers(),
  });
};

export const useDiscoverUsers = (query: string, interests: string[]) => {
  return useQuery({
    queryKey: friendsKeys.discover(query, interests),
    queryFn: () => realFriendsService.getDiscoverUsers(query, interests),
  });
};

// Mutations
export const useFriendMutations = () => {
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: friendsKeys.all });
  };

  const sendRequest = useMutation({
    mutationFn: (userId: string) => realFriendsService.sendRequest(userId),
    onSuccess: invalidateAll,
  });

  const acceptRequest = useMutation({
    mutationFn: (userId: string) => realFriendsService.acceptRequest(userId),
    onSuccess: invalidateAll,
  });

  const declineRequest = useMutation({
    mutationFn: (userId: string) => realFriendsService.declineRequest(userId),
    onSuccess: invalidateAll,
  });

  const cancelRequest = useMutation({
    mutationFn: (userId: string) => realFriendsService.cancelRequest(userId),
    onSuccess: invalidateAll,
  });

  const removeFriend = useMutation({
    mutationFn: (userId: string) => realFriendsService.removeFriend(userId),
    onSuccess: invalidateAll,
  });

  const blockUser = useMutation({
    mutationFn: (userId: string) => realFriendsService.blockUser(userId),
    onSuccess: invalidateAll,
  });

  const unblockUser = useMutation({
    mutationFn: (userId: string) => realFriendsService.unblockUser(userId),
    onSuccess: invalidateAll,
  });

  return {
    sendRequest,
    acceptRequest,
    declineRequest,
    cancelRequest,
    removeFriend,
    blockUser,
    unblockUser,
  };
};
