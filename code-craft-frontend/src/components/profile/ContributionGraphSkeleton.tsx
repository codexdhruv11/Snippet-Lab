'use client';

import React, { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Calendar, Flame, Trophy } from 'lucide-react';
import { getDefaultDateRange, getMonthLabels, getWeekdayLabels } from '@/utils/contributionUtils';

interface ContributionGraphSkeletonProps {
  className?: string;
  showAnimation?: boolean;
  variant?: 'default' | 'simple' | 'detailed' | 'mobile';
  weeks?: number;
  daysPerWeek?: number;
  showStats?: boolean;
  showLegend?: boolean;
}

export function ContributionGraphSkeleton({ 
  className,
  showAnimation = true,
  variant = 'default',
  weeks: weekCount = 53,
  daysPerWeek = 7,
  showStats = true,
  showLegend = true,
}: ContributionGraphSkeletonProps) {
  // Check if reduced motion is preferred
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);
  
  const shouldAnimate = showAnimation && !prefersReducedMotion;
  
  // Calculate responsive grid size based on variant
  const responsiveWeeks = useMemo(() => {
    switch (variant) {
      case 'mobile':
        return Math.min(weekCount, 12); // Show only 12 weeks on mobile
      case 'simple':
        return Math.min(weekCount, 26); // Show half year for simple variant
      default:
        return weekCount;
    }
  }, [variant, weekCount]);
  
  // Generate skeleton grid
  const weeks = Array(responsiveWeeks).fill(null);
  const days = Array(daysPerWeek).fill(null);
  
  // Get date range for month labels
  const { startDate, endDate } = getDefaultDateRange();
  const monthLabels = useMemo(() => getMonthLabels(startDate, endDate), [startDate, endDate]);
  const weekdayLabels = useMemo(() => getWeekdayLabels(), []);
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 20
      }
    }
  };

  // Simple variant - just the grid
  if (variant === 'simple') {
    return (
      <div className={cn('flex gap-[3px]', className)}>
        {weeks.slice(0, 12).map((_, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-[3px]">
            {days.map((_, dayIndex) => (
              <Skeleton
                key={`${weekIndex}-${dayIndex}`}
                className="w-[11px] h-[11px] rounded-sm"
              />
            ))}
          </div>
        ))}
      </div>
    );
  }
  
  const MotionWrapper = showAnimation ? motion.div : 'div';
  const animationProps = showAnimation ? {
    initial: 'hidden',
    animate: 'visible',
    variants: containerVariants
  } : {};

  return (
    <MotionWrapper className={cn('space-y-4', className)} {...animationProps}>
      {/* Stats Summary Skeleton */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { icon: Calendar, label: 'Total snippets' },
          { icon: Flame, label: 'Current streak' },
          { icon: Trophy, label: 'Longest streak' }
        ].map((stat, index) => {
          const IconComponent = stat.icon;
          const ItemWrapper = showAnimation ? motion.div : 'div';
          const itemAnimationProps = showAnimation ? { variants: itemVariants } : {};
          
          return (
            <ItemWrapper key={index} className="text-center" {...itemAnimationProps}>
              <div className="flex items-center justify-center gap-2 mb-1">
                {variant === 'detailed' ? (
                  <IconComponent className="h-4 w-4 text-muted-foreground animate-pulse" />
                ) : (
                  <Skeleton className="h-4 w-4 rounded" />
                )}
                <Skeleton className="h-8 w-12" />
              </div>
              <Skeleton className="h-4 w-20 mx-auto" />
            </ItemWrapper>
          );
        })}
      </div>

      {/* Contribution Graph Skeleton */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-fit">
          {/* Month labels skeleton */}
          <div className="flex mb-2">
            <div className="w-8" />
            <div className="flex gap-8">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => (
                <Skeleton key={month} className="h-3 w-8" />
              ))}
            </div>
          </div>

          {/* Grid container */}
          <div className="flex mt-6">
            {/* Weekday labels skeleton */}
            <div className="flex flex-col justify-between pr-2">
              {days.map((_, index) => (
                <Skeleton
                  key={index}
                  className={cn(
                    'h-[11px] w-6',
                    index % 2 === 0 ? 'opacity-0' : 'opacity-100'
                  )}
                />
              ))}
            </div>

            {/* Contribution grid skeleton */}
            <div className="flex gap-[3px]">
              {weeks.map((_, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-[3px]">
                  {days.map((_, dayIndex) => (
                    <Skeleton
                      key={`${weekIndex}-${dayIndex}`}
                      className="w-[11px] h-[11px] rounded-sm"
                      style={{
                        animationDelay: `${(weekIndex * 7 + dayIndex) * 2}ms`,
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Legend skeleton */}
          <div className="flex items-center justify-end gap-2 mt-4">
            <Skeleton className="h-3 w-8" />
            <div className="flex gap-[3px]">
              {[0, 1, 2, 3, 4].map((level) => (
                <Skeleton
                  key={level}
                  className="w-[11px] h-[11px] rounded-sm"
                />
              ))}
            </div>
            <Skeleton className="h-3 w-8" />
          </div>
        </div>
      </div>

      {/* Best day info skeleton */}
      <div className="text-center">
        <Skeleton className="h-4 w-64 mx-auto" />
      </div>
    </MotionWrapper>
  );
}
