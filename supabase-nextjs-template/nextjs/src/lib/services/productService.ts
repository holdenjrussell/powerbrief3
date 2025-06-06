import { createSPAClient } from '@/lib/supabase/client';
import { Product } from '@/lib/types/powerbrief';

const supabase = createSPAClient();

// Get all products for a brand
export async function getProductsByBrand(brandId: string): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('products' as any)
      .select('*')
      .eq('brand_id', brandId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      // If the table doesn't exist, just return empty array
      if (error.code === '42P01' || error.message?.includes('relation "public.products" does not exist')) {
        console.log('Products table does not exist yet');
        return [];
      }
      // If it's an RLS error, also return empty array
      if (error.code === '42501' || error.message?.includes('permission denied')) {
        console.log('No permission to access products table');
        return [];
      }
      console.error('Error fetching products:', error);
      // Return empty array instead of throwing to prevent page crashes
      return [];
    }

    return (data || []) as unknown as Product[];
  } catch (err) {
    console.error('Unexpected error fetching products:', err);
    return [];
  }
}

// Get a single product by ID
export async function getProductById(productId: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products' as any)
    .select('*')
    .eq('id', productId)
    .single();

  if (error) {
    console.error('Error fetching product:', error);
    throw error;
  }

  return data as unknown as Product;
}

// Create a new product
export async function createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
  const { data, error } = await supabase
    .from('products' as any)
    .insert([product])
    .select()
    .single();

  if (error) {
    console.error('Error creating product:', error);
    throw error;
  }

  return data as unknown as Product;
}

// Update an existing product
export async function updateProduct(product: Partial<Product> & { id: string }): Promise<Product> {
  const { data, error } = await supabase
    .from('products' as any)
    .update(product)
    .eq('id', product.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating product:', error);
    throw error;
  }

  return data as unknown as Product;
}

// Delete a product (soft delete by setting is_active to false)
export async function deleteProduct(productId: string): Promise<void> {
  const { error } = await supabase
    .from('products' as any)
    .update({ is_active: false })
    .eq('id', productId);

  if (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
}

// Hard delete a product (permanently remove from database)
export async function hardDeleteProduct(productId: string): Promise<void> {
  const { error } = await supabase
    .from('products' as any)
    .delete()
    .eq('id', productId);

  if (error) {
    console.error('Error hard deleting product:', error);
    throw error;
  }
}