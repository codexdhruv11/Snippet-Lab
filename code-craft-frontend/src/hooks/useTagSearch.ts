import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from './useDebounce';
import { snippetApi } from '@/lib/api';
import { TagData } from '@/types/api';
import { filterTagsByQuery } from '@/utils/tagUtils';

interface UseTagSearchOptions {
  debounceMs?: number;
  popularTagsLimit?: number;
}

export const useTagSearch = (options: UseTagSearchOptions = {}) => {
  const { debounceMs = 300, popularTagsLimit = 20 } = options;
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const debouncedQuery = useDebounce(searchQuery, debounceMs);

  // Fetch popular tags
  const {
    data: popularTagsData,
    isLoading: isLoadingPopular,
    error: popularTagsError,
    refetch: refetchPopularTags
  } = useQuery({
    queryKey: ['popularTags', popularTagsLimit],
    queryFn: async () => {
      try {
        const response = await snippetApi.getPopularTags(popularTagsLimit);
        // Validate response structure
        if (!response || (typeof response === 'object' && !Array.isArray(response))) {
          // If response is an object, check for data or tags field
          if (response.data && Array.isArray(response.data)) {
            return response;
          } else if (response.tags && Array.isArray(response.tags)) {
            // Convert old format to new format for consistency
            return { data: response.tags, total: response.tags.length };
          }
        }
        // Return empty data structure if response is malformed
        console.error('Invalid popular tags response format:', response);
        return { data: [], total: 0 };
      } catch (error) {
        console.error('Error fetching popular tags:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  // Fix API response structure mismatch - backend returns {data: TagData[], total}
  // Handle both response formats for backward compatibility
  const popularTags = popularTagsData?.data || popularTagsData?.tags || [];

  // Filter tags based on search query
  // Ensure we have valid tag data before filtering
  const validTags = Array.isArray(popularTags) ? popularTags.filter(t => t && typeof t.tag === 'string') : [];
  
  const filteredTags = debouncedQuery 
    ? filterTagsByQuery(validTags.map(t => t.tag), debouncedQuery)
    : validTags.map(t => t.tag);

  // Get tag suggestions with counts
  const tagSuggestions: TagData[] = filteredTags.map(tag => {
    const tagData = validTags.find(t => t.tag === tag);
    return tagData || { tag, count: 0 };
  });

  const searchTags = (query: string) => {
    setSearchQuery(query);
    // Set searching state for better UX
    if (query && query.trim()) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
    }
  };

  const getPopularTags = (limit?: number) => {
    return popularTags.slice(0, limit || popularTagsLimit);
  };

  // Clear searching state when debounced query catches up
  useEffect(() => {
    if (searchQuery === debouncedQuery) {
      setIsSearching(false);
    }
  }, [searchQuery, debouncedQuery]);

  const isLoading = isLoadingPopular || isSearching;
  const error = popularTagsError;

  return {
    searchTags,
    getPopularTags,
    tagSuggestions,
    popularTags,
    filteredTags,
    searchQuery,
    debouncedQuery,
    isLoading,
    error,
    refetchPopularTags,
  };
};