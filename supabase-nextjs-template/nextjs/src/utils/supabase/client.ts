/**
 * Supabase Client for Browser/Client-side Usage
 * 
 * KEYWORDS: Supabase, client-side, browser client, authentication, database
 * 
 * This file creates a Supabase client for client-side (browser) usage.
 * It's used for client-side authentication flows and data fetching.
 */
import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates and returns a Supabase client configured for browser usage
 * 
 * KEYWORDS: Supabase client factory, browser client
 * 
 * @returns A Supabase client instance for browser-side operations
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
} 