import React from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useRelativeDate } from '@/lib/date-utils';
import { Notification } from '@/types/api';
import { MessageSquare, Star, UserPlus, Code } from 'lucide-react';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead?: (notificationId: string) => void;
}

export function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const router = useRouter();
  const relativeDate = useRelativeDate(notification.createdAt);

  const handleClick = () => {
    // Mark as read if unread
    if (!notification.read && onMarkAsRead) {
      onMarkAsRead(notification._id);
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'comment_reply':
      case 'new_comment':
        if (notification.data.snippetId) {
          router.push(`/snippets/${notification.data.snippetId}`);
        }
        break;
      case 'snippet_starred':
        if (notification.data.snippetId) {
          router.push(`/snippets/${notification.data.snippetId}`);
        }
        break;
      case 'user_followed':
        if (notification.data.actorId) {
          router.push(`/users/${notification.data.actorId}`);
        }
        break;
    }
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'comment_reply':
        return <MessageSquare className="h-4 w-4" />;
      case 'new_comment':
        return <MessageSquare className="h-4 w-4" />;
      case 'snippet_starred':
        return <Star className="h-4 w-4" />;
      case 'user_followed':
        return <UserPlus className="h-4 w-4" />;
      default:
        return <Code className="h-4 w-4" />;
    }
  };

  const getNotificationText = () => {
    const { actorName } = notification.data;
    
    switch (notification.type) {
      case 'comment_reply':
        return (
          <>
            <span className="font-medium">{actorName}</span> replied to your comment
            {notification.data.snippetTitle && (
              <> on <span className="font-medium">{notification.data.snippetTitle}</span></>
            )}
          </>
        );
      case 'new_comment':
        return (
          <>
            <span className="font-medium">{actorName}</span> commented on your snippet
            {notification.data.snippetTitle && (
              <> <span className="font-medium">{notification.data.snippetTitle}</span></>
            )}
          </>
        );
      case 'snippet_starred':
        return (
          <>
            <span className="font-medium">{actorName}</span> starred your snippet
            {notification.data.snippetTitle && (
              <> <span className="font-medium">{notification.data.snippetTitle}</span></>
            )}
          </>
        );
      case 'user_followed':
        return (
          <>
            <span className="font-medium">{actorName}</span> started following you
          </>
        );
      default:
        return 'New notification';
    }
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 cursor-pointer transition-colors hover:bg-accent",
        !notification.read && "bg-accent/50"
      )}
      onClick={handleClick}
    >
      <Avatar className="h-10 w-10">
        <AvatarImage src={notification.data.actorAvatar} alt={notification.data.actorName} />
        <AvatarFallback>{notification.data.actorName[0]?.toUpperCase()}</AvatarFallback>
      </Avatar>

      <div className="flex-1 space-y-1">
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <p className="text-sm leading-relaxed">
              {getNotificationText()}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">{relativeDate}</span>
              {!notification.read && (
                <Badge variant="secondary" className="h-5 text-xs">
                  New
                </Badge>
              )}
            </div>
          </div>
          <div className="text-muted-foreground">
            {getIcon()}
          </div>
        </div>
      </div>
    </div>
  );
}
