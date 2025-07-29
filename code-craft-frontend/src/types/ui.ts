import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

/**
 * Responsive breakpoints
 */
export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

/**
 * Theme options
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * Navigation item
 */
export interface NavigationItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  isExternal?: boolean;
}

/**
 * Mobile bottom navigation props
 */
export interface MobileBottomNavProps {
  items?: NavigationItem[];
  activeItem?: string;
  className?: string;
}

/**
 * Responsive layout props
 */
export interface ResponsiveLayoutProps {
  children: ReactNode;
  header?: ReactNode;
  sidebar?: ReactNode;
  footer?: ReactNode;
  showMobileNav?: boolean;
  hideHeaderOnMobile?: boolean;
  className?: string;
}

/**
 * Animation variants
 */
export interface AnimationVariants {
  hidden: object;
  visible: object;
  exit?: object;
}

/**
 * Staggered animation props
 */
export interface StaggerAnimationProps {
  children: ReactNode;
  staggerDelay?: number;
  className?: string;
  animateOnMount?: boolean;
}

/**
 * Code editor container props
 */
export interface CodeEditorProps {
  code: string;
  language: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: string;
  theme?: 'vs-dark' | 'vs-light';
  onMount?: (editor: unknown) => void;
}

/**
 * Execution panel props
 */
export interface ExecutionPanelProps {
  code: string;
  language: string;
  onSaveSnippet?: () => void;
  className?: string;
}

/**
 * Snippet card props
 */
export interface SnippetCardProps {
  snippet: {
    _id: string;
    title: string;
    language: string;
    code: string;
    author: {
      name: string;
      _id: string;
    };
    stars: number;
    comments: number;
    isStarred?: boolean;
    createdAt: string;
    tags?: string[];
  };
  onClick?: () => void;
  className?: string;
}

/**
 * Star button props
 */
export interface StarButtonProps {
  snippetId: string;
  isStarred?: boolean;
  starsCount: number;
  onToggle?: (isStarred: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Navigation state types
 */
export interface NavigationState {
  isSidebarOpen: boolean;
  activeTab: string;
}

/**
 * Animation variant types
 */
export type AnimationVariant = 
  | 'fadeIn'
  | 'slideUp'
  | 'slideIn'
  | 'scale'
  | 'staggeredList'
  | 'staggeredItem'
  | 'bottomSheet'
  | 'sidebar'
  | 'pageTransition';

export type AnimationPriority = 'P1' | 'P2';

/**
 * Component prop types
 */
export interface WithChildrenProps {
  children: ReactNode;
}

export interface WithClassNameProps {
  className?: string;
}

/**
 * Adaptive sidebar props
 */
export interface AdaptiveSidebarProps extends WithChildrenProps, WithClassNameProps {
  isOpen: boolean;
  onClose: () => void;
  position?: 'left' | 'right';
}

export interface LanguageSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export interface CommentListProps {
  snippetId: string;
  className?: string;
}

export interface SnippetFormProps {
  initialValues?: {
    title?: string;
    language?: string;
    code?: string;
    description?: string;
  };
  onSubmit: (values: {
    title: string;
    language: string;
    code: string;
    description?: string;
  }) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  className?: string;
} 