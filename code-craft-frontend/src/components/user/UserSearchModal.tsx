'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useDebounceCallback } from '@/hooks/useDebounceCallback';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { UserCard } from './UserCard';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, UserX, Loader2 } from 'lucide-react';
import { userSearchApi } from '@/lib/api';
import type { UserSearchResult } from '@/types/api';

interface UserSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserSearchModal({ isOpen, onClose }: UserSearchModalProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Debounce search query
  const debouncedSearch = useDebounceCallback((query: string) => {
    setDebouncedQuery(query);
  }, 300);

  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  // Search users
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['user-search', debouncedQuery],
    queryFn: () => userSearchApi.searchUsers(debouncedQuery),
    enabled: isOpen && debouncedQuery.length > 0,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    staleTime: 60000, // 1 minute
  });

  // Reset search when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setDebouncedQuery('');
      setSelectedIndex(-1);
    }
  }, [isOpen]);

  // Reset selected index when search results change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [data]);

  const handleViewAllResults = () => {
    router.push(`/discover?q=${encodeURIComponent(searchQuery)}`);
    onClose();
  };

  const handleUserClick = (userId: string) => {
    router.push(`/users/${userId}`);
    onClose();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const users = data?.data || [];
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < users.length - 1 ? prev + 1 : prev
        );
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => prev > -1 ? prev - 1 : prev);
        break;
      
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < users.length) {
          handleUserClick(users[selectedIndex]._id);
        } else if (users.length > 0 && selectedIndex === -1) {
          // If no item is selected but there are results, go to view all
          handleViewAllResults();
        }
        break;
      
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  };

  // Loading skeleton
  const SearchResultSkeleton = () => (
    <div className="p-4">
      <div className="flex items-start space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-3 w-full" />
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Search Users</DialogTitle>
          <DialogDescription>
            Find and connect with other developers
          </DialogDescription>
        </DialogHeader>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search users by name..."
            className="pl-9"
            autoFocus
            aria-label="Search users"
            aria-controls="search-results"
            aria-expanded={searchQuery.length > 0}
          />
        </div>

        {/* Search Results */}
        <ScrollArea className="max-h-[400px]">
          {searchQuery.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2" />
              <p>Start typing to search for users</p>
            </div>
          ) : isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <SearchResultSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="py-8 text-center text-destructive">
              <p>{error.message || 'Error searching users. Please try again.'}</p>
              <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-4">
                {isFetching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Retrying...
                  </>
                ) : (
                  'Retry'
                )}
              </Button>
            </div>
          ) : data?.data?.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <UserX className="h-8 w-8 mx-auto mb-2" />
              <p>No users found matching "{searchQuery}"</p>
            </div>
          ) : (
            <div className="space-y-2" id="search-results" role="listbox">
              {data?.data?.map((user: UserSearchResult, index: number) => (
                <div
                  key={user._id}
                  onClick={() => handleUserClick(user._id)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`cursor-pointer transition-all duration-150 rounded-lg ${
                    selectedIndex === index ? 'ring-2 ring-primary ring-offset-2' : ''
                  }`}
                  role="option"
                  aria-selected={selectedIndex === index}
                  tabIndex={-1}
                >
                  <UserCard user={user} showFollowButton={true} />
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* View All Results */}
        {data?.data?.length > 0 && (
          <div className="flex justify-center pt-2">
            <Button
              onClick={handleViewAllResults}
              variant="ghost"
              size="sm"
              className="text-primary"
            >
              View all results
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
