import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { commentApi } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface ReplyBoxProps {
  parentCommentId: string;
  snippetId: string;
  onReplySuccess?: () => void;
  onCancel?: () => void;
}

const MAX_REPLY_LENGTH = 500;

export function ReplyBox({ 
  parentCommentId, 
  snippetId, 
  onReplySuccess, 
  onCancel 
}: ReplyBoxProps) {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  // Auto-focus textarea when component mounts
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Create reply mutation
  const createReplyMutation = useMutation({
    mutationFn: () => commentApi.createReply(snippetId, parentCommentId, content),
    onSuccess: () => {
      toast.success('Reply posted successfully');
      setContent('');
      queryClient.invalidateQueries({ queryKey: ['comments', 'threaded', snippetId] });
      queryClient.invalidateQueries({ queryKey: ['comments', snippetId] });
      onReplySuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to post reply');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast.error('Reply cannot be empty');
      return;
    }

    if (content.length > MAX_REPLY_LENGTH) {
      toast.error(`Reply must be less than ${MAX_REPLY_LENGTH} characters`);
      return;
    }

    createReplyMutation.mutate();
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd + Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e);
    }
    
    // Escape to cancel
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel?.();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a reply..."
          className="min-h-[80px] resize-none pr-20"
          disabled={createReplyMutation.isPending}
        />
        <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
          {content.length}/{MAX_REPLY_LENGTH}
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Press Ctrl+Enter to submit, Esc to cancel
        </span>
        
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={createReplyMutation.isPending}
          >
            Cancel
          </Button>
          
          <Button
            type="submit"
            size="sm"
            disabled={!content.trim() || content.length > MAX_REPLY_LENGTH || createReplyMutation.isPending}
          >
            {createReplyMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Posting...
              </>
            ) : (
              'Reply'
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
