import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { ContractService } from '@/lib/services/contractService';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSSRClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 });
    }

    const contractService = ContractService.getInstance();
    const templates = await contractService.getTemplates(brandId, user.id);

    return NextResponse.json({ 
      success: true, 
      templates: templates.map(template => ({
        ...template,
        // Don't send document_data in list view for performance
        document_data: undefined,
      }))
    });

  } catch (error) {
    console.error('Error fetching contract templates:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch contract templates' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  console.log('[API Templates POST] === ENDPOINT REACHED ===');
  console.log('[API Templates POST] Request received at:', new Date().toISOString());
  
  try {
    const supabase = await createSSRClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const formData = await request.formData();
    const brandId = formData.get('brandId') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const fields = formData.get('fields') as string;
    const document = formData.get('document') as File;

    console.log('[API Templates POST] === TEMPLATE CREATION DEBUGGING ===');
    console.log('[API Templates POST] Received FormData:', {
      brandId,
      title,
      description,
      fieldsRaw: fields,
      documentName: document?.name,
      documentSize: document?.size
    });

    if (!brandId || !title || !document) {
      return NextResponse.json({ 
        error: 'Brand ID, title, and document file are required' 
      }, { status: 400 });
    }

    // Parse fields
    let parsedFields;
    try {
      parsedFields = JSON.parse(fields || '[]');
      console.log('[API Templates POST] Successfully parsed fields:', {
        fieldsCount: parsedFields.length,
        fields: parsedFields
      });
      console.log('[API Templates POST] Individual parsed fields:');
      parsedFields.forEach((field: { id: string; type: string; page: number; positionX: number; positionY: number; width: number; height: number; recipientId: string; recipientEmail: string }, index: number) => {
        console.log(`[API Templates POST] Field ${index}:`, field);
      });
    } catch (parseError) {
      console.error('[API Templates POST] Failed to parse fields:', parseError);
      return NextResponse.json({ 
        error: 'Invalid fields format' 
      }, { status: 400 });
    }

    // Convert file to bytes
    const documentBuffer = await document.arrayBuffer();
    const documentData = new Uint8Array(documentBuffer);

    // Validate file size (max 10MB)
    if (documentData.length > 10 * 1024 * 1024) {
      return NextResponse.json({ 
        error: 'Document file too large. Maximum size is 10MB.' 
      }, { status: 400 });
    }

    // Validate file type
    if (document.type !== 'application/pdf') {
      return NextResponse.json({ 
        error: 'Only PDF files are supported' 
      }, { status: 400 });
    }

    const contractService = ContractService.getInstance();
    const template = await contractService.createTemplate(
      {
        title,
        description: description || undefined,
        document_data: documentData,
        document_name: document.name,
        document_size: documentData.length,
        fields: parsedFields,
      },
      brandId,
      user.id
    );

    return NextResponse.json({ 
      success: true, 
      template: {
        ...template,
        // Don't send document_data in response for performance
        document_data: undefined,
      }
    });

  } catch (error) {
    console.error('Error creating contract template:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to create contract template' 
    }, { status: 500 });
  }
} 