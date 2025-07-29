"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/stores/authStore";
import { commentApi } from "@/lib/api";
import { API_LIMITS } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";
import { CommentItem } from './CommentItem';
import { ThreadedCommentItem } from './ThreadedCommentItem';
import { ThreadedComment } from '@/types/api';
import { MessageSquare, List } from 'lucide-react';

interface CommentListProps {
  snippetId: string;
}

export function CommentList({ snippetId }: CommentListProps) {
  const [comment, setComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [viewMode, setViewMode] = useState<'flat' | 'threaded'>('threaded');
  const { user, isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();

  // Fetch comments based on view mode
  const { data: commentsData, isLoading, error } = useQuery({
    queryKey: ["comments", snippetId, viewMode],
    queryFn: () => viewMode === 'threaded' 
      ? commentApi.getThreadedComments(snippetId)
      : commentApi.getComments(snippetId),
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
  });

  // Add comment mutation
  const addComment = useMutation({
    mutationFn: async (content: string) => {
      return await commentApi.createComment(snippetId, content);
    },
    onSuccess: () => {
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["comments", snippetId] });
      toast.success("Comment added");
    },
    onError: () => {
      toast.error("Failed to add comment");
    },
  });

  // Update comment mutation
  const updateComment = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      return await commentApi.updateComment(commentId, content);
    },
    onSuccess: () => {
      setEditingCommentId(null);
      queryClient.invalidateQueries({ queryKey: ["comments", snippetId] });
      toast.success("Comment updated");
    },
    onError: () => {
      toast.error("Failed to update comment");
    },
  });

  // Delete comment mutation
  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      return await commentApi.deleteComment(commentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", snippetId] });
      toast.success("Comment deleted");
    },
    onError: () => {
      toast.error("Failed to delete comment");
    },
  });

  // Handle comment submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    addComment.mutate(comment);
  };

  // Handle edit start
  const handleEditStart = (commentId: string, content: string) => {
    setEditingCommentId(commentId);
    setEditingContent(content);
  };

  // Handle edit save
  const handleEditSave = (commentId: string) => {
    if (!editingContent.trim()) return;
    updateComment.mutate({ commentId, content: editingContent });
  };

  // Handle comment delete
  const handleDelete = (commentId: string) => {
    if (confirm("Are you sure you want to delete this comment?")) {
      deleteComment.mutate(commentId);
    }
  };

  // Handle reply submission
  const handleReply = (parentCommentId: string) => {
    queryClient.invalidateQueries({ queryKey: ["comments", "threaded", snippetId] });
  };

  const comments = commentsData?.data || [];
  const commentCount = commentsData?.pagination?.total || 0;
  const hasMore = commentsData?.pagination?.hasNext || false;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Comments ({commentCount})</CardTitle>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'flat' | 'threaded')}>
            <TabsList className="grid w-[200px] grid-cols-2">
              <TabsTrigger value="threaded">
                <MessageSquare className="h-4 w-4 mr-1" />
                Threaded
              </TabsTrigger>
              <TabsTrigger value="flat">
                <List className="h-4 w-4 mr-1" />
                Flat
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Comment form for authenticated users */}
        {isAuthenticated ? (
          <form onSubmit={handleSubmit} className="space-y-2">
            <Textarea
              placeholder="Add a comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={API_LIMITS.COMMENT_MAX_LENGTH}
              className="min-h-[100px]"
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">
                {comment.length}/{API_LIMITS.COMMENT_MAX_LENGTH}
              </span>
              <Button 
                type="submit" 
                disabled={!comment.trim() || addComment.isPending}
                aria-busy={addComment.isPending}
              >
                {addComment.isPending ? "Posting..." : "Post Comment"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-2">Sign in to leave a comment</p>
            <Button onClick={() => router.push("/login")}>
              Sign In
            </Button>
          </div>
        )}

        {/* Comments list */}
        <div className="space-y-4 mt-6">
          {isLoading ? (
            <p className="text-center py-4">Loading comments...</p>
          ) : comments.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">
              No comments yet. Be the first to comment!
            </p>
          ) : (
            <AnimatePresence mode="wait">
              {viewMode === 'flat' ? (
                // Flat view
                comments.map((comment: any) =>
                  <motion.div
                    key={comment._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="border rounded-md p-4"
                  >
                    <CommentItem
                      comment={comment}
                      currentUserId={user?._id}
                      isEditing={editingCommentId === comment._id}
                      editingContent={editingContent}
                      onEditStart={handleEditStart}
                      onEditSave={handleEditSave}
                      onEditCancel={() => setEditingCommentId(null)}
                      onEditContentChange={setEditingContent}
                      onDelete={handleDelete}
                      isPending={updateComment.isPending}
                    />
                  </motion.div>
                )
              ) : (
                // Threaded view
                (comments as ThreadedComment[]).map((comment) => (
                  <motion.div
                    key={comment._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <ThreadedCommentItem
                      comment={comment}
                      currentUserId={user?._id}
                      snippetId={snippetId}
                      onReply={handleReply}
                      onEdit={handleEditStart}
                      onDelete={handleDelete}
                      isEditing={editingCommentId === comment._id}
                      editingCommentId={editingCommentId}
                      editingContent={editingContent}
                      onEditStart={handleEditStart}
                      onEditSave={handleEditSave}
                      onEditCancel={() => setEditingCommentId(null)}
                      onEditContentChange={setEditingContent}
                      isPending={updateComment.isPending}
                    />
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          )}
        </div>
      </CardContent>

      {hasMore && (
        <CardFooter>
          <Button variant="outline" className="w-full">
            Load More Comments
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
