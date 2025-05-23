import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

interface Params {
  scriptId: string;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { scriptId } = params;
    const body = await request.json();
    
    const { 
      payment_status,
      deposit_amount,
      final_payment_amount,
      payment_notes,
      mark_deposit_paid,
      mark_final_payment_paid
    } = body;
    
    // Create Supabase client
    const supabase = await createClient();
    
    // Build update object
    const updateData: {
      updated_at: string;
      payment_status?: string;
      deposit_amount?: number | null;
      final_payment_amount?: number | null;
      payment_notes?: string | null;
      deposit_paid_date?: string;
      final_payment_paid_date?: string;
    } = {
      updated_at: new Date().toISOString()
    };
    
    if (payment_status !== undefined) updateData.payment_status = payment_status;
    if (deposit_amount !== undefined) updateData.deposit_amount = parseFloat(deposit_amount) || null;
    if (final_payment_amount !== undefined) updateData.final_payment_amount = parseFloat(final_payment_amount) || null;
    if (payment_notes !== undefined) updateData.payment_notes = payment_notes || null;
    
    // Handle payment date marking
    if (mark_deposit_paid) {
      updateData.deposit_paid_date = new Date().toISOString();
      if (!payment_status) updateData.payment_status = 'Deposit Paid';
    }
    
    if (mark_final_payment_paid) {
      updateData.final_payment_paid_date = new Date().toISOString();
      if (!payment_status) updateData.payment_status = 'Fully Paid';
    }
    
    // Update the script
    const { data: updatedScript, error: updateError } = await supabase
      .from('ugc_creator_scripts')
      .update(updateData)
      .eq('id', scriptId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating script payment:', updateError);
      return NextResponse.json({ error: 'Failed to update payment information' }, { status: 500 });
    }
    
    return NextResponse.json({ 
      message: 'Payment information updated successfully',
      script: updatedScript 
    });
  } catch (error) {
    console.error('Error in payment update:', error);
    return NextResponse.json({
      error: 'An error occurred while updating payment information'
    }, { status: 500 });
  }
} 