import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mockWorldService } from './mockWorldService';
import type { WorldPlaceId, Vector2D } from '../types';

export const WORLD_KEYS = {
  places: ['world', 'places'] as const,
  place: (id: WorldPlaceId) => ['world', 'place', id] as const,
  presence: (id: WorldPlaceId) => ['world', 'presence', id] as const,
  activity: ['world', 'activity'] as const,
};

export const useWorldPlaces = () => {
  return useQuery({
    queryKey: WORLD_KEYS.places,
    queryFn: () => mockWorldService.getPlaces(),
  });
};

export const useWorldPlace = (id: WorldPlaceId) => {
  return useQuery({
    queryKey: WORLD_KEYS.place(id),
    queryFn: () => mockWorldService.getPlace(id),
  });
};

export const useWorldPresence = (id: WorldPlaceId) => {
  return useQuery({
    queryKey: WORLD_KEYS.presence(id),
    queryFn: () => mockWorldService.getPresence(id),
    staleTime: 1000 * 30, // 30s
  });
};

export const useWorldActivity = () => {
  return useQuery({
    queryKey: WORLD_KEYS.activity,
    queryFn: () => mockWorldService.getActivityFeed(),
    refetchInterval: 12000,
  });
};

export const useWorldMutations = (placeId: WorldPlaceId) => {
  const queryClient = useQueryClient();

  const movePlayer = useMutation({
    mutationFn: (target: Vector2D) => mockWorldService.movePlayer(placeId, target),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORLD_KEYS.presence(placeId) });
    },
  });

  const sendEmote = useMutation({
    mutationFn: (emoji: string) => mockWorldService.sendEmote(placeId, emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORLD_KEYS.activity });
    },
  });

  const sendSpeech = useMutation({
    mutationFn: (text: string) => mockWorldService.sendSpeech(placeId, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORLD_KEYS.activity });
    },
  });

  const waveTo = useMutation({
    mutationFn: (targetUserId: string) => mockWorldService.waveTo(placeId, targetUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORLD_KEYS.activity });
    },
  });

  return {
    movePlayer,
    sendEmote,
    sendSpeech,
    waveTo,
  };
};
