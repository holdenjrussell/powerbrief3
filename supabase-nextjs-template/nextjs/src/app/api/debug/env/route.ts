import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const envCheck = {
      META_APP_ID: !!process.env.META_APP_ID,
      META_APP_SECRET: !!process.env.META_APP_SECRET,
      META_TOKEN_ENCRYPTION_KEY: !!process.env.META_TOKEN_ENCRYPTION_KEY,
      META_TOKEN_ENCRYPTION_KEY_LENGTH: process.env.META_TOKEN_ENCRYPTION_KEY?.length || 0,
      NEXT_PUBLIC_APP_URL: !!process.env.NEXT_PUBLIC_APP_URL,
    };

    return NextResponse.json({
      success: true,
      environment: envCheck
    });

  } catch (error) {
    console.error('Error in debug env API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 