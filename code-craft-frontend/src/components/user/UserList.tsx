'use client';

import { UserCard } from './UserCard';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { UserX, Loader2 } from 'lucide-react';

interface UserListProps {
  users: any[];
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  emptyMessage?: string;
  showFollowButton?: boolean;
  className?: string;
  error?: Error | null;
  onRetry?: () => void;
  retryLoading?: boolean;
}

export function UserList({
  users,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  isLoadingMore = false,
  emptyMessage = 'No users found',
  showFollowButton = true,
  className,
  error,
  onRetry,
  retryLoading = false,
}: UserListProps) {
  // Loading skeleton
  const UserCardSkeleton = () => (
    <div className="p-4 border rounded-lg">
      <div className="flex items-start space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-3 w-full mb-1" />
          <Skeleton className="h-3 w-3/4" />
          <div className="flex gap-2 mt-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
      </div>
    </div>
  );

  if (isLoading && users.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[...Array(3)].map((_, i) => (
          <UserCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
        <UserX className="h-12 w-12 text-destructive mb-4" />
        <p className="text-center text-destructive mb-4">{error.message}</p>
        <Button onClick={onRetry} disabled={retryLoading} variant="outline" size="sm">
          {retryLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Retrying...
            </>
          ) : (
            'Retry'
          )}
        </Button>
      </div>
    );
  }

  if (!isLoading && users.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
        <UserX className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-center">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ScrollArea className={`h-full ${className}`}>
      <div className="space-y-4 pr-4">
        {/* User Cards Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {users.map((user) => (
            <UserCard
              key={user._id}
              user={user}
              showFollowButton={showFollowButton}
            />
          ))}
        </div>

        {/* Load More Button */}
        {hasMore && onLoadMore && (
          <div className="flex justify-center pt-4 pb-2">
            <Button
              onClick={onLoadMore}
              disabled={isLoadingMore}
              variant="outline"
              size="sm"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading...
                </>
              ) : (
                'Load More'
              )}
            </Button>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
