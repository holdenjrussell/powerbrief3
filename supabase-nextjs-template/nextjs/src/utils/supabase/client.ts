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
 * Clear corrupted Supabase cookies to prevent parsing errors
 */
function clearSupabaseCookies() {
  if (typeof window !== 'undefined') {
    // Get all cookies
    const cookies = document.cookie.split(';');
    
    // Find and clear Supabase-related cookies
    cookies.forEach(cookie => {
      const [name] = cookie.split('=');
      const cookieName = name.trim();
      
      // Clear Supabase auth cookies
      if (cookieName.includes('supabase') || 
          cookieName.includes('sb-') || 
          cookieName.includes('auth-token')) {
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}; SameSite=Lax`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
        console.log(`[Supabase Client] Cleared corrupted cookie: ${cookieName}`);
      }
    });
  }
}

/**
 * Creates and returns a Supabase client configured for browser usage
 * 
 * KEYWORDS: Supabase client factory, browser client
 * 
 * @returns A Supabase client instance for browser-side operations
 */
export function createClient() {
  try {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          // Add error handling for storage operations
          storage: {
            getItem: (key: string) => {
              try {
                if (typeof window !== 'undefined') {
                  return localStorage.getItem(key);
                }
                return null;
              } catch (error) {
                console.warn(`[Supabase Client] Error getting item ${key}:`, error);
                return null;
              }
            },
            setItem: (key: string, value: string) => {
              try {
                if (typeof window !== 'undefined') {
                  localStorage.setItem(key, value);
                }
              } catch (error) {
                console.warn(`[Supabase Client] Error setting item ${key}:`, error);
              }
            },
            removeItem: (key: string) => {
              try {
                if (typeof window !== 'undefined') {
                  localStorage.removeItem(key);
                }
              } catch (error) {
                console.warn(`[Supabase Client] Error removing item ${key}:`, error);
              }
            }
          }
        }
      }
    );
  } catch (error) {
    console.error('[Supabase Client] Error creating client, clearing cookies:', error);
    clearSupabaseCookies();
    
    // Retry creating client after clearing cookies
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
} 