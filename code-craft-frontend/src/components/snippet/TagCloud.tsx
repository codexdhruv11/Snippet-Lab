"use client";

import React from "react";
import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTagSearch } from "@/hooks/useTagSearch";

interface TagCloudProps {
  onTagClick?: (tag: string) => void;
  limit?: number;
  className?: string;
  showTitle?: boolean;
  showRefresh?: boolean;
}

export function TagCloud({
  onTagClick,
  limit = 20,
  className,
  showTitle = true,
  showRefresh = true
}: TagCloudProps) {
  const { popularTags, isLoading, error, refetchPopularTags } = useTagSearch({
    popularTagsLimit: limit
  });

  const getTagSize = (count: number, maxCount: number) => {
    const ratio = count / maxCount;
    if (ratio > 0.8) return "text-lg px-3 py-1.5";
    if (ratio > 0.6) return "text-base px-2.5 py-1";
    if (ratio > 0.4) return "text-sm px-2.5 py-1";
    return "text-xs px-2 py-0.5";
  };

  const getTagVariant = (count: number, maxCount: number) => {
    const ratio = count / maxCount;
    if (ratio > 0.8) return "default";
    if (ratio > 0.6) return "secondary";
    return "outline";
  };

  if (isLoading) {
    return (
      <Card className={cn("", className)}>
        {showTitle && (
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Popular Tags</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading tags...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("", className)}>
        {showTitle && (
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Popular Tags</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-8">
            <p className="text-destructive mb-4">Failed to load tags</p>
            {showRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchPopularTags()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!popularTags || popularTags.length === 0) {
    return (
      <Card className={cn("", className)}>
        {showTitle && (
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Popular Tags</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">No tags found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...popularTags.map(tag => tag.count));

  return (
    <Card className={cn("", className)}>
      {showTitle && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Popular Tags</CardTitle>
            {showRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchPopularTags()}
                disabled={isLoading}
              >
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
            )}
          </div>
        </CardHeader>
      )}
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {popularTags.map((tagData) => (
            <Badge
              key={tagData.tag}
              variant={getTagVariant(tagData.count, maxCount)}
              className={cn(
                getTagSize(tagData.count, maxCount),
                onTagClick && "cursor-pointer hover:bg-primary/20 transition-colors",
                "select-none"
              )}
              onClick={onTagClick ? () => onTagClick(tagData.tag) : undefined}
              title={`${tagData.count} snippet${tagData.count !== 1 ? 's' : ''}`}
            >
              {tagData.tag}
              <span className="ml-1 text-xs opacity-70">
                {tagData.count}
              </span>
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}