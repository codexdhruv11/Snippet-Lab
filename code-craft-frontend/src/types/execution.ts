export interface Execution {
  _id: string;
  code: string;
  language: string;
  output?: string;
  error?: string;
  status: 'success' | 'error';
  executionTime: number;
  createdAt: string;
  updatedAt: string;
  userId?: string;
}

export interface ExecutionsResponse {
  executions: Execution[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
