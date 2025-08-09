import React, { useEffect } from 'react';
import { useSearchStore } from '@/stores/searchStore';
import { SnippetCard } from '@/components/snippet/SnippetCard';
import { UserCard } from '@/components/user/UserCard';
import { Loader2 } from 'lucide-react';
import type { SearchResult } from '@/types/search';

interface SearchResultsProps {
  onResultClick?: (result: SearchResult, index: number) => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({ onResultClick }) => {
  const { 
    results, 
    isLoading, 
    error, 
    totalCount,
    query 
  } = useSearchStore();

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
        Found {totalCount} results for "{query}"
      </div>
      
      <div className="grid gap-4">
        {results.map((result, index) => (
          <div
            key={result.id}
            onClick={() => onResultClick?.(result, index)}
            className="cursor-pointer"
          >
            {renderResult(result)}
          </div>
        ))}
      </div>
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
