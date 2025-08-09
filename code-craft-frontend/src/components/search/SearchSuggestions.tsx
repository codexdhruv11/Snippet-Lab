import React from 'react';
import { useSearch } from '@/hooks/useSearch';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { Clock, Search, Tag, User } from 'lucide-react';
import type { SearchSuggestion, SearchHistoryItem } from '@/types/search';
import { cn } from '@/lib/utils';

interface SearchSuggestionsProps {
  onSelect: (suggestion: string) => void;
  visible?: boolean;
}

export const SearchSuggestions: React.FC<SearchSuggestionsProps> = ({ 
  onSelect, 
  visible = true 
}) => {
  const { suggestions, history, popularSearches } = useSearch();
  
  const allSuggestions = [
    ...history.slice(0, 3).map(item => ({
      id: item.id,
      text: item.query,
      type: 'history' as const,
      metadata: { count: item.resultCount }
    })),
    ...suggestions,
    ...popularSearches.slice(0, 3).map((item, index) => ({
      id: `popular-${index}`,
      text: item.query,
      type: 'popular' as const,
      metadata: { count: item.count }
    }))
  ];

  const { activeIndex, setActiveIndex } = useKeyboardNavigation(
    allSuggestions.length,
    {
      onSelect: (index) => onSelect(allSuggestions[index].text),
    }
  );

  if (!visible || allSuggestions.length === 0) {
    return null;
  }

  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
      <div className="p-2">
        {allSuggestions.map((suggestion, index) => (
          <button
            key={suggestion.id}
            className={cn(
              "w-full px-3 py-2 text-left flex items-center gap-2 rounded hover:bg-accent transition-colors",
              activeIndex === index && "bg-accent"
            )}
            onClick={() => onSelect(suggestion.text)}
            onMouseEnter={() => setActiveIndex(index)}
          >
            {renderIcon(suggestion)}
            <span className="flex-1 truncate">{suggestion.text}</span>
            {suggestion.metadata?.count && (
              <span className="text-xs text-muted-foreground">
                {suggestion.metadata.count} results
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

function renderIcon(suggestion: { type: string }) {
  switch (suggestion.type) {
    case 'history':
      return <Clock className="h-4 w-4 text-muted-foreground" />;
    case 'popular':
      return <Search className="h-4 w-4 text-muted-foreground" />;
    case 'tag':
      return <Tag className="h-4 w-4 text-muted-foreground" />;
    case 'user':
      return <User className="h-4 w-4 text-muted-foreground" />;
    default:
      return <Search className="h-4 w-4 text-muted-foreground" />;
  }
}
