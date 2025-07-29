"use client";

import React, { useState } from "react";
import { X, Search, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TagCloud } from "./TagCloud";
import { useTagSearch } from "@/hooks/useTagSearch";

interface TagFilterProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  className?: string;
}

export function TagFilter({
  selectedTags,
  onTagsChange,
  className
}: TagFilterProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { tagSuggestions } = useTagSearch();

  const handleTagSelect = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const handleTagRemove = (tagToRemove: string) => {
    onTagsChange(selectedTags.filter(tag => tag !== tagToRemove));
  };

  const handleClearAll = () => {
    onTagsChange([]);
  };

  // Filter available tags based on search and exclude selected ones
  const filteredAvailableTags = tagSuggestions
    .filter(tagData => !selectedTags.includes(tagData.tag))
    .filter(tagData => 
      searchQuery.trim() === "" || 
      tagData.tag.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .slice(0, 10);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Selected Tags Section */}
      {selectedTags.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center">
                <Tag className="h-4 w-4 mr-2" />
                Active Filters
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="text-xs"
              >
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {selectedTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="default"
                  className="text-xs px-2 py-1 pr-1"
                >
                  {tag}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 ml-1 hover:bg-transparent"
                    onClick={() => handleTagRemove(tag)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Tags */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Search Tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Search for tags..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filtered Available Tags */}
          {filteredAvailableTags.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Available tags:</p>
              <div className="flex flex-wrap gap-1.5">
                {filteredAvailableTags.map((tagData) => (
                  <Badge
                    key={tagData.tag}
                    variant="outline"
                    className="text-xs px-2 py-1 cursor-pointer hover:bg-primary/10 transition-colors"
                    onClick={() => handleTagSelect(tagData.tag)}
                  >
                    {tagData.tag}
                    {tagData.count > 0 && (
                      <span className="ml-1 opacity-70">
                        {tagData.count}
                      </span>
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {searchQuery.trim() && filteredAvailableTags.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No tags found matching "{searchQuery}"
            </p>
          )}
        </CardContent>
      </Card>

      {/* Popular Tags Cloud */}
      <TagCloud
        onTagClick={handleTagSelect}
        limit={15}
        showTitle={true}
        showRefresh={false}
      />
    </div>
  );
}