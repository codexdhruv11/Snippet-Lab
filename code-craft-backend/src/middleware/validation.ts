import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { getSupportedLanguageIds, API_CONSTANTS, HTTP_STATUS, ERROR_CODES } from '../utils/constants';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { normalizeTags } from '../utils/tagNormalization';
import { SnippetComment } from '../models/SnippetComment';

// Setup DOMPurify for server-side HTML sanitization
const window = new JSDOM('').window;
const purify = DOMPurify(window as any);

// Middleware to handle validation errors
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: {
        message: 'Validation failed',
        code: ERROR_CODES.VALIDATION_ERROR,
        details: errors.array(),
      },
    });
    return;
  }
  
  next();
};

// User search validation
export const validateUserSearch = [
  query('q')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters')
    .custom((value) => {
      // Check for meaningful content (not just whitespace)
      if (!value || value.trim().length === 0) {
        throw new Error('Search query cannot be empty or contain only whitespace');
      }
      // Check for very short queries that might return too many results
      if (value.trim().length < 2) {
        throw new Error('Search query must be at least 2 characters long');
      }
      // Check for excessive special characters that might break search
      const specialCharCount = (value.match(/[^a-zA-Z0-9\s]/g) || []).length;
      if (specialCharCount > value.length / 2) {
        throw new Error('Search query contains too many special characters');
      }
      return true;
    })
    .customSanitizer((value) => {
      // Sanitize to prevent XSS and normalize whitespace
      const sanitized = purify.sanitize(value || '', {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
      });
      // Normalize multiple spaces to single space
      return sanitized.replace(/\s+/g, ' ').trim();
    }),
  handleValidationErrors,
];

// Authentication validation
export const validateRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),
  body('password')
    .isLength({ min: 12 })
    .withMessage('Password must be at least 12 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;':",./<>?])/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character')
    .custom((value) => {
      // Additional password complexity checks
      // Check for sequential characters (e.g., 123, abc)
      const hasSequential = /(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(value);
      if (hasSequential) {
        throw new Error('Password must not contain sequential characters');
      }
      
      // Check for repeated characters (e.g., aaa, 111)
      const hasRepeated = /(.)\1{2,}/.test(value);
      if (hasRepeated) {
        throw new Error('Password must not contain 3 or more repeated characters');
      }
      
      // Check for common passwords patterns
      const commonPatterns = ['password', 'qwerty', 'admin', 'letmein', 'welcome', 'monkey', 'dragon'];
      const lowerValue = value.toLowerCase();
      if (commonPatterns.some(pattern => lowerValue.includes(pattern))) {
        throw new Error('Password is too common or predictable');
      }
      
      return true;
    }),
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  handleValidationErrors,
];

export const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors,
];

// User validation
// Password change validation
export const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 12 })
    .withMessage('New password must be at least 12 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;':",./<>?])/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, one number, and one special character')
    .custom((value, { req }) => {
      // Ensure new password is different from current password
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      
      // Apply same complexity checks as registration
      const hasSequential = /(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(value);
      if (hasSequential) {
        throw new Error('Password must not contain sequential characters');
      }
      
      const hasRepeated = /(.)\1{2,}/.test(value);
      if (hasRepeated) {
        throw new Error('Password must not contain 3 or more repeated characters');
      }
      
      const commonPatterns = ['password', 'qwerty', 'admin', 'letmein', 'welcome', 'monkey', 'dragon'];
      const lowerValue = value.toLowerCase();
      if (commonPatterns.some(pattern => lowerValue.includes(pattern))) {
        throw new Error('Password is too common or predictable');
      }
      
      return true;
    }),
  handleValidationErrors,
];

export const validateUserUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters')
    .customSanitizer((value) => {
      // Sanitize HTML content to prevent XSS
      return purify.sanitize(value || '', {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
      });
    }),
  handleValidationErrors,
];

// Snippet validation
export const validateSnippetCreation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: API_CONSTANTS.MAX_TITLE_LENGTH })
    .withMessage(`Title must be between 1 and ${API_CONSTANTS.MAX_TITLE_LENGTH} characters`),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters')
    .customSanitizer((value) => {
      // Sanitize HTML content to prevent XSS
      return purify.sanitize(value || '', {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
      });
    }),
  body('language')
    .isIn(getSupportedLanguageIds())
    .withMessage(`Language must be one of: ${getSupportedLanguageIds().join(', ')}`),
  body('code')
    .isLength({ min: 1, max: API_CONSTANTS.MAX_CODE_LENGTH })
    .withMessage(`Code must be between 1 and ${API_CONSTANTS.MAX_CODE_LENGTH} characters`),
  body('tags')
    .optional()
    .isArray({ max: API_CONSTANTS.MAX_TAGS_PER_SNIPPET })
    .withMessage(`Maximum ${API_CONSTANTS.MAX_TAGS_PER_SNIPPET} tags allowed`)
    .custom((tags) => {
      if (!Array.isArray(tags)) return true;
      // Check each tag is a string
      if (!tags.every(tag => typeof tag === 'string')) {
        throw new Error('All tags must be strings');
      }
      // Check tag lengths
      const invalidTags = tags.filter(
        tag => tag.trim().length < API_CONSTANTS.MIN_TAG_LENGTH || 
               tag.trim().length > API_CONSTANTS.MAX_TAG_LENGTH
      );
      if (invalidTags.length > 0) {
        throw new Error(`Each tag must be between ${API_CONSTANTS.MIN_TAG_LENGTH} and ${API_CONSTANTS.MAX_TAG_LENGTH} characters`);
      }
      return true;
    })
    .customSanitizer((tags) => {
      if (!Array.isArray(tags)) return [];
      // Use the shared normalizeTags function to ensure consistency
      return normalizeTags(tags);
    }),
  handleValidationErrors,
];

export const validateSnippetUpdate = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: API_CONSTANTS.MAX_TITLE_LENGTH })
    .withMessage(`Title must be between 1 and ${API_CONSTANTS.MAX_TITLE_LENGTH} characters`),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters')
    .customSanitizer((value) => {
      // Sanitize HTML content to prevent XSS
      return purify.sanitize(value || '', {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
      });
    }),
  body('language')
    .optional()
    .isIn(getSupportedLanguageIds())
    .withMessage(`Language must be one of: ${getSupportedLanguageIds().join(', ')}`),
  body('code')
    .optional()
    .isLength({ min: 1, max: API_CONSTANTS.MAX_CODE_LENGTH })
    .withMessage(`Code must be between 1 and ${API_CONSTANTS.MAX_CODE_LENGTH} characters`),
  body('tags')
    .optional()
    .isArray({ max: API_CONSTANTS.MAX_TAGS_PER_SNIPPET })
    .withMessage(`Maximum ${API_CONSTANTS.MAX_TAGS_PER_SNIPPET} tags allowed`)
    .custom((tags) => {
      if (!Array.isArray(tags)) return true;
      // Check each tag is a string
      if (!tags.every(tag => typeof tag === 'string')) {
        throw new Error('All tags must be strings');
      }
      // Check tag lengths
      const invalidTags = tags.filter(
        tag => tag.trim().length < API_CONSTANTS.MIN_TAG_LENGTH || 
               tag.trim().length > API_CONSTANTS.MAX_TAG_LENGTH
      );
      if (invalidTags.length > 0) {
        throw new Error(`Each tag must be between ${API_CONSTANTS.MIN_TAG_LENGTH} and ${API_CONSTANTS.MAX_TAG_LENGTH} characters`);
      }
      return true;
    })
    .customSanitizer((tags) => {
      if (!Array.isArray(tags)) return [];
      // Use the shared normalizeTags function to ensure consistency
      return normalizeTags(tags);
    }),
  handleValidationErrors,
];

// Comment validation
export const validateCommentCreation = [
  body('content')
    .trim()
    .isLength({ min: 1, max: API_CONSTANTS.MAX_COMMENT_LENGTH })
    .withMessage(`Comment must be between 1 and ${API_CONSTANTS.MAX_COMMENT_LENGTH} characters`)
    .customSanitizer((value) => {
      // Sanitize HTML content to prevent XSS
      return purify.sanitize(value, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'code', 'pre'],
        ALLOWED_ATTR: [],
      });
    }),
  handleValidationErrors,
];

export const validateCommentUpdate = [
  body('content')
    .trim()
    .isLength({ min: 1, max: API_CONSTANTS.MAX_COMMENT_LENGTH })
    .withMessage(`Comment must be between 1 and ${API_CONSTANTS.MAX_COMMENT_LENGTH} characters`)
    .customSanitizer((value) => {
      return purify.sanitize(value, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'code', 'pre'],
        ALLOWED_ATTR: [],
      });
    }),
  handleValidationErrors,
];

// Reply validation
export const validateReplyCreation = [
  body('content')
    .trim()
    .isLength({ min: 1, max: API_CONSTANTS.MAX_COMMENT_LENGTH })
    .withMessage(`Reply must be between 1 and ${API_CONSTANTS.MAX_COMMENT_LENGTH} characters`)
    .customSanitizer((value) => {
      return purify.sanitize(value, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'code', 'pre'],
        ALLOWED_ATTR: [],
      });
    }),
  param('commentId')
    .isMongoId()
    .withMessage('commentId must be a valid MongoDB ObjectId')
    .custom(async (commentId, { req }) => {
      // Check if parent comment exists
      const parentComment = await SnippetComment.findById(commentId);
      if (!parentComment) {
        throw new Error('Parent comment not found');
      }
      
      // Check if parent comment belongs to the same snippet
      const snippetId = req.params?.id;
      if (!snippetId || parentComment.snippetId.toString() !== snippetId) {
        throw new Error('Parent comment does not belong to this snippet');
      }
      
      // Check nesting depth
      const depth = await SnippetComment.getCommentDepth(commentId);
      if (depth >= API_CONSTANTS.MAX_COMMENT_DEPTH) {
        throw new Error(`Cannot create replies deeper than ${API_CONSTANTS.MAX_COMMENT_DEPTH} levels`);
      }
      
      // Store parent comment in request for later use
      req.parentComment = parentComment;
      return true;
    }),
  handleValidationErrors,
];

// Threaded comments validation
export const validateThreadedComments = [
  query('includeReplies')
    .optional()
    .isBoolean()
    .withMessage('includeReplies must be a boolean')
    .toBoolean(),
  query('maxDepth')
    .optional()
    .isInt({ min: 1, max: API_CONSTANTS.MAX_COMMENT_DEPTH })
    .withMessage(`maxDepth must be between 1 and ${API_CONSTANTS.MAX_COMMENT_DEPTH}`)
    .toInt(),
  query('sortOrder')
    .optional()
    .isIn(['newest', 'oldest'])
    .withMessage('sortOrder must be either "newest" or "oldest"'),
  handleValidationErrors,
];

// Code execution validation
export const validateCodeExecution = [
  body('language')
    .isIn(getSupportedLanguageIds())
    .withMessage(`Language must be one of: ${getSupportedLanguageIds().join(', ')}`),
  body('code')
    .isLength({ min: 1, max: API_CONSTANTS.MAX_CODE_LENGTH })
    .withMessage(`Code must be between 1 and ${API_CONSTANTS.MAX_CODE_LENGTH} characters`),
  handleValidationErrors,
];

// Contribution graph validation
export const validateContributionGraph = [
  query('startDate')
    .optional()
    .isISO8601({ strict: true })
    .withMessage('startDate must be a valid ISO8601 date string (YYYY-MM-DD format)')
    .custom((startDate) => {
      const date = new Date(startDate);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid start date');
      }
      return true;
    }),
  query('endDate')
    .optional()
    .isISO8601({ strict: true })
    .withMessage('endDate must be a valid ISO8601 date string (YYYY-MM-DD format)')
    .custom((endDate, { req }) => {
      const date = new Date(endDate);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid end date');
      }
      
      // Check if startDate is provided and validate the range
      const startDate = req.query?.startDate;
      if (startDate) {
        const start = new Date(startDate as string);
        const end = new Date(endDate);
        
        if (start >= end) {
          throw new Error('endDate must be after startDate');
        }
        
        // Check for maximum 2 year range
        const twoYearsInMs = 2 * 365 * 24 * 60 * 60 * 1000;
        if (end.getTime() - start.getTime() > twoYearsInMs) {
          throw new Error('Date range cannot exceed 2 years');
        }
      }
      
      return true;
    }),
  handleValidationErrors,
];

// Pagination validation
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: API_CONSTANTS.MAX_PAGE_SIZE })
    .withMessage(`Limit must be between 1 and ${API_CONSTANTS.MAX_PAGE_SIZE}`)
    .toInt(),
  handleValidationErrors,
];

// Notification validation
export const validateNotificationFetch = [
  query('unreadOnly')
    .optional()
    .isBoolean()
    .withMessage('unreadOnly must be a boolean')
    .toBoolean(),
  handleValidationErrors,
];

export const validateMarkAsRead = [
  param('id')
    .isMongoId()
    .withMessage('Notification ID must be a valid MongoDB ObjectId'),
  handleValidationErrors,
];

// Helper for validating notification data field size and content
export const validateNotificationData = (data: any): boolean => {
  if (!data || typeof data !== 'object') return false;
  
  // Check data size
  const dataStr = JSON.stringify(data);
  if (dataStr.length > API_CONSTANTS.NOTIFICATION_DATA_MAX_SIZE) {
    return false;
  }
  
  // Sanitize any string values in the data object
  for (const key in data) {
    if (typeof data[key] === 'string') {
      data[key] = purify.sanitize(data[key], {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
      });
    }
  }
  
  return true;
};

// MongoDB ObjectId validation
export const validateObjectId = (paramName: string) => [
  param(paramName)
    .isMongoId()
    .withMessage(`${paramName} must be a valid MongoDB ObjectId`),
  handleValidationErrors,
];

// Search validation
export const validateSearch = [
  query('search')
    .optional()
    .trim()
    .custom((value) => {
      // Allow empty string or values between 1-100 characters
      if (value === '' || value === undefined) return true;
      return value.length >= 1 && value.length <= 100;
    })
    .withMessage('Search query must be between 1 and 100 characters'),
  query('language')
    .optional()
    .custom((value) => {
      // Allow empty string for "all languages"
      if (value === '' || value === undefined) return true;
      return getSupportedLanguageIds().includes(value);
    })
    .withMessage(`Language filter must be empty or one of: ${getSupportedLanguageIds().join(', ')}`),
  query('tags')
    .optional()
    .custom((value) => {
      if (value === '' || value === undefined) return true;
      // Accept comma-separated string of tags
      if (typeof value === 'string') {
        const tags = value.split(',').map(t => t.trim());
        // Check maximum number of tags in filter
        if (tags.length > API_CONSTANTS.MAX_TAGS_PER_SNIPPET) {
          return false;
        }
        // Check if all tags are valid
        return tags.every(tag => 
          tag.length >= API_CONSTANTS.MIN_TAG_LENGTH && 
          tag.length <= API_CONSTANTS.MAX_TAG_LENGTH
        );
      }
      return false;
    })
    .withMessage(`Tags must be a comma-separated string with each tag between ${API_CONSTANTS.MIN_TAG_LENGTH}-${API_CONSTANTS.MAX_TAG_LENGTH} characters and maximum ${API_CONSTANTS.MAX_TAGS_PER_SNIPPET} tags`)
    .customSanitizer((value) => {
      if (!value || value === '') return undefined;
      // Convert comma-separated string to array and sanitize
      return value.split(',').map((tag: string) => 
        purify.sanitize(tag.trim().toLowerCase(), {
          ALLOWED_TAGS: [],
          ALLOWED_ATTR: [],
        })
      ).filter((tag: string) => tag.length > 0);
    }),
  handleValidationErrors,
];

// Language validation helper
export const validateLanguage = (req: Request, res: Response, next: NextFunction): void => {
  const { language } = req.body;
  
  if (!getSupportedLanguageIds().includes(language)) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: {
        message: `Unsupported language: ${language}`,
        code: ERROR_CODES.INVALID_LANGUAGE,
        details: {
          supportedLanguages: getSupportedLanguageIds(),
        },
      },
    });
    return;
  }
  
  next();
};