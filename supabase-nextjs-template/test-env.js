// Test script to check for environment variables
require('dotenv').config({ path: './nextjs/.env.local' });
console.log("Testing environment variables:");
console.log("NEXT_PUBLIC_SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log("SUPABASE_SERVICE_ROLE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "exists (not showing value)" : "missing");
