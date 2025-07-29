import React, { useState } from 'react';
import { User, Edit, Trash2, MessageSquare, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useRelativeDate } from '@/lib/date-utils';
import { API_LIMITS } from '@/lib/constants';
import { ReplyBox } from './ReplyBox';
import { cn } from '@/lib/utils';
import { ThreadedComment } from '@/types/api';
import { motion, AnimatePresence } from 'framer-motion';

interface ThreadedCommentItemProps {
  comment: ThreadedComment;
  currentUserId?: string;
  snippetId: string;
  depth?: number;
  maxDepth?: number;
  onReply?: (parentCommentId: string) => void;
  onEdit: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  isEditing: boolean;
  editingCommentId?: string | null;
  editingContent: string;
  onEditStart: (commentId: string, content: string) => void;
  onEditSave: (commentId: string) => void;
  onEditCancel: () => void;
  onEditContentChange: (content: string) => void;
  isPending?: boolean;
}

export function ThreadedCommentItem({
  comment,
  currentUserId,
  snippetId,
  depth = 0,
  maxDepth = API_LIMITS.MAX_COMMENT_DEPTH,
  onReply,
  onEdit,
  onDelete,
  isEditing,
  editingCommentId,
  editingContent,
  onEditStart,
  onEditSave,
  onEditCancel,
  onEditContentChange,
  isPending = false
}: ThreadedCommentItemProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [showReplies, setShowReplies] = useState(true);
  const relativeDate = useRelativeDate(comment.createdAt);
  const isAuthor = currentUserId === comment.author._id;
  const hasReplies = comment.replies && comment.replies.length > 0;
  const canReply = depth < maxDepth;

  const handleReplyClick = () => {
    setIsReplying(true);
  };

  const handleReplySuccess = () => {
    setIsReplying(false);
    if (onReply) {
      onReply(comment._id);
    }
  };

  const handleReplyCancel = () => {
    setIsReplying(false);
  };

  return (
    <div className={cn("group", depth > 0 && "ml-8")}>
      {/* Thread line indicator */}
      {depth > 0 && (
        <div className="absolute left-0 top-0 bottom-0 w-px bg-border ml-4" />
      )}

      <div className="relative">
        {/* Comment content */}
        <div className="border rounded-md p-4 bg-card">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center">
              <User className="h-4 w-4 mr-2" />
              <span className="font-medium">{comment.author.name}</span>
              {depth > 0 && (
                <span className="text-xs text-muted-foreground ml-2">• Reply</span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {relativeDate}
            </span>
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editingContent}
                onChange={(e) => onEditContentChange(e.target.value)}
                maxLength={API_LIMITS.COMMENT_MAX_LENGTH}
                className="min-h-[80px]"
              />
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEditCancel}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => onEditSave(comment._id)}
                  disabled={isPending}
                >
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm">{comment.content}</p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center space-x-2">
              {canReply && !isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReplyClick}
                  className="h-7 text-xs"
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Reply
                </Button>
              )}
              
              {hasReplies && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReplies(!showReplies)}
                  className="h-7 text-xs"
                >
                  {showReplies ? (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      Hide {comment.replies!.length} {comment.replies!.length === 1 ? 'reply' : 'replies'}
                    </>
                  ) : (
                    <>
                      <ChevronRight className="h-3 w-3 mr-1" />
                      Show {comment.replies!.length} {comment.replies!.length === 1 ? 'reply' : 'replies'}
                    </>
                  )}
                </Button>
              )}
            </div>

            {isAuthor && !isEditing && (
              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEditStart(comment._id, comment.content)}
                  className="h-7 text-xs"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-destructive hover:text-destructive"
                  onClick={() => onDelete(comment._id)}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Reply box */}
        <AnimatePresence>
          {isReplying && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 ml-8"
            >
              <ReplyBox
                parentCommentId={comment._id}
                snippetId={snippetId}
                onReplySuccess={handleReplySuccess}
                onCancel={handleReplyCancel}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nested replies */}
        <AnimatePresence>
          {hasReplies && showReplies && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-3 space-y-3"
            >
              {comment.replies!.map((reply) => (
                <ThreadedCommentItem
                  key={reply._id}
                  comment={reply}
                  currentUserId={currentUserId}
                  snippetId={snippetId}
                  depth={depth + 1}
                  maxDepth={maxDepth}
                  onReply={onReply}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  isEditing={editingCommentId === reply._id}
                  editingCommentId={editingCommentId}
                  editingContent={editingContent}
                  onEditStart={onEditStart}
                  onEditSave={onEditSave}
                  onEditCancel={onEditCancel}
                  onEditContentChange={onEditContentChange}
                  isPending={isPending}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
