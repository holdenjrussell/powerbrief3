import { NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { ugcAiCoordinator } from '@/lib/services/ugcAiCoordinator';

export async function POST(request: Request) {
  try {
    const { brandId } = await request.json();

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 });
    }

    const supabase = await createSSRClient();
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify user has access to this brand
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brandId)
      .eq('user_id', user.id)
      .single();

    if (brandError || !brand) {
      return NextResponse.json({ error: 'Brand not found or access denied' }, { status: 404 });
    }

    // Process the pipeline with AI analysis
    const result = await ugcAiCoordinator.processPipeline(brandId);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error analyzing pipeline:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' }, 
      { status: 500 }
    );
  }
} 