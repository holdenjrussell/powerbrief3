import { NextRequest, NextResponse } from 'next/server';
import { CreatorAutomationService } from '@/lib/services/creatorAutomationService';

export async function POST(request: NextRequest) {
  try {
    const { testEmail = 'test@example.com' } = await request.json();

    // Your actual webhook URL
    const webhookUrl = 'https://primary-production-f140.up.railway.app/webhook/powerbrief-creator-acknowledgment';
    
    // Test data matching your n8n workflow structure with valid email addresses
    const testData = {
      creatorId: 'test-creator-123',
      creatorName: 'John Doe',
      creatorEmail: testEmail,
      brandId: 'test-brand-456',
      brandName: 'Test Brand Co.',
      brandEmail: 'support@powerbrief.ai', // Use verified sender instead
    };

    // Create automation service instance
    const automationService = new CreatorAutomationService();
    
    // Test the webhook directly
    await automationService.testWebhook(webhookUrl, testData);

    return NextResponse.json({
      success: true,
      message: 'Webhook test completed successfully! Check your email.',
      webhookUrl,
      testData
    });

  } catch (error) {
    console.error('Webhook test error:', error);
    return NextResponse.json(
      {
        error: 'Webhook test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
} 