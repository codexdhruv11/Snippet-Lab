import { API_LIMITS } from '@/lib/constants';

/**
 * Validate a single tag
 */
export const validateTag = (tag: string): { isValid: boolean; error?: string } => {
  if (!tag || typeof tag !== 'string') {
    return { isValid: false, error: 'Tag is required' };
  }

  const trimmedTag = tag.trim();
  
  if (trimmedTag.length < API_LIMITS.MIN_TAG_LENGTH) {
    return { isValid: false, error: `Tag must be at least ${API_LIMITS.MIN_TAG_LENGTH} characters` };
  }
  
  if (trimmedTag.length > API_LIMITS.MAX_TAG_LENGTH) {
    return { isValid: false, error: `Tag must be no more than ${API_LIMITS.MAX_TAG_LENGTH} characters` };
  }
  
  // Improved regex validation for alphanumeric, hyphens, underscores, periods, and dashes
  if (!/^[a-zA-Z0-9._-]+$/.test(trimmedTag)) {
    return { isValid: false, error: 'Tag can only contain letters, numbers, hyphens, underscores, periods, and dashes' };
  }
  
  const reservedKeywords = ['admin', 'null', 'undefined'];
  if (reservedKeywords.includes(trimmedTag.toLowerCase())) {
    return { isValid: false, error: 'Tag is a reserved keyword' };
  }

  return { isValid: true };
};

/**
 * Normalize and validate an array of tags
 */
export const normalizeTags = (tags: string[]): string[] => {
  if (!Array.isArray(tags)) return [];
  
  const normalized = tags
    .map(tag => tag.trim().toLowerCase())
    .filter(tag => tag.length > 0)
    .filter((tag, index, arr) => arr.indexOf(tag) === index); // Remove duplicates
  
  return normalized.slice(0, API_LIMITS.MAX_TAGS_PER_SNIPPET);
};

/**
 * Format tags for URL parameters
 */
export const formatTagsForUrl = (tags: string[]): string => {
  return tags.join(',');
};

/**
 * Parse tags from URL parameters
 */
export const parseTagsFromUrl = (urlParams: string): string[] => {
  if (!urlParams) return [];
  return urlParams.split(',').filter(tag => tag.trim().length > 0);
};

/**
 * Get a consistent color for a tag (for visual consistency)
 */
export const getTagColor = (tag: string): string => {
  const colors = [
    'bg-blue-100 text-blue-800',
    'bg-green-100 text-green-800',
    'bg-yellow-100 text-yellow-800',
    'bg-red-100 text-red-800',
    'bg-purple-100 text-purple-800',
    'bg-pink-100 text-pink-800',
    'bg-indigo-100 text-indigo-800',
    'bg-gray-100 text-gray-800',
  ];
  
  // Simple hash function to get consistent color for same tag
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = ((hash << 5) - hash + tag.charCodeAt(i)) & 0xffffffff;
  }
  
  return colors[Math.abs(hash) % colors.length];
};

/**
 * Filter tags by search query
 */
export const filterTagsByQuery = (tags: string[], query: string): string[] => {
  if (!query.trim()) return tags;
  
  const lowercaseQuery = query.toLowerCase();
  return tags.filter(tag =>
    tag.toLowerCase().includes(lowercaseQuery) ||
    tag.toLowerCase().startsWith(lowercaseQuery) ||
    tag.toLowerCase().endsWith(lowercaseQuery)
  );
};

/**
 * Validate an array of tags
 */
export const validateTags = (tags: string[]): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (tags.length > API_LIMITS.MAX_TAGS_PER_SNIPPET) {
    errors.push(`Maximum ${API_LIMITS.MAX_TAGS_PER_SNIPPET} tags allowed`);
  }
  
  tags.forEach((tag, index) => {
    const validation = validateTag(tag);
    if (!validation.isValid) {
      errors.push(`Tag ${index + 1}: ${validation.error}`);
    }
  });

  // Detailed error information and suggestions
  if (errors.length) {
    errors.push('Consider shortening or altering your tags to meet the validation rules.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};
