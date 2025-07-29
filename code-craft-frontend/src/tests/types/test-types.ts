import { Snippet } from '@/types/api';

export type TestSnippet = Partial<Snippet> & {
  _id: string;
  title: string;
  code: string;
  programmingLanguage: string;
  language: string;
  userName: string;
  author: { name: string; _id: string };
  createdAt: string;
  updatedAt: string;
  stars: number;
  comments: number;
  isStarred: boolean;
};
