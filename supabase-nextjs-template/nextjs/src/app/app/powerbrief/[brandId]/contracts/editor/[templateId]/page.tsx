'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, Button, Alert, AlertDescription } from '@/components/ui';
import { ArrowLeft } from 'lucide-react';
import PowerBriefContractEditor from '@/components/contracts/PowerBriefContractEditor';

interface SimpleRecipient {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface SimpleField {
  id: string;
  type: string;
  page: number;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  recipientId: string;
  recipientEmail: string;
}

// For storing the raw uploaded File object and its metadata
interface UploadedFileContainer {
  id: string;      // Temporary client-side ID for this upload instance
  file: File;      // The actual File object from the input
  name: string;    // Filename, typically file.name
}

// Data structure passed to PowerBriefContractEditor for display purposes
interface EditorDisplayProps {
  id: string;                   // Temporary client-side ID (for new) or template ID
  name: string;                 // Document name for display
  dataForViewer: Uint8Array | null; // Changed back to dataForViewer
}

interface ContractTemplate {
  id: string;
  title: string;
  description?: string;
  document_data: Uint8Array; // Template data is already Uint8Array
  document_name: string;
  created_at: string;
}

export default function ContractEditorPage() {
  const router = useRouter();
  const params = useParams();
  const brandId = params.brandId as string;
  const templateId = params.templateId as string;
  
  const [template, setTemplate] = useState<ContractTemplate | null>(null);
  const [uploadedOriginalFile, setUploadedOriginalFile] = useState<UploadedFileContainer | null>(null);
  const [newFileViewerData, setNewFileViewerData] = useState<Uint8Array | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Effect to process new file for viewer data (populates newFileViewerData)
  useEffect(() => {
    if (templateId === 'new' && uploadedOriginalFile && uploadedOriginalFile.file) {
      let isActive = true;
      const processFileForViewer = async () => {
        console.log('[useEffect] Processing new file for dataForViewer field:', uploadedOriginalFile.name);
        setNewFileViewerData(null); 
        try {
          const arrayBuffer = await uploadedOriginalFile.file.arrayBuffer();
          if (isActive) {
            const uint8Array = new Uint8Array(arrayBuffer);
            setNewFileViewerData(uint8Array); // This state will be used for dataForViewer
            console.log('[useEffect] setNewFileViewerData successful for dataForViewer, length:', uint8Array.length);
          }
        } catch (err) {
          if (isActive) {
            console.error('[useEffect] Error processing file for dataForViewer:', err);
            setError('Failed to load PDF for preview.');
            setNewFileViewerData(null);
          }
        }
      };
      processFileForViewer();
      return () => { isActive = false; };
    } else if (templateId !== 'new') {
      setUploadedOriginalFile(null); 
      setNewFileViewerData(null); 
    }
  }, [uploadedOriginalFile, templateId]);

  // Prepare the props for PowerBriefContractEditor
  const documentPropsForEditor = useMemo<EditorDisplayProps | null>(() => {
    console.log('[useMemo documentPropsForEditor] Recalculating for dataForViewer field...');
    if (templateId === 'new') {
      if (uploadedOriginalFile) {
        return {
          id: uploadedOriginalFile.id,
          name: uploadedOriginalFile.name,
          dataForViewer: newFileViewerData, // Use newFileViewerData for the dataForViewer field
        };
      }
      return null; 
    } else if (template) {
      return {
        id: template.id,
        name: template.document_name || template.title,
        dataForViewer: template.document_data, // Template data goes into dataForViewer field
      };
    }
    return null;
  }, [templateId, uploadedOriginalFile, template, newFileViewerData]);

  // Fetch template logic (simplified for brevity, ensure it sets `template` state)
  useEffect(() => {
    setLoading(true);
    if (templateId !== 'new') {
      // Simulate fetching template data
      // const fetchTemplateData = async () => { // Commenting out unused function
      //   console.log('[useEffect] Fetching template:', templateId);
      //   // Replace with actual API call: const fetchedTemplate = await api.fetchTemplate(templateId, brandId);
      //   // For now, using placeholder if you have one, or ensure `template` state is managed
      //   // Example: 
      //   // setTemplate({ id: templateId, title: 'Fetched Template', document_data: new Uint8Array([...]), document_name: 'template.pdf', created_at: new Date().toISOString() });
      //   setError(null);
      //   setLoading(false);
      // };
      // fetchTemplateData();
      console.log('[useEffect] In template mode, ensure template state is set. Currently:', template);
      setLoading(false); // Assume loaded or handled
    } else {
      console.log('[useEffect] In new contract mode.');
      setTemplate(null); // Ensure no stale template data
      setLoading(false);
    }
  }, [brandId, templateId]); // Removed router from deps unless used in actual fetch

  const handleSaveAsTemplate = async (data: { title: string; description?: string; fields: SimpleField[] }) => {
    console.log('Save as template requested:', data);
    alert('Template saving functionality will be implemented here.');
  };

  // Updated handleSend
  const handleSend = async (dataFromEditor: { 
    recipients: SimpleRecipient[]; 
    fields: SimpleField[]; 
  }) => {
    console.log(
      '[handleSend] Initiated.', 
      'templateId:', templateId, 
      'uploadedOriginalFile:', uploadedOriginalFile ? 
        { id: uploadedOriginalFile.id, name: uploadedOriginalFile.name, fileSize: uploadedOriginalFile.file?.size, fileExists: !!uploadedOriginalFile.file } : 
        null
    );

    if (!dataFromEditor.recipients || dataFromEditor.recipients.length === 0) {
      alert('Please add at least one recipient before sending.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let contractIdToUse: string;
      let documentNameToUse: string;

      if (templateId === 'new') {
        const uof = uploadedOriginalFile; // Capture current state for consistent check
        if (!uof || !uof.file || uof.file.size === 0) {
          const errorDetails = `uploadedOriginalFile is ${uof === null ? 'null' : 
            !uof.file ? 'missing .file property' : 
            uof.file.size === 0 ? 'file size is 0' : 'in an unexpected state'}`;
          const msg = `No document data found or file is empty. Please re-upload the document. (Details: ${errorDetails})`;
          console.error('[handleSend] Error:', msg, 'Current state of uploadedOriginalFile:', uof);
          setError(msg);
          alert(msg); // Enhanced alert
          setLoading(false);
          return;
        }

        documentNameToUse = uof.name;
        console.log('[handleSend] New contract: using uploadedOriginalFile:', documentNameToUse, 'size:', uof.file.size);

        const arrayBuffer = await uof.file.arrayBuffer();
        const documentBlobForApi = new Blob([arrayBuffer], { type: 'application/pdf' });

        if (documentBlobForApi.size === 0) {
           const msg = 'Failed to process the uploaded file (created Blob is empty). Please try again.';
           console.error('[handleSend] Error creating Blob:', msg);
           setError(msg); alert(msg); setLoading(false); return;
        }

        const formData = new FormData();
        formData.append('brandId', brandId as string);
        formData.append('title', documentNameToUse);
        formData.append('document', documentBlobForApi, documentNameToUse);
        formData.append('recipients', JSON.stringify(dataFromEditor.recipients));
        formData.append('fields', JSON.stringify(dataFromEditor.fields));

        console.log('[handleSend] Attempting to create new contract via /api/contracts...');
        const createResponse = await fetch('/api/contracts', {
          method: 'POST',
          body: formData,
        });

        if (!createResponse.ok) {
          const errorData = await createResponse.json();
          throw new Error(errorData.error || `Failed to create contract (HTTP ${createResponse.status})`);
        }
        const { contract } = await createResponse.json();
        contractIdToUse = contract.id;
        console.log('[handleSend] New contract created successfully, ID:', contractIdToUse);

      } else if (template) {
        contractIdToUse = template.id;
        documentNameToUse = template.document_name || template.title;
        console.log('[handleSend] Using existing template, ID:', contractIdToUse, 'Name:', documentNameToUse);
      } else {
        const msg = 'Contract source unclear: No new file uploaded and no template loaded.';
        console.error('[handleSend] Error:', msg);
        setError(msg); alert(msg); setLoading(false); return;
      }

      // Proceed to send email
      const emailPayload = {
        contractId: contractIdToUse,
        recipients: dataFromEditor.recipients,
        documentName: documentNameToUse,
        brandId: brandId as string,
      };
      console.log('[handleSend] Sending email with payload:', emailPayload);
      const sendEmailResponse = await fetch('/api/contracts/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailPayload),
      });
      const sendEmailResult = await sendEmailResponse.json();
      if (!sendEmailResponse.ok) {
        throw new Error(sendEmailResult.error || `Failed to send contract emails (HTTP ${sendEmailResponse.status})`);
      }
      
      alert(sendEmailResult.message || 'Contract sent successfully!');
      // Redirect to the main contracts list page
      router.push(`/app/powerbrief/${brandId}/ugc-pipeline?view=contracts`);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during the send process.';
      console.error('[handleSend] Catch block error:', errorMessage, err);
      setError(errorMessage);
      alert(`Operation failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Updated handleFileUpload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.log('[FileUpload] No file selected.');
      return;
    }
    setError(null); 
    setNewFileViewerData(null); 
    setUploadedOriginalFile(null); 
    setUploading(true);
    console.log('[FileUpload] Starting for:', { name: file.name, size: file.size, type: file.type });

    if (file.type !== 'application/pdf') {
      const msg = 'Please upload a PDF file only.';
      console.warn('[FileUpload]', msg); setError(msg); setUploading(false); return;
    }
    if (file.size > 10 * 1024 * 1024) { 
      const msg = 'File size must be less than 10MB.';
      console.warn('[FileUpload]', msg); setError(msg); setUploading(false); return;
    }
    if (file.size === 0) {
      const msg = 'The selected file is empty. Please choose a valid PDF.';
      console.warn('[FileUpload]', msg); setError(msg); setUploading(false); return;
    }

    try {
      const newFileContainer: UploadedFileContainer = {
        id: `upload_${Date.now()}`,
        file: file,
        name: file.name,
      };
      setUploadedOriginalFile(newFileContainer);
      console.log(
        '[FileUpload] setUploadedOriginalFile called with:', 
        { id: newFileContainer.id, name: newFileContainer.name, fileSize: newFileContainer.file.size, fileExists: !!newFileContainer.file },
        'Effect will now process for viewer.'
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      console.error('[FileUpload] Error during staging:', errorMessage, err);
      setError('Failed to stage the uploaded file.');
      setUploadedOriginalFile(null);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-lg font-semibold text-gray-700">Loading Contract Editor...</p>
              <p className="text-sm text-gray-500">Please wait a moment.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle className="text-red-600">An Error Occurred</CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button 
              className="mt-6 w-full"
              onClick={() => {
                setError(null);
                // Attempt to re-initialize or go back
                if (templateId === 'new') setUploadedOriginalFile(null);
                else router.refresh(); // Or navigate back
              }}
            >
              Try Again or Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Case 1: New Contract Mode (templateId === 'new')
  if (templateId === 'new') {
    // Subcase 1.1: No file has been uploaded yet, or is currently being uploaded.
    if (!uploadedOriginalFile || uploading) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-center">Create New Contract</CardTitle>
              <p className="text-sm text-gray-600 text-center">Upload a PDF document to begin.</p>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="flex flex-col items-center">
                <label htmlFor="pdf-upload" className={`flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 ${uploading ? 'opacity-50' : ''}`}>
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg className="w-10 h-10 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                    <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                    <p className="text-xs text-gray-500">PDF only (MAX. 10MB)</p>
                  </div>
                  <input id="pdf-upload" type="file" className="hidden" onChange={handleFileUpload} accept="application/pdf" disabled={uploading} />
                </label>
                {uploading && <p className="mt-4 text-sm text-blue-600">Uploading and processing file...</p>}
              </div>
              <Button className="w-full" onClick={() => router.push(`/app/powerbrief/${brandId}/ugc-pipeline?view=contracts`)} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Contracts List
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    // Subcase 1.2: File uploaded, editor can be shown.
    // documentPropsForEditor should be populated by now, viewer data might still be loading via newFileViewerData effect
    if (documentPropsForEditor) {
        return (
            <div className="min-h-screen bg-gray-50">
            {/* Header for New Contract */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" onClick={() => router.push(`/app/powerbrief/${brandId}/ugc-pipeline?view=contracts`)}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back
                    </Button>
                    <div>
                    <h1 className="text-xl font-bold flex items-center gap-2">🎯 PowerBrief Contract Editor</h1>
                    <p className="text-sm text-gray-600">{documentPropsForEditor.name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setUploadedOriginalFile(null); setNewFileViewerData(null); /* Clear relevant states */ }} title="Upload a different document">
                    📄 Change Document
                    </Button>
                    {/* Save as Template and Send buttons are inside PowerBriefContractEditor */}
                </div>
                </div>
            </div>
            {/* Main Editor */}
            <div className="max-w-full mx-auto p-3 md:p-6">
                <PowerBriefContractEditor
                documentData={documentPropsForEditor} // This now has {id, name, dataForViewer}
                brandId={brandId as string}
                onSaveAsTemplate={handleSaveAsTemplate}
                onSend={handleSend} // handleSend in Page will use its own state for file data
                className="min-h-[calc(100vh-150px)]" // Adjusted height
                />
            </div>
            </div>
        );
    }
    // Subcase 1.3: Fallback if uploadedOriginalFile is set but documentPropsForEditor isn't ready (should be rare)
    return (
      <div className="container mx-auto py-8 flex justify-center items-center min-h-[60vh]">
          <p className="text-lg font-semibold text-gray-700">Preparing document editor...</p>
      </div>
    ); 
  }

  // Case 2: Template Mode (templateId is not 'new')
  if (template && documentPropsForEditor) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header for Template */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
                <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={() => router.push(`/app/powerbrief/${brandId}/ugc-pipeline?view=contracts`)}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2">🎯 PowerBrief Contract Editor</h1>
                    <p className="text-sm text-gray-600">Using Template: {template.title}</p>
                </div>
                </div>
                {/* Actions for template mode might differ, e.g., no 'Change Document' */}
            </div>
        </div>
        {/* Main Editor */}
        <div className="max-w-full mx-auto p-3 md:p-6">
            <PowerBriefContractEditor
            documentData={documentPropsForEditor} // This will have template data
            brandId={brandId as string}
            onSaveAsTemplate={handleSaveAsTemplate}
            onSend={handleSend}
            className="min-h-[calc(100vh-150px)]" // Adjusted height
            />
        </div>
      </div>
    );
  }
  
  // Fallback / Default State (e.g., template is loading, or template not found but not an error yet)
  return (
    <div className="container mx-auto py-8 flex justify-center items-center min-h-[60vh]">
        <p className="text-lg font-semibold text-gray-700">
            {templateId !== 'new' && !template ? 'Loading template data...' : 'Unable to load contract editor.'}
        </p>
    </div>
  );
} 