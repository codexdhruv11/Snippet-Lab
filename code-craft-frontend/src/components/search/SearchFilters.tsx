import React, { useState } from 'react';
import { useSearchFilters } from '@/hooks/useSearchFilters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, X } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';
import { cn } from '@/lib/utils';

const SearchFilters: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const {
    filters,
    setFilter,
    clearFilters,
    getActiveFilters
  } = useSearchFilters();

  const activeFilterCount = Object.keys(getActiveFilters()).length;

  const handleTagsChange = (value: string) => {
    const tags = value.split(',').map(tag => tag.trim()).filter(Boolean);
    setFilter('tags', tags.length > 0 ? tags : undefined);
  };

  const removeFilter = (key: keyof typeof filters) => {
    setFilter(key, undefined);
  };

  return (
    <div className="w-full space-y-4 rounded-lg border bg-card p-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Filters</h3>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <Badge variant="secondary">{activeFilterCount} active</Badge>
            )}
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform",
                  isOpen && "rotate-180"
                )} />
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>
        
        <CollapsibleContent className="space-y-4 pt-4">
          {/* Language Filter */}
          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Select
              value={filters.language || ''}
              onValueChange={(value) => setFilter('language', value || undefined)}
            >
              <SelectTrigger id="language">
                <SelectValue placeholder="Any language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any language</SelectItem>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.id} value={lang.id}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Author Filter */}
          <div className="space-y-2">
            <Label htmlFor="author">Author</Label>
            <Input
              id="author"
              type="text"
              placeholder="Filter by author..."
              value={filters.author || ''}
              onChange={(e) => setFilter('author', e.target.value || undefined)}
            />
          </div>

          {/* Tags Filter */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              type="text"
              placeholder="tag1, tag2, tag3..."
              value={(filters.tags || []).join(', ')}
              onChange={(e) => handleTagsChange(e.target.value)}
            />
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <Label>Date Range</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => setFilter('dateFrom', e.target.value || undefined)}
              />
              <Input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => setFilter('dateTo', e.target.value || undefined)}
              />
            </div>
          </div>

          {/* Sort By */}
          <div className="space-y-2">
            <Label htmlFor="sortBy">Sort By</Label>
            <Select
              value={filters.sortBy || 'relevance'}
              onValueChange={(value) => setFilter('sortBy', value as any)}
            >
              <SelectTrigger id="sortBy">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="alphabetical">Alphabetical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active Filters */}
          {activeFilterCount > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Active Filters</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-auto p-1 text-xs"
                >
                  Clear all
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(getActiveFilters()).map(([key, value]) => (
                  <Badge
                    key={key}
                    variant="secondary"
                    className="gap-1 pr-1"
                  >
                    <span className="text-xs">
                      {key}: {Array.isArray(value) ? value.join(', ') : String(value)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0.5 hover:bg-transparent"
                      onClick={() => removeFilter(key as keyof typeof filters)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default SearchFilters;

