'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Loader2, UserCheck, UserPlus } from 'lucide-react';
import { followApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

  // Early return if userId is not provided
  if (!userId) {
    return null;
  }

  // Check follow status
  const { data: followStatus, isLoading: isCheckingStatus } = useQuery({
    queryKey: ['follow-status', userId],
    queryFn: () => followApi.checkFollowStatus(userId),
    enabled: !!currentUser && !!userId && currentUser._id !== userId,
    initialData: initialFollowState !== undefined ? { isFollowing: initialFollowState } : undefined,
  });

  // Toggle follow mutation
  const { mutate: toggleFollow, isPending } = useMutation({
    mutationFn: () => followApi.toggleFollow(userId),
    onSuccess: (data) => {
      // Update the follow status in cache
      queryClient.setQueryData(['follow-status', userId], data);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['user-profile', userId] });
      queryClient.invalidateQueries({ queryKey: ['followers', userId] });
      queryClient.invalidateQueries({ queryKey: ['following'] });
      
      // Show success toast
      toast.success(data.isFollowing ? 'Successfully followed!' : 'Successfully unfollowed!');
    },
    onError: () => {
      toast.error('Failed to update follow status. Please try again.');
    },
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
