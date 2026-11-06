import type { FriendsService, DiscoverUser, FriendStatus } from './friendsService';
// Mock data generation
const names = ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Oliver', 'Isabella', 'Elijah', 'Sophia', 'William', 'Mia', 'James', 'Charlotte', 'Benjamin', 'Amelia', 'Lucas', 'Harper', 'Henry', 'Evelyn', 'Alexander'];
const interests = ['Gaming', 'Music', 'Art', 'Coding', 'Movies', 'Anime', 'Photography', 'Travel', 'Food', 'Fitness'];
const avatars = [
  'https://api.dicebear.com/7.x/notionists/svg?seed=Emma',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Liam',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Olivia',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Noah',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Ava',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Oliver',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Isabella',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Elijah',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Sophia',
  'https://api.dicebear.com/7.x/notionists/svg?seed=William',
];

const generateMockUsers = (): DiscoverUser[] => {
  return names.map((name, index) => {
    let friendStatus: FriendStatus = 'none';
    if (index < 5) friendStatus = 'friends';
    else if (index < 7) friendStatus = 'pending'; // They sent us a request
    else if (index < 9) friendStatus = 'requested'; // We sent them a request
    else if (index < 10) friendStatus = 'blocked';
    
    return {
      id: `user-${index + 1}`,
      username: name.toLowerCase() + Math.floor(Math.random() * 100),
      displayName: name,
      avatarUrl: avatars[index % avatars.length],
      status: Math.random() > 0.5 ? 'online' : 'offline',
      friendStatus,
      isOnline: Math.random() > 0.5,
      bio: `Hello! I am ${name}. I love chatting.`,
      mutualFriends: Math.floor(Math.random() * 10),
      interests: [interests[index % interests.length], interests[(index + 1) % interests.length]],
      suggestedReason: index > 15 ? 'Has 3 mutual friends' : (index > 10 ? 'Similar interests' : undefined),
    } as DiscoverUser; // Assert status for now
  });
};

class MockFriendsServiceImpl implements FriendsService {
  private users: DiscoverUser[] = generateMockUsers();
  private shouldFail = false;

  setShouldFail(fail: boolean) {
    this.shouldFail = fail;
  }

  private async delay() {
    await new Promise(resolve => setTimeout(resolve, 800));
    if (this.shouldFail) {
      throw new Error("Simulated network failure.");
    }
  }

  async getFriends(): Promise<DiscoverUser[]> {
    await this.delay();
    return this.users.filter(u => u.friendStatus === 'friends');
  }

  async getOnlineFriends(): Promise<DiscoverUser[]> {
    await this.delay();
    return this.users.filter(u => u.friendStatus === 'friends' && u.isOnline);
  }

  async getFriendRequests(): Promise<DiscoverUser[]> {
    await this.delay();
    return this.users.filter(u => u.friendStatus === 'pending');
  }

  async getSentRequests(): Promise<DiscoverUser[]> {
    await this.delay();
    return this.users.filter(u => u.friendStatus === 'requested');
  }

  async getBlockedUsers(): Promise<DiscoverUser[]> {
    await this.delay();
    return this.users.filter(u => u.friendStatus === 'blocked');
  }

  async getDiscoverUsers(query: string, filterInterests: string[]): Promise<DiscoverUser[]> {
    await this.delay();
    let filtered = this.users.filter(u => u.friendStatus === 'none');
    
    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter(u => 
        u.displayName.toLowerCase().includes(q) || 
        u.username.toLowerCase().includes(q)
      );
    }
    
    if (filterInterests.length > 0) {
      filtered = filtered.filter(u => 
        u.interests?.some(i => filterInterests.includes(i))
      );
    }
    
    return filtered;
  }

  private changeUserStatus(userId: string, status: FriendStatus) {
    const user = this.users.find(u => u.id === userId);
    if (user) {
      user.friendStatus = status;
    }
  }

  async sendRequest(userId: string): Promise<void> {
    await this.delay();
    this.changeUserStatus(userId, 'requested');
  }

  async acceptRequest(userId: string): Promise<void> {
    await this.delay();
    this.changeUserStatus(userId, 'friends');
  }

  async declineRequest(userId: string): Promise<void> {
    await this.delay();
    this.changeUserStatus(userId, 'none');
  }

  async cancelRequest(userId: string): Promise<void> {
    await this.delay();
    this.changeUserStatus(userId, 'none');
  }

  async removeFriend(userId: string): Promise<void> {
    await this.delay();
    this.changeUserStatus(userId, 'none');
  }

  async blockUser(userId: string): Promise<void> {
    await this.delay();
    this.changeUserStatus(userId, 'blocked');
  }

  async unblockUser(userId: string): Promise<void> {
    await this.delay();
    this.changeUserStatus(userId, 'none');
  }
}

export const mockFriendsService = new MockFriendsServiceImpl();
