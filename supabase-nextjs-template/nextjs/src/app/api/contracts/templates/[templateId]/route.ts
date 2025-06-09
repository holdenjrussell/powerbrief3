import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const supabase = await createSSRClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { templateId } = params;

    if (!templateId) {
      return NextResponse.json({ 
        error: 'Template ID is required' 
      }, { status: 400 });
    }

    // Get template data
    const { data: template, error: templateError } = await supabase
      .from('contract_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError) {
      console.error('Error fetching template:', templateError);
      return NextResponse.json({ 
        error: 'Template not found' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      template: {
        id: template.id,
        title: template.title,
        description: template.description,
        document_data: template.document_data,
        document_name: template.document_name,
        document_size: template.document_size,
        created_at: template.created_at,
        updated_at: template.updated_at
      }
    });

  } catch (error) {
    console.error('Error in template GET route:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const supabase = await createSSRClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { templateId } = params;
    const formData = await request.formData();
    const brandId = formData.get('brandId') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const documentFile = formData.get('document') as File | null;

    if (!templateId || !brandId || !title) {
      return NextResponse.json({ 
        error: 'Template ID, brand ID, and title are required' 
      }, { status: 400 });
    }

    // Check if template exists and user has access
    const { data: existingTemplate, error: templateError } = await supabase
      .from('contract_templates')
      .select('*')
      .eq('id', templateId)
      .eq('brand_id', brandId)
      .single();

    if (templateError || !existingTemplate) {
      return NextResponse.json({ 
        error: 'Template not found or access denied' 
      }, { status: 404 });
    }

    // Prepare update data
    const updateData: {
      title: string;
      description: string | null;
      updated_at: string;
      document_data?: Uint8Array;
      document_name?: string;
      document_size?: number;
    } = {
      title,
      description: description || null,
      updated_at: new Date().toISOString(),
    };

    // Handle document update if provided
    if (documentFile && documentFile.size > 0) {
      if (documentFile.type !== 'application/pdf') {
        return NextResponse.json({ 
          error: 'Only PDF files are allowed' 
        }, { status: 400 });
      }

      if (documentFile.size > 10 * 1024 * 1024) { // 10MB limit
        return NextResponse.json({ 
          error: 'File size must be less than 10MB' 
        }, { status: 400 });
      }

      const documentBuffer = await documentFile.arrayBuffer();
      updateData.document_data = new Uint8Array(documentBuffer);
      updateData.document_name = documentFile.name;
      updateData.document_size = documentFile.size;
    }

    // Update template
    const { data: updatedTemplate, error: updateError } = await supabase
      .from('contract_templates')
      .update(updateData)
      .eq('id', templateId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating template:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update template' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Template updated successfully',
      template: updatedTemplate
    });

  } catch (error) {
    console.error('Error in template PUT route:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const supabase = await createSSRClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { templateId } = params;

    // Verify user owns this template
    const { data: existingTemplate, error: templateError } = await supabase
      .from('contract_templates')
      .select('id, brand_id')
      .eq('id', templateId)
      .eq('user_id', user.id)
      .single();

    if (templateError || !existingTemplate) {
      return NextResponse.json({ 
        error: 'Template not found or access denied' 
      }, { status: 404 });
    }

    // Check if template is being used by any contracts
    const { data: contractsUsingTemplate, error: contractsError } = await supabase
      .from('contracts')
      .select('id')
      .eq('template_id', templateId)
      .limit(1);

    if (contractsError) {
      throw new Error('Failed to check template usage');
    }

    if (contractsUsingTemplate && contractsUsingTemplate.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete template that is being used by existing contracts' 
      }, { status: 400 });
    }

    // Delete the template
    const { error: deleteError } = await supabase
      .from('contract_templates')
      .delete()
      .eq('id', templateId);

    if (deleteError) {
      throw new Error(`Failed to delete template: ${deleteError.message}`);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Template deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting contract template:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to delete contract template' 
    }, { status: 500 });
  }
} 