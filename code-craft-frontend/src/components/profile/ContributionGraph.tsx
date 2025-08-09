'use client';

import React, { useRef, useEffect, KeyboardEvent, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Flame, Trophy, AlertCircle, RefreshCw } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { userApi } from '@/lib/api';
import {
  generateContributionGrid,
  getContributionColor,
  formatContributionTooltip,
  getWeekdayLabels,
  getMonthLabels,
  getDefaultDateRange,
  calculateContributionStats,
  CONTRIBUTION_THEMES,
} from '@/utils/contributionUtils';
import { ContributionGraphSkeleton } from './ContributionGraphSkeleton';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ErrorBoundary } from 'react-error-boundary';
import { isValidObjectId } from '@/lib/validation';
import { useContributionData } from '@/hooks/useContributionData';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';

// Lazy load the virtualized component for large datasets
const ContributionGraphVirtualized = lazy(() => 
  import('./ContributionGraphVirtualized').then(module => ({ 
    default: module.ContributionGraphVirtualized 
  }))
);

interface ContributionThresholds {
  low: number;
  medium: number;
  high: number;
}

interface ContributionGraphProps {
  userId: string;
  className?: string;
  thresholds?: ContributionThresholds;
  colors?: {
    none?: string;
    low?: string;
    medium?: string;
    high?: string;
    max?: string;
  };
  theme?: keyof typeof CONTRIBUTION_THEMES;
  enableVirtualization?: boolean;
  virtualizeThreshold?: number;
  enableRealtime?: boolean;
  enableKeyboardNavigation?: boolean;
  enableAnimations?: boolean;
  onContributionClick?: (date: string, count: number) => void;
  onContributionHover?: (date: string, count: number) => void;
}

const defaultThresholds: ContributionThresholds = {
  low: 1,
  medium: 3,
  high: 5
};

const defaultColors = {
  none: 'bg-gray-100 dark:bg-gray-800',
  low: 'bg-green-200 dark:bg-green-900',
  medium: 'bg-green-400 dark:bg-green-700',
  high: 'bg-green-600 dark:bg-green-500',
  max: 'bg-green-800 dark:bg-green-300'
};

// Performance constants
const VIRTUALIZE_THRESHOLD = 365; // Virtualize if more than a year of data
const ANIMATION_BATCH_SIZE = 50; // Animate in batches for better performance

function ContributionGraphContent({ 
  userId, 
  className,
  thresholds = defaultThresholds,
  colors = defaultColors,
  theme = 'default',
  enableVirtualization = true,
  virtualizeThreshold = VIRTUALIZE_THRESHOLD,
  enableRealtime = false,
  enableKeyboardNavigation = true,
  enableAnimations = true,
  onContributionClick,
  onContributionHover,
}: ContributionGraphProps) {
  // Validate userId before any hooks to ensure consistent hook order
  const isValidUserId = isValidObjectId(userId);
  
  // All hooks must be called unconditionally
  const { startDate, endDate } = getDefaultDateRange();
  const gridRef = useRef<HTMLDivElement>(null);
  const [focusedSquare, setFocusedSquare] = React.useState<{ week: number; day: number } | null>(null);
  
  // Use the enhanced contribution data hook for better data management
  const {
    data: contributionDataFromHook,
    grid: gridFromHook,
    isLoading: isLoadingHook,
    isError: isErrorHook,
    error: errorHook,
    refetch: refetchHook,
    stats: statsFromHook,
  } = useContributionData({
    userId,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    enableRealtime,
  });
  
  // Check if should use reduced motion
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);
  
  const shouldAnimate = enableAnimations && !prefersReducedMotion;

  // Custom function to get contribution level based on configurable thresholds
  const getContributionLevel = useCallback((count: number): number => {
    if (count === 0) return 0;
    if (count < thresholds.low) return 1;
    if (count < thresholds.medium) return 2;
    if (count < thresholds.high) return 3;
    return 4;
  }, [thresholds]);

  // Custom function to get contribution color based on level and theme
  const getCustomContributionColor = useCallback((level: number): string => {
    // Use theme colors if specified
    if (theme !== 'default' && CONTRIBUTION_THEMES[theme]) {
      return getContributionColor(level, theme);
    }
    
    // Otherwise use custom colors
    switch (level) {
      case 0: return colors.none || defaultColors.none;
      case 1: return colors.low || defaultColors.low;
      case 2: return colors.medium || defaultColors.medium;
      case 3: return colors.high || defaultColors.high;
      case 4: return colors.max || defaultColors.max;
      default: return colors.none || defaultColors.none;
    }
  }, [colors, theme]);

  // Use data from the enhanced hook
  const effectiveData = contributionDataFromHook;
  const effectiveIsLoading = isLoadingHook;
  const effectiveError = isErrorHook ? errorHook : null;
  const effectiveRefetch = refetchHook;

  // Handle invalid userId
  if (!isValidUserId) {
    return (
      <div className={cn('p-6 text-center', className)}>
        <p className="text-destructive font-medium mb-2">Invalid User ID</p>
        <p className="text-sm text-muted-foreground">
          The user ID provided is not in a valid format.
        </p>
      </div>
    );
  }

  if (effectiveIsLoading) {
    return <ContributionGraphSkeleton className={className} showAnimation={shouldAnimate} />;
  }

  if (effectiveError) {
    const errorMessage = effectiveError instanceof Error ? effectiveError.message : 'Failed to load contribution graph';
    const isNetworkError = errorMessage.includes('network') || errorMessage.includes('Network');
    // Safely check for response status
    const errorResponse = (effectiveError as any)?.response;
    const is404Error = errorResponse?.status === 404;
    const is400Error = errorResponse?.status === 400;
    
    return (
      <div className={cn('p-6 text-center', className)}>
        <div className="flex justify-center mb-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
        </div>
        <p className="text-destructive font-medium mb-2">
          {is404Error ? 'User not found' : is400Error ? 'Invalid request' : 'Failed to load contribution graph'}
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          {isNetworkError ? 'Please check your internet connection' : errorMessage}
        </p>
        <button
          onClick={() => effectiveRefetch()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      </div>
    );
  }

  // Validate data structure
  if (!effectiveData || typeof effectiveData !== 'object') {
    return (
      <div className={cn('p-6 text-center', className)}>
        <div className="flex justify-center mb-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
        </div>
        <p className="text-destructive font-medium mb-2">Invalid data format</p>
        <p className="text-sm text-muted-foreground mb-4">
          The server returned an unexpected response format.
        </p>
        <button
          onClick={() => effectiveRefetch()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      </div>
    );
  }

  // Safely extract contribution data with validation
  const contributionData = useMemo(() => {
    const data = contributionDataFromHook || (Array.isArray(effectiveData) ? effectiveData : []);
    return data.filter(item => {
      if (!item || typeof item !== 'object') return false;
      if (typeof item.date !== 'string' || !item.date) return false;
      if (typeof item.count !== 'number' || item.count < 0) return false;
      return true;
    });
  }, [contributionDataFromHook, effectiveData]);
  
  // Generate grid data with custom contribution levels
  const contributionGrid = useMemo(() => {
    const rawGrid = gridFromHook || generateContributionGrid(
      contributionData,
      startDate,
      endDate
    );
    
    // Apply custom thresholds to contribution levels
    return rawGrid.map(week => 
      week.map(day => ({
        ...day,
        level: getContributionLevel(day.count)
      }))
    );
  }, [gridFromHook, contributionData, startDate, endDate, getContributionLevel]);

  // Calculate stats
  const stats = useMemo(() => 
    statsFromHook || calculateContributionStats(contributionData),
    [statsFromHook, contributionData]
  );

  // Get month labels
  const monthLabels = useMemo(() => getMonthLabels(startDate, endDate), [startDate, endDate]);
  const weekdayLabels = useMemo(() => getWeekdayLabels(), []);
  
  // Check if should use virtualization
  const shouldVirtualize = enableVirtualization && contributionData.length > virtualizeThreshold;
  
  // If virtualization is needed and data is large, use virtualized component
  if (shouldVirtualize) {
    return (
      <Suspense fallback={<ContributionGraphSkeleton className={className} />}>
        <ContributionGraphVirtualized
          userId={userId}
          className={className}
          contributionData={contributionData}
          contributionGrid={contributionGrid}
          stats={stats}
          thresholds={thresholds}
          theme={theme}
          colors={colors}
          enableKeyboardNavigation={enableKeyboardNavigation}
          enableAnimations={shouldAnimate}
          onContributionClick={onContributionClick}
          onContributionHover={onContributionHover}
          getContributionLevel={getContributionLevel}
          getCustomContributionColor={getCustomContributionColor}
        />
      </Suspense>
    );
  }

  // Keyboard navigation handler with enhanced features
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>, weekIndex: number, dayIndex: number) => {
    if (!enableKeyboardNavigation) return;
    
    let newWeek = weekIndex;
    let newDay = dayIndex;

    switch (e.key) {
      case 'ArrowUp':
        newDay = Math.max(0, dayIndex - 1);
        break;
      case 'ArrowDown':
        newDay = Math.min(6, dayIndex + 1);
        break;
      case 'ArrowLeft':
        if (weekIndex > 0) {
          newWeek = weekIndex - 1;
        } else if (dayIndex > 0) {
          // Wrap to previous row
          newWeek = contributionGrid.length - 1;
          newDay = dayIndex - 1;
        }
        break;
      case 'ArrowRight':
        if (weekIndex < contributionGrid.length - 1) {
          newWeek = weekIndex + 1;
        } else if (dayIndex < 6) {
          // Wrap to next row
          newWeek = 0;
          newDay = dayIndex + 1;
        }
        break;
      case 'Home':
        if (e.ctrlKey) {
          // Go to first day
          newWeek = 0;
          newDay = 0;
        } else {
          // Go to start of current week
          newWeek = weekIndex;
          newDay = 0;
        }
        break;
      case 'End':
        if (e.ctrlKey) {
          // Go to last day
          newWeek = contributionGrid.length - 1;
          newDay = contributionGrid[newWeek].length - 1;
        } else {
          // Go to end of current week
          newWeek = weekIndex;
          newDay = 6;
        }
        break;
      case 'PageUp':
        // Jump 4 weeks back
        newWeek = Math.max(0, weekIndex - 4);
        break;
      case 'PageDown':
        // Jump 4 weeks forward
        newWeek = Math.min(contributionGrid.length - 1, weekIndex + 4);
        break;
      case 'Enter':
      case ' ':
        // Trigger click event
        e.preventDefault();
        const day = contributionGrid[weekIndex][dayIndex];
        if (onContributionClick) {
          onContributionClick(day.date, day.count);
        }
        break;
      default:
        return;
    }

    e.preventDefault();
    setFocusedSquare({ week: newWeek, day: newDay });
    
    // Focus the new square
    const newSquare = gridRef.current?.querySelector(
      `[data-week="${newWeek}"][data-day="${newDay}"]`
    ) as HTMLElement;
    newSquare?.focus();
    
    // Announce to screen readers
    if (newSquare) {
      const day = contributionGrid[newWeek][newDay];
      const announcement = formatContributionTooltip(day.date, day.count);
      // Use aria-live region for announcement (would need to add this)
    }
  }, [enableKeyboardNavigation, contributionGrid, onContributionClick]);

  // Set initial focus when component mounts
  useEffect(() => {
    if (focusedSquare && gridRef.current) {
      const square = gridRef.current.querySelector(
        `[data-week="${focusedSquare.week}"][data-day="${focusedSquare.day}"]`
      ) as HTMLElement;
      square?.focus();
    }
  }, [focusedSquare]);

  return (
    <TooltipProvider>
      <div className={cn('space-y-4', className)}>
        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{stats.totalContributions}</span>
            </div>
            <p className="text-sm text-muted-foreground">Total snippets</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-2xl font-bold">{stats.currentStreak}</span>
            </div>
            <p className="text-sm text-muted-foreground">Current streak</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <span className="text-2xl font-bold">{stats.longestStreak}</span>
            </div>
            <p className="text-sm text-muted-foreground">Longest streak</p>
          </motion.div>
        </div>

        {/* Contribution Graph */}
        <div className="overflow-x-auto pb-2">
          <div className="min-w-fit">
            {/* Month labels */}
            <div className="flex mb-2">
              <div className="w-8" /> {/* Space for weekday labels */}
              <div className="flex flex-1">
                {monthLabels.map((month, index) => (
                  <div
                    key={index}
                    className="text-xs text-muted-foreground"
                    style={{
                      position: 'absolute',
                      left: `${32 + month.weekIndex * 13}px`,
                    }}
                  >
                    {month.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Grid container */}
            <div className="flex mt-6">
              {/* Weekday labels */}
              <div className="flex flex-col justify-between pr-2 text-xs text-muted-foreground">
                {weekdayLabels.map((label, index) => (
                  <div
                    key={label}
                    className={cn(
                      'h-[11px] leading-[11px]',
                      index % 2 === 0 ? 'opacity-0' : 'opacity-100'
                    )}
                  >
                    {label}
                  </div>
                ))}
              </div>

              {/* Contribution grid */}
              <div className="flex gap-[3px]" ref={gridRef}>
                {contributionGrid.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-[3px]">
                    {week.map((day, dayIndex) => (
                      <Tooltip key={`${weekIndex}-${dayIndex}`}>
                        <TooltipTrigger asChild>
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{
                              // Optimize animation delay for large datasets
                              // Use progressive delay that's faster for later items
                              delay: weekIndex < 10 ? (weekIndex * 7 + dayIndex) * 0.002 : 0.1 + (weekIndex * 0.001),
                              type: 'spring',
                              stiffness: 300,
                              damping: 20,
                            }}
                            className={cn(
                              'w-[11px] h-[11px] rounded-sm cursor-pointer transition-all',
                              getCustomContributionColor(day.level),
                              'contribution-square',
                              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1'
                            )}
                            style={{
                              '--contribution-color': `var(--contribution-level-${day.level})`,
                            } as React.CSSProperties}
                            data-date={day.date}
                            data-count={day.count}
                            data-level={day.level}
                            data-week={weekIndex}
                            data-day={dayIndex}
                            tabIndex={focusedSquare?.week === weekIndex && focusedSquare?.day === dayIndex ? 0 : -1}
                            onKeyDown={(e) => handleKeyDown(e, weekIndex, dayIndex)}
                            onFocus={() => setFocusedSquare({ week: weekIndex, day: dayIndex })}
                            role="button"
                            aria-label={formatContributionTooltip(day.date, day.count)}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">
                            {formatContributionTooltip(day.date, day.count)}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-end gap-2 mt-4 text-xs text-muted-foreground">
              <span>Less</span>
              <div className="flex gap-[3px]">
                {[0, 1, 2, 3, 4].map((level) => (
                  <Tooltip key={level}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          'w-[11px] h-[11px] rounded-sm',
                          getCustomContributionColor(level)
                        )}
                        style={{
                          '--contribution-color': `var(--contribution-level-${level})`,
                        } as React.CSSProperties}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        Level {level}: {level === 0 ? 'No' : level <= 2 ? 'Low' : level === 3 ? 'Medium' : 'High'} activity
                      </p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
              <span>More</span>
            </div>
          </div>
        </div>

        {/* Best day info */}
        {stats.bestDay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center text-sm text-muted-foreground mt-4"
          >
            Best day: {stats.bestDay.count} snippets on{' '}
            {format(new Date(stats.bestDay.date), 'MMM d, yyyy')}
          </motion.div>
        )}
      </div>
    </TooltipProvider>
  );
}

// Error fallback component
function ContributionGraphError({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="p-6 text-center border border-destructive/20 rounded-lg bg-destructive/5">
      <p className="text-destructive font-semibold mb-2">Failed to render contribution graph</p>
      <p className="text-sm text-muted-foreground mb-4">
        {error.message || 'An unexpected error occurred'}
      </p>
      <button
        onClick={resetErrorBoundary}
        className="text-primary hover:underline text-sm font-medium"
      >
        Try again
      </button>
    </div>
  );
}

// Export component wrapped with ErrorBoundary
export function ContributionGraph(props: ContributionGraphProps) {
  const [errorKey, setErrorKey] = React.useState(0);
  
  return (
    <ErrorBoundary
      key={errorKey}
      FallbackComponent={ContributionGraphError}
      onReset={() => {
        // Increment key to force component remount
        setErrorKey(prev => prev + 1);
      }}
      onError={(error, errorInfo) => {
        // Log error details for debugging
        console.error('[ContributionGraph] Render Error:', {
          error: error?.message || error,
          stack: error?.stack,
          componentStack: errorInfo?.componentStack,
          timestamp: new Date().toISOString(),
          userId: props.userId,
        });
      }}
    >
      <ContributionGraphContent {...props} />
    </ErrorBoundary>
  );
}
