import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { useSearch } from '@/hooks/useSearch';
import { useSearchStore } from '@/stores/searchStore';
import { SearchModal } from './SearchModal';
import { SearchSuggestions } from './SearchSuggestions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface GlobalSearchBarProps {
  className?: string;
}

export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({ className }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [localQuery, setLocalQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { setQuery, setFilters } = useSearchStore();
  const { suggestions } = useSearch();

  // Keyboard shortcut (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearch = (query: string) => {
    setLocalQuery(query);
    setQuery(query);
    setIsModalOpen(true);
    setShowSuggestions(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalQuery(value);
    setShowSuggestions(value.length > 0);
  };

  const handleInputFocus = () => {
    setShowSuggestions(localQuery.length > 0);
  };

  const handleInputBlur = () => {
    // Delay to allow clicking on suggestions
    setTimeout(() => setShowSuggestions(false), 200);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localQuery.trim()) {
      handleSearch(localQuery);
    }
  };

  return (
    <>
      <div className={cn("relative", className)}>
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search snippets, users, tags... (Ctrl+K)"
              value={localQuery}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              className="pl-10 pr-4"
            />
            <kbd className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>
        </form>

        {showSuggestions && (
          <SearchSuggestions
            onSelect={handleSearch}
            visible={showSuggestions}
          />
        )}
      </div>

      <SearchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
