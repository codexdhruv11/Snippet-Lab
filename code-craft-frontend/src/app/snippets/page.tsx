'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Search, Filter } from 'lucide-react';
import { LazySnippetCard } from '@/components/lazy/LazySnippetCard';
import { MagicBentoGrid, MagicBentoContainer } from '@/components/ui/magic-bento';
import { snippetApi } from '@/lib/api';
import { useResponsive } from '@/hooks/useResponsive';
import { TagFilter } from '@/components/snippet/TagFilter';
import { TagCloud } from '@/components/snippet/TagCloud';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';

export default function SnippetsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [language, setLanguage] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const { isMobile, isTablet } = useResponsive();

  // Initialize tags from URL parameters
  useEffect(() => {
    const tagsParam = searchParams.get('tags');
    if (tagsParam) {
      const tagsFromUrl = tagsParam.split(',').filter(tag => tag.trim().length > 0);
      setSelectedTags(tagsFromUrl);
    }
  }, [searchParams]);

  // Update URL when tags change
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (selectedTags.length > 0) {
      params.set('tags', selectedTags.join(','));
    } else {
      params.delete('tags');
    }
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    router.replace(newUrl, { scroll: false });
  }, [selectedTags, router, searchParams]);
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['snippets', page, language, searchQuery, selectedTags],
    queryFn: () => snippetApi.getSnippets({ 
      page, 
      limit: 12, 
      language, 
      search: searchQuery,
      tags: selectedTags.length > 0 ? selectedTags : undefined
    }),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // The query will automatically run due to the dependency array
  };

  const handleLoadMore = () => {
    setPage((prev) => prev + 1);
  };

  const handleTagClick = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
      setPage(1); // Reset to first page when filtering
    }
  };

  const handleTagsChange = (tags: string[]) => {
    setSelectedTags(tags);
    setPage(1); // Reset to first page when filtering
  };

  return (
    <MagicBentoContainer className="container py-8">
      <div className="flex flex-col desktop:flex-row gap-6">
        {/* Filter sidebar - visible on desktop, collapsible on mobile/tablet */}
        <motion.div 
          className={`${isMobile || isTablet ? 'hidden' : 'w-64'}`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="space-y-4">
            <Card magic glow className="p-4 sticky top-20">
              <h2 className="text-xl font-semibold mb-4">Filters</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="language" className="block text-sm font-medium mb-1">
                    Language
                  </label>
                  <select
                    id="language"
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    <option value="">All Languages</option>
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={lang.id} value={lang.id}>{lang.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>
            
            <TagFilter
              selectedTags={selectedTags}
              onTagsChange={handleTagsChange}
            />
          </div>
        </motion.div>

        {/* Main content */}
        <div className="flex-1">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-heading-3-mobile desktop:text-heading-3-desktop">Code Snippets</h1>
            
            {/* Mobile/Tablet filter button */}
            {(isMobile || isTablet) && (
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            )}
          </div>

          {/* Search form */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="search"
                placeholder="Search snippets..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </form>

          {/* Popular Tags Cloud */}
          <div className="mb-6">
            <TagCloud
              onTagClick={handleTagClick}
              limit={15}
              showTitle={true}
              showRefresh={true}
            />
          </div>

          {/* Snippets grid */}
          {isLoading ? (
            <div className="text-center py-10">Loading snippets...</div>
          ) : error ? (
            <div className="text-center py-10 text-destructive">
              Failed to load snippets. Please try again.
            </div>
          ) : data?.data?.length === 0 ? (
            <div className="text-center py-10">
              No snippets found. Try adjusting your filters.
            </div>
          ) : (
            <>
              <MagicBentoGrid 
                columns={{ mobile: 1, tablet: 2, desktop: 3 }} 
                stagger="normal"
              >
                {data?.data?.map((snippet) => (
                  <LazySnippetCard key={snippet._id} snippet={snippet} />
                ))}
              </MagicBentoGrid>

              {/* Load more button */}
              {data?.pagination?.hasNext && (
                <motion.div 
                  className="mt-8 text-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <Button magic onClick={handleLoadMore} disabled={isLoading}>
                    Load More
                  </Button>
                </motion.div>
              )}
            </>
          )}
        </div>
      </div>
    </MagicBentoContainer>
  );
}
