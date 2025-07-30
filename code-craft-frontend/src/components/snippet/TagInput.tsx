"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { validateTag, normalizeTags, validateTags } from "@/utils/tagUtils";
import { useTagSearch } from "@/hooks/useTagSearch";
import { API_LIMITS } from "@/lib/constants";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  error?: string;
}

export function TagInput({
  value = [],
  onChange,
  placeholder = "Add tags...",
  disabled = false,
  className,
  error
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [inputError, setInputError] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  
  const { tagSuggestions, isLoading, searchTags } = useTagSearch({
    popularTagsLimit: 10
  });

  // Filter suggestions to exclude already selected tags
  const availableSuggestions = tagSuggestions.filter(
    suggestion => !value.includes(suggestion.tag.toLowerCase())
  );

  // Filter suggestions based on input
  const filteredSuggestions = inputValue.trim()
    ? availableSuggestions.filter(suggestion =>
        suggestion.tag.toLowerCase().includes(inputValue.toLowerCase())
      )
    : availableSuggestions.slice(0, 5);

  // Close popover when input is cleared
  useEffect(() => {
    if (!inputValue.trim() && isOpen && filteredSuggestions.length === 0) {
      setIsOpen(false);
    }
  }, [inputValue, isOpen, filteredSuggestions.length]);

  const addTag = (tag: string) => {
    // Trim and normalize the tag (don't remove valid characters)
    const trimmedTag = tag.trim().toLowerCase();
    
    if (!trimmedTag) {
      setInputError("Tag cannot be empty");
      return;
    }
    
    // Validate tag
    const validation = validateTag(trimmedTag);
    if (!validation.isValid) {
      setInputError(validation.error || "Invalid tag");
      return;
    }
    
    // Check if tag already exists (case-insensitive)
    if (value.some(t => t.toLowerCase() === trimmedTag)) {
      setInputError("Tag already added");
      return;
    }
    
    // Check max tags limit
    if (value.length >= API_LIMITS.MAX_TAGS_PER_SNIPPET) {
      setInputError(`Maximum ${API_LIMITS.MAX_TAGS_PER_SNIPPET} tags allowed`);
      return;
    }
    
    // Add tag
    const newTags = [...value, trimmedTag];
    onChange(newTags);
    setInputValue("");
    setInputError("");
    setIsOpen(false);
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = value.filter(tag => tag !== tagToRemove);
    onChange(newTags);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      // Remove last tag when backspace is pressed on empty input
      removeTag(value[value.length - 1]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setInputValue("");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setInputError("");
    
    // Open suggestions when typing
    if (newValue.trim() && !isOpen) {
      setIsOpen(true);
    }
    
    // Trigger search functionality
    searchTags(newValue);
  };

  const handleSuggestionSelect = (suggestion: string) => {
    addTag(suggestion);
  };

  // Validate all tags
  const tagsValidation = validateTags(value);
  const hasError = error || inputError || !tagsValidation.isValid;
  const errorMessage = error || inputError || tagsValidation.errors[0];

  return (
    <div className={cn("space-y-2", className)}>
      {/* Selected tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag, index) => (
            <Badge
              key={`${tag}-${index}`}
              variant="secondary"
              className="text-xs px-2 py-1 pr-1"
            >
              {tag}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto p-0 ml-1 hover:bg-transparent"
                onClick={() => removeTag(tag)}
                disabled={disabled}
                aria-label={`Remove ${tag} tag`}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input with suggestions */}
      <Popover open={isOpen && !disabled} onOpenChange={setIsOpen}>
        <div ref={popoverRef}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Input
              ref={inputRef}
              type="text"
              placeholder={placeholder}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (inputValue.trim() || availableSuggestions.length > 0) {
                  setIsOpen(true);
                }
              }}
              onBlur={(e) => {
                // Close popover when focus leaves the input and popover
                setTimeout(() => {
                  if (!popoverRef.current?.contains(document.activeElement)) {
                    setIsOpen(false);
                  }
                }, 200);
              }}
              disabled={disabled}
              className={cn(
                "pr-10",
                hasError && "border-destructive focus-visible:ring-destructive"
              )}
              aria-label="Tag input"
              aria-invalid={hasError}
              aria-describedby={hasError ? "tag-error" : undefined}
            />
            {inputValue.trim() && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                onClick={() => addTag(inputValue)}
                disabled={disabled || !!inputError || value.length >= API_LIMITS.MAX_TAGS_PER_SNIPPET}
                aria-label="Add tag"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </PopoverTrigger>
        
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search tags..."
              value={inputValue}
              onValueChange={setInputValue}
            />
            <CommandList>
              {isLoading ? (
                <div className="p-2 text-sm text-muted-foreground">Loading...</div>
              ) : filteredSuggestions.length > 0 ? (
                <CommandGroup>
                  {filteredSuggestions.map((suggestion, index) => (
                    <CommandItem
                      key={suggestion.tag}
                      onSelect={() => handleSuggestionSelect(suggestion.tag)}
                      className="cursor-pointer"
                      aria-label={`${suggestion.tag} (${suggestion.count} uses)`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{suggestion.tag}</span>
                        {suggestion.count > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {suggestion.count}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : inputValue.trim() ? (
                <CommandEmpty>
                  <div className="p-2">
                    <div className="text-sm text-muted-foreground mb-2">
                      No tags found. Press Enter to add "{inputValue.trim()}"
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addTag(inputValue)}
                      className="w-full"
                    >
                      Add "{inputValue.trim()}"
                    </Button>
                  </div>
                </CommandEmpty>
              ) : (
                <CommandEmpty>Start typing to search tags...</CommandEmpty>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
        </div>
      </Popover>

      {/* Error message */}
      {hasError && (
        <p id="tag-error" className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      )}

      {/* Helper text */}
      <p className="text-xs text-muted-foreground">
        Press Enter or comma to add tags. Maximum {API_LIMITS.MAX_TAGS_PER_SNIPPET} tags.
      </p>
    </div>
  );
}