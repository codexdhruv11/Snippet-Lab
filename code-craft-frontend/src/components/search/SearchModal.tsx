"use client";

import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, 
  X, 
  Code, 
  Clock, 
  FileCode2, 
  User, 
  Tag, 
  ArrowRight,
  TrendingUp,
  History
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useSearch } from "@/hooks/useSearch";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";
import { useSearchStore } from "@/stores/searchStore";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import type { SearchResult, SearchScope, SearchHistoryItem } from "@/types/search";
import { cn } from "@/lib/utils";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = React.useState<SearchScope>('all');
  
  const {
    query,
    setQuery,
    results,
    isSearching,
    error,
    suggestions,
    history,
    popularSearches,
    setFilters,
    clearSearch,
    clearHistory,
    removeFromHistory,
    searchFromHistory,
    trackResultClick,
  } = useSearch();

  const { activeIndex, handleKeyDown: handleNavKeyDown, resetNavigation } = useKeyboardNavigation(
    results.length,
    {
      onSelect: (index) => handleSelectResult(results[index]),
      onEscape: onClose,
    }
  );

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      resetNavigation();
    } else {
      clearSearch();
    }
  }, [isOpen, clearSearch, resetNavigation]);

  // Update filters when tab changes
  useEffect(() => {
    setFilters({ scope: activeTab });
  }, [activeTab, setFilters]);

  const handleSelectResult = (result: SearchResult) => {
    if (!result) return;
    
    const position = results.findIndex(r => r.id === result.id);
    trackResultClick(result.id, result.type, position);

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
    
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && query === '') {
      onClose();
      return;
    }
    handleNavKeyDown(e);
  };

  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'snippet':
        return Code;
      case 'user':
        return User;
      case 'tag':
        return Tag;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b relative">
          {/* Visually hidden but accessible title and description */}
          <DialogTitle className="sr-only">Search</DialogTitle>
          <DialogDescription className="sr-only">
            Search for code snippets, users, or tags
          </DialogDescription>
          
          {/* Search Input Container */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search code, users, or tags..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10 border-0 focus-visible:ring-0"
              autoFocus
              aria-label="Search"
              aria-autocomplete="list"
              aria-controls="search-results"
              aria-expanded={results.length > 0}
              aria-activedescendant={activeIndex >= 0 ? `search-result-${activeIndex}` : undefined}
            />
          </div>
        </DialogHeader>

        {/* Search Scope Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SearchScope)} className="px-4 pt-2">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="snippets">Snippets</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="tags">Tags</TabsTrigger>
          </TabsList>
        </Tabs>

        <ScrollArea className="max-h-[400px]">
          <div className="px-4 py-2">
            {isSearching ? (
              <div className="py-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Searching...</p>
              </div>
            ) : error ? (
              <div className="py-8 text-center">
                <FileCode2 className="h-12 w-12 text-destructive mx-auto mb-4" />
                <p className="text-destructive">Error occurred while searching</p>
                <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
              </div>
            ) : query && results.length === 0 ? (
              <div className="py-8 text-center">
                <FileCode2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No results found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Try searching with different keywords
                </p>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-1" id="search-results" role="listbox">
                <AnimatePresence>
                  {results.map((result, index) => {
                    const Icon = getResultIcon(result.type);
                    const isActive = activeIndex === index;
                    
                    return (
                      <motion.button
                        key={result.id}
                        id={`search-result-${index}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={cn(
                          "w-full px-3 py-3 hover:bg-muted/50 transition-colors text-left group rounded-md",
                          isActive && "bg-muted/50 ring-2 ring-primary ring-inset"
                        )}
                        onClick={() => handleSelectResult(result)}
                        onMouseEnter={() => handleNavKeyDown({ key: 'MouseEnter', preventDefault: () => {} } as any)}
                        role="option"
                        aria-selected={isActive}
                      >
                        <div className="flex items-start gap-3">
                          <Icon className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">
                                {result.type === 'snippet' && result.data.title}
                                {result.type === 'user' && result.data.name}
                                {result.type === 'tag' && result.data.name}
                              </span>
                              {result.type === 'snippet' && (
                                <Badge variant="secondary" className="text-xs">
                                  {result.data.language}
                                </Badge>
                              )}
                              {result.type === 'tag' && (
                                <Badge variant="outline" className="text-xs">
                                  {result.data.count} snippets
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                              {result.type === 'snippet' && (
                                <>
                                  <span>{result.data.author?.name || 'Unknown'}</span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDistanceToNow(new Date(result.data.createdAt), {
                                      addSuffix: true,
                                    })}
                                  </span>
                                </>
                              )}
                              {result.type === 'user' && result.data.bio && (
                                <span className="line-clamp-1">{result.data.bio}</span>
                              )}
                            </div>
                          </div>
                          {isActive && (
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </div>
            ) : query === '' && (
              <div className="space-y-4">
                {/* Recent Searches */}
                {history.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium flex items-center gap-2">
                        <History className="h-4 w-4" />
                        Recent Searches
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => clearHistory()}
                        className="text-xs"
                      >
                        Clear
                      </Button>
                    </div>
                    <div className="space-y-1">
                      {history.slice(0, 5).map((item) => (
                        <div
                          key={item.id}
                          className="w-full px-3 py-2 hover:bg-muted/50 rounded-md text-sm group flex items-center justify-between"
                        >
                          <button
                            className="flex-1 text-left truncate"
                            onClick={() => searchFromHistory(item)}
                          >
                            <span className="truncate">{item.query}</span>
                          </button>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{item.resultCount} results</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFromHistory(item.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted-foreground/20 rounded"
                              aria-label="Remove from history"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Popular Searches */}
                {popularSearches.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Trending Searches
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {popularSearches.slice(0, 8).map((search, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => setQuery(search.query)}
                          className="text-xs"
                        >
                          {search.query}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {results.length > 0 && (
          <div className="px-4 py-3 border-t bg-muted/30">
            <Button
              variant="ghost"
              className="w-full justify-start text-sm"
              onClick={() => {
                router.push(`/search?q=${encodeURIComponent(query)}&scope=${activeTab}`);
                onClose();
              }}
            >
              View all results for &quot;{query}&quot;
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
