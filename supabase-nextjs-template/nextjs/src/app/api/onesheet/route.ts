import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import onesheetService from '@/lib/services/onesheetService';
import { CreateOneSheetRequest } from '@/lib/types/onesheet';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 });
    }

    const onesheet = await onesheetService.getOneSheet(brandId, user.id, supabase);
    return NextResponse.json(onesheet);
  } catch (error) {
    console.error('Error fetching OneSheet:', error);
    return NextResponse.json(
      { error: 'Failed to fetch OneSheet' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateOneSheetRequest = await request.json();

    if (!body.brand_id) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 });
    }

    const onesheet = await onesheetService.createOneSheet(body);
    return NextResponse.json(onesheet);
  } catch (error) {
    console.error('Error creating OneSheet:', error);
    return NextResponse.json(
      { error: 'Failed to create OneSheet' },
      { status: 500 }
    );
  }
} 