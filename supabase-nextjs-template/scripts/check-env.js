/*
 * This script checks for required environment variables
 * Run with: node scripts/check-env.js
 */

console.log('🔍 Checking environment variables...');

const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

let missingVars = [];

for (const varName of requiredVars) {
  if (!process.env[varName]) {
    missingVars.push(varName);
  }
}

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\n🔴 Please add these variables to your .env.local file');
  console.error('   Example format:');
  console.error('   VARIABLE_NAME=your_value_here');
  
  // The following line helps debug service key formatting issues
  if (missingVars.includes('SUPABASE_SERVICE_ROLE_KEY')) {
    console.error('\n⚠️  Note about SUPABASE_SERVICE_ROLE_KEY:');
    console.error('   - Make sure there are no spaces around the = sign');
    console.error('   - Make sure the key doesn\'t have any line breaks');
    console.error('   - The service key should start with "eyJ..." and be a long string');
  }
  
  process.exit(1);
} else {
  console.log('✅ All required environment variables are set!');
  
  // Print first few characters of each variable to confirm they're loaded properly
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    console.log(`   - ${varName}: ${value.substring(0, 10)}...`);
  });
} 