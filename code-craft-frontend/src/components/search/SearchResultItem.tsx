import React from "react";
import { SnippetCard } from "@/components/snippet/SnippetCard";
import { UserCard } from "@/components/user/UserCard";
import { cn } from "@/lib/utils";
import type { SearchResult } from "@/types/search";

interface SearchResultItemProps {
  result: SearchResult;
  onClick?: () => void;
}

const SearchResultItem: React.FC<SearchResultItemProps> = ({ result, onClick }) => {
  return (
    <div
      className={cn(
        "rounded-md hover:bg-accent p-3 flex items-center transition-colors cursor-pointer",
        result.type === "snippet" && "bg-snippet",
        result.type === "user" && "bg-user",
        result.type === "tag" && "bg-tag"
      )}
      onClick={onClick}
    >
      {renderResultComponent(result)}
    </div>
  );
};

function renderResultComponent(result: SearchResult) {
  switch (result.type) {
    case "snippet":
      return <SnippetCard snippet={result.data} showAuthor showStats />;
    case "user":
      return <UserCard user={result.data} showStats />;
    case "tag":
      return (
        <div className="p-2">
          <div className="text-lg font-medium">#{result.data.name}</div>
          <div className="text-sm text-muted-foreground">
            {result.data.count} snippets
          </div>
        </div>
      );
    default:
      return null;
  }
}

export default SearchResultItem;

