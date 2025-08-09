import { format, eachDayOfInterval, startOfWeek, endOfWeek, getDay, getMonth, startOfYear, endOfYear, subDays, isValid } from 'date-fns';
import type { ContributionDay } from '@/types/user';

// Memoization function to optimize computations
function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map<string, ReturnType<T>>();
  return ((...args: any[]) => {
    const key = JSON.stringify(args);
    if (!cache.has(key)) {
      cache.set(key, fn(...args));
    }
    return cache.get(key)!;
  }) as T;
}

// Theme configuration
export const CONTRIBUTION_THEMES = {
  default: {
    0: 'bg-muted hover:bg-muted/80',
    1: 'bg-green-200 dark:bg-green-900 hover:bg-green-300 dark:hover:bg-green-800',
    2: 'bg-green-400 dark:bg-green-700 hover:bg-green-500 dark:hover:bg-green-600',
    3: 'bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-400',
    4: 'bg-green-800 dark:bg-green-300 hover:bg-green-900 dark:hover:bg-green-200',
  },
  highContrast: {
    0: 'bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800',
    1: 'bg-yellow-300 dark:bg-yellow-700 hover:bg-yellow-400 dark:hover:bg-yellow-600',
    2: 'bg-orange-400 dark:bg-orange-600 hover:bg-orange-500 dark:hover:bg-orange-500',
    3: 'bg-red-500 dark:bg-red-600 hover:bg-red-600 dark:hover:bg-red-500',
    4: 'bg-purple-700 dark:bg-purple-400 hover:bg-purple-800 dark:hover:bg-purple-300',
  },
  colorBlind: {
    0: 'bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700',
    1: 'bg-blue-200 dark:bg-blue-900 hover:bg-blue-300 dark:hover:bg-blue-800',
    2: 'bg-blue-400 dark:bg-blue-700 hover:bg-blue-500 dark:hover:bg-blue-600',
    3: 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-400',
    4: 'bg-blue-800 dark:bg-blue-300 hover:bg-blue-900 dark:hover:bg-blue-200',
  },
  darkMode: {
    0: 'bg-dark-50 dark:bg-dark-950 hover:bg-dark-100 dark:hover:bg-dark-900',
    1: 'bg-dark-100 dark:bg-dark-850 hover:bg-dark-150 dark:hover:bg-dark-800',
    2: 'bg-dark-200 dark:bg-dark-750 hover:bg-dark-250 dark:hover:bg-dark-700',
    3: 'bg-dark-300 dark:bg-dark-650 hover:bg-dark-350 dark:hover:bg-dark-600',
    4: 'bg-dark-400 dark:bg-dark-550 hover:bg-dark-450 dark:hover:bg-dark-500',
  },
} as const;

type ContributionTheme = keyof typeof CONTRIBUTION_THEMES;
type ContributionLevel = 0 | 1 | 2 | 3 | 4;

/**
 * Type guard for valid number
 */
function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Type guard for valid date
 */
function isValidDate(date: unknown): boolean {
  if (!date) return false;
  const dateObj = date instanceof Date ? date : new Date(date as string);
  return isValid(dateObj) && !isNaN(dateObj.getTime());
}

/**
 * Type guard for contribution data
 */
export function isContributionData(data: unknown): data is ContributionDay {
  return (
    typeof data === 'object' &&
    data !== null &&
    'date' in data &&
    'count' in data &&
    typeof (data as any).date === 'string' &&
    isValidNumber((data as any).count)
  );
}

/**
 * Validate contribution data array
 */
export function validateContributionData(data: unknown): data is ContributionDay[] {
  return Array.isArray(data) && data.every(isContributionData);
}

/**
 * Process raw contribution data with validation
 */
export function processContributionData(rawData: unknown): ContributionDay[] {
  if (!Array.isArray(rawData)) {
    console.error('Invalid contribution data format');
    return [];
  }

  return rawData
    .filter(isContributionData)
    .map(item => ({
      date: item.date,
      count: Math.max(0, Math.floor(item.count)),
    }));
}

/**
 * Get contribution level based on count with customizable thresholds
 */
export function getContributionLevel(
  count: number,
  thresholds: number[] = [0, 1, 3, 5, 7]
): ContributionLevel {
  if (!isValidNumber(count) || count < 0) {
    console.warn('Invalid count provided to getContributionLevel:', count);
    return 0;
  }
  
  const safeCount = Math.floor(count);
  
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (safeCount >= thresholds[i]) {
      return i as ContributionLevel;
    }
  }
  
  return 0;
}

/**
 * Get CSS class for contribution level with theme support
 */
export function getContributionColor(
  level: number,
  theme: ContributionTheme = 'default'
): string {
  if (!isValidNumber(level)) {
    console.warn('Invalid level provided to getContributionColor:', level);
    level = 0;
  }
  
  const safeLevel = Math.max(0, Math.min(4, Math.floor(level))) as ContributionLevel;
  const themeColors = CONTRIBUTION_THEMES[theme] || CONTRIBUTION_THEMES.default;
  
  return themeColors[safeLevel];
}

// Cache for memoized date ranges
const dateRangeCache = new Map<string, Date[]>();

/**
 * Generate date range array with memoization
 */
export const generateDateRange = memoize((startDate: Date, endDate: Date): Date[] => {
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    console.warn('Invalid dates provided to generateDateRange:', { startDate, endDate });
    return [];
  }
  
  if (startDate > endDate) {
    console.warn('Start date is after end date in generateDateRange');
    return [];
  }
  
  try {
    const dates = eachDayOfInterval({ start: startDate, end: endDate });
    return dates;
  } catch (error) {
    console.error('Error generating date range:', error);
    return [];
  }
});

/**
 * Format contribution tooltip text with customization
 */
export function formatContributionTooltip(
  date: string | Date,
  count: number,
  options?: {
    format?: string;
    singular?: string;
    plural?: string;
    none?: string;
  }
): string {
  if (!isValidDate(date)) {
    console.warn('Invalid date provided to formatContributionTooltip:', date);
    return 'Invalid date';
  }
  
  if (!isValidNumber(count) || count < 0) {
    console.warn('Invalid count provided to formatContributionTooltip:', count);
    count = 0;
  }
  
  const {
    format: dateFormat = 'MMM d, yyyy',
    singular = 'snippet',
    plural = 'snippets',
    none = 'No snippets',
  } = options || {};
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    const formattedDate = format(dateObj, dateFormat);
    const safeCount = Math.floor(count);
    
    if (safeCount === 0) {
      return `${none} on ${formattedDate}`;
    }
    
    const label = safeCount === 1 ? singular : plural;
    return `${safeCount} ${label} on ${formattedDate}`;
  } catch (error) {
    console.error('Error formatting contribution tooltip:', error);
    return 'Error formatting date';
  }
}

/**
 * Get weekday labels
 */
export function getWeekdayLabels(): string[] {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
}

/**
 * Get month labels for the contribution graph
 */
export function getMonthLabels(startDate: Date, endDate: Date): Array<{ label: string; weekIndex: number }> {
  const months: Array<{ label: string; weekIndex: number }> = [];
  let currentMonth = -1;
  let weekIndex = 0;
  
  const dates = generateDateRange(startDate, endDate);
  
  dates.forEach((date) => {
    const month = getMonth(date);
    const dayOfWeek = getDay(date);
    
    // If it's Sunday, increment week index
    if (dayOfWeek === 0 && date !== startDate) {
      weekIndex++;
    }
    
    // If it's a new month, add label
    if (month !== currentMonth) {
      currentMonth = month;
      months.push({
        label: format(date, 'MMM'),
        weekIndex
      });
    }
  });
  
  return months;
}

/**
 * Generate contribution grid data structure
 */
export interface ContributionWeek {
  days: Array<{
    date: string;
    count: number;
    level: number;
  }>;
}

export function generateContributionGrid(
  data: ContributionDay[],
  startDate?: string | Date,
  endDate?: string | Date
): ContributionDay[][] {
  // Use default date range if not provided
  const dateRange = startDate && endDate
    ? {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      }
    : getDefaultDateRange();
  
  if (!validateContributionData(data)) {
    console.warn('Invalid data provided to generateContributionGrid');
    return [];
  }
  
  if (!isValidDate(dateRange.startDate) || !isValidDate(dateRange.endDate)) {
    console.warn('Invalid dates provided to generateContributionGrid');
    return [];
  }
  
  if (dateRange.startDate > dateRange.endDate) {
    console.warn('Start date is after end date in generateContributionGrid');
    return [];
  }
  
  // Create optimized lookup map
  const dataMap = new Map<string, number>();
  data.forEach(item => {
    if (isValidDate(item.date) && item.count >= 0) {
      dataMap.set(item.date, Math.floor(item.count));
    }
  });
  
  try {
    // Adjust dates to week boundaries
    const adjustedStartDate = startOfWeek(dateRange.startDate, { weekStartsOn: 0 });
    const adjustedEndDate = endOfWeek(dateRange.endDate, { weekStartsOn: 0 });
  
    // Generate all dates with memoization
    const allDates = generateDateRange(adjustedStartDate, adjustedEndDate);
    
    // Create 2D array grid
    const grid: ContributionDay[][] = [];
    
    for (let i = 0; i < allDates.length; i += 7) {
      const week: ContributionDay[] = [];
      
      for (let j = 0; j < 7 && i + j < allDates.length; j++) {
        const date = allDates[i + j];
        const dateStr = format(date, 'yyyy-MM-dd');
        const count = dataMap.get(dateStr) || 0;
        
        week.push({
          date: dateStr,
          count,
        });
      }
      
      grid.push(week);
    }
    
    return grid;
  } catch (error) {
    console.error('Error generating contribution grid:', error);
    return [];
  }
}

/**
 * Get default date range with timezone support
 */
export function getDefaultDateRange(options?: {
  days?: number;
  timezone?: string;
}): { startDate: Date; endDate: Date } {
  const { days = 365, timezone } = options || {};
  
  const endDate = new Date();
  const startDate = subDays(endDate, days - 1); // Include today
  
  // TODO: Add timezone conversion if needed
  
  return { startDate, endDate };
}

/**
 * Calculate contribution statistics
 */
export interface ContributionStats {
  totalContributions: number;
  longestStreak: number;
  currentStreak: number;
  bestDay: { date: string; count: number } | null;
}

export function calculateContributionStats(
  data: Array<{ date: string; count: number }>
): ContributionStats {
  // Validate data
  if (!Array.isArray(data)) {
    console.warn('Non-array data provided to calculateContributionStats');
    return {
      totalContributions: 0,
      longestStreak: 0,
      currentStreak: 0,
      bestDay: null
    };
  }

  const validData = data.filter(item => 
    item && typeof item === 'object' &&
    isValidDate(item.date) && isValidNumber(item.count)
  );

  if (validData.length === 0) {
    return {
      totalContributions: 0,
      longestStreak: 0,
      currentStreak: 0,
      bestDay: null
    };
  }
  
  // Sort data by date
  const sortedData = [...validData].sort((a, b) => a.date.localeCompare(b.date));
  
  let totalContributions = 0;
  let longestStreak = 0;
  let currentStreak = 0;
  let lastDate: Date | null = null;
  let bestDay = { date: '', count: 0 };
  
  sortedData.forEach((item) => {
    totalContributions += item.count;
    
    // Track best day
    if (item.count > bestDay.count) {
      bestDay = { date: item.date, count: item.count };
    }
    
    // Calculate streaks
    if (item.count > 0) {
      const currentDate = new Date(item.date);
      
      if (lastDate) {
        const dayDiff = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (dayDiff === 1) {
          currentStreak++;
        } else {
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
      }
      
      longestStreak = Math.max(longestStreak, currentStreak);
      lastDate = currentDate;
    } else {
      // Reset current streak if no contributions
      currentStreak = 0;
      lastDate = null;
    }
  });
  
  // Check if current streak extends to today
  const today = format(new Date(), 'yyyy-MM-dd');
  const lastDataDate = sortedData[sortedData.length - 1]?.date;
  
  if (lastDataDate !== today || sortedData[sortedData.length - 1]?.count === 0) {
    currentStreak = 0;
  }
  
  return {
    totalContributions,
    longestStreak,
    currentStreak,
    bestDay: bestDay.count > 0 ? bestDay : null
  };
}
