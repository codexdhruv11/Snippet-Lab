"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, TrendingUp, Clock, Users } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserList } from "@/components/user/UserList";
import { userSearchApi, userProfileApi } from "@/lib/api";
import { API_LIMITS } from "@/lib/constants";
import { UserProfile } from "@/types/api";
import { useDebounce } from "@/hooks/useDebounce";

export default function DiscoverPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchPage, setSearchPage] = useState(1);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Search users query
  const searchUsersQuery = useQuery({
    queryKey: ["searchUsers", debouncedSearchQuery, searchPage],
    queryFn: async () => {
      if (!debouncedSearchQuery) return null;
      return await userSearchApi.searchUsers(debouncedSearchQuery, searchPage, API_LIMITS.MAX_USERS_PER_PAGE);
    },
    enabled: !!debouncedSearchQuery,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  // Popular users query (most followers)
  const popularUsersQuery = useQuery({
    queryKey: ["popularUsers"],
    queryFn: async () => {
      // TODO: Implement dedicated endpoint for popular users
      // This should return users sorted by follower count
      // Example: GET /api/users/popular?limit=10
      // For now, we'll use search with empty query to get all users
      return await userSearchApi.searchUsers("", 1, 10);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Recent users query
  const recentUsersQuery = useQuery({
    queryKey: ["recentUsers"],
    queryFn: async () => {
      // TODO: Implement dedicated endpoint for recent users
      // This should return users sorted by registration date (newest first)
      // Example: GET /api/users/recent?limit=10
      // For now, we'll use search with empty query
      return await userSearchApi.searchUsers("", 1, 10);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setSearchPage(1);
  };

  const handleLoadMore = () => {
    setSearchPage(searchPage + 1);
  };

  return (
    <div className="container py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-heading-2-mobile tablet:text-heading-2-desktop mb-2">Discover Users</h1>
        <p className="text-muted-foreground">Find and connect with other developers</p>
      </div>

      {/* Search Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Users
          </CardTitle>
          <CardDescription>Search for users by name or bio</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="flex-1"
            />
          </div>
          
          {searchUsersQuery.data && (
            <div className="mt-6">
              <UserList
                users={searchUsersQuery.data.data}
                isLoading={searchUsersQuery.isLoading}
                hasMore={searchUsersQuery.data.pagination?.hasMore || false}
                onLoadMore={handleLoadMore}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Browse Sections */}
      {!searchQuery && (
        <div className="grid gap-6 tablet:grid-cols-2">
          {/* Popular Users */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Popular Users
              </CardTitle>
              <CardDescription>Users with the most followers</CardDescription>
            </CardHeader>
            <CardContent>
              <UserList
                users={popularUsersQuery.data?.data || []}
                isLoading={popularUsersQuery.isLoading}
                hasMore={false}
                onLoadMore={() => {}}
              />
            </CardContent>
          </Card>

          {/* Recently Joined */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recently Joined
              </CardTitle>
              <CardDescription>New members of the community</CardDescription>
            </CardHeader>
            <CardContent>
              <UserList
                users={recentUsersQuery.data?.data || []}
                isLoading={recentUsersQuery.isLoading}
                hasMore={false}
                onLoadMore={() => {}}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
