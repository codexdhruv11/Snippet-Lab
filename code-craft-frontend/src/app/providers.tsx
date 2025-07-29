'use client';

import { useEffect } from 'react';

export function SuppressHydrationWarning({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Suppress hydration warnings caused by browser extensions
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      const originalError = console.error;
      console.error = (...args) => {
        if (
          args[0] && 
          typeof args[0] === 'string' && 
          (args[0].includes('bis_skin_checked') ||
           args[0].includes('Extra attributes from the server') ||
           args[0].includes('Hydration failed') ||
           args[0].includes('did not match') ||
           args[0].includes('Warning: Text content did not match') ||
           args[0].includes('Warning: Expected server HTML'))
        ) {
          // Log more details for debugging
          console.warn('Hydration warning suppressed:', args[0]);
          return;
        }
        originalError.apply(console, args);
      };
    }
  }, []);

  // Prevent hydration mismatch by not rendering until client-side
  return <div suppressHydrationWarning>{children}</div>;
}
