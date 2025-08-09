import { useState, useCallback, useEffect } from 'react';
import type { SearchFilters } from '@/types/search';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

/**
 * Hook for managing search filters
 */
export function useSearchFilters() {
  const [filters, setFilters] = useState<SearchFilters>({ scope: 'all' });
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize filters from URL on mount
  useEffect(() => {
    const urlFilters: Partial<SearchFilters> = {};
    searchParams.forEach((value, key) => {
      if (key === 'tags' && value) {
        urlFilters.tags = value.split(',');
      } else {
        (urlFilters as any)[key] = value;
      }
    });
    if (Object.keys(urlFilters).length > 0) {
      setFilters({ scope: 'all', ...urlFilters });
    }
  }, []);

  // Synchronize filters with URL parameters
  const synchronizeUrl = useCallback(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value != null && value !== '' && value !== 'all') {
        if (Array.isArray(value)) {
          params.set(key, value.join(','));
        } else {
          params.set(key, String(value));
        }
      }
    });
    const search = params.toString();
    router.push(`${pathname}${search ? `?${search}` : ''}`);
  }, [filters, router, pathname]);

  // Set a specific filter
  const setFilter = useCallback(
    <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
      setFilters(prevFilters => {
        const newFilters = {
          ...prevFilters,
          [key]: value,
        };
        return newFilters;
      });
    },
    [],
  );

  // Update URL when filters change
  useEffect(() => {
    synchronizeUrl();
  }, [filters]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({ scope: 'all' });
  }, []);

  // Reset filters to initial state
  const resetFilters = useCallback(() => {
    setFilters({ scope: 'all' });
  }, []);

  // Get currently active filters
  const getActiveFilters = useCallback(() => {
    return filters;
  }, [filters]);

  return {
    filters,
    setFilter,
    clearFilters,
    resetFilters,
    getActiveFilters,
  };
}
