"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TagDisplayProps {
  tags: string[];
  onTagClick?: (tag: string) => void;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "secondary" | "outline";
  className?: string;
  maxTags?: number;
  showCount?: boolean;
}

export function TagDisplay({ 
  tags, 
  onTagClick, 
  size = "sm", 
  variant = "secondary",
  className,
  maxTags,
  showCount = true
}: TagDisplayProps) {
  if (!tags || tags.length === 0) {
    return null;
  }

  const displayTags = maxTags ? tags.slice(0, maxTags) : tags;
  const remainingCount = maxTags && tags.length > maxTags ? tags.length - maxTags : 0;

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5"
  };

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {displayTags.map((tag, index) => (
        <Badge
          key={`${tag}-${index}`}
          variant={variant}
          className={cn(
            sizeClasses[size],
            onTagClick && "cursor-pointer hover:bg-primary/20 transition-colors",
            "select-none"
          )}
          onClick={onTagClick ? () => onTagClick(tag) : undefined}
        >
          {tag}
        </Badge>
      ))}
      
      {showCount && remainingCount > 0 && (
        <Badge
          variant="outline"
          className={cn(
            sizeClasses[size],
            "text-muted-foreground"
          )}
        >
          +{remainingCount}
        </Badge>
      )}
    </div>
  );
}