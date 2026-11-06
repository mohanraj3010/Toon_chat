import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { NotificationItem } from '../types';

const NOTIFICATIONS_STORAGE_KEY = 'toonchat_notifications_v1';

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    type: 'friend_request',
    actor: {
      id: '8',
      username: 'noah_n',
      displayName: 'Noah',
      themeBase: 8,
    },
    content: 'sent you a friend request! Let us connect in ToonChat 👋',
    expression: 'happy',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago (Today)
    read: false,
    actionData: { friendId: '8' },
  },
  {
    id: 'notif-2',
    type: 'reaction',
    actor: {
      id: '3',
      username: 'bella_b',
      displayName: 'Bella',
      themeBase: 3,
    },
    content: 'reacted 🔥 to your 24h cartoon story',
    expression: 'wink',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago (Today)
    read: false,
    targetUrl: '/stories',
  },
  {
    id: 'notif-3',
    type: 'message',
    actor: {
      id: '1',
      username: 'lucy_sky',
      displayName: 'Lucy',
      themeBase: 2,
    },
    content: 'sent a new sticker: "See you at the skatepark!" 🛹',
    expression: 'cool',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago (Today)
    read: false,
    targetUrl: '/chat/chat-1',
  },
  {
    id: 'notif-4',
    type: 'story_interaction',
    actor: {
      id: '4',
      username: 'sam_smith',
      displayName: 'Sam',
      themeBase: 4,
    },
    content: 'replied to your story: "Haha love the new hairstyle!" 😆',
    expression: 'laughing',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), // 6 hours ago (Today)
    read: true,
    targetUrl: '/chat/chat-1',
  },
  {
    id: 'notif-5',
    type: 'group_activity',
    actor: {
      id: '7',
      username: 'chloe_c',
      displayName: 'Chloe',
      themeBase: 7,
    },
    content: 'added 3 new party stickers to "Maple Park Squad" 🎉',
    expression: 'surprised',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(), // Yesterday (Earlier)
    read: true,
    targetUrl: '/chat/chat-3',
  },
  {
    id: 'notif-6',
    type: 'world_activity',
    actor: {
      id: '6',
      username: 'leo_lion',
      displayName: 'Leo',
      themeBase: 6,
    },
    content: 'jumped into the Fountain in Maple Park ⛲',
    expression: 'cool',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 40).toISOString(), // 2 days ago (Earlier)
    read: true,
    targetUrl: '/world',
  },
];

function loadNotifications(): NotificationItem[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(INITIAL_NOTIFICATIONS));
      return INITIAL_NOTIFICATIONS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_NOTIFICATIONS;
  }
}

function saveNotifications(items: NotificationItem[]) {
  localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(items));
}

export const NotificationsService = {
  getNotifications: async (): Promise<NotificationItem[]> => {
    await new Promise((r) => setTimeout(r, 80));
    return loadNotifications();
  },

  getUnreadCount: async (): Promise<number> => {
    const items = loadNotifications();
    return items.filter((n) => !n.read).length;
  },

  markAsRead: async (id: string): Promise<void> => {
    const items = loadNotifications();
    const item = items.find((n) => n.id === id);
    if (item) {
      item.read = true;
      saveNotifications(items);
    }
  },

  markAllAsRead: async (): Promise<void> => {
    const items = loadNotifications();
    items.forEach((n) => {
      n.read = true;
    });
    saveNotifications(items);
  },

  deleteNotification: async (id: string): Promise<void> => {
    const items = loadNotifications();
    const filtered = items.filter((n) => n.id !== id);
    saveNotifications(filtered);
  },

  handleFriendAction: async (id: string, action: 'accept' | 'decline'): Promise<void> => {
    const items = loadNotifications();
    const target = items.find((n) => n.id === id);
    if (target) {
      target.read = true;
      target.content = action === 'accept' ? 'Friend request accepted! 🎉' : 'Friend request declined.';
      delete target.actionData;
      saveNotifications(items);
    }
  },

  pushNotification: (item: NotificationItem): void => {
    const items = loadNotifications();
    items.unshift(item);
    saveNotifications(items);
    window.dispatchEvent(new CustomEvent('toonchat:notification-added', { detail: item }));
  },
};

export const NOTIFICATIONS_QUERY_KEY = ['notifications'];

export const useNotifications = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleAdd = () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    };
    window.addEventListener('toonchat:notification-added', handleAdd);
    return () => window.removeEventListener('toonchat:notification-added', handleAdd);
  }, [queryClient]);

  return useQuery<NotificationItem[], Error>({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: NotificationsService.getNotifications,
  });
};

export const useUnreadNotificationsCount = () => {
  const { data } = useNotifications();
  return data?.filter((n) => !n.read).length || 0;
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => NotificationsService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });
};

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => NotificationsService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => NotificationsService.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });
};

export const useHandleFriendNotification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'accept' | 'decline' }) =>
      NotificationsService.handleFriendAction(id, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
    },
  });
};
