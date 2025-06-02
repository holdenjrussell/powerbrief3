import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { Product } from '@/lib/types/powerbrief';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSSRClient();
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.brand_id || !body.user_id) {
      return NextResponse.json(
        { error: 'Missing required fields: name, brand_id, user_id' },
        { status: 400 }
      );
    }

    // Create the product
    const { data, error } = await supabase
      .from('products' as any)
      .insert([{
        brand_id: body.brand_id,
        user_id: body.user_id,
        name: body.name,
        identifier: body.identifier || null,
        description: body.description || null,
        category: body.category || null,
        price: body.price || null,
        msrp: body.msrp || null,
        sale_price: body.sale_price || null,
        currency: body.currency || 'USD',
        image_url: body.image_url || null,
        product_url: body.product_url || null,
        is_active: body.is_active !== undefined ? body.is_active : true
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating product:', error);
      return NextResponse.json(
        { error: 'Failed to create product' },
        { status: 500 }
      );
    }

    return NextResponse.json(data as unknown as Product);
  } catch (error) {
    console.error('Error in POST /api/products:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 