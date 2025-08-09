"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Star, MessageSquare, Calendar } from "lucide-react";
import { useRelativeDate } from "@/lib/date-utils";

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils";
import { SnippetCardProps } from "@/types/ui";
import { staggerItem } from "@/lib/animations";
import { SUPPORTED_LANGUAGES } from "@/lib/constants";
import { StarButton } from './StarButton';
import { FollowButton } from '@/components/user/FollowButton';
import { useAuthStore } from '@/stores/authStore';
import { TagDisplay } from './TagDisplay';

export function SnippetCard({ snippet, onClick, className }: SnippetCardProps) {
  // Auth state
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  
  const handleTagClick = (tag: string) => {
    // Navigate to snippets page with tag filter
    router.push(`/snippets?tags=${encodeURIComponent(tag)}`);
  };
  
  // Find language info
  const languageInfo = SUPPORTED_LANGUAGES.find(lang => lang.id === snippet.language) || 
    SUPPORTED_LANGUAGES[0];
  
  // Format code preview (truncate if needed)
  const codePreview = truncateText(snippet.code, 200);
  
  // Use snippet properties
  const commentCount = snippet.comments || 0;
  const starCount = snippet.stars || 0;
  const userName = snippet.author ? snippet.author.name : "Unknown";
  const isOwnSnippet = user?._id === snippet.author?._id;
  
  // Get hydration-safe relative date
  const relativeDate = useRelativeDate(snippet.createdAt);
  
  return (
    <motion.div variants={staggerItem}>
      <Link href={`/snippets/${snippet._id}`} onClick={onClick}>
        <Card 
          magic
          hover 
          glow
          className={cn(
            "h-full group overflow-hidden",
            className
          )}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-all duration-200 group-hover:bg-primary/20 group-hover:scale-105">
                {languageInfo.name}
              </div>
              <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4" fill={snippet.isStarred ? "currentColor" : "none"} />
                  <span>{starCount}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MessageSquare className="h-4 w-4" />
                  <span>{commentCount}</span>
                </div>
              </div>
            </div>
            <CardTitle className="line-clamp-1 mt-2 text-lg">
              {snippet.title}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="pb-2">
            <div className="h-[120px] overflow-hidden rounded-lg bg-muted p-3 transition-all duration-300 group-hover:bg-muted/80 group-hover:shadow-inner">
              <pre className="text-xs leading-relaxed cascadia-code-regular">
                <code className="text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                  {codePreview}
                </code>
              </pre>
            </div>
          </CardContent>
          
          <CardFooter className="px-4 py-3 border-t flex flex-col gap-3">
            <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <button
                  className="hover:text-foreground transition-colors text-left"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    router.push(`/users/${snippet.author?._id}`);
                  }}
                >
                  <span className="hover:underline">By {userName}</span>
                </button>
                {isAuthenticated && !isOwnSnippet && snippet.author?._id && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <FollowButton 
                      userId={snippet.author._id} 
                      initialFollowState={false}
                      size="sm"
                    />
                  </div>
                )}
              </div>
              <div className="flex items-center">
                <Calendar className="mr-1 h-3 w-3" />
                <span>{relativeDate}</span>
              </div>
            </div>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                <div onClick={(e) => e.stopPropagation()}>
                  <StarButton snippetId={snippet._id} initialStarCount={starCount} isSmall />
                </div>
              </div>
            </div>
            
            {/* Tags */}
            {snippet.tags && snippet.tags.length > 0 && (
              <div className="w-full" onClick={(e) => e.stopPropagation()}>
                <TagDisplay
                  tags={snippet.tags}
                  onTagClick={handleTagClick}
                  size="sm"
                  maxTags={3}
                  showCount={true}
                />
              </div>
            )}
          </CardFooter>
        </Card>
      </Link>
    </motion.div>
  );
} 