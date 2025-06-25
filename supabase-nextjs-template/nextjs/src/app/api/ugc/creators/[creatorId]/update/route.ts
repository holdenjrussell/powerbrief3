import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
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
    const supabase = await createClient();
    const { creatorId } = params;
    const body = await request.json();
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
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
      
      console.log('Checking for status changes...', {
        currentStatus: currentCreator.status,
        newStatus: body.status,
        currentContractStatus: currentCreator.contract_status,
        newContractStatus: body.contract_status,
        currentShipmentStatus: currentCreator.product_shipment_status,
        newShipmentStatus: body.product_shipment_status
      });
      
      // Creator status change notifications (only for specific statuses)
      if (body.status && currentCreator.status !== body.status) {
        const notifiableStatuses = ['Approved for next steps', 'Ready for scripts', 'Rejected'];
        if (notifiableStatuses.includes(body.status)) {
          console.log('Sending creator status notification...', {
            brandId: data.brand_id,
            creatorName: data.name,
            newStatus: body.status
          });
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
          console.log('Creator status notification sent successfully');
        }
      }
      
      // Contract status change notifications
      if (body.contract_status && currentCreator.contract_status !== body.contract_status) {
        console.log('Sending contract status notification...', {
          brandId: data.brand_id,
          creatorName: data.name,
          newContractStatus: body.contract_status
        });
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
        console.log('Contract status notification sent successfully');
      }
      
      // Product shipment status change notifications
      if (body.product_shipment_status && currentCreator.product_shipment_status !== body.product_shipment_status) {
        console.log('Sending product shipment notification...', {
          brandId: data.brand_id,
          creatorName: data.name,
          newShipmentStatus: body.product_shipment_status
        });
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
        console.log('Product shipment notification sent successfully');
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