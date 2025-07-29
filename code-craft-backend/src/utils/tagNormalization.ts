/**
 * Tag normalization utility to ensure consistent tag processing
 * across validation and model layers
 */

// Special pattern mappings for common programming language tags
const SPECIAL_PATTERNS: Record<string, string> = {
  'c#': 'csharp',
  'c++': 'cpp',
  '.net': 'dotnet',
  'f#': 'fsharp',
  'objective-c': 'objectivec',
  'node.js': 'nodejs',
  'vue.js': 'vuejs',
  'react.js': 'reactjs',
  'angular.js': 'angularjs',
  'asp.net': 'aspnet',
  'vb.net': 'vbnet',
};

/**
 * Normalize a single tag
 */
export function normalizeTag(tag: string): string {
  if (typeof tag !== 'string') return '';
  
  // Trim and check for special patterns
  let normalized = tag.trim();
  const lowerTag = normalized.toLowerCase();
  
  // Check for special patterns first
  if (SPECIAL_PATTERNS[lowerTag]) {
    return SPECIAL_PATTERNS[lowerTag];
  }
  
  // Standard normalization
  normalized = normalized.toLowerCase();
  
  // Replace spaces and dots with hyphens
  normalized = normalized.replace(/[\s.]+/g, '-');
  
  // Remove any character that's not alphanumeric, hyphen, underscore, plus, or sharp
  normalized = normalized.replace(/[^a-z0-9\-_+#]/g, '');
  
  // Clean up multiple consecutive hyphens
  normalized = normalized.replace(/-+/g, '-');
  
  // Remove leading/trailing hyphens
  normalized = normalized.replace(/^[-_]+|[-_]+$/g, '');
  
  return normalized;
}

/**
 * Normalize an array of tags
 */
export function normalizeTags(tags: string[]): string[] {
  if (!Array.isArray(tags)) return [];
  
  const normalizedTags = tags
    .map(tag => normalizeTag(tag))
    .filter(tag => tag.length > 0);
  
  // Remove duplicates
  return [...new Set(normalizedTags)];
}

/**
 * Validate tag length
 */
export function isValidTagLength(tag: string, minLength: number, maxLength: number): boolean {
  return tag.length >= minLength && tag.length <= maxLength;
}

/**
 * Validate tag format
 */
export function isValidTagFormat(tag: string): boolean {
  if (!tag || tag.length === 0) return false;
  
  // Must start and end with alphanumeric character
  if (tag.length > 1 && !/^[a-z0-9].*[a-z0-9]$/.test(tag)) {
    return false;
  }
  
  // Single character tags must be alphanumeric
  if (tag.length === 1 && !/^[a-z0-9]$/.test(tag)) {
    return false;
  }
  
  return true;
}
