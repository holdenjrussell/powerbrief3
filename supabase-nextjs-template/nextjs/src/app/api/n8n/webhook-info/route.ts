import { NextResponse } from 'next/server';

// GET - Get current webhook configuration
export async function GET() {
  const webhookUrl = process.env.NEXT_PUBLIC_N8N_CREATOR_ACKNOWLEDGEMENT_WEBHOOK || 
                     'https://primary-production-f140.up.railway.app/webhook/powerbrief-creator-acknowledgment';
  
  return NextResponse.json({
    webhookUrl,
    isConfigured: !!process.env.NEXT_PUBLIC_N8N_CREATOR_ACKNOWLEDGEMENT_WEBHOOK,
    environmentVariable: 'NEXT_PUBLIC_N8N_CREATOR_ACKNOWLEDGEMENT_WEBHOOK'
  });
} 