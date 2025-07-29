import { ISnippetComment } from '../models/SnippetComment';

declare global {
  namespace Express {
    interface Request {
      parentComment?: ISnippetComment;
    }
  }
}

export {};
