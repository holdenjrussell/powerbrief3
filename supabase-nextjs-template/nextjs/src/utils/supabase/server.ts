/**
 * Supabase Client for Server-side Usage
 * 
 * KEYWORDS: Supabase, server-side, SSR, authentication, database, cookies
 * 
 * This file creates a Supabase client for server-side operations in Next.js.
 * It's used for server-side rendering and API routes to access Supabase.
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Creates and returns a Supabase client configured for server-side usage
 * 
 * KEYWORDS: Supabase server client, cookie management, server components
 * 
 * This function:
 * 1. Gets the cookie store from Next.js
 * 2. Creates a server client with cookie handling for SSR
 * 3. Handles cookie operations for authentication
 * 
 * @returns A Supabase client instance for server-side operations
 */
export async function createClient() {
  // Get the cookie store from Next.js
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        /**
         * Get all cookies from the cookie store
         * @returns All cookies from the Next.js cookie store
         */
        getAll() {
          return cookieStore.getAll();
        },
        
        /**
         * Set multiple cookies in the cookie store
         * @param cookiesToSet Array of cookies to set with name, value, and options
         */
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The setAll method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );
} 