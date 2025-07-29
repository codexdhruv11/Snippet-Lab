'use client';

import React, { useRef, useEffect, ReactNode } from "react";
import { motion, useAnimation, useInView } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/animations";

// Magic Bento Animation Configuration
const MAGIC_BENTO_CONFIG = {
  // Animation durations
  duration: {
    micro: 200,
    short: 300,
    medium: 500,
    long: 800,
  },
  // Scale transforms
  scale: {
    hover: 1.02,
    active: 0.98,
    focus: 1.05,
  },
  // Spring configurations
  spring: {
    gentle: { type: "spring", stiffness: 300, damping: 30 },
    bouncy: { type: "spring", stiffness: 400, damping: 25 },
    smooth: { type: "spring", stiffness: 200, damping: 40 },
  },
  // Shadow elevations
  shadows: {
    low: "0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)",
    medium: "0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)",
    high: "0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)",
    glow: "0 0 20px rgba(132, 0, 255, 0.3)",
  },
  // Stagger delays
  stagger: {
    fast: 0.05,
    normal: 0.1,
    slow: 0.15,
  },
};

// Magic Bento Card Component
interface MagicBentoCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  delay?: number;
  scale?: keyof typeof MAGIC_BENTO_CONFIG.scale;
  shadow?: keyof typeof MAGIC_BENTO_CONFIG.shadows;
  onClick?: () => void;
  href?: string;
}

export function MagicBentoCard({
  children,
  className,
  hover = true,
  glow = false,
  delay = 0,
  scale = "hover",
  shadow = "medium",
  onClick,
  href,
}: MagicBentoCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-10%" });
  const prefersReducedMotion = useReducedMotion();
  const controls = useAnimation();

  const cardVariants = {
    hidden: {
      opacity: 0,
      y: 20,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: prefersReducedMotion ? 0.1 : MAGIC_BENTO_CONFIG.duration.short / 1000,
        delay: prefersReducedMotion ? 0 : delay,
        ...MAGIC_BENTO_CONFIG.spring.gentle,
      },
    },
  };

  const hoverVariants = hover ? {
    scale: prefersReducedMotion ? 1 : MAGIC_BENTO_CONFIG.scale[scale],
    boxShadow: prefersReducedMotion ? undefined : MAGIC_BENTO_CONFIG.shadows[shadow],
    transition: {
      duration: MAGIC_BENTO_CONFIG.duration.micro / 1000,
      ...MAGIC_BENTO_CONFIG.spring.smooth,
    },
  } : {};

  // Glow effect is handled via CSS classes

  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    }
  }, [isInView, controls]);

  const Component = href ? motion.a : motion.div;
  const componentProps = href ? { href } : {};

  return (
    <Component
      ref={ref as any}
      className={cn(
        "rounded-xl border bg-card text-card-foreground overflow-hidden",
        "transition-all duration-300 cursor-pointer",
        glow && "animate-pulse",
        className
      )}
      variants={cardVariants}
      initial="hidden"
      animate={controls}
      whileHover={hoverVariants}
      whileTap={{ scale: prefersReducedMotion ? 1 : MAGIC_BENTO_CONFIG.scale.active }}
      onClick={onClick}
      {...componentProps}
    >
      {children}
    </Component>
  );
}

// Magic Bento Grid Component
interface MagicBentoGridProps {
  children: ReactNode;
  className?: string;
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: number;
  stagger?: keyof typeof MAGIC_BENTO_CONFIG.stagger;
}

export function MagicBentoGrid({
  children,
  className,
  columns = { mobile: 1, tablet: 2, desktop: 3 },
  gap = 6,
  stagger = "normal",
}: MagicBentoGridProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-10%" });
  const prefersReducedMotion = useReducedMotion();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : MAGIC_BENTO_CONFIG.stagger[stagger],
        delayChildren: prefersReducedMotion ? 0 : 0.1,
      },
    },
  };

  const gridClasses = cn(
    "grid",
    `grid-cols-${columns.mobile}`,
    `tablet:grid-cols-${columns.tablet}`,
    `desktop:grid-cols-${columns.desktop}`,
    `gap-${gap}`,
    className
  );

  return (
    <motion.div
      ref={ref}
      className={gridClasses}
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div
          key={index}
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { 
              opacity: 1, 
              y: 0,
              transition: {
                duration: prefersReducedMotion ? 0.1 : MAGIC_BENTO_CONFIG.duration.short / 1000,
                ...MAGIC_BENTO_CONFIG.spring.gentle,
              },
            },
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

// Magic Bento Button Component
interface MagicBentoButtonProps {
  children: ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  glow?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}

export function MagicBentoButton({
  children,
  className,
  variant = "primary",
  size = "md",
  glow = false,
  onClick,
  disabled = false,
  type = "button",
}: MagicBentoButtonProps) {
  const prefersReducedMotion = useReducedMotion();

  const baseClasses = "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
  
  const variantClasses = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
  };

  const sizeClasses = {
    sm: "h-9 px-3 text-sm",
    md: "h-10 px-4 py-2",
    lg: "h-11 px-8",
  };

  const buttonVariants = {
    hover: {
      scale: prefersReducedMotion ? 1 : 1.02,
      transition: {
        duration: MAGIC_BENTO_CONFIG.duration.micro / 1000,
        ...MAGIC_BENTO_CONFIG.spring.smooth,
      },
    },
    tap: {
      scale: prefersReducedMotion ? 1 : 0.98,
      transition: {
        duration: MAGIC_BENTO_CONFIG.duration.micro / 1000,
      },
    },
  };

  const glowVariants = glow ? {
    boxShadow: [
      "0 0 0 rgba(132, 0, 255, 0)",
      "0 0 20px rgba(132, 0, 255, 0.5)",
      "0 0 0 rgba(132, 0, 255, 0)",
    ],
    transition: {
      duration: MAGIC_BENTO_CONFIG.duration.long / 1000,
      repeat: Infinity,
      repeatType: "reverse" as const,
    },
  } : {};

  return (
    <motion.button
      type={type}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      variants={buttonVariants}
      whileHover={disabled ? undefined : "hover"}
      whileTap={disabled ? undefined : "tap"}
      animate={glow && !disabled ? glowVariants : undefined}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </motion.button>
  );
}

// Magic Bento Container Component
interface MagicBentoContainerProps {
  children: ReactNode;
  className?: string;
  fadeIn?: boolean;
  slideDirection?: "up" | "down" | "left" | "right";
}

export function MagicBentoContainer({
  children,
  className,
  fadeIn = true,
  slideDirection = "up",
}: MagicBentoContainerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-10%" });
  const prefersReducedMotion = useReducedMotion();

  const slideVariants = {
    up: { y: 20 },
    down: { y: -20 },
    left: { x: 20 },
    right: { x: -20 },
  };

  const containerVariants = {
    hidden: {
      opacity: fadeIn ? 0 : 1,
      ...slideVariants[slideDirection],
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0.1 : MAGIC_BENTO_CONFIG.duration.medium / 1000,
        ...MAGIC_BENTO_CONFIG.spring.gentle,
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
    >
      {children}
    </motion.div>
  );
}

// Export configuration for external use
export { MAGIC_BENTO_CONFIG };