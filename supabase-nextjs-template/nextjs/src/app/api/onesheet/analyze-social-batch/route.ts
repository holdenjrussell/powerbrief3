import { NextRequest, NextResponse } from 'next/server';

interface BatchSocialAnalysisRequest {
  urls: string[];
  sourceType: 'organic_social' | 'paid_social';
  brandId: string;
}

export async function POST(request: NextRequest) {
  try {
    const { urls, sourceType, brandId }: BatchSocialAnalysisRequest = await request.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: 'URLs array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (!sourceType || !brandId) {
      return NextResponse.json(
        { error: 'Source type and brand ID are required' },
        { status: 400 }
      );
    }

    // Validate source type
    if (!['organic_social', 'paid_social'].includes(sourceType)) {
      return NextResponse.json(
        { error: 'Invalid source type. Must be organic_social or paid_social' },
        { status: 400 }
      );
    }

    console.log(`[BatchSocialAnalysis] Processing ${urls.length} URLs for batch analysis`);

    // Process each URL with the existing single analysis endpoint
    const results = [];
    const errors = [];

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i].trim();
      if (!url) continue;

      try {
        console.log(`[BatchSocialAnalysis] Processing ${i + 1}/${urls.length}: ${url}`);
        
        // Call the existing single analysis endpoint
        const analysisResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/onesheet/analyze-social`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('Cookie') || '' // Forward cookies for auth
          },
          body: JSON.stringify({
            url,
            sourceType,
            brandId
          }),
        });

        if (analysisResponse.ok) {
          const analysisData = await analysisResponse.json();
          results.push({
            url,
            status: 'completed',
            data: analysisData
          });
        } else {
          const errorData = await analysisResponse.json().catch(() => ({}));
          errors.push({
            url,
            status: 'failed',
            error: errorData.error || `HTTP ${analysisResponse.status}`
          });
        }
      } catch (error) {
        console.error(`[BatchSocialAnalysis] Error processing ${url}:`, error);
        errors.push({
          url,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Add small delay between requests to avoid overwhelming the system
      if (i < urls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`[BatchSocialAnalysis] Batch complete: ${results.length} successful, ${errors.length} failed`);

    return NextResponse.json({
      success: true,
      message: `Processed ${results.length + errors.length} URLs. ${results.length} successful, ${errors.length} failed.`,
      results,
      errors,
      total: urls.length,
      successful: results.length,
      failed: errors.length
    });

  } catch (error) {
    console.error('[BatchSocialAnalysis] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to process batch social media content', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 