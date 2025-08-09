import React from 'react';
import { useSearch } from '@/hooks/useSearch';
import { Button } from '@/components/ui/button';

const SearchHistory: React.FC = () => {
  const { history, searchFromHistory, clearHistory, removeFromHistory } = useSearch();

  return (
    <div className="search-history p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-xl font-semibold">Search History</h4>
        <Button onClick={clearHistory} variant="ghost">
          Clear All
        </Button>
      </div>

      <ul className="space-y-2">
        {history.map(item => (
          <li 
            key={item.id} 
            className="p-2 bg-card rounded-md flex justify-between items-center"
          >
            <div className="flex gap-2 items-center">
              <Button variant="link" onClick={() => searchFromHistory(item)}>{item.query}</Button>
              <span className="text-muted-foreground text-xs">{item.resultCount} results</span>
            </div>
            <Button 
              variant="ghost"
              size="sm"
              onClick={() => removeFromHistory(item.id)}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>

      {history.length === 0 && (
        <div className="text-sm text-muted-foreground text-center">
          No search history found.
        </div>
      )}
    </div>
  );
};

export default SearchHistory;

