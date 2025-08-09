import type { Snippet, UserProfile, UserSearchResult } from './api';

/**
 * Search scope types
 */
export type SearchScope = 'snippets' | 'users' | 'tags' | 'all';

/**
 * Search sort options
 */
export type SearchSortOption = 'relevance' | 'recent' | 'popular' | 'alphabetical';

/**
 * Base search result interface
 */
export interface BaseSearchResult {
  id: string;
  type: 'snippet' | 'user' | 'tag';
  score: number;
  highlights?: string[];
}

/**
 * Snippet search result
 */
export interface SnippetSearchResult extends BaseSearchResult {
  type: 'snippet';
  data: Snippet;
}

/**
 * User search result item
 */
export interface UserSearchResultItem extends BaseSearchResult {
  type: 'user';
  data: UserProfile;
}

/**
 * Tag search result
 */
export interface TagSearchResult extends BaseSearchResult {
  type: 'tag';
  data: {
    name: string;
    count: number;
  };
}

/**
 * Union type for all search results
 */
export type SearchResult = SnippetSearchResult | UserSearchResultItem | TagSearchResult;

/**
 * Search filters interface
 */
export interface SearchFilters {
  scope: SearchScope;
  language?: string;
  author?: string;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
  sortBy?: SearchSortOption;
  hasComments?: boolean;
  minStars?: number;
}

/**
 * Search history item
 */
export interface SearchHistoryItem {
  id: string;
  query: string;
  filters?: SearchFilters;
  timestamp: string;
  resultCount: number;
}

/**
 * Search suggestion
 */
export interface SearchSuggestion {
  id: string;
  text: string;
  type: 'query' | 'tag' | 'user' | 'language';
  metadata?: {
    count?: number;
    icon?: string;
  };
}

/**
 * Global search response
 */
export interface GlobalSearchResponse {
  results: SearchResult[];
  totalCount: number;
  hasMore: boolean;
  suggestions?: SearchSuggestion[];
  facets?: {
    languages: { name: string; count: number }[];
    tags: { name: string; count: number }[];
    authors: { name: string; count: number }[];
  };
}

/**
 * Search analytics event
 */
export interface SearchAnalyticsEvent {
  id: string;
  type: 'search' | 'click' | 'filter' | 'clear';
  query?: string;
  filters?: SearchFilters;
  resultId?: string;
  resultType?: 'snippet' | 'user' | 'tag';
  position?: number;
  timestamp: string;
  sessionId: string;
}

/**
 * Search analytics summary
 */
export interface SearchAnalytics {
  popularQueries: { query: string; count: number }[];
  recentSearches: SearchHistoryItem[];
  clickThroughRate: number;
  averageResultPosition: number;
  topResults: { id: string; type: string; clicks: number }[];
}

/**
 * Search state interface
 */
export interface SearchState {
  query: string;
  filters: SearchFilters;
  results: SearchResult[];
  isLoading: boolean;
  error: Error | null;
  totalCount: number;
  hasMore: boolean;
  currentPage: number;
  suggestions: SearchSuggestion[];
  history: SearchHistoryItem[];
  activeIndex: number;
}

/**
 * Search configuration
 */
export interface SearchConfig {
  debounceDelay: number;
  minQueryLength: number;
  maxHistoryItems: number;
  maxSuggestions: number;
  enableAnalytics: boolean;
  enableHistory: boolean;
  enableSuggestions: boolean;
}
