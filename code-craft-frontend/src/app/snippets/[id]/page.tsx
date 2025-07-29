'use client';

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Calendar, User, Edit, Trash2, Share } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CommentList } from "@/components/snippet/CommentList";
import { StarButton } from "@/components/snippet/StarButton";
import { CodeEditorContainer } from "@/components/editor/CodeEditorContainer";
import { TagDisplay } from "@/components/snippet/TagDisplay";
import { useAuthStore } from "@/stores/authStore";
import { apiClient } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/constants";
import { formatDistanceToNow } from "date-fns";

export default function SnippetDetailPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const snippetId = params.id as string;
  
  // Fetch snippet data
  const { data: snippetResponse, isLoading, error } = useQuery({
    queryKey: ["snippet", snippetId],
    queryFn: async () => {
      const response = await apiClient.get(`${API_ENDPOINTS.SNIPPETS.BASE}/${snippetId}`);
      return response.data;
    },
  });
  
  // Extract snippet from response
  const snippet = snippetResponse?.snippet;

  // Delete snippet mutation
  const deleteSnippet = useMutation({
    mutationFn: async () => {
      return await apiClient.delete(API_ENDPOINTS.SNIPPETS.DETAIL(snippetId));
    },
    onSuccess: () => {
      toast.success("Snippet deleted successfully");
      router.push("/snippets");
      queryClient.invalidateQueries({ queryKey: ["snippets"] });
    },
    onError: () => {
      toast.error("Failed to delete snippet");
      // Handle delete error silently
    },
  });

  // Handle delete confirmation
  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this snippet?")) {
      deleteSnippet.mutate();
    }
  };

  // Handle edit
  const handleEdit = () => {
    router.push(`/editor?snippetId=${snippetId}`);
  };

  // Handle share
  const handleShare = async () => {
    try {
      const url = `${window.location.origin}/snippets/${snippetId}`;
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  // Handle tag click
  const handleTagClick = (tag: string) => {
    router.push(`/snippets?tags=${encodeURIComponent(tag)}`);
  };

  if (isLoading) {
    return (
      <div className="container py-8 text-center">
        <p>Loading snippet...</p>
      </div>
    );
  }

  if (error || !snippet) {
    return (
      <div className="container py-8 text-center">
        <p className="text-destructive">Failed to load snippet. It may have been deleted or you don&apos;t have permission to view it.</p>
        <Button className="mt-4" onClick={() => router.push("/snippets")}>
          Back to Snippets
        </Button>
      </div>
    );
  }

  const isOwner = user?._id === snippet.author?._id;

  return (
    <div className="container py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-heading-3-mobile tablet:text-heading-3-desktop">{snippet.title}</h1>
          <div className="flex items-center space-x-2">
            <StarButton snippetId={snippetId} initialStarCount={snippet.starCount} />
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share className="mr-2 h-4 w-4" />
              Share
            </Button>
            {isOwner && (
              <>
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>
        
        {/* Description */}
        {snippet.description && (
          <p className="text-muted-foreground mb-4">{snippet.description}</p>
        )}
        
        {/* Tags */}
        {snippet.tags && snippet.tags.length > 0 && (
          <div className="mb-4">
            <TagDisplay
              tags={snippet.tags}
              onTagClick={handleTagClick}
              size="md"
              showCount={false}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 desktop:grid-cols-3">
        <div className="desktop:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="rounded bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                {snippet.language}
              </div>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {formatDistanceToNow(new Date(snippet.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <User className="h-4 w-4" />
                  <span>{snippet.author?.name || 'Unknown'}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[500px] overflow-hidden rounded">
                <CodeEditorContainer
                  code={snippet.code}
                  language={snippet.language}
                  readOnly
                  height="100%"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="desktop:col-span-1">
          <CommentList snippetId={snippetId} />
        </div>
      </div>
    </div>
  );
} 