// Export all models from a central location
export { User, IUser, UserModel } from './User';
export { Snippet, ISnippet, SnippetModel } from './Snippet';
export { CodeExecution, ICodeExecution, CodeExecutionModel } from './CodeExecution';
export { SnippetComment, ISnippetComment, SnippetCommentModel } from './SnippetComment';
export { Star, IStar, StarModel } from './Star';
export { Follow, IFollow, FollowModel } from './Follow';
export { Notification, INotification, NotificationModel } from './Notification';

// Re-export mongoose types for convenience
export { Document, Schema, Types } from 'mongoose';
