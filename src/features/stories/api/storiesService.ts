import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  StoryItem,
  UserStoryGroup,
  StoryCreateInput,
  StoryReaction,
} from '../types';
import { StoryCreateInputSchema } from '../types';
import type { AvatarConfig } from '@/features/avatar/types';
import { avatarService } from '@/features/avatar/api/avatarService';

const STORIES_STORAGE_KEY = 'toonchat_stories_v1';
const CURRENT_USER_ID = 'me-current-user';

const INITIAL_MOCK_STORIES: StoryItem[] = [
  {
    id: 'story-lucy-1',
    userId: '1',
    user: {
      id: '1',
      username: 'lucy_sky',
      displayName: 'Lucy',
      themeBase: 2,
    },
    type: 'expression',
    content: {
      expression: 'happy',
      caption: 'Good morning ToonChat world! Sunshine & good vibes today ☀️🌻',
      backgroundColor: '#fef3c7',
      backgroundPattern: 'dots',
      stickers: [
        { id: 's1', emoji: '✨', x: 20, y: 30, scale: 1.2, rotation: 12 },
        { id: 's2', emoji: '🌈', x: 80, y: 25, scale: 1.4, rotation: -10 },
      ],
      textColor: '#78350f',
      fontFamily: 'fredoka',
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45m ago
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 23).toISOString(),
    viewed: false,
    reactions: [],
    viewers: [],
  },
  {
    id: 'story-lucy-2',
    userId: '1',
    user: {
      id: '1',
      username: 'lucy_sky',
      displayName: 'Lucy',
      themeBase: 2,
    },
    type: 'sticker',
    content: {
      expression: 'wink',
      caption: 'Found the best bubble tea spot in town! 🧋✨',
      backgroundColor: '#fce7f3',
      backgroundPattern: 'hearts',
      stickers: [
        { id: 's3', emoji: '🧋', x: 50, y: 55, scale: 2, rotation: 5 },
        { id: 's4', emoji: '💖', x: 25, y: 65, scale: 1.3, rotation: -15 },
        { id: 's5', emoji: '🌸', x: 75, y: 65, scale: 1.3, rotation: 20 },
      ],
      textColor: '#831843',
      fontFamily: 'fredoka',
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(), // 20m ago
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 23.5).toISOString(),
    viewed: false,
    reactions: [],
    viewers: [],
  },
  {
    id: 'story-max-1',
    userId: '2',
    user: {
      id: '2',
      username: 'max_power',
      displayName: 'Max',
      themeBase: 1,
    },
    type: 'sticker',
    content: {
      expression: 'cool',
      caption: 'Meet me at Maple Park skate ramps at 4pm! 🛹🔥',
      backgroundColor: '#e0f2fe',
      backgroundPattern: 'stars',
      stickers: [
        { id: 's6', emoji: '🛹', x: 45, y: 50, scale: 1.8, rotation: -15 },
        { id: 's7', emoji: '🔥', x: 75, y: 35, scale: 1.5, rotation: 10 },
        { id: 's8', emoji: '⚡', x: 20, y: 40, scale: 1.2, rotation: -5 },
      ],
      textColor: '#0c4a6e',
      fontFamily: 'fredoka',
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(), // 1.5h ago
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 22).toISOString(),
    viewed: false,
    reactions: [],
    viewers: [],
  },
  {
    id: 'story-bella-1',
    userId: '3',
    user: {
      id: '3',
      username: 'bella_b',
      displayName: 'Bella',
      themeBase: 3,
    },
    type: 'text',
    content: {
      expression: 'laughing',
      caption: 'Who is up for pizza & board games tonight? Vote below! 🍕🎲',
      backgroundColor: '#fed7aa',
      backgroundPattern: 'stripes',
      stickers: [
        { id: 's9', emoji: '🍕', x: 30, y: 35, scale: 1.6, rotation: -8 },
        { id: 's10', emoji: '🎲', x: 70, y: 35, scale: 1.5, rotation: 12 },
      ],
      textColor: '#7c2d12',
      fontFamily: 'fredoka',
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3h ago
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 20.5).toISOString(),
    viewed: false,
    reactions: [],
    viewers: [],
  },
  {
    id: 'story-sam-1',
    userId: '4',
    user: {
      id: '4',
      username: 'sam_smith',
      displayName: 'Sam',
      themeBase: 4,
    },
    type: 'expression',
    content: {
      expression: 'cool',
      caption: 'Lo-fi beats and cozy coding session 🎧💻',
      backgroundColor: '#e0e7ff',
      backgroundPattern: 'clouds',
      stickers: [
        { id: 's11', emoji: '🎧', x: 75, y: 30, scale: 1.5, rotation: 15 },
        { id: 's12', emoji: '☕', x: 25, y: 65, scale: 1.3, rotation: -5 },
      ],
      textColor: '#312e81',
      fontFamily: 'fredoka',
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(), // 5h ago
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 19).toISOString(),
    viewed: true,
    reactions: [],
    viewers: [],
  },
  {
    id: 'story-chloe-1',
    userId: '7',
    user: {
      id: '7',
      username: 'chloe_c',
      displayName: 'Chloe',
      themeBase: 7,
    },
    type: 'sticker',
    content: {
      expression: 'wink',
      caption: 'Weekend countdown is officially ON! 🎉🥳',
      backgroundColor: '#f3e8ff',
      backgroundPattern: 'dots',
      stickers: [
        { id: 's13', emoji: '🎉', x: 25, y: 35, scale: 1.6, rotation: -12 },
        { id: 's14', emoji: '✨', x: 75, y: 40, scale: 1.4, rotation: 15 },
      ],
      textColor: '#581c87',
      fontFamily: 'fredoka',
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 420).toISOString(), // 7h ago
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 17).toISOString(),
    viewed: true,
    reactions: [],
    viewers: [],
  },
];

function loadStoriesFromStorage(): StoryItem[] {
  try {
    const raw = localStorage.getItem(STORIES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORIES_STORAGE_KEY, JSON.stringify(INITIAL_MOCK_STORIES));
      return INITIAL_MOCK_STORIES;
    }
    const items: StoryItem[] = JSON.parse(raw);
    const now = new Date().toISOString();
    // Filter out expired stories (older than 24h)
    const valid = items.filter((s) => s.expiresAt > now);
    if (valid.length !== items.length) {
      localStorage.setItem(STORIES_STORAGE_KEY, JSON.stringify(valid));
    }
    return valid;
  } catch {
    return INITIAL_MOCK_STORIES;
  }
}

function saveStoriesToStorage(stories: StoryItem[]) {
  localStorage.setItem(STORIES_STORAGE_KEY, JSON.stringify(stories));
}

export const StoriesService = {
  getStories: async (): Promise<StoryItem[]> => {
    // Artificial small delay for realistic loading skeleton demo
    await new Promise((r) => setTimeout(r, 80));
    return loadStoriesFromStorage();
  },

  getStoryGroups: async (): Promise<UserStoryGroup[]> => {
    const stories = await StoriesService.getStories();
    
    // Group by user
    const groupMap = new Map<string, StoryItem[]>();
    for (const story of stories) {
      const existing = groupMap.get(story.userId) || [];
      existing.push(story);
      groupMap.set(story.userId, existing);
    }

    const groups: UserStoryGroup[] = [];
    for (const [userId, userStories] of groupMap.entries()) {
      // Sort stories for this user chronologically
      userStories.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const hasUnviewed = userStories.some((s) => !s.viewed);
      const lastStory = userStories[userStories.length - 1];
      
      groups.push({
        userId,
        user: lastStory.user,
        stories: userStories,
        hasUnviewed,
        lastStoryAt: lastStory.createdAt,
      });
    }

    // Sort groups: unviewed first, then by lastStoryAt descending
    groups.sort((a, b) => {
      // Put current user first if present
      if (a.userId === CURRENT_USER_ID) return -1;
      if (b.userId === CURRENT_USER_ID) return 1;

      if (a.hasUnviewed !== b.hasUnviewed) {
        return a.hasUnviewed ? -1 : 1;
      }
      return new Date(b.lastStoryAt).getTime() - new Date(a.lastStoryAt).getTime();
    });

    return groups;
  },

  createStory: async (input: StoryCreateInput, customAvatar?: AvatarConfig): Promise<StoryItem> => {
    const validated = StoryCreateInputSchema.parse(input);
    const stories = loadStoriesFromStorage();

    const avatar = customAvatar || avatarService.getAvatarOrDefault();
    let currentUsername = 'You';
    try {
      const rawSession = localStorage.getItem('toonchat_supabase_auth_session_v1');
      if (rawSession) {
        const parsed = JSON.parse(rawSession);
        currentUsername = parsed?.user?.user_metadata?.username || parsed?.user?.email?.split('@')[0] || 'You';
      }
    } catch {
      // ignore
    }

    const newStory: StoryItem = {
      id: `story-my-${Date.now()}`,
      userId: CURRENT_USER_ID,
      user: {
        id: CURRENT_USER_ID,
        username: currentUsername,
        displayName: avatar.name || 'You',
        avatarConfig: avatar,
      },
      type: validated.type,
      content: validated.content,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // 24h
      viewed: true, // You have viewed your own story
      reactions: [],
      viewers: [
        {
          id: '1',
          username: 'lucy_sky',
          displayName: 'Lucy',
          themeBase: 2,
          viewedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        },
        {
          id: '2',
          username: 'max_power',
          displayName: 'Max',
          themeBase: 1,
          viewedAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
        },
      ],
    };

    stories.push(newStory);
    saveStoriesToStorage(stories);
    return newStory;
  },

  markStoryViewed: async (storyId: string): Promise<void> => {
    const stories = loadStoriesFromStorage();
    const target = stories.find((s) => s.id === storyId);
    if (target) {
      target.viewed = true;
      saveStoriesToStorage(stories);
    }
  },

  reactToStory: async (storyId: string, emoji: string): Promise<void> => {
    const stories = loadStoriesFromStorage();
    const target = stories.find((s) => s.id === storyId);
    if (target) {
      const reaction: StoryReaction = {
        userId: CURRENT_USER_ID,
        userName: 'You',
        emoji,
        createdAt: new Date().toISOString(),
      };
      target.reactions.push(reaction);
      saveStoriesToStorage(stories);
    }
  },

  replyToStory: async (_storyId: string, _text: string): Promise<void> => {
    // In demo environment, store or notify
    await new Promise((r) => setTimeout(r, 100));
  },

  deleteStory: async (storyId: string): Promise<void> => {
    const stories = loadStoriesFromStorage();
    const filtered = stories.filter((s) => s.id !== storyId);
    saveStoriesToStorage(filtered);
  },
};

// React Query Hooks
export const STORIES_QUERY_KEY = ['storyGroups'];

export const useStoryGroups = () => {
  return useQuery<UserStoryGroup[], Error>({
    queryKey: STORIES_QUERY_KEY,
    queryFn: StoriesService.getStoryGroups,
  });
};

export const useCreateStory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { input: StoryCreateInput; customAvatar?: AvatarConfig }) =>
      StoriesService.createStory(input.input, input.customAvatar),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STORIES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
  });
};

export const useMarkStoryViewed = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (storyId: string) => StoriesService.markStoryViewed(storyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STORIES_QUERY_KEY });
    },
  });
};

export const useReactToStory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ storyId, emoji }: { storyId: string; emoji: string }) =>
      StoriesService.reactToStory(storyId, emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STORIES_QUERY_KEY });
    },
  });
};

export const useDeleteStory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (storyId: string) => StoriesService.deleteStory(storyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STORIES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
  });
};
