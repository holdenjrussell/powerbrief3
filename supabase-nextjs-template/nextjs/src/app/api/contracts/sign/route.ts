import { NextRequest, NextResponse } from 'next/server';
import { ContractService } from '@/lib/services/contractService';

export async function POST(request: NextRequest) {
  try {
    const { contractId, recipientId, authToken, signatures, ipAddress, userAgent } = await request.json();

    if (!contractId || !recipientId || !authToken || !signatures || !Array.isArray(signatures)) {
      return NextResponse.json({ 
        error: 'Contract ID, recipient ID, auth token, and signatures are required' 
      }, { status: 400 });
    }

    // Validate signature data
    for (const signature of signatures) {
      if (!signature.fieldId || signature.value === undefined || !signature.type) {
        return NextResponse.json({ 
          error: 'All signatures must have fieldId, value, and type' 
        }, { status: 400 });
      }
    }

    const contractService = ContractService.getInstance();
    
    // Get client IP if not provided
    const clientIp = ipAddress || request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 'unknown';
    
    // Get user agent if not provided
    const clientUserAgent = userAgent || request.headers.get('user-agent') || 'unknown';

    await contractService.submitSignature(
      contractId,
      recipientId,
      authToken,
      signatures,
      clientIp,
      clientUserAgent
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Signature submitted successfully' 
    });

  } catch (error) {
    console.error('Error submitting signature:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to submit signature' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contractId = searchParams.get('contractId');
    const authToken = searchParams.get('authToken');

    if (!contractId || !authToken) {
      return NextResponse.json({ 
        error: 'Contract ID and auth token are required' 
      }, { status: 400 });
    }

    const contractService = ContractService.getInstance();
    const signingData = await contractService.getSigningLink(contractId, authToken);

    if (!signingData) {
      return NextResponse.json({ 
        error: 'Invalid signing link or contract not found' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      signingData 
    });

  } catch (error) {
    console.error('Error getting signing data:', error);
    return NextResponse.json({ 
      error: 'Failed to get signing data' 
    }, { status: 500 });
  }
} 