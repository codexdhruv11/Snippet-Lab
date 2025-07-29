"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search, X, Code, Clock, FileCode2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiClient } from "@/lib/api";
import { API_ENDPOINTS, SUPPORTED_LANGUAGES } from "@/lib/constants";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search snippets
  const { data, isLoading } = useQuery({
    queryKey: ["searchSnippets", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return { data: [] };
      const response = await apiClient.get(
        `${API_ENDPOINTS.SNIPPETS.BASE}?search=${encodeURIComponent(debouncedQuery)}&limit=10`
      );
      return response.data;
    },
    enabled: isOpen && debouncedQuery.length > 0,
  });

  const handleSelectSnippet = (snippetId: string) => {
    router.push(`/snippets/${snippetId}`);
    onClose();
    setSearchQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  const getLanguageIcon = (language: string) => {
    const lang = SUPPORTED_LANGUAGES.find((l) => l.id === language);
    return lang?.name || language;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b relative">
          {/* Close Dialog Button - positioned further right */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-3 top-3 h-6 w-6 rounded-full hover:bg-muted z-10"
            onClick={onClose}
            title="Close search"
          >
            <X className="h-4 w-4" />
          </Button>
          
          {/* Search Input Container */}
          <div className="relative pr-12">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="search"
              placeholder="Search snippets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10 border-0 focus-visible:ring-0"
              autoFocus
            />
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Searching...</p>
            </div>
          ) : debouncedQuery && data?.data?.length === 0 ? (
            <div className="p-8 text-center">
              <FileCode2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No snippets found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Try searching with different keywords
              </p>
            </div>
          ) : data?.data?.length > 0 ? (
            <div className="py-2">
              <AnimatePresence>
                {data.data.map((snippet: any, index: number) => (
                  <motion.button
                    key={snippet._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="w-full px-4 py-3 hover:bg-muted/50 transition-colors text-left group"
                    onClick={() => handleSelectSnippet(snippet._id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Code className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium truncate">
                            {snippet.title}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">
                            {getLanguageIcon(snippet.language)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{snippet.author?.name || 'Unknown'}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(snippet.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="p-8 text-center">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Start typing to search</p>
              <p className="text-sm text-muted-foreground mt-2">
                Search by title, language, or author
              </p>
            </div>
          )}
        </ScrollArea>

        {data?.data?.length > 0 && (
          <div className="px-4 py-3 border-t bg-muted/30">
            <Button
              variant="ghost"
              className="w-full justify-start text-sm"
              onClick={() => {
                router.push(`/snippets?search=${encodeURIComponent(searchQuery)}`);
                onClose();
              }}
            >
              View all results for &quot;{searchQuery}&quot;
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
