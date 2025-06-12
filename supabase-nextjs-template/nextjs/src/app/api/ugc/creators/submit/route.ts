import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import { NextRequest, NextResponse } from 'next/server';

// POST - Submit creator application directly to ugc_creators table
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerAdminClient();
    const body = await request.json();
    const { 
      brand_id,
      submission_data,
      utm_source,
      utm_medium,
      utm_campaign
    } = body;

    if (!brand_id || !submission_data) {
      return NextResponse.json({ 
        error: 'Missing required fields: brand_id, submission_data' 
      }, { status: 400 });
    }

    // Validate required fields
    if (!submission_data.name || !submission_data.email) {
      return NextResponse.json({ 
        error: 'Name and email are required' 
      }, { status: 400 });
    }

    try {
      // Check if creator with this email already exists for this brand
      const { data: existingCreator } = await supabase
        .from('ugc_creators')
        .select('id, email')
        .eq('brand_id', brand_id)
        .eq('email', submission_data.email)
        .maybeSingle(); // Use maybeSingle to handle no results gracefully

      if (existingCreator) {
        return NextResponse.json({ 
          error: 'A creator with this email already exists for this brand' 
        }, { status: 409 });
      }

      // Create UGC creator record directly with application data
      // Note: user_id should be null - creators are external applicants, not system users
      // Shipment fields are for internal use only, not set during application
      const creatorData = {
        user_id: null, // Creators don't have user accounts - they're external applicants
        brand_id,
        name: submission_data.name,
        email: submission_data.email,
        phone_number: submission_data.phone_number || null,
        instagram_handle: submission_data.instagram_handle || null,
        tiktok_handle: submission_data.tiktok_handle || null,
        portfolio_link: submission_data.portfolio_link || null,
        per_script_fee: submission_data.per_script_fee || null,
        gender: submission_data.gender || null,
        age: submission_data.age || null, // Age is now a direct table column
        platforms: submission_data.platforms || [],
        content_types: submission_data.content_types || [],
        products: [], // Initialize as empty array
        address_line1: submission_data.address_line1 || null,
        address_line2: submission_data.address_line2 || null,
        city: submission_data.city || null,
        state: submission_data.state || null,
        zip: submission_data.zip || null,
        country: submission_data.country || null,
        status: 'New Creator Submission', // Default status
        contract_status: 'not signed', // Default contract status
        contacted_by: null, // Initialize as null
        custom_fields: submission_data.custom_fields || {} // Custom fields
        // Note: product_shipment_status, product_shipped, tracking_number are internal fields
        // They will use database defaults and be managed internally, not set during application
      };

      const { data: creator, error: creatorError } = await supabase
        .from('ugc_creators')
        .insert(creatorData)
        .select()
        .single();

      if (creatorError) {
        console.error('Error creating UGC creator:', creatorError);
        return NextResponse.json({ 
          error: 'Failed to create creator profile' 
        }, { status: 500 });
      }

      // Log UTM data for analytics (optional)
      if (utm_source || utm_medium || utm_campaign) {
        console.log('Creator submission UTM data:', {
          creator_id: creator.id,
          utm_source,
          utm_medium,
          utm_campaign
        });
      }

      return NextResponse.json({ 
        success: true, 
        creator,
        message: 'Creator application submitted successfully! We will review it and get back to you soon.'
      });

    } catch (error) {
      console.error('Error in creator creation process:', error);
      return NextResponse.json({ 
        error: 'Failed to create creator profile' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Creator submission API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 