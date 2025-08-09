import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from './useDebounce';
import { searchApi } from '@/lib/search-api';
import { useSearchStore } from '@/stores/searchStore';
import type { 
  SearchResult, 
  SearchFilters, 
  SearchHistoryItem, 
  SearchSuggestion,
  GlobalSearchResponse 
} from '@/types/search';
import { toast } from 'sonner';

const SEARCH_HISTORY_KEY = 'search-history';
const MAX_HISTORY_ITEMS = 20;

// Safe toString helper
const safeToString = (value: any): string => {
  if (value === null || value === undefined) return '';
  return String(value);
};

interface UseSearchOptions {
  debounceDelay?: number;
  minQueryLength?: number;
  enableHistory?: boolean;
  enableSuggestions?: boolean;
  enableAnalytics?: boolean;
  useStore?: boolean;
}

export function useSearch(options: UseSearchOptions = {}) {
  const {
    debounceDelay = 300,
    minQueryLength = 2,
    enableHistory = true,
    enableSuggestions = true,
    enableAnalytics = true,
  } = options;

  const queryClient = useQueryClient();
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Use search store for state management
  const {
    query: storeQuery,
    filters: storeFilters,
    results: storeResults,
    suggestions: storeSuggestions,
    history: storeHistory,
    isLoading: storeIsLoading,
    error: storeError,
    setQuery: storeSetQuery,
    setFilters: storeSetFilters,
    setResults: storeSetResults,
    setSuggestions: storeSetSuggestions,
    addToHistory: storeAddToHistory,
    clearHistory: storeClearHistory,
    removeFromHistory: storeRemoveFromHistory,
    setLoading: storeSetLoading,
    setError: storeSetError,
  } = useSearchStore();
  
  // Use store state or local state based on integration preference
  const [localQuery, setLocalQuery] = useState(storeQuery);
  const [localFilters, setLocalFilters] = useState<SearchFilters>(storeFilters);
  const [localHistory, setLocalHistory] = useState<SearchHistoryItem[]>([]);
  
  // Sync with store
  const query = options.useStore !== false ? storeQuery : localQuery;
  const filters = options.useStore !== false ? storeFilters : localFilters;
  const history = options.useStore !== false ? storeHistory : localHistory;
  
  const debouncedQuery = useDebounce(query, debounceDelay);

  // Load search history from localStorage
  useEffect(() => {
    if (enableHistory) {
      const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (options.useStore !== false) {
            // Update store history
            parsed.forEach((item: SearchHistoryItem) => storeAddToHistory(item));
          } else {
            setLocalHistory(parsed);
          }
        } catch (error) {
          console.error('Failed to load search history:', error);
        }
      }
    }
  }, [enableHistory, options.useStore, storeAddToHistory]);

  // Search query
  const {
    data: searchResults,
    isLoading: isSearching,
    error: searchError,
    refetch: refetchSearch,
  } = useQuery({
    queryKey: ['search', debouncedQuery, filters],
    queryFn: async () => {
      if (debouncedQuery.length < minQueryLength) {
        return null;
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      try {
        const response = await searchApi.globalSearch(debouncedQuery, filters);
        
        // Track search event
        if (enableAnalytics) {
          await searchApi.trackSearchEvent({
            type: 'search',
            query: debouncedQuery,
            filters,
            sessionId: getSessionId(),
          });
        }

        // Add to history
        if (enableHistory && response.totalCount > 0) {
          addToHistory(debouncedQuery, filters, response.totalCount);
        }

        return response;
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          throw error;
        }
        return null;
      }
    },
    enabled: debouncedQuery.length >= minQueryLength,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // Suggestions query
  const { data: suggestions } = useQuery({
    queryKey: ['search-suggestions', debouncedQuery, filters.scope],
    queryFn: () => searchApi.getSearchSuggestions(debouncedQuery, filters.scope),
    enabled: enableSuggestions && debouncedQuery.length >= minQueryLength,
    staleTime: 5 * 60 * 1000,
  });

  // Popular searches query
  const { data: popularSearches } = useQuery({
    queryKey: ['popular-searches'],
    queryFn: () => searchApi.getPopularSearches(),
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  // Track click mutation
  const trackClickMutation = useMutation({
    mutationFn: async ({ resultId, resultType, position }: {
      resultId: string;
      resultType: 'snippet' | 'user' | 'tag';
      position: number;
    }) => {
      if (enableAnalytics) {
        await searchApi.trackSearchEvent({
          type: 'click',
          query: debouncedQuery,
          filters,
          resultId,
          resultType,
          position,
          sessionId: getSessionId(),
        });
      }
    },
  });

  // Add to search history
  const addToHistory = useCallback((query: string, filters: SearchFilters, resultCount: number) => {
    const newItem: SearchHistoryItem = {
      id: safeToString(Date.now()),
      query,
      filters,
      timestamp: new Date().toISOString(),
      resultCount,
    };

    if (options.useStore !== false) {
      storeAddToHistory(newItem);
    } else {
      setLocalHistory(prev => {
        const updated = [newItem, ...prev.filter(item => item.query !== query)].slice(0, MAX_HISTORY_ITEMS);
        if (enableHistory) {
          localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
        }
        return updated;
      });
    }
  }, [enableHistory, options.useStore, storeAddToHistory]);

  // Unified setters
  const setQuery = useCallback((value: string) => {
    if (options.useStore !== false) {
      storeSetQuery(value);
    } else {
      setLocalQuery(value);
    }
  }, [options.useStore, storeSetQuery]);

  const setFilters = useCallback((value: SearchFilters) => {
    if (options.useStore !== false) {
      storeSetFilters(value);
    } else {
      setLocalFilters(value);
    }
  }, [options.useStore, storeSetFilters]);

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('');
    setFilters({ scope: 'all' });
    queryClient.invalidateQueries({ queryKey: ['search'] });
  }, [queryClient, setQuery, setFilters]);

  // Clear history
  const clearHistory = useCallback(() => {
    if (options.useStore !== false) {
      storeClearHistory();
    } else {
      setLocalHistory([]);
    }
    if (enableHistory) {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
    }
  }, [enableHistory, options.useStore, storeClearHistory]);

  // Remove from history
  const removeFromHistory = useCallback((id: string) => {
    if (options.useStore !== false) {
      storeRemoveFromHistory(id);
    } else {
      setLocalHistory(prev => {
        const updated = prev.filter(item => item.id !== id);
        if (enableHistory) {
          localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
        }
        return updated;
      });
    }
  }, [enableHistory, options.useStore, storeRemoveFromHistory]);

  // Search from history
  const searchFromHistory = useCallback((item: SearchHistoryItem) => {
    setQuery(item.query);
    if (item.filters) {
      setFilters(item.filters);
    }
  }, [setQuery, setFilters]);

  // Track click on result
  const trackResultClick = useCallback((resultId: string, resultType: 'snippet' | 'user' | 'tag', position: number) => {
    trackClickMutation.mutate({ resultId, resultType, position });
  }, [trackClickMutation]);

  return {
    // State
    query,
    filters,
    results: searchResults?.results || [],
    totalCount: searchResults?.totalCount || 0,
    hasMore: searchResults?.hasMore || false,
    isSearching,
    error: searchError,
    suggestions: suggestions || [],
    history,
    popularSearches: popularSearches || [],
    
    // Actions
    setQuery,
    setFilters,
    clearSearch,
    clearHistory,
    removeFromHistory,
    searchFromHistory,
    trackResultClick,
    refetchSearch,
  };
}

// Generate or get session ID for analytics
function getSessionId(): string {
  let sessionId = sessionStorage.getItem('search-session-id');
  if (!sessionId) {
    sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('search-session-id', sessionId);
  }
  return sessionId;
}
