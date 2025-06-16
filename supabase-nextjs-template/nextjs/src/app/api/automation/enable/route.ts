import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { N8nService } from '@/lib/services/n8nService';

/**
 * Enable Automation API
 * 
 * Creates an n8n workflow for a brand based on a template
 */

interface EnableAutomationRequest {
  brandId: string;
  templateId: string;
  templateName: string;
  configuration?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  console.log('🚀 [AUTOMATION ENABLE] Starting request...');
  
  try {
    // Log request details
    const url = request.url;
    const method = request.method;
    console.log(`📍 [AUTOMATION ENABLE] ${method} ${url}`);

    const supabase = await createClient();
    console.log('✅ [AUTOMATION ENABLE] Supabase client created');

    const { data: { user } } = await supabase.auth.getUser();
    console.log('👤 [AUTOMATION ENABLE] User check:', user ? `User ID: ${user.id}` : 'No user found');

    if (!user) {
      console.log('❌ [AUTOMATION ENABLE] Unauthorized - no user');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: EnableAutomationRequest = await request.json();
    console.log('📦 [AUTOMATION ENABLE] Request body:', JSON.stringify(body, null, 2));
    
    const { brandId, templateId, templateName, configuration = {} } = body;

    if (!brandId || !templateId || !templateName) {
      console.log('❌ [AUTOMATION ENABLE] Missing required fields:', { brandId, templateId, templateName });
      return NextResponse.json(
        { error: 'Missing required fields', received: { brandId, templateId, templateName } },
        { status: 400 }
      );
    }

    console.log('🔍 [AUTOMATION ENABLE] Looking up brand:', brandId);
    
    // First, let's check if the brand exists at all
    const { data: allBrands, error: allBrandsError } = await supabase
      .from('brands')
      .select('id, name, user_id')
      .eq('id', brandId);
    
    console.log('🔍 [AUTOMATION ENABLE] All brands with this ID:', allBrands, allBrandsError);
    
    // Try direct ownership first
    console.log('🔍 [AUTOMATION ENABLE] Trying direct ownership query...');
    let brand = null;
    let brandError = null;
    
    const { data: ownedBrand } = await supabase
      .from('brands')
      .select('id, name, email_identifier, user_id')
      .eq('id', brandId)
      .eq('user_id', user.id)
      .single();
    
    if (ownedBrand) {
      // User owns the brand directly
      console.log('✅ [AUTOMATION ENABLE] User owns brand directly');
      brand = ownedBrand;
    } else {
      console.log('❌ [AUTOMATION ENABLE] No direct ownership, checking shared access...');
      
      // Check if user has shared access
      const { data: sharedAccess } = await supabase
        .from('brand_shares')
        .select('brand_id, role, status')
        .eq('brand_id', brandId)
        .eq('shared_with_user_id', user.id)
        .eq('status', 'accepted')
        .single();
      
      if (sharedAccess) {
        console.log('✅ [AUTOMATION ENABLE] User has shared access:', sharedAccess);
        
        // Get the brand details
        const { data: sharedBrand } = await supabase
          .from('brands')
          .select('id, name, email_identifier, user_id')
          .eq('id', brandId)
          .single();
        
        if (sharedBrand) {
          brand = sharedBrand;
          console.log('✅ [AUTOMATION ENABLE] Got shared brand details');
        } else {
          brandError = { message: 'Brand not found' };
        }
      } else {
        brandError = { message: 'No access to this brand' };
      }
    }

    console.log('🏢 [AUTOMATION ENABLE] Brand query result:', { brand, brandError });

    if (brandError || !brand) {
      console.log('❌ [AUTOMATION ENABLE] Brand not found or unauthorized:', brandError);
      return NextResponse.json(
        { error: 'Brand not found or unauthorized', brandError: brandError?.message },
        { status: 404 }
      );
    }

    console.log('🔍 [AUTOMATION ENABLE] Looking up template:', templateId);

    // Get the automation template
    const { data: template, error: templateError } = await supabase
      .from('n8n_automation_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    console.log('📋 [AUTOMATION ENABLE] Template query result:', { 
      template: template ? { id: template.id, name: template.name } : null, 
      templateError 
    });

    if (templateError || !template) {
      console.log('❌ [AUTOMATION ENABLE] Template not found:', templateError);
      
      // Let's also check what templates are available
      const { data: allTemplates } = await supabase
        .from('n8n_automation_templates')
        .select('id, name')
        .limit(10);
      
      console.log('📋 [AUTOMATION ENABLE] Available templates:', allTemplates);
      
      return NextResponse.json(
        { 
          error: 'Automation template not found', 
          templateError: templateError?.message,
          availableTemplates: allTemplates 
        },
        { status: 404 }
      );
    }

    console.log('🔍 [AUTOMATION ENABLE] Checking for existing automation...');

    // Check if automation is already enabled for this brand
    const { data: existingAutomation } = await supabase
      .from('brand_n8n_workflows')
      .select('id')
      .eq('brand_id', brandId)
      .eq('template_name', templateName)
      .single();

    console.log('🔄 [AUTOMATION ENABLE] Existing automation check:', existingAutomation);

    if (existingAutomation) {
      console.log('⚠️ [AUTOMATION ENABLE] Automation already exists');
      return NextResponse.json(
        { error: 'Automation already enabled for this brand' },
        { status: 409 }
      );
    }

    console.log('🔍 [AUTOMATION ENABLE] Checking automation settings...');

    // Ensure brand has automation settings
    const { data: automationSettings } = await supabase
      .from('brand_automation_settings')
      .select('*')
      .eq('brand_id', brandId)
      .single();

    console.log('⚙️ [AUTOMATION ENABLE] Automation settings:', automationSettings);

    if (!automationSettings) {
      console.log('🔧 [AUTOMATION ENABLE] Creating default automation settings...');
      
      // Create default automation settings
      const { error: settingsError } = await supabase
        .from('brand_automation_settings')
        .insert({
          brand_id: brandId,
          automation_enabled: true,
          webhook_secret: generateWebhookSecret(),
        });

      if (settingsError) {
        console.error('❌ [AUTOMATION ENABLE] Error creating automation settings:', settingsError);
        return NextResponse.json(
          { error: 'Failed to initialize automation settings', settingsError: settingsError.message },
          { status: 500 }
        );
      }
      
      console.log('✅ [AUTOMATION ENABLE] Created automation settings');
    }

    // Build brand email from email_identifier or use fallback
    const brandEmail = brand.email_identifier 
      ? `${brand.email_identifier}@mail.powerbrief.ai`
      : 'support@powerbrief.ai';

    console.log('📧 [AUTOMATION ENABLE] Brand email:', brandEmail);

    // Prepare variables for the n8n workflow
    const workflowVariables = {
      brandId,
      brandName: brand.name,
      brandEmail: brandEmail,
      ...configuration,
    };

    console.log('🔧 [AUTOMATION ENABLE] Workflow variables:', workflowVariables);
    console.log('🚀 [AUTOMATION ENABLE] Creating n8n workflow...');

    // Create the n8n workflow
    const n8nService = new N8nService();
    const workflow = await n8nService.createWorkflowForBrand(
      brandId,
      templateName,
      template.workflow_definition as Record<string, unknown>,
      workflowVariables
    );

    console.log('✅ [AUTOMATION ENABLE] Workflow created successfully:', {
      id: workflow.id,
      name: workflow.name,
      active: workflow.active
    });

    return NextResponse.json({
      success: true,
      message: 'Automation enabled successfully',
      workflow: {
        id: workflow.id,
        name: workflow.name,
        active: workflow.active,
      },
    });

  } catch (error) {
    console.error('💥 [AUTOMATION ENABLE] Error enabling automation:', error);
    console.error('💥 [AUTOMATION ENABLE] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * Generate a secure webhook secret
 */
function generateWebhookSecret(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
} 