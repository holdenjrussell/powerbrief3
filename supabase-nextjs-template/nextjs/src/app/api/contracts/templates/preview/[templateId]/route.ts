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

    // Get template data - verify user has access to this brand's templates
    const { data: template, error: templateError } = await supabase
      .from('contract_templates')
      .select('*, brand:brands!inner(id, name)')
      .eq('id', templateId)
      .eq('user_id', user.id)
      .single();

    if (templateError || !template) {
      return NextResponse.json({ 
        error: 'Template not found or access denied' 
      }, { status: 404 });
    }

    // Get the document data
    const documentData = template.document_data;
    
    if (!documentData) {
      return NextResponse.json({ 
        error: 'Document not available' 
      }, { status: 404 });
    }

    // Convert Uint8Array to Buffer for response
    const buffer = Buffer.from(documentData);

    // Create response with PDF headers for inline viewing
    const response = new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${template.document_name || 'template.pdf'}"`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
      },
    });

    return response;

  } catch (error) {
    console.error('Error previewing template:', error);
    return NextResponse.json({ 
      error: 'Failed to preview template' 
    }, { status: 500 });
  }
} 