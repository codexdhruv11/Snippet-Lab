'use client';

import React, { useEffect, Suspense, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SearchResults } from '@/components/search/SearchResults';
import SearchFilters from '@/components/search/SearchFilters';
import { GlobalSearchBar } from '@/components/search/GlobalSearchBar';
import { useSearch } from '@/hooks/useSearch';
import { useSearchStore } from '@/stores/searchStore';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, AlertCircle } from 'lucide-react';
import type { SearchResult } from '@/types/search';
import { ErrorBoundary } from '@/components/ui/error-boundary';

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setQuery, setFilters } = useSearchStore();
  const { query, results, totalCount, isSearching, error, trackResultClick } = useSearch();

  // Initialize search from URL params
  useEffect(() => {
    const urlQuery = searchParams.get('q');
    const scope = searchParams.get('scope') || 'all';
    
    if (urlQuery) {
      setQuery(urlQuery);
      setFilters({ scope: scope as any });
    }
  }, [searchParams, setQuery, setFilters]);

  const handleResultClick = (result: SearchResult, index: number) => {
    trackResultClick(result.id, result.type, index);
    
    switch (result.type) {
      case 'snippet':
        router.push(`/snippets/${result.id}`);
        break;
      case 'user':
        router.push(`/users/${result.id}`);
        break;
      case 'tag':
        router.push(`/snippets?tag=${result.data.name}`);
        break;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Search Results</h1>
        <div className="max-w-2xl">
          <GlobalSearchBar className="w-full" />
        </div>
      </div>

      {/* Search Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <aside className="lg:col-span-1">
          <SearchFilters />
        </aside>

        {/* Results Section */}
        <main className="lg:col-span-3">
          {query && (
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                {isSearching ? (
                  'Searching...'
                ) : error ? (
                  <span className="text-destructive">Error: {error.message}</span>
                ) : (
                  <>
                    Found <strong>{totalCount}</strong> results for <strong>"{query}"</strong>
                  </>
                )}
              </p>
            </div>
          )}

          {/* Results */}
          <SearchResults onResultClick={handleResultClick} />

          {/* Pagination would go here */}
          {results.length > 0 && totalCount > results.length && (
            <div className="mt-8 flex justify-center">
              <Button variant="outline" disabled={isSearching}>
                Load More Results
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-48 mb-4" />
        <Skeleton className="h-10 w-full max-w-2xl mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Skeleton className="h-96" />
          <div className="lg:col-span-3 space-y-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}

