/**
 * Supabase Middleware Utility for Next.js
 * 
 * KEYWORDS: Supabase, authentication, session management, cookies, middleware, SSR
 * 
 * This file handles the session management for Supabase authentication in a Next.js application.
 * It creates a Supabase client that works with cookies in the middleware context.
 */
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

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
 * @param request - The incoming Next.js request
 * @returns NextResponse with updated auth cookies
 */
export async function updateSession(request: NextRequest) {
  // Create initial response object
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Initialize Supabase client with cookie handling for SSR
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        /**
         * Get a cookie value from the request
         * @param name - The cookie name to retrieve
         */
        get(name) {
          return request.cookies.get(name)?.value;
        },
        
        /**
         * Set a cookie in both the request and response
         * @param name - Cookie name
         * @param value - Cookie value
         * @param options - Cookie options (path, domain, etc.)
         */
        set(name, value, options) {
          // If the cookie is updated, update the request and response
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        
        /**
         * Remove a cookie by setting its value to empty
         * @param name - Cookie name to remove
         * @param options - Cookie options (path, domain, etc.)
         */
        remove(name, options) {
          // If the cookie is removed, update the request and response
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // This will refresh session if expired - required for Server Components
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  try {
    await supabase.auth.getUser();
  } catch (error) {
    // Log the error but don't crash the middleware
    console.warn('Middleware auth error:', error);
    // Continue processing the request even if auth fails
  }

  return response;
} 