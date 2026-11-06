import type { UserProfile } from './types';

export interface ProfileService {
  getCurrentProfile(): Promise<UserProfile>;
  getProfileByUsername(username: string): Promise<UserProfile | null>;
  updateProfile(data: Partial<UserProfile>): Promise<UserProfile>;
  updateRelationship(
    username: string,
    action: 'add' | 'remove' | 'cancel' | 'accept' | 'decline' | 'block' | 'unblock'
  ): Promise<UserProfile>;
}
