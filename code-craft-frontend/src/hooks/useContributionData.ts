import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useEffect } from 'react';
import { userApi } from '@/lib/api';
import { 
  generateContributionGrid, 
  processContributionData,
  validateContributionData 
} from '@/utils/contributionUtils';
import type { ContributionDay } from '@/types/user';

interface UseContributionDataOptions {
  userId: string;
  startDate?: string;
  endDate?: string;
  enableRealtime?: boolean;
  cacheTime?: number;
  staleTime?: number;
}

interface UseContributionDataReturn {
  data: ContributionDay[] | null;
  grid: ContributionDay[][];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  invalidate: () => void;
  updateOptimistically: (date: string, count: number) => void;
  stats: {
    totalContributions: number;
    longestStreak: number;
    currentStreak: number;
    averagePerDay: number;
  } | null;
}

const CACHE_KEY_PREFIX = 'contributions';
const DEFAULT_CACHE_TIME = 5 * 60 * 1000; // 5 minutes
const DEFAULT_STALE_TIME = 60 * 1000; // 1 minute

export function useContributionData({
  userId,
  startDate,
  endDate,
  enableRealtime = false,
  cacheTime = DEFAULT_CACHE_TIME,
  staleTime = DEFAULT_STALE_TIME,
}: UseContributionDataOptions): UseContributionDataReturn {
  const queryClient = useQueryClient();
  const [realtimeData, setRealtimeData] = useState<ContributionDay[] | null>(null);

  // Create query key with all parameters
  const queryKey = [CACHE_KEY_PREFIX, userId, { startDate, endDate }];

  // Fetch contribution data with React Query
  const {
    data: fetchedData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      try {
        // Use only userId to maintain backward compatibility with existing API
        const response = await userApi.getContributionGraph(userId);
        
        // Validate the data
        const responseData = response?.data || response;
        if (!validateContributionData(responseData)) {
          throw new Error('Invalid contribution data format');
        }
        
        // Process data and filter by date range if provided
        let processedData = processContributionData(responseData);
        
        // Apply date filtering on client side if dates are provided
        if (startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          processedData = processedData.filter(day => {
            const dayDate = new Date(day.date);
            return dayDate >= start && dayDate <= end;
          });
        }
        
        return processedData;
      } catch (error: any) {
        // Handle rate limiting specifically
        if (error.response?.status === 429) {
          const retryAfter = error.response?.data?.error?.retryAfter || 60;
          console.warn(`Rate limited. Retry after ${retryAfter} seconds`);
          // Don't log the full error for rate limiting
          throw new Error(`Rate limited. Please wait ${retryAfter} seconds before retrying.`);
        }
        console.error('Failed to fetch contribution data:', error);
        throw error;
      }
    },
    cacheTime,
    staleTime,
    retry: (failureCount, error: any) => {
      // Don't retry on rate limiting
      if (error?.response?.status === 429) {
        return false;
      }
      // Default retry logic for other errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex, error: any) => {
      // For rate limiting, use the server-provided retry-after time
      if (error?.response?.status === 429) {
        const retryAfter = error.response?.data?.error?.retryAfter || 60;
        return retryAfter * 1000; // Convert to milliseconds
      }
      // Exponential backoff for other errors
      return Math.min(1000 * 2 ** attemptIndex, 30000);
    },
    refetchOnWindowFocus: false,
    refetchOnMount: 'always',
  });

  // Merge fetched data with realtime updates
  const data = realtimeData || fetchedData || null;

  // Generate contribution grid from data
  const grid = data ? generateContributionGrid(data, startDate, endDate) : [];

  // Calculate statistics
  const stats = data ? calculateStats(data) : null;

  // Invalidate cache
  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  // Optimistic update mutation
  const optimisticUpdateMutation = useMutation({
    mutationFn: async ({ date, count }: { date: string; count: number }) => {
      // In a real app, this would make an API call
      return { date, count };
    },
    onMutate: async ({ date, count }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<ContributionDay[]>(queryKey);

      // Optimistically update to the new value
      if (previousData) {
        const updatedData = previousData.map(day =>
          day.date === date ? { ...day, count } : day
        );
        queryClient.setQueryData(queryKey, updatedData);
      }

      // Return a context object with the snapshotted value
      return { previousData };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Optimistic update function
  const updateOptimistically = useCallback(
    (date: string, count: number) => {
      optimisticUpdateMutation.mutate({ date, count });
    },
    [optimisticUpdateMutation]
  );

  // WebSocket connection for real-time updates (if enabled)
  useEffect(() => {
    if (!enableRealtime || !userId) return;

    // Use environment variable for WebSocket URL
    const websocketUrl = process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:3000';
    const ws = new WebSocket(`${websocketUrl}/contributions/${userId}`);

    ws.onopen = () => {
      console.log(`WebSocket connected: ${ws.url}`);
    };

    ws.onclose = (event) => {
      console.warn(`WebSocket closed: ${event.reason}`);
      // WebSocket reconnection would be handled by recreating the effect
      // In production, you might want to implement exponential backoff
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data);
        if (update.type === 'contribution_update') {
          setRealtimeData(prevData => {
            if (!prevData) return null;
            return prevData.map(day =>
              day.date === update.date ? { ...day, count: update.count } : day
            );
          });
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    return () => {
      ws.close();
    };
  }, [enableRealtime, userId]);

  // Handle offline support
  useEffect(() => {
    const handleOnline = () => {
      refetch();
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [refetch]);

  return {
    data,
    grid,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
    invalidate,
    updateOptimistically,
    stats,
  };
}

// Helper function to calculate contribution statistics
function calculateStats(data: ContributionDay[]): {
  totalContributions: number;
  longestStreak: number;
  currentStreak: number;
  averagePerDay: number;
} {
  const sortedData = [...data].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let totalContributions = 0;
  let longestStreak = 0;
  let currentStreak = 0;
  let tempStreak = 0;

  for (let i = 0; i < sortedData.length; i++) {
    const day = sortedData[i];
    totalContributions += day.count;

    if (day.count > 0) {
      tempStreak++;
      
      // Check if this is consecutive with previous day
      if (i > 0) {
        const prevDate = new Date(sortedData[i - 1].date);
        const currDate = new Date(day.date);
        const dayDiff = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (dayDiff > 1) {
          tempStreak = 1;
        }
      }
      
      longestStreak = Math.max(longestStreak, tempStreak);
      
      // Update current streak if this is recent
      const today = new Date();
      const dayDate = new Date(day.date);
      const daysSinceContribution = Math.floor(
        (today.getTime() - dayDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceContribution <= 1) {
        currentStreak = tempStreak;
      }
    } else {
      tempStreak = 0;
    }
  }

  const averagePerDay = data.length > 0 ? totalContributions / data.length : 0;

  return {
    totalContributions,
    longestStreak,
    currentStreak,
    averagePerDay: Number(averagePerDay.toFixed(2)),
  };
}
