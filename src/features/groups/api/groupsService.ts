import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  GroupItem,
  GroupRole,
  CreateGroupInput,
  GroupMember,
} from '../types';
import { CreateGroupInputSchema } from '../types';
import type { AvatarConfig } from '@/features/avatar/types';
import { avatarService } from '@/features/avatar/api/avatarService';

const GROUPS_STORAGE_KEY = 'toonchat_groups_v1';
export const CURRENT_USER_ID = '00000000-0000-0000-0000-000000000000';

function getCurrentUserIdentity(): { username: string; displayName: string } {
  try {
    const rawSession = localStorage.getItem('toonchat_supabase_auth_session_v1');
    if (rawSession) {
      const parsed = JSON.parse(rawSession);
      const u = parsed?.user;
      if (u) {
        const meta = u.user_metadata || {};
        return {
          username: (meta.username as string) || u.email?.split('@')[0] || 'toon_user',
          displayName: (meta.displayName as string) || (meta.username as string) || 'Toon User',
        };
      }
    }
  } catch {
    // ignore
  }
  return { username: 'toon_user', displayName: 'Toon User' };
}

const INITIAL_GROUPS: GroupItem[] = [
  {
    id: 'group-1',
    conversationId: 'chat-3',
    name: 'Maple Park Squad 🛹',
    description: 'The official crew for skating, snacks, and weekend park hangouts.',
    category: 'skate',
    privacy: 'public',
    avatar: {
      emblem: '🛹',
      backgroundColor: '#ffedd5',
      pattern: 'dots',
    },
    bannerColor: '#fed7aa',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    pinnedMessage: {
      id: 'pin-1',
      content: 'Skate ramps session today at 4pm! Bring snacks and helmets 🛹✨',
      pinnedBy: 'Bella',
      pinnedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    },
    members: [
      {
        id: '3',
        username: 'bella_b',
        displayName: 'Bella',
        themeBase: 3,
        role: 'owner',
        joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
      },
      {
        id: CURRENT_USER_ID,
        username: 'toon_user',
        displayName: 'Toon User',
        role: 'admin',
        joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
      },
      {
        id: '1',
        username: 'lucy_sky',
        displayName: 'Lucy',
        themeBase: 2,
        role: 'member',
        joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
      },
      {
        id: '2',
        username: 'max_power',
        displayName: 'Max',
        themeBase: 1,
        role: 'member',
        joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
      },
      {
        id: '4',
        username: 'sam_smith',
        displayName: 'Sam',
        themeBase: 4,
        role: 'member',
        joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
      },
    ],
    joinRequests: [],
  },
  {
    id: 'group-2',
    conversationId: 'chat-6',
    name: 'Toon Artists Studio 🎨',
    description: 'Doodling, animation challenges, cartoon feedback, and sticker creation.',
    category: 'art',
    privacy: 'public',
    avatar: {
      emblem: '🎨',
      backgroundColor: '#fce7f3',
      pattern: 'stars',
    },
    bannerColor: '#fbcfe8',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
    members: [
      {
        id: '1',
        username: 'lucy_sky',
        displayName: 'Lucy',
        themeBase: 2,
        role: 'owner',
        joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
      },
      {
        id: '7',
        username: 'chloe_c',
        displayName: 'Chloe',
        themeBase: 7,
        role: 'admin',
        joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
      },
      {
        id: CURRENT_USER_ID,
        username: 'toon_user',
        displayName: 'Toon User',
        role: 'member',
        joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
      },
    ],
    joinRequests: [],
  },
  {
    id: 'group-3',
    conversationId: 'chat-gaming',
    name: 'Retro Arcade Gamers 🎮',
    description: 'High scores, speedruns, platformers, and late-night pixel quests.',
    category: 'gaming',
    privacy: 'private',
    avatar: {
      emblem: '🎮',
      backgroundColor: '#e0f2fe',
      pattern: 'stripes',
    },
    bannerColor: '#bae6fd',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
    members: [
      {
        id: '2',
        username: 'max_power',
        displayName: 'Max',
        themeBase: 1,
        role: 'owner',
        joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
      },
      {
        id: '6',
        username: 'leo_lion',
        displayName: 'Leo',
        themeBase: 6,
        role: 'admin',
        joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 18).toISOString(),
      },
    ],
    joinRequests: [],
  },
  {
    id: 'group-4',
    conversationId: 'chat-music',
    name: 'Lo-Fi Music Den 🎵',
    description: 'Beats to study, chill, vibe, and cartoon animate to.',
    category: 'music',
    privacy: 'public',
    avatar: {
      emblem: '🎵',
      backgroundColor: '#f3e8ff',
      pattern: 'clouds',
    },
    bannerColor: '#e9d5ff',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    members: [
      {
        id: '4',
        username: 'sam_smith',
        displayName: 'Sam',
        themeBase: 4,
        role: 'owner',
        joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
      },
      {
        id: '8',
        username: 'noah_n',
        displayName: 'Noah',
        themeBase: 8,
        role: 'member',
        joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
      },
    ],
    joinRequests: [],
  },
];

function loadGroups(): GroupItem[] {
  try {
    const raw = localStorage.getItem(GROUPS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(INITIAL_GROUPS));
      return INITIAL_GROUPS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_GROUPS;
  }
}

function saveGroups(groups: GroupItem[]) {
  localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(groups));
}

export const GroupsService = {
  getGroups: async (): Promise<GroupItem[]> => {
    await new Promise((r) => setTimeout(r, 80));
    return loadGroups();
  },

  getGroup: async (id: string): Promise<GroupItem | null> => {
    const groups = loadGroups();
    return groups.find((g) => g.id === id) || null;
  },

  getGroupByConversationId: async (conversationId: string): Promise<GroupItem | null> => {
    const groups = loadGroups();
    return groups.find((g) => g.conversationId === conversationId) || null;
  },

  createGroup: async (input: CreateGroupInput, customAvatar?: AvatarConfig): Promise<GroupItem> => {
    const validated = CreateGroupInputSchema.parse(input);
    const groups = loadGroups();
    const avatar = customAvatar || avatarService.getAvatarOrDefault();

    const newGroupId = `group-${Date.now()}`;
    const newConvId = `chat-group-${Date.now()}`;

    const currentIdentity = getCurrentUserIdentity();
    const initialMembers: GroupMember[] = [
      {
        id: CURRENT_USER_ID,
        username: currentIdentity.username,
        displayName: avatar.name || currentIdentity.displayName,
        avatarConfig: avatar,
        role: 'owner',
        joinedAt: new Date().toISOString(),
      },
    ];

    // Add selected initial members
    const knownFriends: Record<string, { username: string; displayName: string; themeBase: number }> = {
      '1': { username: 'lucy_sky', displayName: 'Lucy', themeBase: 2 },
      '2': { username: 'max_power', displayName: 'Max', themeBase: 1 },
      '3': { username: 'bella_b', displayName: 'Bella', themeBase: 3 },
      '4': { username: 'sam_smith', displayName: 'Sam', themeBase: 4 },
      '7': { username: 'chloe_c', displayName: 'Chloe', themeBase: 7 },
    };

    validated.initialMemberIds.forEach((friendId) => {
      const f = knownFriends[friendId];
      if (f) {
        initialMembers.push({
          id: friendId,
          username: f.username,
          displayName: f.displayName,
          themeBase: f.themeBase,
          role: 'member',
          joinedAt: new Date().toISOString(),
        });
      }
    });

    const newGroup: GroupItem = {
      id: newGroupId,
      conversationId: newConvId,
      name: validated.name,
      description: validated.description,
      category: validated.category as GroupItem['category'],
      privacy: validated.privacy,
      avatar: validated.avatar,
      bannerColor: validated.avatar.backgroundColor,
      createdAt: new Date().toISOString(),
      members: initialMembers,
      joinRequests: [],
    };

    groups.unshift(newGroup);
    saveGroups(groups);
    return newGroup;
  },

  joinGroup: async (groupId: string, customAvatar?: AvatarConfig): Promise<void> => {
    const groups = loadGroups();
    const target = groups.find((g) => g.id === groupId);
    if (!target) return;

    const alreadyMember = target.members.some((m) => m.id === CURRENT_USER_ID);
    if (alreadyMember) return;

    const avatar = customAvatar || avatarService.getAvatarOrDefault();
    const currentIdentity = getCurrentUserIdentity();
    target.members.push({
      id: CURRENT_USER_ID,
      username: currentIdentity.username,
      displayName: avatar.name || currentIdentity.displayName,
      avatarConfig: avatar,
      role: 'member',
      joinedAt: new Date().toISOString(),
    });

    saveGroups(groups);
  },

  leaveGroup: async (groupId: string, newOwnerId?: string): Promise<void> => {
    const groups = loadGroups();
    const target = groups.find((g) => g.id === groupId);
    if (!target) return;

    const currentMember = target.members.find((m) => m.id === CURRENT_USER_ID);
    if (currentMember?.role === 'owner') {
      if (newOwnerId) {
        const newOwner = target.members.find((m) => m.id === newOwnerId);
        if (newOwner) newOwner.role = 'owner';
      } else {
        const nextInLine = target.members.find((m) => m.id !== CURRENT_USER_ID);
        if (nextInLine) nextInLine.role = 'owner';
      }
    }

    target.members = target.members.filter((m) => m.id !== CURRENT_USER_ID);
    saveGroups(groups);
  },

  requestToJoin: async (groupId: string): Promise<void> => {
    const groups = loadGroups();
    const target = groups.find((g) => g.id === groupId);
    if (!target) return;

    const exists = target.joinRequests?.some((r) => r.user.id === CURRENT_USER_ID);
    if (!exists) {
      if (!target.joinRequests) target.joinRequests = [];
      const currentIdentity = getCurrentUserIdentity();
      target.joinRequests.push({
        id: `req-${Date.now()}`,
        user: {
          id: CURRENT_USER_ID,
          username: currentIdentity.username,
          displayName: currentIdentity.displayName,
        },
        requestedAt: new Date().toISOString(),
      });
      saveGroups(groups);
    }
  },

  approveJoinRequest: async (groupId: string, userId: string): Promise<void> => {
    const groups = loadGroups();
    const target = groups.find((g) => g.id === groupId);
    if (!target) return;

    target.joinRequests = target.joinRequests?.filter((r) => r.user.id !== userId) || [];
    if (!target.members.some((m) => m.id === userId)) {
      target.members.push({
        id: userId,
        username: 'user_' + userId,
        displayName: 'Member ' + userId,
        role: 'member',
        joinedAt: new Date().toISOString(),
      });
    }
    saveGroups(groups);
  },

  declineJoinRequest: async (groupId: string, userId: string): Promise<void> => {
    const groups = loadGroups();
    const target = groups.find((g) => g.id === groupId);
    if (!target) return;

    target.joinRequests = target.joinRequests?.filter((r) => r.user.id !== userId) || [];
    saveGroups(groups);
  },

  removeMember: async (groupId: string, userId: string): Promise<void> => {
    const groups = loadGroups();
    const target = groups.find((g) => g.id === groupId);
    if (!target) return;

    target.members = target.members.filter((m) => m.id !== userId);
    saveGroups(groups);
  },

  toggleMuteMember: async (groupId: string, userId: string): Promise<void> => {
    const groups = loadGroups();
    const target = groups.find((g) => g.id === groupId);
    if (!target) return;

    const member = target.members.find((m) => m.id === userId);
    if (member) {
      member.isMuted = !member.isMuted;
      saveGroups(groups);
    }
  },

  promoteDemoteMember: async (groupId: string, userId: string, newRole: GroupRole): Promise<void> => {
    const groups = loadGroups();
    const target = groups.find((g) => g.id === groupId);
    if (!target) return;

    const member = target.members.find((m) => m.id === userId);
    if (member && member.role !== 'owner') {
      member.role = newRole;
      saveGroups(groups);
    }
  },

  updateGroup: async (groupId: string, updates: Partial<GroupItem>): Promise<void> => {
    const groups = loadGroups();
    const target = groups.find((g) => g.id === groupId);
    if (!target) return;

    Object.assign(target, updates);
    saveGroups(groups);
  },

  deleteGroup: async (groupId: string): Promise<void> => {
    const groups = loadGroups();
    const filtered = groups.filter((g) => g.id !== groupId);
    saveGroups(filtered);
  },

  pinMessage: async (groupId: string, content: string): Promise<void> => {
    const groups = loadGroups();
    const target = groups.find((g) => g.id === groupId);
    if (!target) return;

    target.pinnedMessage = {
      id: `pin-${Date.now()}`,
      content,
      pinnedBy: 'Mohan',
      pinnedAt: new Date().toISOString(),
    };
    saveGroups(groups);
  },

  unpinMessage: async (groupId: string): Promise<void> => {
    const groups = loadGroups();
    const target = groups.find((g) => g.id === groupId);
    if (!target) return;

    delete target.pinnedMessage;
    saveGroups(groups);
  },

  // Role-switch debug tool in dev only:
  setDebugUserRole: async (groupId: string, role: GroupRole): Promise<void> => {
    const groups = loadGroups();
    const target = groups.find((g) => g.id === groupId);
    if (!target) return;

    const me = target.members.find((m) => m.id === CURRENT_USER_ID);
    if (me) {
      me.role = role;
      saveGroups(groups);
    }
  },
};

// React Query Hooks
export const GROUPS_QUERY_KEY = ['groups'];

export const useGroups = () => {
  return useQuery<GroupItem[], Error>({
    queryKey: GROUPS_QUERY_KEY,
    queryFn: GroupsService.getGroups,
  });
};

export const useGroup = (id?: string) => {
  return useQuery<GroupItem | null, Error>({
    queryKey: ['group', id],
    queryFn: () => (id ? GroupsService.getGroup(id) : Promise.resolve(null)),
    enabled: Boolean(id),
  });
};

export const useGroupByConversationId = (conversationId?: string) => {
  return useQuery<GroupItem | null, Error>({
    queryKey: ['groupByConv', conversationId],
    queryFn: () => (conversationId ? GroupsService.getGroupByConversationId(conversationId) : Promise.resolve(null)),
    enabled: Boolean(conversationId),
  });
};

export const useCreateGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { input: CreateGroupInput; customAvatar?: AvatarConfig }) =>
      GroupsService.createGroup(input.input, input.customAvatar),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GROUPS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
};

export const useJoinGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, customAvatar }: { groupId: string; customAvatar?: AvatarConfig }) =>
      GroupsService.joinGroup(groupId, customAvatar),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GROUPS_QUERY_KEY });
    },
  });
};

export const useLeaveGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, newOwnerId }: { groupId: string; newOwnerId?: string }) =>
      GroupsService.leaveGroup(groupId, newOwnerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GROUPS_QUERY_KEY });
    },
  });
};

export const useRemoveMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      GroupsService.removeMember(groupId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GROUPS_QUERY_KEY });
    },
  });
};

export const usePromoteDemoteMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, userId, newRole }: { groupId: string; userId: string; newRole: GroupRole }) =>
      GroupsService.promoteDemoteMember(groupId, userId, newRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GROUPS_QUERY_KEY });
    },
  });
};

export const useToggleMuteMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      GroupsService.toggleMuteMember(groupId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GROUPS_QUERY_KEY });
    },
  });
};

export const useUpdateGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, updates }: { groupId: string; updates: Partial<GroupItem> }) =>
      GroupsService.updateGroup(groupId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GROUPS_QUERY_KEY });
    },
  });
};

export const useDeleteGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => GroupsService.deleteGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GROUPS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
};

export const usePinMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, content }: { groupId: string; content?: string }) =>
      content ? GroupsService.pinMessage(groupId, content) : GroupsService.unpinMessage(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GROUPS_QUERY_KEY });
    },
  });
};

export const useDebugUserRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, role }: { groupId: string; role: GroupRole }) =>
      GroupsService.setDebugUserRole(groupId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GROUPS_QUERY_KEY });
    },
  });
};
