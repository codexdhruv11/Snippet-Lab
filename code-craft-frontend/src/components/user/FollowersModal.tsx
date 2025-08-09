'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserList } from './UserList';
import { followApi } from '@/lib/api';
import { API_LIMITS } from '@/lib/constants';
import type { UserProfile } from '@/types/api';

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName?: string;
  initialTab?: 'followers' | 'following';
}

export function FollowersModal({
  isOpen,
  onClose,
  userId,
  userName = 'User',
  initialTab = 'followers',
}: FollowersModalProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [followersPage, setFollowersPage] = useState(1);
  const [followingPage, setFollowingPage] = useState(1);
  const [allFollowers, setAllFollowers] = useState<UserProfile[]>([]);
  const [allFollowing, setAllFollowing] = useState<UserProfile[]>([]);

  // Reset pages and data when modal opens or userId changes
  useEffect(() => {
    if (isOpen) {
      setFollowersPage(1);
      setFollowingPage(1);
      setAllFollowers([]);
      setAllFollowing([]);
    }
  }, [isOpen, userId]);

  // Fetch followers
  const {
    data: followersData,
    isLoading: isLoadingFollowers,
    isFetching: isFetchingMoreFollowers,
    error: followersError,
    refetch: refetchFollowers,
  } = useQuery({
    queryKey: ['followers', userId, followersPage],
    queryFn: () => followApi.getFollowers(userId, followersPage, API_LIMITS.MAX_USERS_PER_PAGE),
    enabled: isOpen && activeTab === 'followers' && !!userId,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  // Update accumulated followers when new data arrives
  useEffect(() => {
    if (followersData?.data) {
      if (followersPage === 1) {
        setAllFollowers(followersData.data);
      } else {
        setAllFollowers(prev => {
          const newUsers = followersData.data.filter(
            (user: UserProfile) => !prev.some((existing: UserProfile) => existing._id === user._id)
          );
          return [...prev, ...newUsers];
        });
      }
    }
  }, [followersData, followersPage]);

  // Fetch following
  const {
    data: followingData,
    isLoading: isLoadingFollowing,
    isFetching: isFetchingMoreFollowing,
    error: followingError,
    refetch: refetchFollowing,
  } = useQuery({
    queryKey: ['following', userId, followingPage],
    queryFn: () => followApi.getFollowing(userId, followingPage, API_LIMITS.MAX_USERS_PER_PAGE),
    enabled: isOpen && activeTab === 'following' && !!userId,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  // Update accumulated following when new data arrives
  useEffect(() => {
    if (followingData?.data) {
      if (followingPage === 1) {
        setAllFollowing(followingData.data);
      } else {
        setAllFollowing(prev => {
          const newUsers = followingData.data.filter(
            (user: UserProfile) => !prev.some((existing: UserProfile) => existing._id === user._id)
          );
          return [...prev, ...newUsers];
        });
      }
    }
  }, [followingData, followingPage]);

  const handleLoadMoreFollowers = () => {
    if (followersData?.pagination?.hasMore) {
      setFollowersPage((prev) => prev + 1);
    }
  };

  const handleLoadMoreFollowing = () => {
    if (followingData?.pagination?.hasMore) {
      setFollowingPage((prev) => prev + 1);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{userName}'s Network</DialogTitle>
          <DialogDescription>
            View {userName}'s followers and the people they follow
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'followers' | 'following')}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2" aria-label="User network tabs">
            <TabsTrigger value="followers" aria-label="Followers tab">
              Followers
              {followersData?.pagination?.totalItems !== undefined && (
                <span className="ml-2 text-xs text-muted-foreground">
                  ({followersData.pagination.totalItems})
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="following" aria-label="Following tab">
              Following
              {followingData?.pagination?.totalItems !== undefined && (
                <span className="ml-2 text-xs text-muted-foreground">
                  ({followingData.pagination.totalItems})
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="followers" className="mt-4">
            <UserList
              users={allFollowers}
              isLoading={isLoadingFollowers && followersPage === 1}
              hasMore={followersData?.pagination?.hasMore || false}
              onLoadMore={handleLoadMoreFollowers}
              isLoadingMore={isFetchingMoreFollowers && followersPage > 1}
              emptyMessage={`${userName} doesn't have any followers yet`}
              className="max-h-[50vh]"
              error={followersError as Error | null}
              onRetry={() => refetchFollowers()}
              retryLoading={isFetchingMoreFollowers}
            />
          </TabsContent>

          <TabsContent value="following" className="mt-4">
            <UserList
              users={allFollowing}
              isLoading={isLoadingFollowing && followingPage === 1}
              hasMore={followingData?.pagination?.hasMore || false}
              onLoadMore={handleLoadMoreFollowing}
              isLoadingMore={isFetchingMoreFollowing && followingPage > 1}
              emptyMessage={`${userName} isn't following anyone yet`}
              className="max-h-[50vh]"
              error={followingError as Error | null}
              onRetry={() => refetchFollowing()}
              retryLoading={isFetchingMoreFollowing}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
