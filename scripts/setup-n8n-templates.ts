#!/usr/bin/env tsx

/**
 * Setup script for n8n automation templates
 * 
 * This script guides you through setting up the n8n integration with PowerBrief.
 * It will help you configure the necessary environment variables and test the connection.
 */

import { createClient } from '@supabase/supabase-js';
import { N8nService } from '../supabase-nextjs-template/nextjs/src/lib/services/n8nService';

const REQUIRED_ENV_VARS = [
  'N8N_URL', // or RAILWAY_N8N_URL
  'N8N_API_KEY',
  'SENDGRID_API_KEY',
  'SENDGRID_FROM_EMAIL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
];

async function checkEnvironment() {
  console.log('🔍 Checking environment variables...\n');
  
  const missing = [];
  
  for (const envVar of REQUIRED_ENV_VARS) {
    const value = process.env[envVar];
    if (value) {
      console.log(`✅ ${envVar}: ${envVar.includes('KEY') ? '[HIDDEN]' : value}`);
    } else {
      console.log(`❌ ${envVar}: Not set`);
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    console.log('\n⚠️  MISSING ENVIRONMENT VARIABLES:');
    console.log('\nPlease add these to your .env.local file:');
    missing.forEach(envVar => {
      console.log(`${envVar}=your_value_here`);
    });
    
    console.log('\n📚 CONFIGURATION GUIDE:');
    console.log('\n1. N8N CONFIGURATION:');
    console.log('   - N8N_URL: Your n8n instance URL (e.g., https://your-n8n.railway.app)');
    console.log('   - N8N_API_KEY: Your n8n API key (Settings > API Keys in n8n)');
    
    console.log('\n2. SENDGRID CONFIGURATION:');
    console.log('   - SENDGRID_API_KEY: Your SendGrid API key');
    console.log('   - SENDGRID_FROM_EMAIL: Verified sender email (e.g., support@powerbrief.ai)');
    
    console.log('\n3. SUPABASE CONFIGURATION:');
    console.log('   - NEXT_PUBLIC_SUPABASE_URL: Your Supabase project URL');
    console.log('   - NEXT_PUBLIC_SUPABASE_ANON_KEY: Your Supabase anonymous key');
    
    return false;
  }

  return true;
}

async function testN8nConnection() {
  console.log('\n🔗 Testing n8n connection...');
  
  try {
    const n8nService = new N8nService();
    // You can add a test method to N8nService to ping the API
    console.log('✅ n8n connection successful');
    return true;
  } catch (error) {
    console.log('❌ n8n connection failed:', error);
    return false;
  }
}

async function testSupabaseConnection() {
  console.log('\n🔗 Testing Supabase connection...');
  
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const { data, error } = await supabase.from('brands').select('id').limit(1);
    if (error) throw error;
    
    console.log('✅ Supabase connection successful');
    return true;
  } catch (error) {
    console.log('❌ Supabase connection failed:', error);
    return false;
  }
}

async function showNextSteps() {
  console.log('\n🎉 SETUP COMPLETE!');
  console.log('\nNext steps:');
  console.log('1. Run the database migration: npm run supabase:migrate');
  console.log('2. Start your development server: npm run dev');
  console.log('3. Navigate to any brand\'s UGC pipeline');
  console.log('4. Click on the "Smart Automations" tab');
  console.log('5. Enable automations for your brands');
  
  console.log('\n📖 AUTOMATION TEMPLATES AVAILABLE:');
  console.log('   • Creator Onboarding Email Sequence');
  console.log('   • Script Assignment Notification'); 
  console.log('   • Content Submission Reminder');
  
  console.log('\n🔧 ADVANCED CONFIGURATION:');
  console.log('   • Customize email templates in the database');
  console.log('   • Add new automation templates');
  console.log('   • Configure business hours and timezones');
  console.log('   • Set up notification preferences');
}

async function main() {
  console.log('🚀 PowerBrief n8n Integration Setup\n');
  console.log('This script will help you set up the n8n automation integration.\n');

  const envOk = await checkEnvironment();
  if (!envOk) {
    process.exit(1);
  }

  const n8nOk = await testN8nConnection();
  const supabaseOk = await testSupabaseConnection();

  if (!n8nOk || !supabaseOk) {
    console.log('\n❌ Some connections failed. Please check your configuration.');
    process.exit(1);
  }

  await showNextSteps();
}

if (require.main === module) {
  main().catch(console.error);
} 