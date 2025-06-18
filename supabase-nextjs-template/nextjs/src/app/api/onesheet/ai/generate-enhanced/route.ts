import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/types/supabase';
import { OnesheetAIService } from '@/lib/services/onesheetAIService';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Ignore if called from Server Component
            }
          },
        }
      }
    );
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, onesheet_id, additionalData } = await request.json();

    if (!type || !onesheet_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify user owns this onesheet
    const { data: onesheet } = await supabase
      .from('onesheets')
      .select('*')
      .eq('id', onesheet_id)
      .eq('user_id', user.id)
      .single();

    if (!onesheet) {
      return NextResponse.json({ error: 'OneSheet not found' }, { status: 404 });
    }

    // Fetch all context data for this onesheet
    const { data: contextData } = await supabase
      .from('onesheet_context_data')
      .select('*')
      .eq('onesheet_id', onesheet_id)
      .eq('is_active', true);

    if (!contextData || contextData.length === 0) {
      return NextResponse.json({ 
        error: 'No context data found. Please load context first.' 
      }, { status: 400 });
    }

    // Organize context by type
    const context = {
      brandWebsite: contextData.find(c => c.source_type === 'brand_website')?.content_text || '',
      brandSocial: contextData.find(c => c.source_type === 'brand_social')?.content_text || '',
      competitorWebsite: contextData.filter(c => c.source_type === 'competitor_website')
        .map(c => `${c.source_name || 'Competitor'}: ${c.content_text}`).join('\n\n'),
      competitorAds: contextData.filter(c => c.source_type === 'competitor_ads')
        .map(c => c.extracted_data || {}).filter(Boolean),
      reviews: contextData.find(c => c.source_type === 'reviews')?.content_text || '',
      reddit: contextData.filter(c => c.source_type === 'reddit')
        .map(c => c.content_text).join('\n\n'),
      articles: contextData.filter(c => c.source_type === 'articles')
        .map(c => c.content_text).join('\n\n'),
      organicContent: contextData.filter(c => ['tiktok', 'youtube'].includes(c.source_type))
        .map(c => c.extracted_data || {}).filter(Boolean),
    };

    // Get brand API key for Gemini
    const { data: brand } = await supabase
      .from('brands')
      .select('gemini_api_key')
      .eq('id', onesheet.brand_id)
      .single();

    if (!brand?.gemini_api_key) {
      return NextResponse.json({ 
        error: 'Gemini API key not configured for this brand' 
      }, { status: 400 });
    }

    // Build enhanced data object with context
    const enhancedData = {
      product: onesheet.product || '',
      brand: onesheet.product || '',
      website: context.brandWebsite,
      reviews: context.reviews,
      competitors: context.competitorWebsite,
      socialContent: context.reddit + '\n\n' + context.articles,
      brandSocial: context.brandSocial,
      competitorAds: context.competitorAds,
      organicContent: context.organicContent,
      ...additionalData,
    };

    // Call AI service with context-enriched data
    const result = await OnesheetAIService.generate(
      { type, data: enhancedData },
      brand.gemini_api_key
    );

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error || 'AI generation failed' 
      }, { status: 500 });
    }

    // Save AI-generated content to synthesis or appropriate fields
    if (type === 'onesheetFillout' && result.data) {
      // Update synthesis data with AI results
      const newSynthesis = { ...onesheet.synthesis_data };
      
      Object.entries(result.data).forEach(([category, items]) => {
        if (Array.isArray(items) && items.length > 0) {
          const synthesisItems = items.map((item: any) => ({
            id: Date.now().toString() + Math.random(),
            text: item.text,
            source: 'ai' as const,
            sourceDetails: 'Generated from context analysis',
            dateAdded: new Date().toISOString(),
            relevance: 4,
            evidence: item.evidence || []
          }));
          
          newSynthesis[category as keyof typeof newSynthesis] = [
            ...(newSynthesis[category as keyof typeof newSynthesis] || []),
            ...synthesisItems
          ];
        }
      });

      await supabase
        .from('onesheets')
        .update({ 
          synthesis_data: newSynthesis,
          last_synthesis_update: new Date().toISOString()
        })
        .eq('id', onesheet_id);
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      usage: result.usage,
    });

  } catch (error) {
    console.error('Enhanced AI generation error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
} 