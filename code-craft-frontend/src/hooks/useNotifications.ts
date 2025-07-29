import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '@/lib/api';
import { NOTIFICATION_POLL_INTERVAL, API_LIMITS } from '@/lib/constants';
import { Notification, NotificationResponse, UnreadCountResponse } from '@/types/api';
import { toast } from 'sonner';

/**
 * Hook for fetching paginated notifications
 */
export const useNotifications = (page: number = 1, limit: number = API_LIMITS.MAX_NOTIFICATIONS_PER_PAGE, unreadOnly: boolean = false) => {
  return useQuery<NotificationResponse>({
    queryKey: ['notifications', page, limit, unreadOnly],
    queryFn: () => notificationApi.listNotifications({ page, limit, unreadOnly }),
    refetchInterval: NOTIFICATION_POLL_INTERVAL,
    refetchIntervalInBackground: false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

/**
 * Hook for fetching unread notification count
 */
export const useUnreadCount = () => {
  return useQuery<UnreadCountResponse, Error>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: notificationApi.getUnreadCount,
    refetchInterval: NOTIFICATION_POLL_INTERVAL,
    refetchIntervalInBackground: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

/**
 * Hook for marking a notification as read
 */
export const useMarkAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (notificationId: string) => notificationApi.markNotificationRead(notificationId),
    onSuccess: () => {
      // Invalidate notifications and unread count
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to mark notification as read');
    },
  });
};

/**
 * Hook for marking all notifications as read
 */
export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: notificationApi.markAllNotificationsRead,
    onSuccess: () => {
      // Invalidate notifications and unread count
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      toast.success('All notifications marked as read');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to mark all notifications as read');
    },
  });
};
