import React, { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { NotificationItem } from './NotificationItem';
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from '@/hooks/useNotifications';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { NotificationResponse } from '@/types/api';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { AlertCircle } from 'lucide-react';

function NotificationDropdownContent() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching, error } = useNotifications(page);
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const notificationData = data as NotificationResponse;
  const notifications = notificationData?.data || [];
  const hasMore = notificationData?.pagination?.hasMore || false;
  const totalUnread = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = (notificationId: string) => {
    markAsRead.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    if (totalUnread > 0) {
      markAllAsRead.mutate();
    }
  };

  const handleLoadMore = () => {
    if (hasMore && !isFetching) {
      setPage(prev => prev + 1);
    }
  };

  if (isLoading) {
    return (
      <div className="w-96 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Notifications</h3>
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-96">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">Notifications</h3>
        {totalUnread > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={markAllAsRead.isPending}
          >
            {markAllAsRead.isPending ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Marking...
              </>
            ) : (
              'Mark all as read'
            )}
          </Button>
        )}
      </div>

      {/* Notifications List */}
      <ScrollArea className="h-[400px]">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <BellOff className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              We'll notify you when something happens
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification._id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="p-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleLoadMore}
                  disabled={isFetching}
                >
                  {isFetching ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load more'
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </ScrollArea>

      {/* Footer */}
      {notifications.length > 0 && (
        <>
          <Separator />
          <div className="p-3">
            <Button variant="ghost" size="sm" className="w-full justify-center">
              View all notifications
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export function NotificationDropdown() {
  return (
    <ErrorBoundary
      fallback={
        <div className="w-96 p-6 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-sm font-medium">Failed to load notifications</p>
          <p className="text-xs text-muted-foreground mt-1">
            Please try refreshing the page
          </p>
        </div>
      }
    >
      <NotificationDropdownContent />
    </ErrorBoundary>
  );
}
