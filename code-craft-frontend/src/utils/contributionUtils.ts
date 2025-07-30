import { format, eachDayOfInterval, startOfWeek, endOfWeek, getDay, getMonth, startOfYear, endOfYear, subDays, isValid } from 'date-fns';

/**
 * Validate that a value is a valid number
 */
function isValidNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Validate that a date string or Date object is valid
 */
function isValidDate(date: any): boolean {
  if (!date) return false;
  const dateObj = date instanceof Date ? date : new Date(date);
  return isValid(dateObj) && !isNaN(dateObj.getTime());
}

/**
 * Get contribution level based on count (0-4)
 * 0 = no activity, 1 = low, 2 = medium, 3 = high, 4 = very high
 */
export function getContributionLevel(count: number): number {
  // Validate input
  if (!isValidNumber(count) || count < 0) {
    console.warn('Invalid count provided to getContributionLevel:', count);
    return 0;
  }
  
  // Ensure count is an integer
  const safeCount = Math.floor(count);
  
  if (safeCount === 0) return 0;
  if (safeCount <= 2) return 1;
  if (safeCount <= 4) return 2;
  if (safeCount <= 6) return 3;
  return 4;
}

/**
 * Get CSS class for contribution level
 */
export function getContributionColor(level: number): string {
  // Validate input
  if (!isValidNumber(level)) {
    console.warn('Invalid level provided to getContributionColor:', level);
    level = 0;
  }
  
  // Clamp level between 0 and 4
  const safeLevel = Math.max(0, Math.min(4, Math.floor(level)));
  
  const colors = {
    0: 'bg-muted hover:bg-muted/80',
    1: 'bg-green-200 dark:bg-green-900 hover:bg-green-300 dark:hover:bg-green-800',
    2: 'bg-green-400 dark:bg-green-700 hover:bg-green-500 dark:hover:bg-green-600',
    3: 'bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-400',
    4: 'bg-green-800 dark:bg-green-300 hover:bg-green-900 dark:hover:bg-green-200',
  };
  return colors[safeLevel as keyof typeof colors] || colors[0];
}

/**
 * Generate date range array
 */
export function generateDateRange(startDate: Date, endDate: Date): Date[] {
  // Validate inputs
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    console.warn('Invalid dates provided to generateDateRange:', { startDate, endDate });
    return [];
  }
  
  // Ensure startDate is before endDate
  if (startDate > endDate) {
    console.warn('Start date is after end date in generateDateRange');
    return [];
  }
  
  try {
    return eachDayOfInterval({ start: startDate, end: endDate });
  } catch (error) {
    console.error('Error generating date range:', error);
    return [];
  }
}

/**
 * Format contribution tooltip text
 */
export function formatContributionTooltip(date: string | Date, count: number): string {
  // Validate date
  if (!isValidDate(date)) {
    console.warn('Invalid date provided to formatContributionTooltip:', date);
    return 'Invalid date';
  }
  
  // Validate count
  if (!isValidNumber(count) || count < 0) {
    console.warn('Invalid count provided to formatContributionTooltip:', count);
    count = 0;
  }
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    const formattedDate = format(dateObj, 'MMM d, yyyy');
    const safeCount = Math.floor(count);
    
    if (safeCount === 0) {
      return `No snippets on ${formattedDate}`;
    }
    return `${safeCount} snippet${safeCount !== 1 ? 's' : ''} on ${formattedDate}`;
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
  data: Array<{ date: string; count: number }>,
  startDate: Date,
  endDate: Date
): ContributionWeek[] {
  // Validate inputs
  if (!Array.isArray(data)) {
    console.warn('Invalid data provided to generateContributionGrid');
    data = [];
  }
  
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    console.warn('Invalid dates provided to generateContributionGrid');
    return [];
  }
  
  if (startDate > endDate) {
    console.warn('Start date is after end date in generateContributionGrid');
    return [];
  }
  
  // Validate and filter data
  const validData = data.filter(item => {
    if (!item || typeof item.date !== 'string' || !isValidNumber(item.count)) {
      console.warn('Invalid data item in generateContributionGrid:', item);
      return false;
    }
    return isValidDate(item.date) && item.count >= 0;
  });
  
  // Create a map for quick lookup
  const dataMap = new Map(validData.map(item => [item.date, Math.floor(item.count)]));
  
  try {
    // Adjust start date to beginning of week (Sunday)
    const adjustedStartDate = startOfWeek(startDate, { weekStartsOn: 0 });
    
    // Adjust end date to end of week (Saturday)
    const adjustedEndDate = endOfWeek(endDate, { weekStartsOn: 0 });
  
    // Generate all dates
    const allDates = generateDateRange(adjustedStartDate, adjustedEndDate);
    
    // Group by weeks
    const weeks: ContributionWeek[] = [];
    let currentWeek: ContributionWeek = { days: [] };
    
    allDates.forEach((date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const count = dataMap.get(dateStr) || 0;
      const level = getContributionLevel(count);
      
      currentWeek.days.push({
        date: dateStr,
        count,
        level
      });
      
      // If we've completed a week (7 days), start a new one
      if (currentWeek.days.length === 7) {
        weeks.push(currentWeek);
        currentWeek = { days: [] };
      }
    });
    
    // Add any remaining days
    if (currentWeek.days.length > 0) {
      weeks.push(currentWeek);
    }
    
    return weeks;
  } catch (error) {
    console.error('Error generating contribution grid:', error);
    return [];
  }
}

/**
 * Get default date range (last 365 days)
 */
export function getDefaultDateRange(): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const startDate = subDays(endDate, 364); // 365 days including today
  
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
