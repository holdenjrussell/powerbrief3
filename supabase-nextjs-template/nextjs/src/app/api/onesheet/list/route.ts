import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/lib/types/supabase';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 });
    }

    // Verify user has access to this brand
    const { data: brandAccess } = await supabase
      .from('brands')
      .select(`
        id,
        user_id,
        brand_shares(
          shared_with_user_id,
          status
        )
      `)
      .eq('id', brandId)
      .single();

    if (!brandAccess) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    const isOwner = brandAccess.user_id === user.id;
    const hasSharedAccess = brandAccess.brand_shares?.some((share: any) => 
      share.shared_with_user_id === user.id && share.status === 'accepted'
    );

    if (!isOwner && !hasSharedAccess) {
      return NextResponse.json({ error: 'Access denied to this brand' }, { status: 403 });
    }

    // Get all OneSheets for this brand
    const { data: onesheets, error } = await supabase
      .from('onesheet')
      .select('id, name, product, landing_page_url, current_stage, stages_completed, created_at, updated_at')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching OneSheets:', error);
      return NextResponse.json({ error: 'Failed to fetch OneSheets' }, { status: 500 });
    }

    return NextResponse.json(onesheets || []);
  } catch (error) {
    console.error('OneSheet list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    const body = await request.json();
    const { brand_id, name, product, landing_page_url, customer_reviews_url } = body;

    if (!brand_id || !name || !product) {
      return NextResponse.json({ error: 'Brand ID, name, and product name are required' }, { status: 400 });
    }

    // Verify user has access to this brand
    const { data: brandAccess } = await supabase
      .from('brands')
      .select('id, user_id')
      .eq('id', brand_id)
      .single();

    if (!brandAccess || brandAccess.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied to this brand' }, { status: 403 });
    }

    // Create new OneSheet with default structure
    const defaultOneSheet = {
      brand_id,
      user_id: user.id,
      name,
      product,
      landing_page_url: landing_page_url || '',
      customer_reviews_url: customer_reviews_url || '',
      current_stage: 'context_loading',
      stages_completed: {
        context: false,
        audience_research: false,
        competitor_research: false,
        ad_audit: false,
        creative_brainstorm: false
      },
      audience_research: {
        angles: [],
        benefits: [],
        painPoints: [],
        features: [],
        objections: [],
        failedSolutions: [],
        other: [],
        personas: []
      },
      competitor_research: {
        competitors: [],
        deepAnalysis: {
          qualityComparison: {},
          formatStrategies: {},
          creatorApproaches: {},
          learningsOverTime: []
        }
      },
      ad_account_audit: {
        ads: [],
        demographicBreakdown: {
          age: {},
          gender: {},
          placement: {}
        },
        performanceByAngle: {},
        performanceByFormat: {},
        performanceByEmotion: {},
        performanceByFramework: {}
      },
      creative_brainstorm: {
        concepts: [],
        hooks: [],
        visuals: []
      },
      context_loaded: {
        brandWebsite: false,
        brandSocial: false,
        competitorWebsite: false,
        competitorSocial: false,
        competitorAds: false,
        reviews: false,
        reddit: false,
        articles: false,
        organicContent: false
      },
      // Legacy fields for backward compatibility
      research_checklist: {
        myKnowledge: false,
        chatgptPerplexity: false,
        customerReviews: false,
        socialListening: false,
        adComments: false,
        forumsSources: false,
        articles: false,
        organicResearch: false,
        tiktok: false,
        youtubeShorts: false
      },
      angles: [],
      audience_insights: [],
      personas: [],
      social_listening_data: {
        reddit: [],
        quora: [],
        adComments: []
      },
      organic_research_data: {
        tiktok: [],
        youtubeShorts: []
      },
      competitor_analysis: [],
      competitive_notes: '',
      ad_account_data: {
        deliveryByAge: {},
        deliveryByGender: {},
        deliveryByPlacement: {},
        topPerformingAngles: [],
        topPerformingFormats: [],
        avgCPA: 0,
        bestHoldRate: 0
      },
      ad_performance_data: [],
      key_learnings: {
        ageInsights: '',
        genderInsights: '',
        placementInsights: '',
        creativeInsights: '',
        implications: '',
        dataQuality: 'low'
      },
      concepts: [],
      hooks: [],
      visuals: [],
      ai_research_data: {
        perplexityResults: {},
        audienceAnalysis: {},
        socialListeningData: {},
        lastUpdated: new Date().toISOString()
      },
      ai_competitor_data: {
        competitorWebsites: {},
        competitorReviews: {},
        gapAnalysis: {},
        lastUpdated: new Date().toISOString()
      },
      ai_analysis_results: {
        generatedAngles: [],
        generatedPersonas: [],
        generatedConcepts: [],
        generatedHooks: [],
        generatedVisuals: [],
        lastUpdated: new Date().toISOString()
      },
      ai_prompt_templates: {
        adAngles: '',
        benefitsPainPoints: '',
        audienceResearch: '',
        statisticsResearch: '',
        redditAnalysis: '',
        forumAnalysis: '',
        competitorGapAnalysis: '',
        competitorReviewAnalysis: '',
        conceptGeneration: '',
        hookGeneration: '',
        visualGeneration: ''
      },
      synthesis_data: {
        angles: [],
        benefits: [],
        painPoints: [],
        features: [],
        objections: [],
        failedSolutions: [],
        other: []
      }
    };

    const { data: newOneSheet, error } = await supabase
      .from('onesheet')
      .insert(defaultOneSheet)
      .select('id, name, product, landing_page_url, current_stage, stages_completed, created_at, updated_at')
      .single();

    if (error) {
      console.error('Error creating OneSheet:', error);
      return NextResponse.json({ error: 'Failed to create OneSheet' }, { status: 500 });
    }

    return NextResponse.json(newOneSheet);
  } catch (error) {
    console.error('OneSheet creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const onesheetId = searchParams.get('onesheetId');

    if (!onesheetId) {
      return NextResponse.json({ error: 'OneSheet ID is required' }, { status: 400 });
    }

    // Verify user owns this OneSheet
    const { data: onesheet } = await supabase
      .from('onesheet')
      .select('user_id, brand_id')
      .eq('id', onesheetId)
      .single();

    if (!onesheet || onesheet.user_id !== user.id) {
      return NextResponse.json({ error: 'OneSheet not found or access denied' }, { status: 404 });
    }

    // Delete the OneSheet
    const { error } = await supabase
      .from('onesheet')
      .delete()
      .eq('id', onesheetId);

    if (error) {
      console.error('Error deleting OneSheet:', error);
      return NextResponse.json({ error: 'Failed to delete OneSheet' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('OneSheet deletion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 