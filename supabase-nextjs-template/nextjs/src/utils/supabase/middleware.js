/**
 * Supabase Middleware Utility for Next.js (JavaScript version)
 * 
 * KEYWORDS: Supabase, authentication, session management, cookies, middleware, SSR, JS
 * 
 * This file handles the session management for Supabase authentication in a Next.js application.
 * It creates a Supabase client that works with cookies in the middleware context.
 */
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

/**
 * Updates the session for the Supabase authentication
 * 
 * KEYWORDS: session refresh, authentication cookies, token refresh
 * 
 * This function:
 * 1. Creates a Supabase server client
 * 2. Configures cookie handling for the request/response cycle
 * 3. Refreshes the session if needed
 * 4. Returns a response with updated auth cookies
 * 
 * @param {NextRequest} request - The incoming Next.js request
 * @returns {NextResponse} Response with updated auth cookies
 */
export async function updateSession(request) {
    // Create initial response object
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });
    
    // Initialize Supabase client with cookie handling for SSR
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
        cookies: {
            /**
             * Get a cookie value from the request
             * @param {string} name - The cookie name to retrieve
             * @returns {string|undefined} The cookie value if found
             */
            get(name) {
                var _a;
                return (_a = request.cookies.get(name)) === null || _a === void 0 ? void 0 : _a.value;
            },
            
            /**
             * Set a cookie in both the request and response
             * @param {string} name - Cookie name
             * @param {string} value - Cookie value
             * @param {Object} options - Cookie options (path, domain, etc.)
             */
            set(name, value, options) {
                // If the cookie is updated, update the request and response
                request.cookies.set(Object.assign({ name,
                    value }, options));
                response = NextResponse.next({
                    request: {
                        headers: request.headers,
                    },
                });
                response.cookies.set(Object.assign({ name,
                    value }, options));
            },
            
            /**
             * Remove a cookie by setting its value to empty
             * @param {string} name - Cookie name to remove
             * @param {Object} options - Cookie options (path, domain, etc.)
             */
            remove(name, options) {
                // If the cookie is removed, update the request and response
                request.cookies.set(Object.assign({ name, value: '' }, options));
                response = NextResponse.next({
                    request: {
                        headers: request.headers,
                    },
                });
                response.cookies.set(Object.assign({ name, value: '' }, options));
            },
        },
    });
    
    // This will refresh session if expired - required for Server Components
    // https://supabase.com/docs/guides/auth/server-side/nextjs
    await supabase.auth.getUser();
    
    return response;
}
