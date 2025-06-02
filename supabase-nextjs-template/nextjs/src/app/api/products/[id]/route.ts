import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { Product } from '@/lib/types/powerbrief';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSSRClient();
    const body = await request.json();
    const { id } = params;

    // Update the product
    const { data, error } = await supabase
      .from('products' as any)
      .update({
        name: body.name,
        identifier: body.identifier,
        description: body.description || null,
        category: body.category || null,
        price: body.price || null,
        msrp: body.msrp || null,
        sale_price: body.sale_price || null,
        currency: body.currency || 'USD',
        image_url: body.image_url || null,
        product_url: body.product_url || null,
        is_active: body.is_active !== undefined ? body.is_active : true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating product:', error);
      return NextResponse.json(
        { error: 'Failed to update product' },
        { status: 500 }
      );
    }

    return NextResponse.json(data as unknown as Product);
  } catch (error) {
    console.error('Error in PUT /api/products/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSSRClient();
    const { id } = params;

    // Delete the product
    const { error } = await supabase
      .from('products' as any)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting product:', error);
      return NextResponse.json(
        { error: 'Failed to delete product' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/products/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 