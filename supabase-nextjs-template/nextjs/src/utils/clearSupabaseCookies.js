/**
 * Utility to clear corrupted Supabase cookies
 * Run this in the browser console if you encounter cookie parsing errors
 */

function clearSupabaseCookies() {
  console.log('🧹 Clearing corrupted Supabase cookies...');
  
  // Clear localStorage
  if (typeof localStorage !== 'undefined') {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes('supabase') || key.includes('sb-')) {
        localStorage.removeItem(key);
        console.log(`Cleared localStorage: ${key}`);
      }
    });
  }
  
  // Clear sessionStorage
  if (typeof sessionStorage !== 'undefined') {
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.includes('supabase') || key.includes('sb-')) {
        sessionStorage.removeItem(key);
        console.log(`Cleared sessionStorage: ${key}`);
      }
    });
  }
  
  // Clear cookies
  if (typeof document !== 'undefined') {
    const cookies = document.cookie.split(';');
    cookies.forEach(cookie => {
      const [name] = cookie.split('=');
      const cookieName = name.trim();
      
      if (cookieName.includes('supabase') || 
          cookieName.includes('sb-') || 
          cookieName.includes('auth-token')) {
        // Clear for current domain
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
        // Clear for current domain with specific domain
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}; SameSite=Lax`;
        // Clear for localhost specifically
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=localhost; SameSite=Lax`;
        console.log(`Cleared cookie: ${cookieName}`);
      }
    });
  }
  
  console.log('✅ Finished clearing Supabase cookies. Please refresh the page.');
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = clearSupabaseCookies;
}

// Make available globally in browser
if (typeof window !== 'undefined') {
  window.clearSupabaseCookies = clearSupabaseCookies;
}

// Auto-run if called directly
if (typeof window !== 'undefined' && window.location) {
  console.log('🔧 Supabase Cookie Cleaner loaded. Run clearSupabaseCookies() if needed.');
} 