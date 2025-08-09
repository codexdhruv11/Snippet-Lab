import { useCallback, useState, useEffect } from 'react';

interface UseKeyboardNavigationOptions {
  onSelect?: (index: number) => void;
  onEscape?: () => void;
  loop?: boolean;
}

interface UseGridKeyboardNavigationOptions {
  onSelect?: (row: number, col: number) => void;
  onEscape?: () => void;
  wrap?: boolean;
  onNavigate?: (row: number, col: number) => void;
}

/**
 * Hook for keyboard navigation in lists
 */
export function useKeyboardNavigation(
  itemCount: number,
  options: UseKeyboardNavigationOptions = {}
) {
  const { onSelect, onEscape, loop = true } = options;
  const [activeIndex, setActiveIndex] = useState(-1);

  // Reset active index when item count changes
  useEffect(() => {
    if (activeIndex >= itemCount) {
      setActiveIndex(itemCount - 1);
    }
  }, [itemCount, activeIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((prev) => {
            if (prev === itemCount - 1) {
              return loop ? 0 : prev;
            }
            return prev + 1;
          });
          break;
          
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((prev) => {
            if (prev <= 0) {
              return loop ? itemCount - 1 : 0;
            }
            return prev - 1;
          });
          break;
          
        case 'Enter':
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < itemCount && onSelect) {
            onSelect(activeIndex);
          }
          break;
          
        case 'Escape':
          e.preventDefault();
          setActiveIndex(-1);
          if (onEscape) {
            onEscape();
          }
          break;
          
        case 'Home':
          e.preventDefault();
          setActiveIndex(0);
          break;
          
        case 'End':
          e.preventDefault();
          setActiveIndex(itemCount - 1);
          break;
          
        default:
          break;
      }
    },
    [itemCount, activeIndex, onSelect, onEscape, loop]
  );

  const selectItem = useCallback(
    (index: number) => {
      if (index >= 0 && index < itemCount) {
        setActiveIndex(index);
        if (onSelect) {
          onSelect(index);
        }
      }
    },
    [itemCount, onSelect]
  );

  const resetNavigation = useCallback(() => {
    setActiveIndex(-1);
  }, []);

  return {
    activeIndex,
    handleKeyDown,
    setActiveIndex,
    selectItem,
    resetNavigation,
  };
}

/**
 * Hook for keyboard navigation in 2D grids
 */
export function useGridKeyboardNavigation(
  rows: number,
  cols: number,
  options: UseGridKeyboardNavigationOptions = {}
) {
  const { onSelect, onEscape, wrap = false, onNavigate } = options;
  const [activePosition, setActivePosition] = useState<{ row: number; col: number } | null>(null);

  // Reset active position when grid size changes
  useEffect(() => {
    if (activePosition) {
      if (activePosition.row >= rows || activePosition.col >= cols) {
        setActivePosition({
          row: Math.min(activePosition.row, rows - 1),
          col: Math.min(activePosition.col, cols - 1),
        });
      }
    }
  }, [rows, cols, activePosition]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const { row = 0, col = 0 } = activePosition || {};
      let newRow = row;
      let newCol = col;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          if (row > 0) {
            newRow = row - 1;
          } else if (wrap && col > 0) {
            newRow = rows - 1;
            newCol = col - 1;
          }
          break;

        case 'ArrowDown':
          e.preventDefault();
          if (row < rows - 1) {
            newRow = row + 1;
          } else if (wrap && col < cols - 1) {
            newRow = 0;
            newCol = col + 1;
          }
          break;

        case 'ArrowLeft':
          e.preventDefault();
          if (col > 0) {
            newCol = col - 1;
          } else if (wrap && row > 0) {
            newCol = cols - 1;
            newRow = row - 1;
          }
          break;

        case 'ArrowRight':
          e.preventDefault();
          if (col < cols - 1) {
            newCol = col + 1;
          } else if (wrap && row < rows - 1) {
            newCol = 0;
            newRow = row + 1;
          }
          break;

        case 'Home':
          e.preventDefault();
          if (e.ctrlKey) {
            // Go to first cell
            newRow = 0;
            newCol = 0;
          } else {
            // Go to start of row
            newCol = 0;
          }
          break;

        case 'End':
          e.preventDefault();
          if (e.ctrlKey) {
            // Go to last cell
            newRow = rows - 1;
            newCol = cols - 1;
          } else {
            // Go to end of row
            newCol = cols - 1;
          }
          break;

        case 'PageUp':
          e.preventDefault();
          // Move up by 5 rows or to first row
          newRow = Math.max(0, row - 5);
          break;

        case 'PageDown':
          e.preventDefault();
          // Move down by 5 rows or to last row
          newRow = Math.min(rows - 1, row + 5);
          break;

        case 'Enter':
        case ' ':
          e.preventDefault();
          if (onSelect && activePosition) {
            onSelect(row, col);
          }
          break;

        case 'Escape':
          e.preventDefault();
          setActivePosition(null);
          if (onEscape) {
            onEscape();
          }
          break;

        default:
          return;
      }

      const newPosition = { row: newRow, col: newCol };
      setActivePosition(newPosition);
      
      if (onNavigate) {
        onNavigate(newRow, newCol);
      }
    },
    [rows, cols, activePosition, onSelect, onEscape, wrap, onNavigate]
  );

  const selectCell = useCallback(
    (row: number, col: number) => {
      if (row >= 0 && row < rows && col >= 0 && col < cols) {
        setActivePosition({ row, col });
        if (onSelect) {
          onSelect(row, col);
        }
      }
    },
    [rows, cols, onSelect]
  );

  const resetNavigation = useCallback(() => {
    setActivePosition(null);
  }, []);

  return {
    activePosition,
    handleKeyDown,
    setActivePosition,
    selectCell,
    resetNavigation,
  };
}
