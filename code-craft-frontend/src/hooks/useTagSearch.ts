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
  const debouncedQuery = useDebounce(searchQuery, debounceMs);

  // Fetch popular tags
  const {
    data: popularTagsData,
    isLoading: isLoadingPopular,
    error: popularTagsError,
    refetch: refetchPopularTags
  } = useQuery({
    queryKey: ['popularTags', popularTagsLimit],
    queryFn: () => snippetApi.getPopularTags(popularTagsLimit),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  const popularTags = popularTagsData?.tags || [];

  // Filter tags based on search query
  const filteredTags = debouncedQuery 
    ? filterTagsByQuery(popularTags.map(t => t.tag), debouncedQuery)
    : popularTags.map(t => t.tag);

  // Get tag suggestions with counts
  const tagSuggestions: TagData[] = filteredTags.map(tag => {
    const tagData = popularTags.find(t => t.tag === tag);
    return tagData || { tag, count: 0 };
  });

  const searchTags = (query: string) => {
    setSearchQuery(query);
  };

  const getPopularTags = (limit?: number) => {
    return popularTags.slice(0, limit || popularTagsLimit);
  };

  const isLoading = isLoadingPopular;
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