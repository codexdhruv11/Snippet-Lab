import React, { useState } from 'react';
import { User, Edit, Trash2, MessageSquare, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useRelativeDate } from '@/lib/date-utils';
import { API_LIMITS } from '@/lib/constants';
import { ReplyBox } from './ReplyBox';
import { cn } from '@/lib/utils';
import { ThreadedComment } from '@/types/api';

interface CommentItemProps {
  comment: {
    _id: string;
    userId?: string | { _id: string; name: string };
    userName?: string;
    content: string;
    createdAt: string;
  };
  currentUserId?: string;
  isEditing: boolean;
  editingContent: string;
  onEditStart: (commentId: string, content: string) => void;
  onEditSave: (commentId: string) => void;
  onEditCancel: () => void;
  onEditContentChange: (content: string) => void;
  onDelete: (commentId: string) => void;
  isPending?: boolean;
}

export function CommentItem({
  comment,
  currentUserId,
  isEditing,
  editingContent,
  onEditStart,
  onEditSave,
  onEditCancel,
  onEditContentChange,
  onDelete,
  isPending = false
}: CommentItemProps) {
  const relativeDate = useRelativeDate(comment.createdAt);
  const isAuthor = currentUserId === (typeof comment.userId === 'object' ? comment.userId._id : comment.userId);

  return (
    <>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center">
          <User className="h-4 w-4 mr-2" />
          <span className="font-medium">{comment.userName || (typeof comment.userId === 'object' ? comment.userId.name : '')}</span>
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
        <p>{comment.content}</p>
      )}

      {/* Comment actions for author */}
      {isAuthor && !isEditing && (
        <div className="flex justify-end space-x-2 mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEditStart(comment._id, comment.content)}
          >
            <Edit className="h-3 w-3 mr-1" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => onDelete(comment._id)}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Delete
          </Button>
        </div>
      )}
    </>
  );
}
