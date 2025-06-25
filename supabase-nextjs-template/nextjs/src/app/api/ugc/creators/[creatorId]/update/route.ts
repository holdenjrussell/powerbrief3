import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import {
  sendUGCCreatorStatusNotification,
  sendUGCContractStatusNotification,
  sendUGCProductShipmentNotification
} from '@/lib/services/ugcSlackService';

type Params = {
  params: {
    creatorId: string;
  };
};

export async function PATCH(
  request: NextRequest,
  { params }: Params
) {
  try {
    const supabase = await createSSRClient();
    const { creatorId } = params;
    const body = await request.json();
    
    // Get the current creator to compare status changes
    const { data: currentCreator, error: fetchError } = await supabase
      .from('ugc_creators')
      .select('*')
      .eq('id', creatorId)
      .single();
      
    if (fetchError) {
      console.error('Error fetching current creator:', fetchError);
      return NextResponse.json({
        error: 'Failed to fetch creator'
      }, { status: 404 });
    }
    
    // Update the creator
    const { data, error } = await supabase
      .from('ugc_creators')
      .update(body)
      .eq('id', creatorId)
      .select()
      .single();
      
    if (error) {
      console.error('Error updating creator:', error);
      return NextResponse.json({
        error: 'Failed to update creator'
      }, { status: 500 });
    }
    
    // Send Slack notifications for status changes
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const creatorDashboardLink = `${baseUrl}/app/powerbrief/${data.brand_id}/ugc-pipeline/creators/${data.id}`;
      const pipelineDashboardLink = `${baseUrl}/app/powerbrief/${data.brand_id}/ugc-pipeline?view=creator`;
      
      // Creator status change notifications (only for specific statuses)
      if (body.status && currentCreator.status !== body.status) {
        const notifiableStatuses = ['Approved for next steps', 'Ready for scripts', 'Rejected'];
        if (notifiableStatuses.includes(body.status)) {
          await sendUGCCreatorStatusNotification({
            brandId: data.brand_id,
            creatorId: data.id,
            creatorName: data.name,
            creatorEmail: data.email,
            previousStatus: currentCreator.status || 'Unknown',
            newStatus: body.status,
            creatorDashboardLink,
            pipelineDashboardLink
          });
        }
      }
      
      // Contract status change notifications
      if (body.contract_status && currentCreator.contract_status !== body.contract_status) {
        await sendUGCContractStatusNotification({
          brandId: data.brand_id,
          creatorId: data.id,
          creatorName: data.name,
          creatorEmail: data.email,
          previousStatus: currentCreator.contract_status || 'not signed',
          newStatus: body.contract_status,
          creatorDashboardLink,
          pipelineDashboardLink
        });
      }
      
      // Product shipment status change notifications
      if (body.product_shipment_status && currentCreator.product_shipment_status !== body.product_shipment_status) {
        await sendUGCProductShipmentNotification({
          brandId: data.brand_id,
          creatorId: data.id,
          creatorName: data.name,
          creatorEmail: data.email,
          previousStatus: currentCreator.product_shipment_status || 'Not Shipped',
          newStatus: body.product_shipment_status,
          trackingNumber: body.tracking_number || currentCreator.tracking_number,
          creatorDashboardLink,
          pipelineDashboardLink
        });
      }
    } catch (slackError) {
      console.error('Error sending Slack notification:', slackError);
      // Don't fail the update if Slack notification fails
    }
    
    // Trigger n8n workflow if brand_id is provided
    if (data.brand_id) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        const n8nResponse = await fetch(`${baseUrl}/api/ugc/n8n/trigger`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event: 'creator_status_changed',
            brandId: data.brand_id,
            creatorId: data.id,
            status: body.status,
            data: data
          }),
        });

        if (!n8nResponse.ok) {
          console.error('Failed to trigger n8n workflow:', await n8nResponse.text());
        }
      } catch (error) {
        console.error('Error triggering n8n workflow:', error);
      }
    }
    
    return NextResponse.json({
      ...data,
      products: data.products || [],
      content_types: data.content_types || [],
      platforms: data.platforms || [],
      custom_fields: data.custom_fields || {}
    });
  } catch (error) {
    console.error('Error in creator update:', error);
    return NextResponse.json({
      error: 'An error occurred while updating creator'
    }, { status: 500 });
  }
} 