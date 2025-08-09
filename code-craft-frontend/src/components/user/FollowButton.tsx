'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Loader2, UserCheck, UserPlus } from 'lucide-react';
import { followApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { validateUserId } from '@/lib/validation';

interface FollowButtonProps {
  userId: string;
  initialFollowState?: boolean;
  className?: string;
  variant?: 'default' | 'secondary' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function FollowButton({
  userId,
  initialFollowState,
  className,
  variant = 'default',
  size = 'default',
}: FollowButtonProps) {
  const { user: currentUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [isHovered, setIsHovered] = useState(false);

  // Early return if userId is invalid
  if (!userId) {
    return null;
  }

  // Check follow status
  const { data: followStatus, isLoading: isCheckingStatus } = useQuery({
    queryKey: ['follow-status', userId],
    queryFn: () => followApi.checkFollowStatus(userId),
    enabled: !!currentUser && !!userId && currentUser._id !== userId,
    initialData: initialFollowState !== undefined ? { isFollowing: initialFollowState } : undefined,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Toggle follow mutation with optimistic updates
  const { mutate: toggleFollow, isPending } = useMutation({
    mutationFn: () => followApi.toggleFollow(userId),
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['follow-status', userId] });
      
      // Snapshot the previous value
      const previousStatus = queryClient.getQueryData(['follow-status', userId]);
      
      // Optimistically update to the new value
      queryClient.setQueryData(['follow-status', userId], (old: any) => ({
        ...old,
        isFollowing: !old?.isFollowing,
      }));
      
      // Return a context object with the snapshotted value
      return { previousStatus };
    },
    onError: (error: any, _variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(['follow-status', userId], context?.previousStatus);
      
      // Handle specific error cases
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.error?.message || 'Invalid request';
        if (errorMessage.includes('Invalid user ID')) {
          toast.error('Invalid user ID format');
        } else if (errorMessage.includes('Cannot follow yourself')) {
          toast.error('You cannot follow yourself');
        } else {
          toast.error(`Validation Error: ${errorMessage}`);
        }
      } else if (error.response?.status === 404) {
        toast.error('User not found');
      } else if (error.response?.status === 401) {
        toast.error('Please log in to follow users');
      } else if (error.response?.status === 429) {
        toast.error('Too many requests. Please try again later');
      } else {
        toast.error('Failed to update follow status. Please try again');
      }
    },
    onSuccess: (data) => {
      // Update the follow status cache
      queryClient.setQueryData(['follow-status', userId], data);
      
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['user-profile', userId] });
      queryClient.invalidateQueries({ queryKey: ['followers', userId] });
      queryClient.invalidateQueries({ queryKey: ['following', currentUser?._id] });
      queryClient.invalidateQueries({ queryKey: ['follower-count', userId] });
      queryClient.invalidateQueries({ queryKey: ['following-count', currentUser?._id] });
      
      // Show success toast
      toast.success(data.isFollowing ? 'Successfully followed!' : 'Successfully unfollowed!');
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['follow-status', userId] });
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  // Don't show button for own profile or when not logged in
  if (!currentUser || currentUser._id === userId) {
    return null;
  }

  const isFollowing = followStatus?.isFollowing || false;
  const isLoading = isCheckingStatus || isPending;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Validate user ID before making the request
    const validation = validateUserId(userId);
    if (!validation.isValid) {
      toast.error(validation.error || 'Invalid user ID');
      return;
    }
    
    toggleFollow();
  };

  const getButtonContent = () => {
    if (isLoading) {
      return (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {size !== 'icon' && <span className="ml-2">Loading...</span>}
        </>
      );
    }

    if (isFollowing) {
      const icon = isHovered ? <UserCheck className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />;
      const text = isHovered ? 'Unfollow' : 'Following';
      
      return (
        <>
          {icon}
          {size !== 'icon' && <span className="ml-2">{text}</span>}
        </>
      );
    }

    return (
      <>
        <UserPlus className="h-4 w-4" />
        {size !== 'icon' && <span className="ml-2">Follow</span>}
      </>
    );
  };

  return (
    <Button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={isLoading}
      variant={isFollowing ? 'secondary' : variant}
      size={size}
      className={cn(
        'transition-all duration-200',
        isFollowing && isHovered && 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        className
      )}
      aria-label={isFollowing ? 'Unfollow user' : 'Follow user'}
    >
      {getButtonContent()}
    </Button>
  );
}
