'use client';

import { useEffect, useState } from 'react';
import { AnimationVariants } from '@/types/ui';
import { ANIMATION_PRIORITIES } from './constants';

/**
 * Check if user prefers reduced motion
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check for the prefers-reduced-motion media query
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    // Add listener for changes
    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

// Fallback animation variants if ReactBits is not available
const fallbackAnimations = {
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.4 } }
  },
  slideUp: {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.4 } }
  },
  slideDown: {
    hidden: { y: -20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.4 } }
  },
  slideLeft: {
    hidden: { x: 20, opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { duration: 0.4 } }
  },
  slideRight: {
    hidden: { x: -20, opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { duration: 0.4 } }
  },
  scaleIn: {
    hidden: { scale: 0.8, opacity: 0 },
    visible: { scale: 1, opacity: 1, transition: { duration: 0.4 } }
  },
  staggerContainer: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  },
  staggerItem: {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  },
  bounceIn: {
    hidden: { scale: 0, opacity: 0 },
    visible: { 
      scale: 1, 
      opacity: 1, 
      transition: { 
        type: "spring", 
        stiffness: 400, 
        damping: 10 
      } 
    }
  },
  rotateIn: {
    hidden: { rotate: -180, opacity: 0 },
    visible: { rotate: 0, opacity: 1, transition: { duration: 0.5 } }
  }
};

// Use built-in animations instead of external package
export const fadeIn = fallbackAnimations.fadeIn;
export const slideUp = fallbackAnimations.slideUp;
export const slideDown = fallbackAnimations.slideDown;
export const slideLeft = fallbackAnimations.slideLeft;
export const slideRight = fallbackAnimations.slideRight;
export const scaleIn = fallbackAnimations.scaleIn;
export const staggerContainer = fallbackAnimations.staggerContainer;
export const staggerItem = fallbackAnimations.staggerItem;
export const bounceIn = fallbackAnimations.bounceIn;
export const rotateIn = fallbackAnimations.rotateIn;

/**
 * Custom animation variants for Framer Motion (fallback if ReactBits not available)
 */
export const fadeInFallback: AnimationVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.4 }
  }
};

export const slideIn: AnimationVariants = {
  hidden: { 
    opacity: 0,
    x: -20
  },
  visible: { 
    opacity: 1,
    x: 0,
    transition: { 
      duration: 0.3,
      ease: [0.25, 0.1, 0.25, 1.0]
    }
  },
  exit: { 
    opacity: 0,
    x: -10,
    transition: { 
      duration: 0.2,
      ease: 'easeIn'
    }
  }
};

export const scale: AnimationVariants = {
  hidden: { 
    opacity: 0,
    scale: 0.9
  },
  visible: { 
    opacity: 1,
    scale: 1,
    transition: { 
      duration: 0.3,
      ease: [0.25, 0.1, 0.25, 1.0]
    }
  },
  exit: { 
    opacity: 0,
    scale: 0.95,
    transition: { 
      duration: 0.2,
      ease: 'easeIn'
    }
  }
};

/**
 * Staggered animation for lists
 */
export const staggeredList: AnimationVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

export const staggeredItem: AnimationVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut'
    }
  }
};

/**
 * Mobile bottom sheet animation
 */
export const bottomSheet: AnimationVariants = {
  hidden: { 
    opacity: 0,
    y: '100%'
  },
  visible: { 
    opacity: 1,
    y: 0,
    transition: { 
      duration: 0.3,
      ease: [0.25, 0.1, 0.25, 1.0]
    }
  },
  exit: { 
    opacity: 0,
    y: '100%',
    transition: { 
      duration: 0.2,
      ease: 'easeIn'
    }
  }
};

/**
 * Sidebar animation
 */
export const sidebar: AnimationVariants = {
  hidden: { 
    opacity: 0,
    x: '-100%'
  },
  visible: { 
    opacity: 1,
    x: 0,
    transition: { 
      duration: 0.3,
      ease: [0.25, 0.1, 0.25, 1.0]
    }
  },
  exit: { 
    opacity: 0,
    x: '-100%',
    transition: { 
      duration: 0.2,
      ease: 'easeIn'
    }
  }
};

/**
 * Page transition animation
 */
export const pageTransition: AnimationVariants = {
  hidden: { 
    opacity: 0
  },
  visible: { 
    opacity: 1,
    transition: { 
      duration: 0.3,
      ease: 'easeOut',
      when: 'beforeChildren'
    }
  },
  exit: { 
    opacity: 0,
    transition: { 
      duration: 0.2,
      ease: 'easeIn'
    }
  }
};

/**
 * Get animation variants based on user preferences
 */
export function getAccessibleAnimationVariants(
  variants: AnimationVariants,
  prefersReducedMotion: boolean
): AnimationVariants {
  if (prefersReducedMotion) {
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.1 } },
      exit: { opacity: 0, transition: { duration: 0.1 } },
    };
  }
  return variants;
}

/**
 * Animation collection
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const animations = {
  fadeIn,
  slideUp,
  slideIn,
  scale,
  staggeredList,
  staggeredItem,
  bottomSheet,
  sidebar,
  pageTransition
};

/**
 * Hook to check if an animation should be enabled based on priority
 */
export function useIsAnimationEnabled(priority: 'P1' | 'P2', type: keyof typeof ANIMATION_PRIORITIES['P1'] | keyof typeof ANIMATION_PRIORITIES['P2']): boolean {
  const prefersReducedMotion = useReducedMotion();
  
  if (prefersReducedMotion) return false;
  
  return ANIMATION_PRIORITIES[priority][type] ?? false;
}
