// Test script to check for environment variables

console.log('Testing environment variables:');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'exists (not showing value)' : 'missing');

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('\nMissing SUPABASE_SERVICE_ROLE_KEY. Please add it to .env.local');
  console.log('Format: SUPABASE_SERVICE_ROLE_KEY=your_key_here');
} 