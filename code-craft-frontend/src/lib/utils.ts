import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";

/**
 * Combines multiple class values into a single className string
 * Handles Tailwind CSS class conflicts
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a date string to a human-readable format
 */
export function formatDate(date: string | Date, formatStr: string = 'PP') {
  return format(new Date(date), formatStr);
}

/**
 * Formats a date to a relative time string (e.g., "2 days ago")
 */
export function formatRelativeDate(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

/**
 * Truncates text to a specified length with ellipsis
 */
export function truncateText(text: string, maxLength: number) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

/**
 * Detects current breakpoint based on window width
 */
export function getBreakpoint(): "mobile" | "tablet" | "desktop" {
  if (typeof window === "undefined") return "desktop"; // Default for SSR
  
  const width = window.innerWidth;
  if (width < 768) return "mobile";
  if (width < 1280) return "tablet";
  return "desktop";
}

/**
 * Detects if the device has touch capability
 */
export function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Validates an email address
 */
export function isValidEmail(email: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Checks if a password meets minimum requirements
 * - At least 8 characters
 * - Contains at least one uppercase letter
 * - Contains at least one lowercase letter
 * - Contains at least one number
 */
export function isStrongPassword(password: string) {
  if (password.length < 8) return false;
  
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  
  return hasUpperCase && hasLowerCase && hasNumbers;
}

/**
 * Gets the appropriate icon for a programming language
 */
export function getLanguageIcon(language: string) {
  // This would be expanded with more language mappings
  const languageMap: Record<string, string> = {
    javascript: 'logos:javascript',
    typescript: 'logos:typescript-icon',
    python: 'logos:python',
    java: 'logos:java',
    csharp: 'logos:c-sharp',
    cpp: 'logos:c-plusplus',
    ruby: 'logos:ruby',
    go: 'logos:go',
    php: 'logos:php',
    rust: 'logos:rust',
  };
  
  return languageMap[language.toLowerCase()] || 'mdi:code-tags';
}

/**
 * Debounces a function call
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Generates a random ID (client-side only to prevent hydration issues)
 */
export function generateId(length: number = 8): string {
  // During SSR, return a placeholder ID
  if (typeof window === 'undefined') {
    return `ssr-${length}-placeholder`;
  }
  
  // On client, generate a proper random ID
  return Math.random()
    .toString(36)
    .substring(2, length + 2);
}

/**
 * Copies text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    // Silent failure for copy operation
    return false;
  }
} 