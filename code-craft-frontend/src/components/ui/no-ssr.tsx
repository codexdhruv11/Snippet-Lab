'use client';

import dynamic from 'next/dynamic';
import { ReactNode } from 'react';

interface NoSSRProps {
  children: ReactNode;
  fallback?: ReactNode;
}

function NoSSRComponent({ children }: NoSSRProps) {
  return <>{children}</>;
}

// Create the NoSSR component using dynamic import with ssr: false
export const NoSSR = dynamic(() => Promise.resolve(NoSSRComponent), {
  ssr: false,
  loading: ({ error, isLoading }) => {
    if (error) return <div>Error loading component</div>;
    if (isLoading) return <div></div>; // Return empty div during loading
    return <div></div>;
  }
});

export default NoSSR;
