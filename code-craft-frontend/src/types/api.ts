/**
 * User model
 */
export interface User {
  _id: string;
  name: string;
  email: string;
  bio?: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Snippet model
 */
export interface Snippet {
  _id: string;
  title: string;
  description?: string;
  language: string;
  code: string;
  author: {
    _id: string;
    name: string;
  };
  stars: number;
  comments: number;
  isStarred?: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Comment model
 */
export interface Comment {
  _id: string;
  content: string;
  author: {
    _id: string;
    name: string;
    avatar?: string;
  };
  snippet: string;
  createdAt: string;
  updatedAt: string;
  // Thread-related fields
  parentComment?: string;
  depth: number;
  replyCount: number;
  thread?: string;
  lineStart?: number;
  lineEnd?: number;
}

/**
 * Star model
 */
export interface Star {
  _id: string;
  user: string;
  snippet: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Code execution model
 */
export interface CodeExecution {
  _id: string;
  code: string;
  language: string;
  status: 'success' | 'error';
  output: string;
  error?: string;
  executionTime: number;
  user: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Pagination response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalItems: number;
    hasMore: boolean;
  };
}

/**
 * API error response
 */
export interface ApiErrorResponse {
  message: string;
  statusCode: number;
  error: string;
}

/**
 * Authentication response
 */
export interface AuthResponse {
  user: User;
  token: string;
}

/**
 * Execution statistics
 */
export interface ExecutionStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  mostUsedLanguage: string;
}

/**
 * Follow status
 */
export interface FollowStatus {
  isFollowing: boolean;
  followerCount: number;
}

/**
 * User profile with follow information
 */
export interface UserProfile extends User {
  followerCount: number;
  followingCount: number;
  isFollowing?: boolean; // Only present for authenticated users viewing other profiles
}

/**
 * User search result
 */
export interface UserSearchResult {
  _id: string;
  name: string;
  bio?: string;
  avatar?: string;
  followerCount: number;
  followingCount?: number;
  isFollowing?: boolean;
}

/**
 * Follow toggle response
 */
export interface FollowToggleResponse {
  isFollowing: boolean;
  followerCount: number;
}

/**
 * Tag data for popular tags
 */
export interface TagData {
  tag: string;
  count: number;
}

/**
 * Create snippet request
 */
export interface CreateSnippetRequest {
  title: string;
  description?: string;
  language: string;
  code: string;
  tags?: string[];
}

/**
 * Update snippet request
 */
export interface UpdateSnippetRequest {
  title?: string;
  description?: string;
  language?: string;
  code?: string;
  tags?: string[];
}

/**
 * Popular tags response
 */
export interface PopularTagsResponse {
  data: TagData[];
  total: number;
}

/**
 * User search API response
 */
export interface UserSearchResponse {
  data: UserSearchResult[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalItems: number;
    hasMore: boolean;
  };
}

/**
 * Followers/Following API response
 */
export interface FollowersResponse {
  data: UserProfile[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalItems: number;
    hasMore: boolean;
  };
}

export interface FollowingResponse extends FollowersResponse {}

/**
 * Contribution day data
 */
export interface ContributionDay {
  date: string; // YYYY-MM-DD format
  count: number;
}

/**
 * Contribution graph response
 */
export interface ContributionGraphResponse {
  data: ContributionDay[];
  meta?: {
    startDate?: string;
    endDate?: string;
    totalDays?: number;
    activeDays?: number;
    totalContributions?: number;
  };
}

/**
 * Comment thread
 */
export interface CommentThread {
  _id: string;
  rootComment: Comment;
  replies: Comment[];
  totalReplies: number;
  lastActivity: string;
}

/**
 * Notification model
 */
export interface Notification {
  _id: string;
  recipient: string;
  type: 'comment_reply' | 'new_comment' | 'snippet_starred' | 'user_followed';
  read: boolean;
  data: {
    snippetId?: string;
    snippetTitle?: string;
    commentId?: string;
    actorId: string;
    actorName: string;
    actorAvatar?: string;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Notification counts
 */
export interface NotificationCounts {
  total: number;
  unread: number;
  byType: {
    comment_reply: number;
    new_comment: number;
    snippet_starred: number;
    user_followed: number;
  };
}

/**
 * Create comment request with threading support
 */
export interface CreateCommentRequest {
  content: string;
  parentComment?: string;
  lineStart?: number;
  lineEnd?: number;
}

/**
 * Comment with thread context
 */
export interface CommentWithContext extends Comment {
  threadContext: CommentThread;
  highlightedLines?: {
    start: number;
    end: number;
  };
}

/**
 * Threaded comment interface for nested replies
 */
export interface ThreadedComment extends Comment {
  replies?: ThreadedComment[];
}

/**
 * Create reply request
 */
export interface CreateReplyRequest {
  content: string;
  parentCommentId: string;
}

/**
 * Notification response interface
 */
export interface NotificationResponse extends PaginatedResponse<Notification> {}

/**
 * Unread count response
 */
export interface UnreadCountResponse {
  count: number;
}
