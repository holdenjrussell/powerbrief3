/**
 * NextJS Middleware for Authentication and Session Management (JavaScript version)
 * 
 * KEYWORDS: authentication, middleware, Supabase, session, NextJS, route protection, JS
 * 
 * This middleware runs on every request to manage authentication sessions with Supabase.
 * It intercepts requests, refreshes auth tokens if needed, and ensures the session state
 * is properly maintained across the application.
 */
import { updateSession } from '@/utils/supabase/middleware';

/**
 * Middleware function that processes each request
 * Updates the auth session by delegating to the Supabase middleware utility
 * 
 * @param {NextRequest} request - The incoming Next.js request
 * @returns {NextResponse} Response with updated auth cookies and session information
 */
export async function middleware(request) {
    return await updateSession(request);
}

/**
 * Middleware configuration defining which routes should be processed
 * 
 * KEYWORDS: routing, matcher, middleware config
 */
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
