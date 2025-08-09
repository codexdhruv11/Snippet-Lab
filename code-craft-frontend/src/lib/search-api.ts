import { apiClient } from './api';
import { API_ENDPOINTS, API_LIMITS } from './constants';
import type { 
  GlobalSearchResponse, 
  SearchFilters, 
  SearchSuggestion, 
  SearchAnalytics,
  SearchAnalyticsEvent,
  SearchResult
} from '@/types/search';
import type { PaginatedResponse, Snippet, UserSearchResult } from '@/types/api';

// Safe toString helper
const safeToString = (value: any, defaultValue: string = ''): string => {
  if (value === null || value === undefined) return defaultValue;
  return String(value);
};

/**
 * Search API functions
 */
export const searchApi = {
  /**
   * Perform global search across snippets, users, and tags
   */
  globalSearch: async (
    query: string, 
    filters?: SearchFilters,
    page: number = 1,
    limit: number = API_LIMITS.MAX_SEARCH_RESULTS
  ): Promise<GlobalSearchResponse> => {
    const params = new URLSearchParams({
      search: query,
      page: safeToString(page, '1'),
      limit: safeToString(limit, API_LIMITS.MAX_SEARCH_RESULTS.toString()),
    });

    if (filters?.language) params.append('language', filters.language);
    if (filters?.author) params.append('author', filters.author);
    if (filters?.tags) filters.tags.forEach(tag => params.append('tags', tag));
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.hasComments !== undefined) params.append('hasComments', safeToString(filters.hasComments));
    if (filters?.minStars !== undefined) params.append('minStars', safeToString(filters.minStars));

    try {
      // Only search based on scope filter
      if (filters?.scope === 'snippets') {
        const snippetsResponse = await apiClient.get(`${API_ENDPOINTS.SNIPPETS.BASE}?${params}`);
        const snippets = snippetsResponse.data.data || [];
        const results: SearchResult[] = snippets.map((snippet: Snippet, index: number) => ({
          id: snippet._id,
          type: 'snippet' as const,
          score: 1.0 - (index * 0.1),
          data: snippet,
        }));
        return {
          results,
          totalCount: snippetsResponse.data.pagination?.totalItems || results.length,
          hasMore: snippetsResponse.data.pagination?.hasMore || false,
        };
      } else if (filters?.scope === 'users') {
        // Users endpoint expects 'q' parameter instead of 'search'
        const userParams = new URLSearchParams(params);
        userParams.delete('search');
        userParams.append('q', query);
        
        const usersResponse = await apiClient.get(`${API_ENDPOINTS.USER_SEARCH.SEARCH}?${userParams}`);
        const users = usersResponse.data.data || [];
        const results: SearchResult[] = users.map((user: UserSearchResult, index: number) => ({
          id: user._id,
          type: 'user' as const,
          score: 1.0 - (index * 0.1),
          data: user,
        }));
        return {
          results,
          totalCount: usersResponse.data.pagination?.totalItems || results.length,
          hasMore: usersResponse.data.pagination?.hasMore || false,
        };
      } else if (filters?.scope === 'tags') {
        try {
          // Tags endpoint might expect 'q' parameter
          const tagParams = new URLSearchParams(params);
          tagParams.delete('search');
          tagParams.append('q', query);
          
          const tagsResponse = await apiClient.get(`${API_ENDPOINTS.TAGS.SEARCH}?${tagParams}`);
          const tags = tagsResponse.data.data || [];
          const results: SearchResult[] = tags.map((tag: { name: string; count: number }, index: number) => ({
            id: tag.name,
            type: 'tag' as const,
            score: 1.0 - (index * 0.1),
            data: tag,
          }));
          return {
            results,
            totalCount: tags.length,
            hasMore: false,
          };
        } catch (error: any) {
          // If tags search endpoint doesn't exist, return empty results
          if (error.response?.status === 404) {
            console.log('Tags search endpoint not available');
            return {
              results: [],
              totalCount: 0,
              hasMore: false,
            };
          }
          throw error;
        }
      } else {
        // Search all scopes - different endpoints expect different parameter names
        const userParams = new URLSearchParams(params);
        userParams.delete('search');
        userParams.append('q', query);
        
        const [snippetsRes, usersRes, tagsRes] = await Promise.allSettled([
          apiClient.get(`${API_ENDPOINTS.SNIPPETS.BASE}?${params}`), // Snippets use 'search'
          apiClient.get(`${API_ENDPOINTS.USER_SEARCH.SEARCH}?${userParams}`), // Users use 'q'
          apiClient.get(`${API_ENDPOINTS.TAGS.POPULAR}?limit=50`), // Use popular tags as fallback
        ]);

        const results: SearchResult[] = [];
        let totalCount = 0;

        // Process snippets
        if (snippetsRes.status === 'fulfilled') {
          const snippets = snippetsRes.value.data.data || [];
          results.push(...snippets.slice(0, 5).map((snippet: Snippet, index: number) => ({
            id: snippet._id,
            type: 'snippet' as const,
            score: 1.0 - (index * 0.1),
            data: snippet,
          })));
          totalCount += snippetsRes.value.data.pagination?.totalItems || snippets.length;
        }

        // Process users
        if (usersRes.status === 'fulfilled') {
          const users = usersRes.value.data.data || [];
          results.push(...users.slice(0, 5).map((user: UserSearchResult, index: number) => ({
            id: user._id,
            type: 'user' as const,
            score: 0.8 - (index * 0.1),
            data: user,
          })));
          totalCount += usersRes.value.data.pagination?.totalItems || users.length;
        }

        // Process tags
        if (tagsRes.status === 'fulfilled') {
          const tags = tagsRes.value.data.data || [];
          results.push(...tags.slice(0, 5).map((tag: { name: string; count: number }, index: number) => ({
            id: tag.name,
            type: 'tag' as const,
            score: 0.6 - (index * 0.1),
            data: tag,
          })));
          totalCount += tags.length;
        }

        // Sort by score
        results.sort((a, b) => b.score - a.score);

        return {
          results,
          totalCount,
          hasMore: totalCount > results.length,
        };
      }
    } catch (error) {
      console.error('Search error:', error);
      return {
        results: [],
        totalCount: 0,
        hasMore: false,
      };
    }
  },

  /**
   * Search snippets with filters
   */
  searchSnippets: async (
    query: string,
    filters?: Partial<SearchFilters>,
    page: number = 1,
    limit: number = API_LIMITS.MAX_SNIPPETS_PER_PAGE
  ): Promise<PaginatedResponse<Snippet>> => {
    const params = new URLSearchParams({
      q: query,
      page: safeToString(page, '1'),
      limit: safeToString(limit, API_LIMITS.MAX_SNIPPETS_PER_PAGE.toString()),
    });

    if (filters?.language) params.append('language', filters.language);
    if (filters?.tags) filters.tags.forEach(tag => params.append('tags', tag));
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);

    const response = await apiClient.get(`${API_ENDPOINTS.SNIPPETS.BASE}/search?${params}`);
    return response.data;
  },

  /**
   * Search users
   */
  searchUsers: async (
    query: string,
    page: number = 1,
    limit: number = API_LIMITS.MAX_USERS_PER_PAGE
  ): Promise<PaginatedResponse<UserSearchResult>> => {
    const params = new URLSearchParams({
      q: query,
      page: safeToString(page, '1'),
      limit: safeToString(limit, API_LIMITS.MAX_USERS_PER_PAGE.toString()),
    });

    const response = await apiClient.get(`${API_ENDPOINTS.USER_SEARCH.SEARCH}?${params}`);
    return response.data;
  },

  /**
   * Search tags
   */
  searchTags: async (
    query: string,
    limit: number = API_LIMITS.MAX_TAGS_PER_PAGE
  ): Promise<{ data: { name: string; count: number }[] }> => {
    const params = new URLSearchParams({
      q: query,
      limit: safeToString(limit, API_LIMITS.MAX_TAGS_PER_PAGE.toString()),
    });

    const response = await apiClient.get(`${API_ENDPOINTS.TAGS.SEARCH}?${params}`);
    return response.data;
  },

  /**
   * Get search suggestions based on partial query
   */
  getSearchSuggestions: async (
    query: string,
    scope: SearchFilters['scope'] = 'all',
    limit: number = 10
  ): Promise<SearchSuggestion[]> => {
    try {
      const params = new URLSearchParams({
        q: query,
        scope,
        limit: safeToString(limit, '10'),
      });

      const response = await apiClient.get(`${API_ENDPOINTS.SEARCH.SUGGESTIONS}?${params}`);
      return response.data;
    } catch (error: any) {
      // If suggestions endpoint doesn't exist, return empty array
      if (error.response?.status === 404) {
        return [];
      }
      throw error;
    }
  },

  /**
   * Track search analytics event
   */
  trackSearchEvent: async (event: Omit<SearchAnalyticsEvent, 'id' | 'timestamp'>): Promise<void> => {
    try {
      await apiClient.post(API_ENDPOINTS.SEARCH.ANALYTICS.TRACK, event);
    } catch (error: any) {
      // If analytics endpoint doesn't exist, just log and continue
      if (error.response?.status === 404) {
        console.log('Analytics tracking not available');
        return;
      }
      throw error;
    }
  },

  /**
   * Get search analytics summary
   */
  getSearchAnalytics: async (
    timeRange?: { from: string; to: string }
  ): Promise<SearchAnalytics> => {
    const params = new URLSearchParams();
    if (timeRange?.from) params.append('from', timeRange.from);
    if (timeRange?.to) params.append('to', timeRange.to);

    const response = await apiClient.get(`${API_ENDPOINTS.SEARCH.ANALYTICS.GET}${params.toString() ? `?${params}` : ''}`);
    return response.data;
  },

  /**
   * Get popular search queries
   */
  getPopularSearches: async (limit: number = 10): Promise<{ query: string; count: number }[]> => {
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.SEARCH.POPULAR}?limit=${limit}`);
      return response.data;
    } catch (error: any) {
      // If popular searches endpoint doesn't exist, return empty array
      if (error.response?.status === 404) {
        return [];
      }
      throw error;
    }
  },
};
