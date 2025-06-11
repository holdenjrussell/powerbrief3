import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';

// Error type
interface ErrorWithMessage {
  message: string;
  stack?: string;
  code?: string;
  details?: string;
}

export async function POST(request: NextRequest) {
  // Create Supabase client
  const supabase = await createClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    
    console.log('Creating new UGC script with title:', body.title);
    
    // Create a public share ID for this script
    const publicShareId = uuidv4();
    
    let creatorId = body.creator_id;
    
    // If this is a TBD creator, check if one exists for this brand, create if not
    if (body.is_tbd_creator) {
      console.log('TBD creator requested, checking if one exists for brand:', body.brand_id);
      
      // Look for existing TBD creator for this brand
      const { data: existingTbdCreator, error: tbdError } = await supabase
        .from('ugc_creators')
        .select('id')
        .eq('brand_id', body.brand_id)
        .eq('name', 'To Be Determined')
        .single();
      
      if (tbdError && tbdError.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error checking for existing TBD creator:', tbdError);
        return NextResponse.json({ error: 'Failed to check for existing TBD creator' }, { status: 500 });
      }
      
      if (existingTbdCreator) {
        console.log('Using existing TBD creator:', existingTbdCreator.id);
        creatorId = existingTbdCreator.id;
      } else {
        console.log('Creating new TBD creator for brand:', body.brand_id);
        
        // Create a new TBD creator for this brand
        const { data: newTbdCreator, error: createError } = await supabase
          .from('ugc_creators')
          .insert({
            id: uuidv4(),
            user_id: session.user.id,
            brand_id: body.brand_id,
            name: 'To Be Determined',
            status: 'READY FOR SCRIPTS',
            contract_status: 'not applicable',
            products: [],
            content_types: [],
            platforms: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('id')
          .single();
        
        if (createError) {
          console.error('Error creating TBD creator:', createError);
          return NextResponse.json({ error: 'Failed to create TBD creator' }, { status: 500 });
        }
        
        console.log('Created new TBD creator:', newTbdCreator.id);
        creatorId = newTbdCreator.id;
      }
    }
    
    // Prepare any additional metadata (including TBD flag)
    const metadata = body.is_tbd_creator ? { is_tbd_creator: true } : null;
    
    // Prepare the script data
    const scriptData = {
      id: uuidv4(),
      user_id: session.user.id,
      brand_id: body.brand_id,
      creator_id: creatorId,
      title: body.title,
      status: body.status || 'PENDING_APPROVAL',
      concept_status: body.concept_status || 'Script Approval',
      script_content: body.script_content,
      b_roll_shot_list: body.b_roll_shot_list || [],
      hook_type: body.hook_type || 'verbal',
      hook_count: body.hook_count || 1,
      hook_body: body.hook_body || null,
      cta: body.cta || null,
      company_description: body.company_description || null,
      guide_description: body.guide_description || null,
      filming_instructions: body.filming_instructions || null,
      ai_custom_prompt: body.ai_custom_prompt || null,
      system_instructions: body.system_instructions || null,
      media_type: body.media_type || 'video',
      creative_strategist: body.creative_strategist || null,
      inspiration_video_url: body.reference_video_url || body.inspiration_video_url || null,
      inspiration_video_notes: body.inspiration_video_notes || null,
      is_ai_generated: body.is_ai_generated || false,
      payment_status: body.payment_status || 'Pending',
      deposit_amount: body.deposit_amount || 0,
      final_payment_amount: body.final_payment_amount || 0,
      public_share_id: publicShareId,
      // Only include metadata if it exists
      ...(metadata ? { metadata } : {}),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('Inserting script into database...', {
      creator_id: scriptData.creator_id,
      is_tbd_creator: body.is_tbd_creator
    });
    
    // Insert the script into the database
    const { data, error } = await supabase
      .from('ugc_creator_scripts')
      .insert(scriptData)
      .select('*')
      .single();
    
    if (error) {
      console.error('Supabase error creating UGC script:', error);
      
      // Check if it's a database constraint violation
      if (error.code === '23502') { // not-null violation
        return NextResponse.json({ 
          error: `Missing required field: ${error.details || error.message}` 
        }, { status: 400 });
      } else if (error.code === '23503') { // foreign key violation
        return NextResponse.json({ 
          error: `Invalid reference: ${error.details || error.message}` 
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        error: `Failed to create script: ${error.message}`,
        details: error
      }, { status: 500 });
    }
    
    console.log('Script created successfully with ID:', data.id);
    return NextResponse.json(data);
  } catch (error: unknown) {
    const err = error as ErrorWithMessage;
    console.error('General error in script creation:', err);
    return NextResponse.json({
      error: `An error occurred while creating the script: ${err.message || 'Unknown error'}`,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, { status: 500 });
  }
} 