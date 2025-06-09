import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { ContractService } from '@/lib/services/contractService';
import { ContractCreationData } from '@/lib/types/contracts';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSSRClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');
    const status = searchParams.get('status');
    const creatorId = searchParams.get('creatorId');
    const scriptId = searchParams.get('scriptId');

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 });
    }

    const contractService = ContractService.getInstance();
    
    let contracts;
    if (creatorId) {
      contracts = await contractService.getCreatorContracts(creatorId);
    } else if (scriptId) {
      contracts = await contractService.getScriptContracts(scriptId);
    } else {
      contracts = await contractService.getContracts(
        brandId, 
        user.id, 
        status as 'draft' | 'sent' | 'partially_signed' | 'completed' | 'voided' | undefined
      );
    }

    return NextResponse.json({ 
      success: true, 
      contracts: contracts.map(contract => ({
        ...contract,
        // Don't send document_data in list view for performance
        document_data: undefined,
        signed_document_data: undefined,
      }))
    });

  } catch (error) {
    console.error('Error fetching contracts:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch contracts' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSSRClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const formData = await request.formData();
    const brandId = formData.get('brandId') as string;
    const title = formData.get('title') as string;
    const templateId = formData.get('templateId') as string;
    const creatorId = formData.get('creatorId') as string;
    const scriptId = formData.get('scriptId') as string;
    const expiresInDays = formData.get('expiresInDays') as string;
    const recipients = formData.get('recipients') as string;
    const document = formData.get('document') as File;

    console.log('Received contract creation request:', {
      brandId,
      title,
      templateId,
      documentName: document?.name,
      documentSize: document?.size,
      documentType: document?.type,
      hasDocument: !!document,
      recipientsLength: recipients?.length
    });

    if (!brandId || !title) {
      return NextResponse.json({ 
        error: 'Brand ID and title are required' 
      }, { status: 400 });
    }

    // Parse recipients
    let parsedRecipients;
    try {
      parsedRecipients = JSON.parse(recipients || '[]');
    } catch {
      return NextResponse.json({ 
        error: 'Invalid recipients format' 
      }, { status: 400 });
    }

    if (!Array.isArray(parsedRecipients) || parsedRecipients.length === 0) {
      return NextResponse.json({ 
        error: 'At least one recipient is required' 
      }, { status: 400 });
    }

    // Validate recipients
    for (const recipient of parsedRecipients) {
      if (!recipient.name || !recipient.email) {
        return NextResponse.json({ 
          error: 'All recipients must have name and email' 
        }, { status: 400 });
      }
    }

    let documentData: Uint8Array;
    let documentName: string;

    if (document && document.size > 0) {
      // New document upload
      if (document.type !== 'application/pdf') {
        return NextResponse.json({ 
          error: 'Only PDF files are supported' 
        }, { status: 400 });
      }

      const documentBuffer = await document.arrayBuffer();
      documentData = new Uint8Array(documentBuffer);
      documentName = document.name;

      // Validate file size (max 10MB)
      if (documentData.length > 10 * 1024 * 1024) {
        return NextResponse.json({ 
          error: 'Document file too large. Maximum size is 10MB.' 
        }, { status: 400 });
      }
    } else if (templateId) {
      // Use template document
      const contractService = ContractService.getInstance();
      const templates = await contractService.getTemplates(brandId, user.id);
      const template = templates.find(t => t.id === templateId);
      
      if (!template) {
        return NextResponse.json({ 
          error: 'Template not found' 
        }, { status: 404 });
      }

      documentData = template.document_data;
      documentName = template.document_name;
    } else {
      return NextResponse.json({ 
        error: 'Either document file or template ID is required' 
      }, { status: 400 });
    }

    const contractData: ContractCreationData = {
      title,
      templateId: templateId || undefined,
      creatorId: creatorId || undefined,
      scriptId: scriptId || undefined,
      recipients: parsedRecipients,
      expiresInDays: expiresInDays ? parseInt(expiresInDays) : undefined,
    };

    const contractService = ContractService.getInstance();
    const contract = await contractService.createContract(
      contractData,
      documentData,
      documentName,
      brandId,
      user.id
    );

    return NextResponse.json({ 
      success: true, 
      contract: {
        ...contract,
        // Don't send document_data in response for performance
        document_data: undefined,
      }
    });

  } catch (error) {
    console.error('Error creating contract:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to create contract' 
    }, { status: 500 });
  }
} 