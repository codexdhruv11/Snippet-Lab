export interface User {
  id: string;
  username: string;
  email: string;
  bio?: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile extends User {
  username: string;
  snippetsCount: number;
  starsReceived: number;
  followersCount: number;
  followingCount: number;
  isFollowing?: boolean;
  contributions?: ContributionDay[];
}

export interface ContributionDay {
  date: string;
  count: number;
  level: number;
}

export interface ContributionWeek {
  days: ContributionDay[];
}

export interface ContributionStats {
  totalContributions: number;
  longestStreak: number;
  currentStreak: number;
  averagePerDay: number;
  bestDay: {
    date: string;
    count: number;
  } | null;
}
