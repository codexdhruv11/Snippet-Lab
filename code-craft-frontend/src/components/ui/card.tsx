import * as React from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/animations";

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { 
    hover?: boolean;
    glow?: boolean;
    magic?: boolean;
    delay?: number;
  }
>(({ className, hover = false, glow = false, magic = false, delay = 0, ...props }, ref) => {
  const prefersReducedMotion = useReducedMotion();

  if (magic) {
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
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          duration: prefersReducedMotion ? 0.1 : 0.3,
          delay: prefersReducedMotion ? 0 : delay,
          type: "spring",
          stiffness: 300,
          damping: 30,
        }}
        whileHover={
          hover && !prefersReducedMotion
            ? {
                scale: 1.02,
                y: -4,
                transition: { duration: 0.2, type: "spring", stiffness: 400, damping: 25 },
              }
            : undefined
        }
        whileTap={
          hover && !prefersReducedMotion
            ? { scale: 0.98, transition: { duration: 0.1 } }
            : undefined
        }
        className={cn(
          "rounded-xl border bg-card text-card-foreground shadow-sm",
          hover && "cursor-pointer transition-shadow duration-300",
          glow && "magic-card-glow",
          !glow && hover && "hover:shadow-lg",
          className
        )}
        {...motionSafeProps}
      />
    );
  }

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-sm",
        hover && "card-hover",
        glow && "magic-card-glow",
        className
      )}
      {...props}
    />
  );
});
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }; 