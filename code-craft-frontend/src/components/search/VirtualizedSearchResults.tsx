import React, { useRef, useEffect, useState } from 'react';
import { useSearchStore } from '@/stores/searchStore';
import { SnippetCard } from '@/components/snippet/SnippetCard';
import { UserCard } from '@/components/user/UserCard';
import { Loader2 } from 'lucide-react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import type { SearchResult } from '@/types/search';

interface VirtualizedSearchResultsProps {
  onResultClick?: (result: SearchResult, index: number) => void;
  itemsPerBatch?: number;
}

export const VirtualizedSearchResults: React.FC<VirtualizedSearchResultsProps> = ({ 
  onResultClick,
  itemsPerBatch = 10 
}) => {
  const { 
    results, 
    isLoading, 
    error, 
    totalCount,
    query 
  } = useSearchStore();

  const [visibleResults, setVisibleResults] = useState<SearchResult[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const [observerRef, isIntersecting] = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '100px',
  });

  // Initialize visible results
  useEffect(() => {
    if (results.length > 0) {
      setVisibleResults(results.slice(0, itemsPerBatch));
      setHasMore(results.length > itemsPerBatch);
    } else {
      setVisibleResults([]);
      setHasMore(false);
    }
  }, [results, itemsPerBatch]);

  // Load more results when intersection observer triggers
  useEffect(() => {
    if (isIntersecting && hasMore && !isLoadingMore) {
      setIsLoadingMore(true);
      
      // Simulate async loading for smooth UX
      setTimeout(() => {
        const currentLength = visibleResults.length;
        const nextBatch = results.slice(currentLength, currentLength + itemsPerBatch);
        
        setVisibleResults(prev => [...prev, ...nextBatch]);
        setHasMore(currentLength + nextBatch.length < results.length);
        setIsLoadingMore(false);
      }, 300);
    }
  }, [isIntersecting, hasMore, isLoadingMore, results, visibleResults.length, itemsPerBatch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-500">Error: {error.message}</p>
      </div>
    );
  }

  if (!query) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Enter a search query to get started</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">No results found for "{query}"</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-4">
        Showing {visibleResults.length} of {totalCount} results for "{query}"
      </div>
      
      <div className="grid gap-4">
        {visibleResults.map((result, index) => (
          <div
            key={`${result.type}-${result.id}`}
            onClick={() => onResultClick?.(result, index)}
            className="cursor-pointer"
          >
            {renderResult(result)}
          </div>
        ))}
      </div>

      {/* Intersection Observer Target */}
      {hasMore && (
        <div 
          ref={observerRef} 
          className="flex items-center justify-center p-4"
        >
          {isLoadingMore && (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Loading more results...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function renderResult(result: SearchResult) {
  switch (result.type) {
    case 'snippet':
      return (
        <SnippetCard
          snippet={result.data}
        />
      );
    
    case 'user':
      return (
        <UserCard
          user={result.data}
          showFollowButton={true}
        />
      );
    
    case 'tag':
      return (
        <div className="p-4 rounded-lg border bg-card hover:bg-accent transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-lg font-medium">#{result.data.name}</span>
            <span className="text-sm text-muted-foreground">
              {result.data.count} snippets
            </span>
          </div>
        </div>
      );
    
    default:
      return null;
  }
}
