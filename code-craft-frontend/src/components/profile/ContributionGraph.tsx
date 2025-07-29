'use client';

import React, { useRef, useEffect, KeyboardEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Calendar, Flame, Trophy } from 'lucide-react';
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
} from '@/utils/contributionUtils';
import { ContributionGraphSkeleton } from './ContributionGraphSkeleton';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ErrorBoundary } from 'react-error-boundary';

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
}

function ContributionGraphContent({ 
  userId, 
  className,
  thresholds = defaultThresholds,
  colors = defaultColors
}: ContributionGraphProps) {
  const { startDate, endDate } = getDefaultDateRange();
  const gridRef = useRef<HTMLDivElement>(null);
  const [focusedSquare, setFocusedSquare] = React.useState<{ week: number; day: number } | null>(null);

  // Custom function to get contribution level based on configurable thresholds
  const getContributionLevel = (count: number): number => {
    if (count === 0) return 0;
    if (count < thresholds.low) return 1;
    if (count < thresholds.medium) return 2;
    if (count < thresholds.high) return 3;
    return 4;
  };

  // Custom function to get contribution color based on level and custom colors
  const getCustomContributionColor = (level: number): string => {
    switch (level) {
      case 0: return colors.none || defaultColors.none;
      case 1: return colors.low || defaultColors.low;
      case 2: return colors.medium || defaultColors.medium;
      case 3: return colors.high || defaultColors.high;
      case 4: return colors.max || defaultColors.max;
      default: return colors.none || defaultColors.none;
    }
  };

  // Fetch contribution data
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['contribution-graph', userId],
    queryFn: () => userApi.getContributionGraph(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return <ContributionGraphSkeleton className={className} />;
  }

  if (error || !data) {
    return (
      <div className={cn('p-6 text-center', className)}>
        <p className="text-muted-foreground mb-4">
          Failed to load contribution graph
        </p>
        <button
          onClick={() => refetch()}
          className="text-primary hover:underline text-sm"
        >
          Try again
        </button>
      </div>
    );
  }

  // Generate grid data with custom contribution levels
  const rawGrid = generateContributionGrid(
    data.data || [],
    startDate,
    endDate
  );
  
  // Apply custom thresholds to contribution levels
  const contributionGrid = rawGrid.map(week => ({
    ...week,
    days: week.days.map(day => ({
      ...day,
      level: getContributionLevel(day.count)
    }))
  }));

  // Calculate stats
  const stats = calculateContributionStats(data.data || []);

  // Get month labels
  const monthLabels = getMonthLabels(startDate, endDate);
  const weekdayLabels = getWeekdayLabels();

  // Keyboard navigation handler
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>, weekIndex: number, dayIndex: number) => {
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
        }
        break;
      case 'ArrowRight':
        if (weekIndex < contributionGrid.length - 1) {
          newWeek = weekIndex + 1;
        }
        break;
      case 'Home':
        newWeek = 0;
        newDay = 0;
        break;
      case 'End':
        newWeek = contributionGrid.length - 1;
        newDay = contributionGrid[newWeek].days.length - 1;
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
  };

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
                    {week.days.map((day, dayIndex) => (
                      <Tooltip key={`${weekIndex}-${dayIndex}`}>
                        <TooltipTrigger asChild>
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{
                              delay: (weekIndex * 7 + dayIndex) * 0.001,
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
  return (
    <ErrorBoundary
      FallbackComponent={ContributionGraphError}
      onReset={() => window.location.reload()}
    >
      <ContributionGraphContent {...props} />
    </ErrorBoundary>
  );
}
