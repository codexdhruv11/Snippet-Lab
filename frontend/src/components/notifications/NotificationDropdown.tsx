import React, { useEffect, useRef } from 'react';
import { Bell, Loader2, Inbox, Check } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import NotificationItem from './NotificationItem';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    notifications,
    isLoading,
    error,
    hasMore,
    fetchNextPage,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    isFetchingNextPage,
  } = useNotifications();

  const dropdownRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Handle scroll for pagination
  const handleScroll = () => {
    if (!scrollRef.current || isFetchingNextPage || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      fetchNextPage();
    }
  };

  if (!isOpen) return null;

  const hasUnread = notifications.some(n => !n.readAt);

  return (
    <div
      ref={dropdownRef}
      className={cn(
        'absolute right-0 top-full mt-2 w-96 rounded-md border bg-popover shadow-lg z-50',
        'animate-in fade-in-0 zoom-in-95'
      )}
    >
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-sm">Notifications</h3>
        {hasUnread && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => markAllAsRead()}
          >
            <Check className="h-3 w-3 mr-1" />
            Mark all as read
          </Button>
        )}
      </div>

      <ScrollArea
        ref={scrollRef}
        className="h-[400px]"
        onScroll={handleScroll}
      >
        {isLoading && notifications.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <p className="text-sm text-destructive">Failed to load notifications</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => window.location.reload()}
            >
              Try again
            </Button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <Inbox className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <>
            {notifications.map((notification, index) => (
              <React.Fragment key={notification.id}>
                <NotificationItem
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onDelete={deleteNotification}
                />
                {index < notifications.length - 1 && <Separator />}
              </React.Fragment>
            ))}
            
            {isFetchingNextPage && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            
            {!hasMore && notifications.length > 10 && (
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground">No more notifications</p>
              </div>
            )}
          </>
        )}
      </ScrollArea>

      <Separator />
      
      <div className="p-2">
        <Button
          variant="ghost"
          className="w-full justify-start text-sm"
          onClick={() => {
            onClose();
            // Navigate to notifications page if you have one
            // navigate('/notifications');
          }}
        >
          <Bell className="h-4 w-4 mr-2" />
          View all notifications
        </Button>
      </div>
    </div>
  );
};

export default NotificationDropdown;
