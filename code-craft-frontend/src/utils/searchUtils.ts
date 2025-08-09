import type { SearchResult, SearchFilters, SearchAnalyticsEvent } from '@/types/search';

/**
 * Highlight search terms in text
 */
export function highlightSearchTerms(text: string, searchTerms: string | string[]): { text: string; highlight: boolean }[] {
  if (!text) return [{ text, highlight: false }];
  
  // Convert single string to array
  const terms = Array.isArray(searchTerms) ? searchTerms : [searchTerms];
  
  if (terms.length === 0 || terms.every(term => !term)) {
    return [{ text, highlight: false }];
  }
  
  const escapedTerms = terms
    .filter(term => term && term.length > 0)
    .map(term => 
      term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );
  
  if (escapedTerms.length === 0) {
    return [{ text, highlight: false }];
  }
  
  const regex = new RegExp(`(${escapedTerms.join('|')})`, 'gi');
  const parts: { text: string; highlight: boolean }[] = [];
  let lastIndex = 0;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    // Add non-highlighted text before match
    if (match.index > lastIndex) {
      parts.push({
        text: text.slice(lastIndex, match.index),
        highlight: false
      });
    }
    // Add highlighted match
    parts.push({
      text: match[1],
      highlight: true
    });
    lastIndex = regex.lastIndex;
  }
  
  // Add remaining non-highlighted text
  if (lastIndex < text.length) {
    parts.push({
      text: text.slice(lastIndex),
      highlight: false
    });
  }
  
  return parts.length > 0 ? parts : [{ text, highlight: false }];
}

/**
 * Parse search query for advanced search syntax
 */
export function parseSearchQuery(query: string): {
  terms: string[];
  filters: Partial<SearchFilters>;
} {
  const terms: string[] = [];
  const filters: Partial<SearchFilters> = {};
  
  // Extract language filter (lang:javascript)
  const langMatch = query.match(/lang:(\w+)/i);
  if (langMatch) {
    filters.language = langMatch[1];
    query = query.replace(langMatch[0], '');
  }
  
  // Extract author filter (author:username)
  const authorMatch = query.match(/author:(\w+)/i);
  if (authorMatch) {
    filters.author = authorMatch[1];
    query = query.replace(authorMatch[0], '');
  }
  
  // Extract tag filters (tag:react tag:hooks)
  const tagMatches = query.matchAll(/tag:(\w+)/gi);
  const tags: string[] = [];
  for (const match of tagMatches) {
    tags.push(match[1]);
    query = query.replace(match[0], '');
  }
  if (tags.length > 0) {
    filters.tags = tags;
  }
  
  // Extract quoted phrases
  const phraseMatches = query.matchAll(/"([^"]+)"/g);
  for (const match of phraseMatches) {
    terms.push(match[1]);
    query = query.replace(match[0], '');
  }
  
  // Add remaining terms
  const remainingTerms = query.trim().split(/\s+/).filter(Boolean);
  terms.push(...remainingTerms);
  
  return { terms, filters };
}

/**
 * Rank search results based on relevance
 */
export function rankSearchResults(
  results: SearchResult[],
  query: string
): SearchResult[] {
  const queryLower = query.toLowerCase();
  
  return results.sort((a, b) => {
    // Calculate relevance scores
    const scoreA = calculateRelevanceScore(a, queryLower);
    const scoreB = calculateRelevanceScore(b, queryLower);
    
    return scoreB - scoreA;
  });
}

function calculateRelevanceScore(result: SearchResult, query: string): number {
  let score = result.score || 0;
  
  // Exact match bonus
  if (result.type === 'snippet') {
    const snippet = result.data;
    if (snippet.title.toLowerCase() === query) score += 10;
    if (snippet.title.toLowerCase().includes(query)) score += 5;
    if (snippet.description?.toLowerCase().includes(query)) score += 3;
    if (snippet.code.toLowerCase().includes(query)) score += 2;
  } else if (result.type === 'user') {
    const user = result.data;
    if (user.name?.toLowerCase() === query) score += 10;
    if (user.name?.toLowerCase().includes(query)) score += 5;
    if (user.bio?.toLowerCase().includes(query)) score += 3;
  } else if (result.type === 'tag') {
    const tag = result.data;
    if (tag.name.toLowerCase() === query) score += 10;
    if (tag.name.toLowerCase().includes(query)) score += 5;
  }
  
  return score;
}

/**
 * Track search analytics event
 */
export function trackSearchEvent(
  event: Omit<SearchAnalyticsEvent, 'id' | 'timestamp'>
): SearchAnalyticsEvent {
  return {
    ...event,
    id: generateEventId(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Format search results for display
 */
export function formatSearchResults(results: SearchResult[]): {
  snippets: SearchResult[];
  users: SearchResult[];
  tags: SearchResult[];
} {
  return {
    snippets: results.filter(r => r.type === 'snippet'),
    users: results.filter(r => r.type === 'user'),
    tags: results.filter(r => r.type === 'tag'),
  };
}

/**
 * Generate unique event ID
 */
function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate search metrics
 */
export function calculateSearchMetrics(events: SearchAnalyticsEvent[]): {
  totalSearches: number;
  avgClickPosition: number;
  clickThroughRate: number;
  popularQueries: { query: string; count: number }[];
} {
  const searchEvents = events.filter(e => e.type === 'search');
  const clickEvents = events.filter(e => e.type === 'click');
  
  const queryCount = new Map<string, number>();
  searchEvents.forEach(event => {
    if (event.query) {
      queryCount.set(event.query, (queryCount.get(event.query) || 0) + 1);
    }
  });
  
  const popularQueries = Array.from(queryCount.entries())
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  const avgClickPosition = clickEvents.length > 0
    ? clickEvents.reduce((sum, e) => sum + (e.position || 0), 0) / clickEvents.length
    : 0;
  
  const clickThroughRate = searchEvents.length > 0
    ? (clickEvents.length / searchEvents.length) * 100
    : 0;
  
  return {
    totalSearches: searchEvents.length,
    avgClickPosition,
    clickThroughRate,
    popularQueries,
  };
}
