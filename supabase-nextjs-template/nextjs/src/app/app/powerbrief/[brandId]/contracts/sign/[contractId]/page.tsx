'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import PowerBriefPDFViewer from '@/components/contracts/PowerBriefPDFViewer'; // Assuming this path
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// Define types for the data expected on this page
interface SigningField { // Simplified for now
  id: string;
  type: string; // e.g., 'signature', 'text', 'date'
  page: number;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  value?: string; // Current value, to be filled by signer
  placeholder?: string;
  // Add other field-specific properties as needed
}

interface ContractSignData {
  contractId: string;
  documentName: string;
  documentData: Uint8Array; // The raw PDF data
  fieldsForSigner: SigningField[];
  recipientName: string;
  recipientEmail: string;
  // Potentially other details like brand name for display
}

export default function ContractSigningPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const contractId = params.contractId as string;
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contractData, setContractData] = useState<ContractSignData | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({}); // { fieldId: value }

  useEffect(() => {
    if (!contractId || !token) {
      setError('Missing contract information or token.');
      setIsLoading(false);
      return;
    }

    const verifyAndFetchContract = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/contracts/sign/verify-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contractId, token }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to verify token or fetch contract.');
        }
        
        // Assuming result.data contains { documentName, documentDataString, fieldsForSigner, recipientName, recipientEmail }
        // And documentDataString is a base64 string or similar that needs conversion
        const documentDataArray = new Uint8Array(Buffer.from(result.data.documentDataString, 'base64')); 
        // Note: Direct conversion from what might be a hex or other string from DB needs care.
        // If it's already a direct bytea that gets converted to an array/object by Supabase client, this conversion might differ.
        // For now, assuming it needs base64 decoding as an example.

        setContractData({
            contractId: contractId,
            documentName: result.data.documentName,
            documentData: documentDataArray, 
            fieldsForSigner: result.data.fieldsForSigner,
            recipientName: result.data.recipientName,
            recipientEmail: result.data.recipientEmail,
        });

      } catch (err) {
        console.error('Error verifying token/fetching contract:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        setContractData(null);
      } finally {
        setIsLoading(false);
      }
    };

    verifyAndFetchContract();
  }, [contractId, token]);

  const handleFieldChange = (fieldId: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmitSignature = async () => {
    if (!contractData) return;
    // TODO: Validate all required fields are filled
    console.log('Submitting signed data:', fieldValues);
    // API call to submit: /api/contracts/sign/submit
    // Body: { contractId, token, fieldValues }
    alert('Signature submission not implemented yet.');
  };

  if (isLoading) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md">
                <CardContent className="p-8 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                    <p className="text-lg font-semibold text-gray-700">Loading Contract...</p>
                    <p className="text-sm text-gray-500">Verifying your secure link and preparing the document.</p>
                </CardContent>
            </Card>
        </div>
    );
  }

  if (error) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <AlertTitle className="text-2xl font-bold text-red-600">Access Denied or Error</AlertTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Alert variant="destructive" className="text-center">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                    <Button className="mt-6 w-full" onClick={() => window.location.href = '/'}>Go to Homepage</Button>
                </CardContent>
            </Card>
        </div>
    );
  }

  if (!contractData) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
             <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <AlertTitle className="text-2xl font-bold text-yellow-600">No Contract Data</AlertTitle>
                </CardHeader>
                <CardContent className="p-6 text-center">
                    <p>Could not load contract details. Please check the link or contact support.</p>
                    <Button className="mt-6 w-full" onClick={() => window.location.href = '/'}>Go to Homepage</Button>
                </CardContent>
            </Card>
        </div>
    );
  }

  // TODO: Render actual interactive fields based on contractData.fieldsForSigner
  // This is a placeholder - the actual field rendering will be complex and overlaid via PowerBriefPDFViewer interactions.
  const renderInteractiveFields = () => {
    return contractData.fieldsForSigner.map(field => (
      <div key={field.id} className="mb-4 p-2 border rounded bg-gray-50">
        <label className="block text-sm font-medium text-gray-700">{field.type} (Page {field.page})</label>
        {field.type === 'signature' ? (
          <div className="w-full h-32 border-2 border-dashed border-gray-300 rounded-md bg-white flex items-center justify-center text-gray-400">
            SIGNATURE AREA (ID: {field.id})
          </div>
        ) : (
          <input 
            type={field.type === 'date' ? 'date' : 'text'} 
            placeholder={field.placeholder || `Enter ${field.type}`}
            value={fieldValues[field.id] || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        )}
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-md p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">PowerBrief Contract Signing</h1>
          <div>
            <p className="text-sm text-gray-600">Signing for: {contractData.recipientName}</p>
            <p className="text-xs text-gray-500">Document: {contractData.documentName}</p>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow container mx-auto p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* PDF Viewer Section */}
        <div className="md:col-span-2 bg-white rounded-lg shadow-lg overflow-hidden">
          {contractData.documentData && contractData.documentData.length > 0 ? (
                <PowerBriefPDFViewer
                    documentData={{
                        id: contractData.contractId,
                        data: contractData.documentData.slice(),
                    }}
                    className="min-h-[70vh] max-h-[80vh]"
                />
            ) : (
                <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">Document data is not available or is empty.</p>
                </div>
            )}
        </div>

        {/* Actions & Fields Panel */}
        <div className="md:col-span-1 bg-white p-6 rounded-lg shadow-lg space-y-6 flex flex-col">
          <h2 className="text-xl font-semibold text-gray-700 border-b pb-2">Complete Your Document</h2>
          
          <div className="flex-grow overflow-y-auto pr-2 space-y-4">
            {/* Placeholder for where interactive fields will be listed/focused */}
            {renderInteractiveFields()} 
            {contractData.fieldsForSigner.length === 0 && <p className="text-sm text-gray-500">No fields assigned for your signature on this document.</p>}
          </div>

          <Button onClick={handleSubmitSignature} className="w-full mt-auto" size="lg">
            Submit Signature & Finalize
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center p-4 text-sm text-gray-500 bg-gray-200">
        Powered by PowerBrief.ai
      </footer>
    </div>
  );
} 