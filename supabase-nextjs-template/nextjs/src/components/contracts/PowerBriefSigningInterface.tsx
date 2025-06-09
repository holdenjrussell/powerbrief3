'use client';

import React, { useState, useRef, useMemo } from 'react';
import { 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Input,
  Label,
  Checkbox,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Alert,
  AlertDescription
} from "@/components/ui";
import { 
  PenTool,
  Type,
  Calendar,
  CheckSquare,
  Mail,
  Hash,
  User,
  Download,
  Send,
  CheckCircle
} from 'lucide-react';
import PowerBriefPDFViewer from './PowerBriefPDFViewer';

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

interface SigningProps {
  contractData: {
    id: string;
    title: string;
    documentData: Uint8Array;
  };
  fields: SigningField[];
  recipientInfo: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  onComplete?: (fieldValues: Record<string, string>) => void;
  className?: string;
}

export default function PowerBriefSigningInterface({
  contractData,
  fields,
  recipientInfo,
  onComplete,
  className = ''
}: SigningProps) {
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [currentSignatureField, setCurrentSignatureField] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [signature, setSignature] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Get fields for current recipient
  const recipientFields = fields.filter(field => field.recipientEmail === recipientInfo.email);

  // Memoize the document data to prevent PDF reloads
  const pdfViewerDocumentData = useMemo(() => ({
    id: contractData.id,
    data: contractData.documentData,
  }), [contractData.id, contractData.documentData]);

  // Handle field value change
  const handleFieldChange = (fieldId: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }));
  };

  // Handle signature creation
  const handleCreateSignature = (fieldId: string) => {
    setCurrentSignatureField(fieldId);
    setShowSignatureDialog(true);
  };

  // Save signature
  const handleSaveSignature = () => {
    if (currentSignatureField && signature) {
      setFieldValues(prev => ({ ...prev, [currentSignatureField]: signature }));
      setShowSignatureDialog(false);
      setCurrentSignatureField(null);
      setSignature('');
    }
  };

  // Clear signature canvas
  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setSignature('');
      }
    }
  };

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      setSignature('drawing');
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || signature !== 'drawing') return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      setSignature(canvas.toDataURL());
    }
  };

  // Complete signing
  const handleCompleteSigning = async () => {
    // Check all required fields are filled
    const requiredFields = recipientFields.filter(field => field.required);
    const missingFields = requiredFields.filter(field => !fieldValues[field.id]);

    if (missingFields.length > 0) {
      alert('Please fill in all required fields before completing.');
      return;
    }

    setIsCompleting(true);
    try {
      await onComplete?.(fieldValues);
      setIsCompleted(true);
    } catch (error) {
      console.error('Error completing contract:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  // Render field input based on type
  const renderFieldInput = (field: SigningField) => {
    const value = fieldValues[field.id] || '';

    switch (field.type) {
      case 'signature':
        return (
          <Dialog open={showSignatureDialog && currentSignatureField === field.id} onOpenChange={setShowSignatureDialog}>
            <DialogTrigger asChild>
              <Button 
                variant={value ? "default" : "outline"} 
                className="w-full h-full"
                onClick={() => handleCreateSignature(field.id)}
              >
                {value ? (
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Signed
                  </div>
                ) : (
                  <div className="flex items-center">
                    <PenTool className="h-4 w-4 mr-2" />
                    Click to Sign
                  </div>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Your Signature</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Draw your signature below:</Label>
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={150}
                    className="border-2 border-gray-300 rounded-lg cursor-crosshair w-full"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                  />
                </div>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={clearSignature}>
                    Clear
                  </Button>
                  <div className="space-x-2">
                    <Button variant="outline" onClick={() => setShowSignatureDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveSignature} disabled={!signature}>
                      Save Signature
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        );

      case 'text':
        return (
          <Input
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder || 'Enter text'}
            className="w-full h-full"
          />
        );

      case 'email':
        return (
          <Input
            type="email"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder || 'Enter email'}
            className="w-full h-full"
          />
        );

      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="w-full h-full"
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder || 'Enter number'}
            className="w-full h-full"
          />
        );

      case 'checkbox':
        return (
          <Checkbox
            checked={value === 'true'}
            onCheckedChange={(checked) => handleFieldChange(field.id, checked ? 'true' : 'false')}
            className="w-5 h-5"
          />
        );

      case 'name':
        return (
          <Input
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={recipientInfo.name}
            className="w-full h-full"
          />
        );

      default:
        return (
          <Input
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder || 'Enter value'}
            className="w-full h-full"
          />
        );
    }
  };

  const getFieldIcon = (type: string) => {
    switch (type) {
      case 'signature':
        return PenTool;
      case 'text':
        return Type;
      case 'date':
        return Calendar;
      case 'email':
        return Mail;
      case 'number':
        return Hash;
      case 'checkbox':
        return CheckSquare;
      case 'name':
        return User;
      default:
        return Type;
    }
  };

  if (isCompleted) {
    return (
      <div className={`flex items-center justify-center min-h-[600px] ${className}`}>
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-800 mb-2">Contract Completed!</h2>
            <p className="text-gray-600 mb-4">
              Thank you for signing. You will receive a copy via email shortly.
            </p>
            <Button className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Download Copy
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const requiredFields = recipientFields.filter(field => field.required);
  const completedRequiredFields = requiredFields.filter(field => fieldValues[field.id]);
  const progress = requiredFields.length > 0 ? (completedRequiredFields.length / requiredFields.length) * 100 : 100;

  return (
    <div className={`grid grid-cols-12 gap-6 ${className}`}>
      {/* Left Panel - Progress & Instructions */}
      <div className="col-span-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>PowerBrief Contract</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-lg">{contractData.title}</h3>
                <p className="text-sm text-gray-600">
                  Welcome, {recipientInfo.name}
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Progress</span>
                  <span className="text-sm text-gray-500">
                    {completedRequiredFields.length} of {requiredFields.length}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <Alert>
                <AlertDescription>
                  Please fill in all the highlighted fields on the document, then complete your signature to finish.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>

        {/* Field List */}
        <Card>
          <CardHeader>
            <CardTitle>Required Fields</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recipientFields.map((field) => {
                const Icon = getFieldIcon(field.type);
                const isCompleted = !!fieldValues[field.id];
                
                return (
                  <div
                    key={field.id}
                    className={`flex items-center p-3 rounded-lg border ${
                      isCompleted ? 'border-green-200 bg-green-50' : 'border-gray-200'
                    }`}
                  >
                    <Icon className={`h-4 w-4 mr-3 ${isCompleted ? 'text-green-600' : 'text-gray-400'}`} />
                    <div className="flex-1">
                      <div className="font-medium capitalize">{field.type}</div>
                      {field.required && (
                        <div className="text-xs text-red-500">Required</div>
                      )}
                    </div>
                    {isCompleted && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Complete Button */}
        <Card>
          <CardContent className="pt-6">
            <Button 
              className="w-full"
              onClick={handleCompleteSigning}
              disabled={isCompleting || completedRequiredFields.length < requiredFields.length}
            >
              {isCompleting ? (
                'Completing...'
              ) : (
                <div className="flex items-center">
                  <Send className="h-4 w-4 mr-2" />
                  Complete Contract
                </div>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Document with Fields */}
      <div className="col-span-8">
        <Card className="h-full overflow-hidden">
          <CardHeader>
            <CardTitle>Document</CardTitle>
          </CardHeader>
          <CardContent className="p-0 h-full">
            {/* Use memoized document data to prevent reloads */}
            <PowerBriefPDFViewer
              documentData={pdfViewerDocumentData}
              className="h-full"
              showToolbar={true}
              enableFieldPlacement={false}
              fields={recipientFields.map(field => ({
                id: field.id,
                type: field.type,
                page: field.page,
                positionX: field.positionX,
                positionY: field.positionY,
                width: field.width,
                height: field.height,
                recipientId: field.recipientId,
                recipientEmail: field.recipientEmail,
                value: fieldValues[field.id],
                placeholder: field.placeholder,
              }))}
            />
            
            {/* Overlay for field inputs - positioned absolutely over the PDF */}
            <div className="absolute inset-0 pointer-events-none">
              {recipientFields.map((field) => {
                const isCompleted = !!fieldValues[field.id];
                
                return (
                  <div
                    key={field.id}
                    className={`absolute border-2 rounded pointer-events-auto ${
                      isCompleted 
                        ? 'border-green-500 bg-green-50' 
                        : field.required 
                        ? 'border-red-500 bg-red-50' 
                        : 'border-blue-500 bg-blue-50'
                    }`}
                    style={{
                      left: `${field.positionX}%`,
                      top: `${field.positionY}%`,
                      width: `${field.width}%`,
                      height: `${field.height}%`,
                      minHeight: '40px',
                    }}
                  >
                    <div className="w-full h-full p-1">
                      {renderFieldInput(field)}
                    </div>
                    {field.required && !fieldValues[field.id] && (
                      <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                        !
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 