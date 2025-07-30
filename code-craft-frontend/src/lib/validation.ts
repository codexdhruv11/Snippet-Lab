/**
 * Validation utilities for client-side validation
 */

/**
 * MongoDB ObjectId validation pattern
 * Matches 24 character hex string
 */
const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/;

/**
 * Validate if a string is a valid MongoDB ObjectId
 * @param id - The ID to validate
 * @returns True if valid ObjectId, false otherwise
 */
export const isValidObjectId = (id: string | null | undefined): boolean => {
  if (!id || typeof id !== 'string') {
    return false;
  }
  return OBJECT_ID_PATTERN.test(id);
};

/**
 * Validate user ID with detailed error information
 * @param userId - The user ID to validate
 * @returns Object with validation result and error message
 */
export const validateUserId = (userId: string | null | undefined): {
  isValid: boolean;
  error?: string;
} => {
  if (!userId) {
    return { isValid: false, error: 'User ID is required' };
  }

  if (typeof userId !== 'string') {
    return { isValid: false, error: 'User ID must be a string' };
  }

  if (userId.length !== 24) {
    return { isValid: false, error: 'User ID must be exactly 24 characters' };
  }

  if (!OBJECT_ID_PATTERN.test(userId)) {
    return { isValid: false, error: 'User ID contains invalid characters' };
  }

  return { isValid: true };
};

/**
 * Validate pagination parameters
 * @param page - Page number
 * @param limit - Items per page
 * @returns Sanitized pagination parameters
 */
export const validatePagination = (
  page?: number | string | null,
  limit?: number | string | null
): {
  page: number;
  limit: number;
} => {
  // Convert and validate page
  const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
  const validPage = !pageNum || isNaN(pageNum) || pageNum < 1 ? 1 : Math.floor(pageNum);

  // Convert and validate limit
  const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : limit;
  const validLimit = !limitNum || isNaN(limitNum) || limitNum < 1 
    ? 20 
    : Math.min(Math.floor(limitNum), 100); // Max 100 items per page

  return {
    page: validPage,
    limit: validLimit,
  };
};

/**
 * Validate array of user IDs
 * @param userIds - Array of user IDs to validate
 * @returns Object with validation result and invalid IDs
 */
export const validateUserIds = (userIds: string[]): {
  isValid: boolean;
  invalidIds: string[];
  validIds: string[];
} => {
  const invalidIds: string[] = [];
  const validIds: string[] = [];

  for (const id of userIds) {
    if (isValidObjectId(id)) {
      validIds.push(id);
    } else {
      invalidIds.push(id);
    }
  }

  return {
    isValid: invalidIds.length === 0,
    invalidIds,
    validIds,
  };
};

/**
 * Check if two user IDs are the same (case-insensitive)
 * @param id1 - First user ID
 * @param id2 - Second user ID
 * @returns True if IDs are the same
 */
export const isSameUser = (
  id1: string | null | undefined,
  id2: string | null | undefined
): boolean => {
  if (!id1 || !id2) return false;
  return id1.toLowerCase() === id2.toLowerCase();
};

/**
 * Format user ID for display (last 6 characters)
 * @param userId - The user ID to format
 * @returns Formatted user ID or empty string
 */
export const formatUserIdForDisplay = (userId: string | null | undefined): string => {
  if (!isValidObjectId(userId)) return '';
  return `...${userId!.slice(-6)}`;
};
