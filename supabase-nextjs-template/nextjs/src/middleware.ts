/**
 * NextJS Middleware for Authentication and Session Management
 * 
 * KEYWORDS: authentication, middleware, Supabase, session, NextJS, route protection
 * 
 * This middleware runs on every request to manage authentication sessions with Supabase.
 * It intercepts requests, refreshes auth tokens if needed, and ensures the session state
 * is properly maintained across the application.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

/**
 * Middleware function that processes each request
 * Updates the auth session by delegating to the Supabase middleware utility
 * 
 * @param request - The incoming Next.js request
 * @returns NextResponse with updated auth cookies and session information
 */
export async function middleware(request: NextRequest) {
    return await updateSession(request)
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
}