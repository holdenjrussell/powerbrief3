'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { 
  Card, 
  CardContent
} from "@/components/ui";
import { 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Loader2
} from 'lucide-react';
import PowerBriefSigningInterface from '@/components/contracts/PowerBriefSigningInterface';

interface SigningField {
  id: string;
  type: string;
  page: number;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  recipientId: string;
  recipientEmail: string;
  placeholder?: string;
  required?: boolean;
  value?: string;
}

interface ContractData {
  id: string;
  title: string;
  documentData: Uint8Array;
}

interface RecipientInfo {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function PublicContractSigningPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const contractId = params.contractId as string;
  const authToken = searchParams.get('token');

  const [contractData, setContractData] = useState<ContractData | null>(null);
  const [fields, setFields] = useState<SigningField[]>([]);
  const [recipientInfo, setRecipientInfo] = useState<RecipientInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (contractId && authToken) {
      fetchSigningData();
    } else {
      setError('Invalid signing link');
      setLoading(false);
    }
  }, [contractId, authToken]);

  const fetchSigningData = async () => {
    try {
      // Verify token and get contract data
      const response = await fetch('/api/contracts/sign/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId, token: authToken }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Invalid or expired signing link');
      }

      const result = await response.json();
      const { documentName, documentDataString, fieldsForSigner, recipientName, recipientEmail } = result.data;

      // Convert base64 string back to Uint8Array
      const documentDataArray = Uint8Array.from(atob(documentDataString), c => c.charCodeAt(0));
      console.log('[PublicSigningPage] documentDataString (first 100 chars):', documentDataString.substring(0, 100));
      console.log('[PublicSigningPage] Converted documentDataArray type:', typeof documentDataArray, 'instanceof Uint8Array:', documentDataArray instanceof Uint8Array, 'length:', documentDataArray.length);
      console.log('[PublicSigningPage] documentDataArray (first 100 bytes as hex):', Array.from(documentDataArray.slice(0, 100)).map(b => b.toString(16).padStart(2, '0')).join(''));

      setContractData({
        id: contractId,
        title: documentName,
        documentData: documentDataArray,
      });

      setFields(fieldsForSigner.map((field: SigningField) => ({
        ...field,
        recipientEmail: recipientEmail,
        recipientId: contractId, // Using contractId as recipientId for now
        required: true, // Mark all fields as required for now
      })));

      setRecipientInfo({
        id: contractId,
        name: recipientName,
        email: recipientEmail,
        role: 'signer',
      });

    } catch (error) {
      console.error('Error fetching signing data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load contract');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (fieldValues: Record<string, string>) => {
    try {
      const response = await fetch('/api/contracts/sign/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractId,
          token: authToken,
          fieldValues,
          ipAddress: '', // Would be populated server-side
          userAgent: navigator.userAgent
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit signature');
      }

      setCompleted(true);
    } catch (error) {
      console.error('Error signing contract:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-600" />
            <p className="text-lg font-semibold">Loading contract...</p>
            <p className="text-sm text-gray-500 mt-2">Please wait while we prepare your document</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold mb-2">Unable to Load Contract</h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <p className="text-sm text-gray-500">
              This signing link may have expired or is invalid. Please contact the sender for a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Contract Signed Successfully!</h1>
            <p className="text-gray-600 mb-4">
              Thank you for signing <strong>{contractData?.title}</strong>
            </p>
            <p className="text-sm text-gray-500">
              You will receive a confirmation email with a copy of the signed contract shortly.
            </p>
            <div className="mt-6 pt-6 border-t">
              <p className="text-xs text-gray-400">
                Powered by PowerBrief
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!contractData || !recipientInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold mb-2">No Contract Data</h1>
            <p className="text-gray-600">
              Unable to load contract details. Please try again or contact support.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-friendly header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              <h1 className="text-lg font-semibold">PowerBrief Contract</h1>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-700">{recipientInfo.name}</p>
              <p className="text-xs text-gray-500">{recipientInfo.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto p-4">
        <PowerBriefSigningInterface
          contractData={contractData}
          fields={fields}
          recipientInfo={recipientInfo}
          onComplete={handleComplete}
          className="min-h-[calc(100vh-120px)]"
        />
      </div>

      {/* Footer */}
      <div className="bg-white border-t mt-8">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center">
          <p className="text-xs text-gray-500">
            This document is secured and powered by PowerBrief. 
            Your signature is legally binding.
          </p>
        </div>
      </div>
    </div>
  );
} 