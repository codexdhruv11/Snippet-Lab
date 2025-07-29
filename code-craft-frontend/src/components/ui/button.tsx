"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/animations";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Custom variants for code editor
        execute: "bg-success text-success-foreground hover:bg-success/90",
        save: "bg-primary text-primary-foreground hover:bg-primary/90",
        cancel: "bg-muted text-muted-foreground hover:bg-muted/80",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  loadingText?: string;
  magic?: boolean;
  glow?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, isLoading = false, loadingText, children, disabled, magic = false, glow = false, ...props }, ref) => {
    const prefersReducedMotion = useReducedMotion();
    const Comp = asChild ? Slot : "button";
    
    // Combine disabled prop with isLoading
    const isDisabled = disabled || isLoading;
    
    if (magic && !asChild) {
      // Extract event handlers that might conflict with Framer Motion
      const {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        onAnimationStart: _onAnimationStart,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        onAnimationEnd: _onAnimationEnd,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        onDragStart: _onDragStart,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        onDragEnd: _onDragEnd,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        onDrag: _onDrag,
        ...motionSafeProps
      } = props;
      
      return (
        <motion.button
          className={cn(
            buttonVariants({ variant, size }),
            glow && "magic-glow-animation",
            className
          )}
          ref={ref}
          disabled={isDisabled}
          whileHover={
            !prefersReducedMotion && !isDisabled
              ? {
                  scale: 1.02,
                  transition: { duration: 0.2, type: "spring", stiffness: 400, damping: 25 },
                }
              : undefined
          }
          whileTap={
            !prefersReducedMotion && !isDisabled
              ? { scale: 0.98, transition: { duration: 0.1 } }
              : undefined
          }
          {...motionSafeProps}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {loadingText || children}
            </>
          ) : (
            children
          )}
        </motion.button>
      );
    }
    
    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size }),
          magic && "magic-button",
          glow && "magic-glow-animation",
          className
        )}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {loadingText || children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants }; 