import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Protected routes that require authentication
// const protectedRoutes = [
//   '/editor',
//   '/profile',
//   '/snippets/starred',
//   '/executions',
// ];

// Routes that should redirect to dashboard if already authenticated
// const authRoutes = [
//   '/login',
//   '/register',
// ];

export function middleware(_request: NextRequest) {
  // Note: We can't access localStorage in middleware (server-side)
  // So we'll handle authentication checks on the client-side instead
  // This middleware will only handle basic route protection
  
  // const { pathname } = request.nextUrl;
  
  // For now, let client-side handle authentication checks
  // This prevents server-side/client-side mismatches
  
  return NextResponse.next();
}

// Configure the paths that should invoke this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}; 