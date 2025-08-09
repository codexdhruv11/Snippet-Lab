'use client';

import React, { useEffect, Suspense, useState, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { SearchResults } from '@/components/search/SearchResults';
import SearchFilters from '@/components/search/SearchFilters';
import { GlobalSearchBar } from '@/components/search/GlobalSearchBar';
import { useSearch } from '@/hooks/useSearch';
import { useSearchStore } from '@/stores/searchStore';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Search, AlertCircle, TrendingUp, Clock, Filter } from 'lucide-react';
import type { SearchResult, SearchFilters as ISearchFilters } from '@/types/search';
import { cn } from '@/lib/utils';

// Error Boundary Component
class SearchErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Search page error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

// Search Stats Component
function SearchStats({ query, totalCount, isSearching }: { 
  query: string; 
  totalCount: number; 
  isSearching: boolean;
}) {
  if (!query) return null;

  return (
    <div className="flex items-center justify-between mb-6 p-4 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">
          {isSearching ? (
            <span className="animate-pulse">Searching...</span>
          ) : (
            <>
              Found <strong className="text-foreground">{totalCount}</strong> results for{' '}
              <strong className="text-foreground">"{query}"</strong>
            </>
          )}
        </span>
      </div>
    </div>
  );
}

// Main Search Page Content
function SearchPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setQuery, setFilters } = useSearchStore();
  const { 
    query, 
    results, 
    totalCount, 
    isSearching, 
    error, 
    trackResultClick,
    history,
    popularSearches,
    clearSearch,
    searchFromHistory,
    removeFromHistory
  } = useSearch();

  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<ISearchFilters['scope']>('all');
  const [showFilters, setShowFilters] = useState(true);

  // Initialize search from URL params
  useEffect(() => {
    const urlQuery = searchParams.get('q');
    const scope = searchParams.get('scope') || 'all';
    const page = searchParams.get('page');
    
    if (urlQuery) {
      setQuery(urlQuery);
      setFilters({ scope: scope as ISearchFilters['scope'] });
    }
    
    if (page) {
      setCurrentPage(parseInt(page, 10));
    }

    setActiveTab(scope as ISearchFilters['scope']);
  }, [searchParams, setQuery, setFilters]);

  // Update URL when search params change
  const updateURL = useCallback((newQuery: string, newScope: ISearchFilters['scope'], page: number) => {
    const params = new URLSearchParams();
    if (newQuery) params.set('q', newQuery);
    if (newScope !== 'all') params.set('scope', newScope);
    if (page > 1) params.set('page', page.toString());
    
    const newURL = `${pathname}?${params.toString()}`;
    router.replace(newURL);
  }, [pathname, router]);

  // Handle tab change
  const handleTabChange = (value: string) => {
    const newScope = value as ISearchFilters['scope'];
    setActiveTab(newScope);
    setFilters({ scope: newScope });
    setCurrentPage(1);
    updateURL(query, newScope, 1);
  };

  // Handle result click
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

  // Handle pagination
  const handleLoadMore = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    updateURL(query, activeTab, nextPage);
  };

  // Render empty state
  if (!query && history.length === 0 && popularSearches.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold mb-2">Start Searching</h1>
            <p className="text-muted-foreground mb-6">
              Search for code snippets, users, and tags across the platform
            </p>
            <div className="max-w-2xl mx-auto">
              <GlobalSearchBar className="w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">Search</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="lg:hidden"
          >
            <Filter className="h-4 w-4 mr-2" />
            {showFilters ? 'Hide' : 'Show'} Filters
          </Button>
        </div>
        <div className="max-w-3xl">
          <GlobalSearchBar className="w-full" />
        </div>
      </div>

      {/* Search Stats */}
      <SearchStats 
        query={query} 
        totalCount={totalCount} 
        isSearching={isSearching} 
      />

      {/* Quick Actions */}
      {(history.length > 0 || popularSearches.length > 0) && !query && (
        <div className="mb-8 space-y-6">
          {/* Recent Searches */}
          {history.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">Recent Searches</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {history.slice(0, 5).map((item) => (
                  <Badge
                    key={item.id}
                    variant="secondary"
                    className="cursor-pointer hover:bg-secondary/80"
                    onClick={() => searchFromHistory(item)}
                  >
                    {item.query}
                    <button
                      className="ml-2 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromHistory(item.id);
                      }}
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Popular Searches */}
          {popularSearches.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">Trending Searches</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {popularSearches.slice(0, 8).map((item, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => setQuery(item.query)}
                  >
                    {item.query}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {item.count}
                    </span>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error State */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error.message || 'An error occurred while searching. Please try again.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Search Content */}
      {query && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <aside className={cn(
            "lg:col-span-1",
            !showFilters && "hidden lg:block"
          )}>
            <div className="sticky top-4">
              <SearchFilters />
            </div>
          </aside>

          {/* Results Section */}
          <main className="lg:col-span-3">
            {/* Scope Tabs */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="snippets">Snippets</TabsTrigger>
                <TabsTrigger value="users">Users</TabsTrigger>
                <TabsTrigger value="tags">Tags</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Results */}
            <SearchResults onResultClick={handleResultClick} />

            {/* Pagination */}
            {results.length > 0 && totalCount > results.length && (
              <div className="mt-8 flex justify-center">
                <Button 
                  variant="outline" 
                  onClick={handleLoadMore}
                  disabled={isSearching}
                >
                  {isSearching ? 'Loading...' : 'Load More Results'}
                </Button>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}

// Loading Component
function SearchPageLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="h-10 w-48 mb-4" />
      <Skeleton className="h-10 w-full max-w-3xl mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Skeleton className="h-96" />
        <div className="lg:col-span-3 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    </div>
  );
}

// Error Fallback Component
function SearchPageError() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Something went wrong while loading the search page. Please refresh and try again.
        </AlertDescription>
      </Alert>
    </div>
  );
}

// Main Export
export default function SearchPage() {
  return (
    <SearchErrorBoundary fallback={<SearchPageError />}>
      <Suspense fallback={<SearchPageLoading />}>
        <SearchPageContent />
      </Suspense>
    </SearchErrorBoundary>
  );
}
