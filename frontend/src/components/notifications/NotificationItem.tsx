import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { Bell, MessageSquare, UserPlus, Code, Check } from 'lucide-react';
import { Notification } from '@/types/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onDelete,
}) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'FOLLOW':
        return <UserPlus className="h-4 w-4" />;
      case 'COMMENT':
        return <MessageSquare className="h-4 w-4" />;
      case 'REPLY':
        return <MessageSquare className="h-4 w-4" />;
      case 'NEW_SNIPPET':
        return <Code className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationText = () => {
    const actorName = notification.actor?.username || 'Someone';
    
    switch (notification.type) {
      case 'FOLLOW':
        return (
          <>
            <span className="font-semibold">{actorName}</span> started following you
          </>
        );
      case 'COMMENT':
        return (
          <>
            <span className="font-semibold">{actorName}</span> commented on your{' '}
            {notification.targetType === 'snippet' ? 'snippet' : 'post'}
          </>
        );
      case 'REPLY':
        return (
          <>
            <span className="font-semibold">{actorName}</span> replied to your comment
          </>
        );
      case 'NEW_SNIPPET':
        return (
          <>
            <span className="font-semibold">{actorName}</span> created a new snippet
          </>
        );
      default:
        return notification.message || 'New notification';
    }
  };

  const handleClick = () => {
    if (!notification.readAt) {
      onMarkAsRead(notification.id);
    }
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors cursor-pointer border-b',
        !notification.readAt && 'bg-primary/5'
      )}
      onClick={handleClick}
    >
      <div className={cn(
        'flex h-8 w-8 items-center justify-center rounded-full',
        !notification.readAt ? 'bg-primary text-primary-foreground' : 'bg-muted'
      )}>
        {getIcon()}
      </div>
      
      <div className="flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className="text-sm">
              {getNotificationText()}
            </p>
            {notification.message && notification.type === 'COMMENT' && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                "{notification.message}"
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
            </p>
          </div>
          
          {notification.actor && (
            <Avatar className="h-8 w-8">
              <AvatarImage src={notification.actor.avatarUrl} alt={notification.actor.username} />
              <AvatarFallback>
                {notification.actor.username.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {notification.targetId && (
            <Link
              to={`/${notification.targetType}/${notification.targetId}`}
              className="text-xs text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              View {notification.targetType}
            </Link>
          )}
          
          {!notification.readAt && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsRead(notification.id);
              }}
            >
              <Check className="h-3 w-3 mr-1" />
              Mark as read
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(notification.id);
            }}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotificationItem;
