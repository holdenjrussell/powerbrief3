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
    
    // Use the creator ID from the request
    const creatorId = body.creator_id;
    
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
      hook_body: body.hook_body || null,
      cta: body.cta || null,
      company_description: body.company_description || null,
      guide_description: body.guide_description || null,
      filming_instructions: body.filming_instructions || null,
      inspiration_video_url: body.reference_video_url || body.inspiration_video_url || null,
      inspiration_video_notes: body.inspiration_video_notes || null,
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