import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { VariableSizeGrid as Grid } from 'react-window';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  getContributionLevel,
  getContributionColor,
  formatContributionTooltip,
  getWeekdayLabels,
  getMonthLabels,
  CONTRIBUTION_THEMES,
} from '@/utils/contributionUtils';
import type { ContributionDay } from '@/types/user';

interface ContributionThresholds {
  low: number;
  medium: number;
  high: number;
}

interface ContributionGraphVirtualizedProps {
  userId: string;
  className?: string;
  contributionData: ContributionDay[];
  contributionGrid: ContributionDay[][];
  stats: {
    totalContributions: number;
    longestStreak: number;
    currentStreak: number;
    bestDay?: { date: string; count: number };
  } | null;
  thresholds?: ContributionThresholds;
  theme?: keyof typeof CONTRIBUTION_THEMES;
  colors?: {
    none?: string;
    low?: string;
    medium?: string;
    high?: string;
    max?: string;
  };
  enableKeyboardNavigation?: boolean;
  enableAnimations?: boolean;
  onContributionClick?: (date: string, count: number) => void;
  onContributionHover?: (date: string, count: number) => void;
  getContributionLevel?: (count: number) => number;
  getCustomContributionColor?: (level: number) => string;
  squareSize?: number;
  gap?: number;
  showMonthLabels?: boolean;
  showWeekdayLabels?: boolean;
  ariaLabel?: string;
}

interface CellProps {
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
  data: {
    grid: ContributionDay[][];
    squareSize: number;
    theme: keyof typeof CONTRIBUTION_THEMES;
    onSquareClick?: (day: ContributionDay) => void;
    focusedCell: { row: number; col: number } | null;
  };
}

const Cell: React.FC<CellProps> = ({ columnIndex, rowIndex, style, data }) => {
  const { grid, squareSize, theme, onSquareClick, focusedCell } = data;
  
  // Skip rendering if out of bounds
  if (columnIndex >= grid.length || rowIndex >= 7) {
    return null;
  }
  
  const week = grid[columnIndex];
  if (!week || rowIndex >= week.length) {
    return null;
  }
  
  const day = week[rowIndex];
  const level = getContributionLevel(day.count);
  const colorClass = getContributionColor(level, theme);
  const isFocused = focusedCell?.row === rowIndex && focusedCell?.col === columnIndex;
  
  return (
    <div style={style}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={cn(
                'transition-all duration-200 rounded-sm cursor-pointer focus:outline-none',
                colorClass,
                isFocused && 'ring-2 ring-primary ring-offset-1',
                'transform hover:scale-110'
              )}
              style={{
                width: squareSize,
                height: squareSize,
              }}
              onClick={() => onSquareClick?.(day)}
              aria-label={formatContributionTooltip(day.date, day.count)}
              data-row={rowIndex}
              data-col={columnIndex}
            />
          </TooltipTrigger>
          <TooltipContent>
            <p>{formatContributionTooltip(day.date, day.count)}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export const ContributionGraphVirtualized: React.FC<ContributionGraphVirtualizedProps> = ({
  userId,
  className,
  contributionData,
  contributionGrid,
  stats,
  thresholds,
  theme = 'default',
  colors,
  enableKeyboardNavigation = true,
  enableAnimations = true,
  onContributionClick,
  onContributionHover,
  getContributionLevel,
  getCustomContributionColor,
  squareSize = 11,
  gap = 3,
  showMonthLabels = true,
  showWeekdayLabels = true,
  ariaLabel = 'Contribution graph',
}) => {
  const gridRef = useRef<Grid>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [focusedCell, setFocusedCell] = React.useState<{ row: number; col: number } | null>(null);
  
  const cellSize = squareSize + gap;
  const weekdayLabels = getWeekdayLabels();
  const monthLabels = useMemo(() => {
    if (!showMonthLabels || contributionGrid.length === 0) return [];
    
    // Calculate month labels based on the grid data
    const labels: Array<{ label: string; weekIndex: number }> = [];
    let currentMonth = -1;
    
    contributionGrid.forEach((week, weekIndex) => {
      if (week.length > 0) {
        const firstDay = new Date(week[0].date);
        const month = firstDay.getMonth();
        
        if (month !== currentMonth) {
          currentMonth = month;
          labels.push({
            label: format(firstDay, 'MMM'),
            weekIndex,
          });
        }
      }
    });
    
    return labels;
  }, [contributionGrid, showMonthLabels]);
  
  // Column width calculator
  const getColumnWidth = useCallback(() => cellSize, [cellSize]);
  
  // Row height calculator
  const getRowHeight = useCallback(() => cellSize, [cellSize]);
  
  // Item data for cells
  const itemData = useMemo(
    () => ({
      grid: contributionGrid,
      squareSize,
      theme,
      onSquareClick: onContributionClick ? (day: ContributionDay) => onContributionClick(day.date, day.count) : undefined,
      focusedCell,
      getContributionLevel,
      getCustomContributionColor,
    }),
    [contributionGrid, squareSize, theme, onContributionClick, focusedCell, getContributionLevel, getCustomContributionColor]
  );
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) return;
      
      const { row = 0, col = 0 } = focusedCell || {};
      let newRow = row;
      let newCol = col;
      
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          newRow = Math.max(0, row - 1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          newRow = Math.min(6, row + 1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          newCol = Math.max(0, col - 1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          newCol = Math.min(contributionGrid.length - 1, col + 1);
          break;
        case 'Home':
          e.preventDefault();
          if (e.ctrlKey) {
            newRow = 0;
            newCol = 0;
          } else {
            newCol = 0;
          }
          break;
        case 'End':
          e.preventDefault();
          if (e.ctrlKey) {
            newRow = 6;
            newCol = contributionGrid.length - 1;
          } else {
            newCol = contributionGrid.length - 1;
          }
          break;
        case 'PageUp':
          e.preventDefault();
          newCol = Math.max(0, col - 4);
          break;
        case 'PageDown':
          e.preventDefault();
          newCol = Math.min(contributionGrid.length - 1, col + 4);
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (contributionGrid[col] && contributionGrid[col][row]) {
            const day = contributionGrid[col][row];
            onContributionClick?.(day.date, day.count);
          }
          break;
        default:
          return;
      }
      
      setFocusedCell({ row: newRow, col: newCol });
      
      // Scroll to the focused cell
      gridRef.current?.scrollToItem({
        align: 'auto',
        columnIndex: newCol,
        rowIndex: newRow,
      });
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedCell, contributionGrid, onContributionClick]);
  
  // Click handler to set focus
  const handleGridClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const row = parseInt(target.getAttribute('data-row') || '0', 10);
    const col = parseInt(target.getAttribute('data-col') || '0', 10);
    
    if (!isNaN(row) && !isNaN(col)) {
      setFocusedCell({ row, col });
    }
  }, []);
  
  const gridHeight = 7 * cellSize;
  const gridWidth = Math.min(contributionGrid.length * cellSize, window.innerWidth - 100);
  
  return (
    <div
      ref={containerRef}
      className={cn('relative', className)}
      role="application"
      aria-label={ariaLabel}
      onClick={handleGridClick}
    >
      {/* Month labels */}
      {showMonthLabels && (
        <div
          className="flex mb-2"
          style={{ marginLeft: showWeekdayLabels ? cellSize + 10 : 0 }}
        >
          {monthLabels.map((month, index) => (
            <div
              key={`${month.label}-${index}`}
              className="text-xs text-muted-foreground"
              style={{
                position: 'absolute',
                left: month.weekIndex * cellSize,
              }}
            >
              {month.label}
            </div>
          ))}
        </div>
      )}
      
      <div className="flex gap-2">
        {/* Weekday labels */}
        {showWeekdayLabels && (
          <div className="flex flex-col justify-between" style={{ height: gridHeight }}>
            {weekdayLabels.map((label, index) => (
              <div
                key={label}
                className="text-xs text-muted-foreground"
                style={{ height: cellSize, lineHeight: `${cellSize}px` }}
              >
                {index % 2 === 0 ? label : ''}
              </div>
            ))}
          </div>
        )}
        
        {/* Virtualized grid */}
        <div className="overflow-auto">
          <Grid
            ref={gridRef}
            columnCount={contributionGrid.length}
            columnWidth={getColumnWidth}
            height={gridHeight}
            rowCount={7}
            rowHeight={getRowHeight}
            width={gridWidth}
            itemData={itemData}
            className="focus:outline-none"
            style={{
              overflowX: 'auto',
              overflowY: 'hidden',
            }}
          >
            {Cell}
          </Grid>
        </div>
      </div>
      
      {/* Screen reader announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {focusedCell && contributionGrid[focusedCell.col] && contributionGrid[focusedCell.col][focusedCell.row] && (
          <span>
            {formatContributionTooltip(
              contributionGrid[focusedCell.col][focusedCell.row].date,
              contributionGrid[focusedCell.col][focusedCell.row].count
            )}
          </span>
        )}
      </div>
    </div>
  );
};
