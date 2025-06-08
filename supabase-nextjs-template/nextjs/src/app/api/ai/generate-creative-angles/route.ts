import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { productInfo, offer, targetAudience } = await req.json();

    // Validate required fields
    if (!productInfo?.trim()) {
      return NextResponse.json(
        { error: 'Product information is required' },
        { status: 400 }
      );
    }

    // For now, return sample data. In production, this would call an AI service
    const sampleAngles = [
      {
        angle: `Transform your ${targetAudience || 'daily routine'} with ${productInfo}`,
        rationale: 'Appeals to desire for improvement and positions product as transformative',
        emotion: 'Aspiration',
        visuals: 'Before/after scenarios, transformation imagery'
      },
      {
        angle: `Join thousands who have already discovered ${productInfo}`,
        rationale: 'Uses social proof and curiosity to drive engagement',
        emotion: 'FOMO',
        visuals: 'Community imagery, testimonials, numbers/stats'
      },
      {
        angle: `Finally, ${productInfo} that actually works`,
        rationale: 'Addresses frustration with existing solutions and promises reliability',
        emotion: 'Relief',
        visuals: 'Problem-solving imagery, satisfied customers'
      },
      {
        angle: `${offer ? `${offer} - ` : ''}Experience ${productInfo} like never before`,
        rationale: 'Creates excitement and positions as innovative solution',
        emotion: 'Excitement',
        visuals: 'Dynamic product shots, energetic lifestyle imagery'
      },
      {
        angle: `Why ${targetAudience || 'smart shoppers'} choose ${productInfo}`,
        rationale: 'Appeals to intelligence and social validation',
        emotion: 'Trust',
        visuals: 'Expert endorsements, quality indicators, awards'
      }
    ];

    return NextResponse.json({
      angles: sampleAngles,
      success: true
    });

  } catch (error) {
    console.error('Error generating creative angles:', error);
    return NextResponse.json(
      { error: 'Failed to generate creative angles' },
      { status: 500 }
    );
  }
}