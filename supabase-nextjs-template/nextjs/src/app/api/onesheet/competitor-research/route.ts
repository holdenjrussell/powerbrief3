import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/lib/types/supabase';
import { v4 as uuidv4 } from 'uuid';
import type { CompetitorResearchData, CompetitorData } from '@/lib/types/onesheet';

// GET - Fetch competitor research data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const onesheetId = searchParams.get('onesheet_id');

    if (!onesheetId) {
      return NextResponse.json({ error: 'OneSheet ID is required' }, { status: 400 });
    }

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

    // Get OneSheet data
    const { data: onesheet, error } = await supabase
      .from('onesheet')
      .select('competitor_research')
      .eq('id', onesheetId)
      .single();

    if (error || !onesheet) {
      return NextResponse.json({ error: 'OneSheet not found' }, { status: 404 });
    }

    return NextResponse.json(onesheet.competitor_research || {
      competitors: [],
      deepAnalysis: {
        qualityComparison: {},
        formatStrategies: {},
        creatorApproaches: {},
        learningsOverTime: []
      }
    });

  } catch (error) {
    console.error('Error fetching competitor research:', error);
    return NextResponse.json(
      { error: 'Failed to fetch competitor research' },
      { status: 500 }
    );
  }
}

// POST - Add new competitor
export async function POST(request: NextRequest) {
  try {
    const { onesheet_id, competitor } = await request.json();

    if (!onesheet_id || !competitor) {
      return NextResponse.json({ error: 'OneSheet ID and competitor data are required' }, { status: 400 });
    }

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

    // Get current competitor research
    const { data: onesheet, error: fetchError } = await supabase
      .from('onesheet')
      .select('competitor_research')
      .eq('id', onesheet_id)
      .single();

    if (fetchError || !onesheet) {
      return NextResponse.json({ error: 'OneSheet not found' }, { status: 404 });
    }

    const currentResearch = onesheet.competitor_research as CompetitorResearchData || {
      competitors: [],
      deepAnalysis: {
        qualityComparison: {},
        formatStrategies: {},
        creatorApproaches: {},
        learningsOverTime: []
      }
    };

    // Add new competitor
    const timestamp = new Date().toISOString();
    const newCompetitor: CompetitorData = {
      id: uuidv4(),
      ...competitor,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    currentResearch.competitors.push(newCompetitor);

    // Update OneSheet
    const { error: updateError } = await supabase
      .from('onesheet')
      .update({
        competitor_research: currentResearch,
        updated_at: timestamp
      })
      .eq('id', onesheet_id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      competitor: newCompetitor
    });

  } catch (error) {
    console.error('Error adding competitor:', error);
    return NextResponse.json(
      { error: 'Failed to add competitor' },
      { status: 500 }
    );
  }
}

// PUT - Update existing competitor
export async function PUT(request: NextRequest) {
  try {
    const { onesheet_id, competitor } = await request.json();

    if (!onesheet_id || !competitor || !competitor.id) {
      return NextResponse.json({ error: 'OneSheet ID and competitor data with ID are required' }, { status: 400 });
    }

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

    // Get current competitor research
    const { data: onesheet, error: fetchError } = await supabase
      .from('onesheet')
      .select('competitor_research')
      .eq('id', onesheet_id)
      .single();

    if (fetchError || !onesheet) {
      return NextResponse.json({ error: 'OneSheet not found' }, { status: 404 });
    }

    const currentResearch = onesheet.competitor_research as CompetitorResearchData || {
      competitors: [],
      deepAnalysis: {
        qualityComparison: {},
        formatStrategies: {},
        creatorApproaches: {},
        learningsOverTime: []
      }
    };

    // Update competitor
    const timestamp = new Date().toISOString();
    const updatedCompetitors = currentResearch.competitors.map(c => 
      c.id === competitor.id 
        ? { ...c, ...competitor, updatedAt: timestamp }
        : c
    );

    currentResearch.competitors = updatedCompetitors;

    // Update OneSheet
    const { error: updateError } = await supabase
      .from('onesheet')
      .update({
        competitor_research: currentResearch,
        updated_at: timestamp
      })
      .eq('id', onesheet_id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: 'Competitor updated successfully'
    });

  } catch (error) {
    console.error('Error updating competitor:', error);
    return NextResponse.json(
      { error: 'Failed to update competitor' },
      { status: 500 }
    );
  }
}

// DELETE - Remove competitor
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const onesheetId = searchParams.get('onesheet_id');
    const competitorId = searchParams.get('competitor_id');

    if (!onesheetId || !competitorId) {
      return NextResponse.json({ error: 'OneSheet ID and competitor ID are required' }, { status: 400 });
    }

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

    // Get current competitor research
    const { data: onesheet, error: fetchError } = await supabase
      .from('onesheet')
      .select('competitor_research')
      .eq('id', onesheetId)
      .single();

    if (fetchError || !onesheet) {
      return NextResponse.json({ error: 'OneSheet not found' }, { status: 404 });
    }

    const currentResearch = onesheet.competitor_research as CompetitorResearchData || {
      competitors: [],
      deepAnalysis: {
        qualityComparison: {},
        formatStrategies: {},
        creatorApproaches: {},
        learningsOverTime: []
      }
    };

    // Remove competitor
    currentResearch.competitors = currentResearch.competitors.filter(c => c.id !== competitorId);

    // Update OneSheet
    const timestamp = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('onesheet')
      .update({
        competitor_research: currentResearch,
        updated_at: timestamp
      })
      .eq('id', onesheetId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: 'Competitor deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting competitor:', error);
    return NextResponse.json(
      { error: 'Failed to delete competitor' },
      { status: 500 }
    );
  }
} 