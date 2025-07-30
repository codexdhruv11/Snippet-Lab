// Language configuration for code execution
export interface LanguageConfig {
  id: string;
  label: string;
  pistonRuntime: {
    language: string;
    version: string;
  };
  monacoLanguage: string;
  icon: string;
}

// Supported languages - ALL available to ALL authenticated users (no premium restrictions)
export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  {
    id: 'javascript',
    label: 'JavaScript',
    pistonRuntime: { language: 'javascript', version: '18.15.0' },
    monacoLanguage: 'javascript',
    icon: '🟨'
  },
  {
    id: 'typescript',
    label: 'TypeScript',
    pistonRuntime: { language: 'typescript', version: '5.0.3' },
    monacoLanguage: 'typescript',
    icon: '🔷'
  },
  {
    id: 'python',
    label: 'Python',
    pistonRuntime: { language: 'python', version: '3.10.0' },
    monacoLanguage: 'python',
    icon: '🐍'
  },
  {
    id: 'java',
    label: 'Java',
    pistonRuntime: { language: 'java', version: '15.0.2' },
    monacoLanguage: 'java',
    icon: '☕'
  },
  {
    id: 'go',
    label: 'Go',
    pistonRuntime: { language: 'go', version: '1.16.2' },
    monacoLanguage: 'go',
    icon: '🐹'
  },
  {
    id: 'rust',
    label: 'Rust',
    pistonRuntime: { language: 'rust', version: '1.68.2' },
    monacoLanguage: 'rust',
    icon: '🦀'
  },
  {
    id: 'cpp',
    label: 'C++',
    pistonRuntime: { language: 'cpp', version: '10.2.0' },
    monacoLanguage: 'cpp',
    icon: '⚡'
  },
  {
    id: 'csharp',
    label: 'C#',
    pistonRuntime: { language: 'csharp', version: '6.12.0' },
    monacoLanguage: 'csharp',
    icon: '💜'
  },
  {
    id: 'ruby',
    label: 'Ruby',
    pistonRuntime: { language: 'ruby', version: '3.0.1' },
    monacoLanguage: 'ruby',
    icon: '💎'
  },
  {
    id: 'swift',
    label: 'Swift',
    pistonRuntime: { language: 'swift', version: '5.3.3' },
    monacoLanguage: 'swift',
    icon: '🍎'
  }
];

import { config } from '../config/env';

// API Constants
export const API_CONSTANTS = {
  // External URLs should be configured via environment variables for security
  PISTON_API_URL: config.pistonApiUrl || 'https://emkc.org/api/v2/piston/execute',
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MAX_CODE_LENGTH: 50000,
  MAX_COMMENT_LENGTH: 1000,
  MAX_TITLE_LENGTH: 100,
  EXECUTION_TIMEOUT: 30000, // 30 seconds
  // Tag-related constants
  MAX_TAGS_PER_SNIPPET: 10,
  MAX_TAG_LENGTH: 30,
  MIN_TAG_LENGTH: 2,
  // Comment threading constants
  MAX_COMMENT_DEPTH: 5,
  MAX_REPLIES_PER_COMMENT: 100,
  DEFAULT_THREAD_LIMIT: 50,
  // Notifications
  NOTIFICATION_TYPES: {
    FOLLOW: 'FOLLOW',
    COMMENT: 'COMMENT',
    REPLY: 'REPLY',
    NEW_SNIPPET: 'NEW_SNIPPET',
  } as const,
  MAX_NOTIFICATIONS_PER_PAGE: 50,
  NOTIFICATION_DATA_MAX_SIZE: 1000,
  MAX_NOTIFICATION_AGE_DAYS: 90,
} as const;

// Rate Limiting Configuration
export const RATE_LIMITS = {
  CODE_EXECUTION: {
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
  },
  SNIPPET_CREATION: {
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 requests per minute
  },
  COMMENT_CREATION: {
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 requests per minute
  },
  GENERAL_API: {
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
  },
  NOTIFICATION_FETCH: {
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
  },
} as const;

// Error Codes
export const ERROR_CODES = {
  // Authentication
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_LANGUAGE: 'INVALID_LANGUAGE',
  INVALID_INPUT: 'INVALID_INPUT',
  
  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  
  // Server
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Helper function to get language by ID
export const getLanguageById = (id: string): LanguageConfig | undefined => {
  return SUPPORTED_LANGUAGES.find(lang => lang.id === id);
};

// Helper function to validate language
export const isValidLanguage = (id: string): boolean => {
  return SUPPORTED_LANGUAGES.some(lang => lang.id === id);
};

// Get all supported language IDs
export const getSupportedLanguageIds = (): string[] => {
  return SUPPORTED_LANGUAGES.map(lang => lang.id);
};