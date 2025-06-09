'use client';

import React, { useState, useCallback } from 'react';
import { 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui";
import { 
  Plus, 
  Users, 
  Send, 
  Edit3, 
  Trash2, 
  PenTool,
  Type,
  Calendar,
  CheckSquare,
  Mail,
  Hash,
  User
} from 'lucide-react';
import PowerBriefPDFViewer from './PowerBriefPDFViewer';

// Field types supported by PowerBrief
export const FIELD_TYPES = {
  SIGNATURE: 'signature',
  TEXT: 'text',
  DATE: 'date',
  EMAIL: 'email',
  NUMBER: 'number',
  CHECKBOX: 'checkbox',
  NAME: 'name',
} as const;

export const FIELD_TYPE_CONFIG = {
  [FIELD_TYPES.SIGNATURE]: {
    label: 'Signature',
    icon: PenTool,
    color: 'blue',
    description: 'Digital signature field'
  },
  [FIELD_TYPES.TEXT]: {
    label: 'Text',
    icon: Type,
    color: 'green',
    description: 'Free text input'
  },
  [FIELD_TYPES.DATE]: {
    label: 'Date',
    icon: Calendar,
    color: 'purple',
    description: 'Date picker field'
  },
  [FIELD_TYPES.EMAIL]: {
    label: 'Email',
    icon: Mail,
    color: 'orange',
    description: 'Email address field'
  },
  [FIELD_TYPES.NUMBER]: {
    label: 'Number',
    icon: Hash,
    color: 'indigo',
    description: 'Numeric input field'
  },
  [FIELD_TYPES.CHECKBOX]: {
    label: 'Checkbox',
    icon: CheckSquare,
    color: 'pink',
    description: 'Checkbox field'
  },
  [FIELD_TYPES.NAME]: {
    label: 'Name',
    icon: User,
    color: 'teal',
    description: 'Full name field'
  },
};

interface DocumentRecipient {
  id: string;
  name: string;
  email: string;
  role: 'signer' | 'viewer' | 'cc';
  signingOrder: number;
  color: string;
}

interface DocumentField {
  id: string;
  type: keyof typeof FIELD_TYPES;
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

interface DocumentEditorProps {
  documentData: {
    id: string;
    data: Uint8Array;
    name: string;
  };
  initialRecipients?: DocumentRecipient[];
  initialFields?: DocumentField[];
  onSave?: (data: { recipients: DocumentRecipient[]; fields: DocumentField[] }) => void;
  onSend?: (data: { recipients: DocumentRecipient[]; fields: DocumentField[]; message?: string }) => void;
  className?: string;
}

export default function PowerBriefDocumentEditor({
  documentData,
  initialRecipients = [],
  initialFields = [],
  onSave,
  onSend,
  className = ''
}: DocumentEditorProps) {
  const [recipients, setRecipients] = useState<DocumentRecipient[]>(initialRecipients);
  const [fields, setFields] = useState<DocumentField[]>(initialFields);
  const [selectedFieldType, setSelectedFieldType] = useState<string | null>(null);
  const [selectedRecipient, setSelectedRecipient] = useState<DocumentRecipient | null>(null);
  const [currentStep, setCurrentStep] = useState<'recipients' | 'fields' | 'send'>('recipients');
  const [isPDFLoaded, setIsPDFLoaded] = useState(false);
  
  // New recipient dialog
  const [showNewRecipientDialog, setShowNewRecipientDialog] = useState(false);
  const [newRecipient, setNewRecipient] = useState({
    name: '',
    email: '',
    role: 'signer' as const
  });

  // Validation
  const [errors] = useState<string[]>([]);

  // Generate recipient colors
  const getRecipientColor = (index: number) => {
    const colors = ['blue', 'green', 'purple', 'orange', 'pink', 'indigo', 'teal', 'red'];
    return colors[index % colors.length];
  };

  // Add new recipient
  const handleAddRecipient = () => {
    if (!newRecipient.name || !newRecipient.email) {
      return;
    }

    const recipient: DocumentRecipient = {
      id: `recipient_${Date.now()}`,
      name: newRecipient.name,
      email: newRecipient.email,
      role: newRecipient.role,
      signingOrder: recipients.length + 1,
      color: getRecipientColor(recipients.length),
    };

    setRecipients(prev => [...prev, recipient]);
    setNewRecipient({ name: '', email: '', role: 'signer' });
    setShowNewRecipientDialog(false);
    
    // Auto-select the new recipient for field placement
    setSelectedRecipient(recipient);
  };

  // Remove recipient
  const handleRemoveRecipient = (recipientId: string) => {
    setRecipients(prev => prev.filter(r => r.id !== recipientId));
    setFields(prev => prev.filter(f => f.recipientId !== recipientId));
    
    if (selectedRecipient?.id === recipientId) {
      setSelectedRecipient(null);
    }
  };

  // Handle field placement from PDF viewer
  const handleFieldPlace = useCallback((fieldPlacement: any) => {
    if (!selectedRecipient || !selectedFieldType) return;

    const newField: DocumentField = {
      id: fieldPlacement.id,
      type: selectedFieldType as keyof typeof FIELD_TYPES,
      page: fieldPlacement.page,
      positionX: fieldPlacement.x,
      positionY: fieldPlacement.y,
      width: fieldPlacement.width,
      height: fieldPlacement.height,
      recipientId: selectedRecipient.id,
      recipientEmail: selectedRecipient.email,
      required: true,
      placeholder: FIELD_TYPE_CONFIG[selectedFieldType as keyof typeof FIELD_TYPES]?.label || '',
    };

    setFields(prev => [...prev, newField]);
    setSelectedFieldType(null); // Clear selection after placing
  }, [selectedRecipient, selectedFieldType]);

  // Remove field
  const handleRemoveField = (fieldId: string) => {
    setFields(prev => prev.filter(f => f.id !== fieldId));
  };

  // Validate document
  const validateDocument = (): string[] => {
    const validationErrors: string[] = [];

    if (recipients.length === 0) {
      validationErrors.push('At least one recipient is required');
    }

    if (fields.length === 0) {
      validationErrors.push('At least one field is required');
    }

    // Check for signature fields for signers
    const signers = recipients.filter(r => r.role === 'signer');
    const signatureFields = fields.filter(f => f.type === FIELD_TYPES.SIGNATURE);
    
    signers.forEach(signer => {
      const hasSignatureField = signatureFields.some(f => f.recipientId === signer.id);
      if (!hasSignatureField) {
        validationErrors.push(`${signer.name} needs at least one signature field`);
      }
    });

    return validationErrors;
  };

  // Handle save
  const handleSave = () => {
    const validationErrors = validateDocument();
    setErrors(validationErrors);

    if (validationErrors.length === 0) {
      onSave?.({ recipients, fields });
    }
  };

  // Handle send
  const handleSend = () => {
    const validationErrors = validateDocument();
    setErrors(validationErrors);

    if (validationErrors.length === 0) {
      onSend?.({ recipients, fields, message: sendMessage });
      setShowSendDialog(false);
    }
  };

  // Steps navigation
  const steps = [
    { id: 'recipients', label: 'Add Recipients', icon: Users },
    { id: 'fields', label: 'Add Fields', icon: Edit3 },
    { id: 'send', label: 'Send Document', icon: Send },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className={`grid grid-cols-12 gap-6 h-full ${className}`}>
      {/* Left Panel - Steps & Tools */}
      <div className="col-span-4 space-y-6">
        {/* Progress Steps */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Document Setup</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = index < currentStepIndex;
                
                return (
                  <div
                    key={step.id}
                    className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                      isActive 
                        ? 'bg-blue-50 border-2 border-blue-200' 
                        : isCompleted
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                    }`}
                    onClick={() => setCurrentStep(step.id as any)}
                  >
                    <Icon className={`h-5 w-5 mr-3 ${
                      isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                    }`} />
                    <span className={`font-medium ${
                      isActive ? 'text-blue-900' : isCompleted ? 'text-green-900' : 'text-gray-600'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recipients Step */}
        {currentStep === 'recipients' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recipients</CardTitle>
                <Dialog open={showNewRecipientDialog} onOpenChange={setShowNewRecipientDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Recipient</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="recipient-name">Name</Label>
                        <Input
                          id="recipient-name"
                          value={newRecipient.name}
                          onChange={(e) => setNewRecipient(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Full name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="recipient-email">Email</Label>
                        <Input
                          id="recipient-email"
                          type="email"
                          value={newRecipient.email}
                          onChange={(e) => setNewRecipient(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="email@example.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="recipient-role">Role</Label>
                        <Select 
                          value={newRecipient.role} 
                          onValueChange={(value) => setNewRecipient(prev => ({ ...prev, role: value as any }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="signer">Signer</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                            <SelectItem value="cc">CC</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setShowNewRecipientDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleAddRecipient}>
                          Add Recipient
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recipients.map((recipient) => (
                  <div
                    key={recipient.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      selectedRecipient?.id === recipient.id 
                        ? 'border-blue-300 bg-blue-50' 
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline">
                        {recipient.role}
                      </Badge>
                      <div>
                        <div className="font-medium">{recipient.name}</div>
                        <div className="text-sm text-gray-500">{recipient.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant={selectedRecipient?.id === recipient.id ? "default" : "outline"}
                        onClick={() => setSelectedRecipient(recipient)}
                      >
                        Select
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemoveRecipient(recipient.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {recipients.length === 0 && (
                  <div className="text-center py-6 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No recipients added yet</p>
                    <p className="text-sm">Add recipients to continue</p>
                  </div>
                )}
              </div>
              
              {recipients.length > 0 && (
                <Button 
                  className="w-full mt-4" 
                  onClick={() => setCurrentStep('fields')}
                  disabled={!isPDFLoaded}
                >
                  Continue to Fields
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Other steps would go here but keeping file size manageable */}
        {currentStep !== 'recipients' && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">Advanced field and send functionality coming next...</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Panel - PDF Viewer */}
      <div className="col-span-8">
        <PowerBriefPDFViewer
          documentData={documentData}
          onDocumentLoad={() => setIsPDFLoaded(true)}
          enableFieldPlacement={currentStep === 'fields'}
          onFieldPlace={handleFieldPlace}
          fields={fields}
          selectedFieldType={selectedFieldType}
          selectedRecipient={selectedRecipient}
          className="h-full"
        />
      </div>
    </div>
  );
} 