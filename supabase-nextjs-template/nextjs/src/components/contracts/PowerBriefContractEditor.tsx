'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
  DialogFooter,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea
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
  User,
  FileText
} from 'lucide-react';
import PowerBriefPDFViewer from './PowerBriefPDFViewer';
import { 
  DndContext, 
  DragOverlay, 
  useDraggable, 
  useSensor, 
  PointerSensor,
  KeyboardSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type Active,
  pointerWithin,
} from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';

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
  value?: string; // Optional value for field defaults (e.g., today's date for date fields)
}

interface Creator {
  id: string;
  name: string;
  email: string;
  // Add other relevant creator fields if needed
}

// Type for raw creator data from API
interface RawCreatorData {
  id: string;
  name: string;
  email: string | null; // API might send null for email
  // Add other fields if they exist in the API response
}

interface FieldTool {
  type: string;
  label: string;
  icon: React.ElementType;
  color: string;
}

interface ContractEditorProps {
  documentData: {
    id: string;
    name: string;
    dataForViewer: Uint8Array | null;
  } | null;
  brandId: string;
  initialFields?: SimpleField[];
  onSend?: (data: { recipients: SimpleRecipient[]; fields: SimpleField[] }) => void;
  onSaveAsTemplate?: (data: { title: string; description?: string; fields: SimpleField[] }) => void;
  className?: string;
}

const FIELD_TOOLS = [
  { type: 'signature', label: 'Signature', icon: PenTool, color: 'blue' },
  { type: 'text', label: 'Text', icon: Type, color: 'green' },
  { type: 'date', label: 'Date', icon: Calendar, color: 'purple' },
  { type: 'email', label: 'Email', icon: Mail, color: 'orange' },
  { type: 'number', label: 'Number', icon: Hash, color: 'indigo' },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare, color: 'pink' },
  { type: 'name', label: 'Name', icon: User, color: 'teal' },
];

// Save Template Form Component
interface SaveTemplateFormProps {
  onSave: (data: { title: string; description?: string; fields: SimpleField[] }) => void;
  fields: SimpleField[];
}

function SaveTemplateForm({ onSave, fields }: SaveTemplateFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    console.log('[SaveTemplateForm] === TEMPLATE SAVE DEBUGGING ===');
    console.log('[SaveTemplateForm] Attempting to save template with:', {
      title: title.trim(),
      description: description.trim() || 'undefined',
      fieldsCount: fields.length,
      fields: fields
    });
    
    if (!title.trim()) {
      alert('Please enter a template title');
      return;
    }

    console.log('[SaveTemplateForm] Fields being passed to onSave:', fields);
    console.log('[SaveTemplateForm] Individual fields:');
    fields.forEach((field, index) => {
      console.log(`[SaveTemplateForm] Field ${index}:`, {
        id: field.id,
        type: field.type,
        page: field.page,
        positionX: field.positionX,
        positionY: field.positionY,
        width: field.width,
        height: field.height,
        recipientId: field.recipientId,
        recipientEmail: field.recipientEmail
      });
    });
    console.log('[SaveTemplateForm] Fields array length:', fields.length);
    console.log('[SaveTemplateForm] Fields as JSON string:', JSON.stringify(fields, null, 2));

    setSaving(true);
    try {
      const templateData = {
        title: title.trim(),
        description: description.trim() || undefined,
        fields
      };
      
      console.log('[SaveTemplateForm] Calling onSave with data:', templateData);
      onSave(templateData);
      
      // Reset form
      setTitle('');
      setDescription('');
      console.log('[SaveTemplateForm] Template save initiated successfully');
    } catch (error) {
      console.error('[SaveTemplateForm] Error saving template:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="template-title">Template Title *</Label>
        <Input
          id="template-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter template title"
        />
      </div>
      <div>
        <Label htmlFor="template-description">Description (Optional)</Label>
        <Textarea
          id="template-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter template description"
          rows={3}
        />
      </div>
      <div className="text-sm text-gray-600">
        <p>This template will include {fields.length} field{fields.length !== 1 ? 's' : ''} with their current positions.</p>
      </div>
      <DialogFooter>
        <Button 
          onClick={handleSave} 
          disabled={saving || !title.trim()}
        >
          {saving ? 'Saving...' : 'Save Template'}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function PowerBriefContractEditor({
  documentData,
  brandId,
  initialFields = [],
  onSend,
  onSaveAsTemplate,
  className = ''
}: ContractEditorProps) {
  const [recipients, setRecipients] = useState<SimpleRecipient[]>([]);
  const [fields, setFields] = useState<SimpleField[]>(initialFields);
  const [selectedFieldType, setSelectedFieldType] = useState<string | null>(null);
  const [selectedRecipient, setSelectedRecipient] = useState<SimpleRecipient | null>(null);
  const [currentStep, setCurrentStep] = useState<'recipients' | 'fields' | 'send'>('recipients');
  const [activeDragItem, setActiveDragItem] = useState<Active | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  
  // New recipient dialog
  const [showNewRecipientDialog, setShowNewRecipientDialog] = useState(false);
  const [newRecipient, setNewRecipient] = useState({
    name: '',
    email: '',
    role: 'signer'
  });

  // State for creators
  const [creatorsList, setCreatorsList] = useState<Creator[]>([]);
  const [creatorSearchTerm, setCreatorSearchTerm] = useState('');
  const [isLoadingCreators, setIsLoadingCreators] = useState(false);

  // Update fields when initialFields prop changes
  useEffect(() => {
    if (initialFields.length > 0) {
      setFields(initialFields);
    }
  }, [initialFields]);



  // Fetch creators
  useEffect(() => {
    if (!brandId) return;

    const fetchRealCreators = async () => {
      setIsLoadingCreators(true);
      try {
        const response = await fetch(`/api/ugc/creators?brandId=${brandId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch creators: ${response.statusText}`);
        }
        const data = await response.json();
        if (data.success && Array.isArray(data.creators)) {
          setCreatorsList(data.creators.map((c: RawCreatorData) => ({
             id: c.id, 
             name: c.name, 
             email: c.email || '' // Fallback for null email 
            }))); 
        } else {
          console.error("Fetched data is not in expected format:", data);
          setCreatorsList([]);
        }
      } catch (error) {
        console.error("Error fetching creators:", error);
        setCreatorsList([]); // Set to empty or handle error state appropriately
      } finally {
        setIsLoadingCreators(false);
      }
    };

    fetchRealCreators();
  }, [brandId]);

  const filteredCreators = creatorsList.filter(creator =>
    creator.name.toLowerCase().includes(creatorSearchTerm.toLowerCase()) ||
    creator.email.toLowerCase().includes(creatorSearchTerm.toLowerCase())
  );

  // Add new recipient
  const handleAddRecipient = () => {
    if (!newRecipient.name || !newRecipient.email) {
      return;
    }

    // Check if a creator was selected and use their ID
    const selectedCreator = creatorsList.find(c => c.email === newRecipient.email && c.name === newRecipient.name);

    const recipient: SimpleRecipient = {
      id: selectedCreator ? selectedCreator.id : `recipient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: newRecipient.name,
      email: newRecipient.email,
      role: newRecipient.role,
    };

    setRecipients(prev => [...prev, recipient]);
    setNewRecipient({ name: '', email: '', role: 'signer' }); // Reset form
    setCreatorSearchTerm(''); // Clear search term
    setShowNewRecipientDialog(false);
    setSelectedRecipient(recipient); // Select the newly added/modified recipient
  };

  const handleSelectCreator = (creator: Creator) => {
    setNewRecipient({ name: creator.name, email: creator.email, role: 'signer' }); // Pre-fill form, default role
    setCreatorSearchTerm(''); 
    // User will still need to click "Add" to confirm the role and add to list.
    // Optionally, we could auto-add here if the UI flow dictates it.
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
  const handleFieldPlace = useCallback((fieldPlacement: {
    id: string;
    type: string;
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
    recipientId: string;
    recipientEmail: string;
  }) => {
    if (!fieldPlacement.type) {
        console.error("handleFieldPlace: No field type provided in placement data.");
        return;
    }

    // Use selected recipient if available, otherwise create a placeholder
    const recipientForField = selectedRecipient || {
      id: 'placeholder_recipient',
      name: 'Unassigned',
      email: 'unassigned@placeholder.com',
      role: 'signer'
    };

    const newField: SimpleField = {
      id: fieldPlacement.id,
      type: fieldPlacement.type,
      page: fieldPlacement.page,
      positionX: fieldPlacement.x,
      positionY: fieldPlacement.y,
      width: fieldPlacement.width,
      height: fieldPlacement.height,
      recipientId: recipientForField.id,
      recipientEmail: recipientForField.email,
    };

    // Set default value for date fields to today's date
    if (fieldPlacement.type === 'date') {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      newField.value = today; // Adding value property for date fields
    }

    setFields(prev => [...prev, newField]);
    // After placing a field, deselect the tool type so the user isn't stuck in click-to-place mode
    // and to ensure enableFieldPlacement for the viewer is correctly managed for new placements.
    // setSelectedFieldType(null); // Let's hold on this exact change until we fix dragging existing fields.
  }, [selectedRecipient, activeDragItem]);

  // Handle field update (drag/resize) and deletion
  const handleFieldUpdate = useCallback((updatedField: Partial<SimpleField> & { id: string } & { _delete?: boolean }) => {
    if (updatedField._delete) {
      // Handle field deletion
      setFields(prevFields => 
        prevFields.filter(field => field.id !== updatedField.id)
      );
      // Clear selection if the deleted field was selected
      if (selectedFieldId === updatedField.id) {
        setSelectedFieldId(null);
      }
    } else {
      // Handle field update
      setFields(prevFields => 
        prevFields.map(field => 
          field.id === updatedField.id ? { ...field, ...updatedField } : field
        )
      );
    }
  }, [selectedFieldId]);

  // DND Handlers for sidebar field tools
  const handleDragStartFields = (event: DragStartEvent) => {
    setActiveDragItem(event.active);
  };

  const handleDragEndFields = (event: DragEndEvent) => {
    setActiveDragItem(null);
    const { active, over } = event;

    if (
      over && 
      over.data.current?.isPdfPage && 
      active.data.current?.isSidebarTool
    ) {
      const fieldType = active.data.current.type as string;
      const pageNumber = over.data.current.pageNumber as number;

      const draggedRect = active.rect.current?.translated;
      const targetRect = over.rect;

      if (!draggedRect) {
          console.error('[DropCalc] active.rect.current.translated is null. Cannot calculate drop position.');
          setActiveDragItem(null);
          return;
      }

      console.log('[DropCalc] Dragged Rect (active.rect.current.translated):', draggedRect);
      console.log('[DropCalc] Target Rect (over.rect):', targetRect);

      // Calculate the center of the dragged item in viewport coordinates
      const draggedCenterX = draggedRect.left + draggedRect.width / 2;
      const draggedCenterY = draggedRect.top + draggedRect.height / 2;
      console.log('[DropCalc] Dragged Center X:', draggedCenterX, 'Dragged Center Y:', draggedCenterY);

      // Calculate the drop position of the dragged item's center relative to the target's top-left corner (in pixels)
      const dropXOnTargetPx = draggedCenterX - targetRect.left;
      const dropYOnTargetPx = draggedCenterY - targetRect.top;
      console.log('[DropCalc] Drop X on Target (pixels):', dropXOnTargetPx, 'Drop Y on Target (pixels):', dropYOnTargetPx);

      // Convert pixel offsets on target to percentages of target dimensions
      let percentageX = (dropXOnTargetPx / targetRect.width) * 100;
      let percentageY = (dropYOnTargetPx / targetRect.height) * 100;
      console.log('[DropCalc] Raw Percentage X on Target:', percentageX, 'Raw Percentage Y on Target:', percentageY);

      const defaultWidth = 15; 
      const defaultHeight = 5;

      // Adjust percentages so the new field's top-left is at the calculated drop point (center of dragged item)
      percentageX = percentageX - (defaultWidth / 2);
      percentageY = percentageY - (defaultHeight / 2);
      console.log('[DropCalc] Centered Percentage X:', percentageX, 'Centered Percentage Y:', percentageY);

      // Boundary checks
      const finalPercentageX = Math.max(0, Math.min(100 - defaultWidth, percentageX));
      const finalPercentageY = Math.max(0, Math.min(100 - defaultHeight, percentageY));
      console.log('[DropCalc] Final Bounded Percentage X:', finalPercentageX, 'Final Bounded Percentage Y:', finalPercentageY);

      console.log(`Placing new field: ${fieldType} on page ${pageNumber} at X: ${finalPercentageX.toFixed(2)}%, Y: ${finalPercentageY.toFixed(2)}%`);

      // Use selected recipient if available, otherwise create a placeholder
      const recipientForField = selectedRecipient || {
        id: 'placeholder_recipient',
        name: 'Unassigned',
        email: 'unassigned@placeholder.com',
        role: 'signer'
      };

      handleFieldPlace({
        id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: fieldType,
        page: pageNumber,
        x: finalPercentageX,
        y: finalPercentageY,
        width: defaultWidth,
        height: defaultHeight,
        recipientId: recipientForField.id,
        recipientEmail: recipientForField.email,
      });
    } else {
      // console.log('Drag ended but not over a valid PDF page target or missing data/recipient.');
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px drag needed to start
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: (event, { currentCoordinates }) => {
        // Your custom logic for keyboard coordinate getting, if needed
        return currentCoordinates;
      },
    })
  );

  // When a field on the PDF is clicked
  const handleFieldSelect = useCallback((fieldId: string | null) => {
    setSelectedFieldId(fieldId);
    // console.log("Selected field ID:", fieldId);
  }, []);

  // Handle deleting the selected field
  const handleDeleteSelectedField = useCallback(() => {
    if (!selectedFieldId) return;
    setFields(prevFields => prevFields.filter(f => f.id !== selectedFieldId));
    setSelectedFieldId(null); // Deselect after deletion
    // console.log("Deleted field ID:", selectedFieldId);
  }, [selectedFieldId]);

  // Effect for keyboard delete
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (selectedFieldId && (event.key === 'Delete' || event.key === 'Backspace')) {
        event.preventDefault(); // Prevent browser back navigation on Backspace
        handleDeleteSelectedField();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedFieldId, handleDeleteSelectedField]);

  // Handle send - now only sends recipients and fields
  const handleSend = () => {
    onSend?.({ recipients, fields });
  };



  // Memoize the documentData object for PowerBriefPDFViewer to prevent unnecessary reloads
  const pdfViewerDocumentData = useMemo(() => {
    if (!documentData || !documentData.dataForViewer) {
      return null;
    }
    return {
      id: documentData.id,
      data: documentData.dataForViewer,
    };
  }, [documentData?.id, documentData?.dataForViewer]);

  // Minimal window scroll listener test - ADDED TO PowerBriefContractEditor
  useEffect(() => {
    const editorScrollTest = () => {
      console.log('[ContractEditor] MINIMAL WINDOW SCROLL DETECTED! (from ContractEditor)');
    };
    console.log('[ContractEditor] Adding MINIMAL window scroll listener (from ContractEditor).');
    window.addEventListener('scroll', editorScrollTest, { passive: true });
    return () => {
      console.log('[ContractEditor] Removing MINIMAL window scroll listener (from ContractEditor).');
      window.removeEventListener('scroll', editorScrollTest);
    };
  }, []); // Empty dependency array, runs once on mount/unmount of ContractEditor

  const isFieldPlacementMode = currentStep === 'fields' && !!selectedFieldType;
  console.log('[ContractEditor] Rendering PDFViewer. currentStep:', currentStep, 'selectedFieldType:', selectedFieldType, 'selectedRecipient:', selectedRecipient, 'isFieldPlacementMode (for PDF click-to-add):', isFieldPlacementMode);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStartFields}
      onDragEnd={handleDragEndFields}
      onDragCancel={() => setActiveDragItem(null)}
    >
      <div className={`grid grid-cols-12 gap-6 ${className} h-[calc(100vh-150px)]`}>
        {/* Left Panel */}
        <div className="col-span-4 space-y-6 overflow-y-auto">
          {/* Step Navigation */}
          <Card>
            <CardHeader>
              <CardTitle>PowerBrief Contract Editor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2">
                <Button 
                  size="sm" 
                  variant={currentStep === 'recipients' ? 'default' : 'outline'}
                  onClick={() => setCurrentStep('recipients')}
                >
                  <Users className="h-4 w-4 mr-1" />
                  Recipients
                </Button>
                <Button 
                  size="sm" 
                  variant={currentStep === 'fields' ? 'default' : 'outline'}
                  onClick={() => setCurrentStep('fields')}
                >
                  <Edit3 className="h-4 w-4 mr-1" />
                  Fields
                </Button>
                <Button 
                  size="sm" 
                  variant={currentStep === 'send' ? 'default' : 'outline'}
                  onClick={() => setCurrentStep('send')}
                >
                  <Send className="h-4 w-4 mr-1" />
                  Send
                </Button>
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
                          <Label>Name</Label>
                          <Input
                            value={newRecipient.name}
                            onChange={(e) => setNewRecipient(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Full name"
                          />
                        </div>
                        <div>
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={newRecipient.email}
                            onChange={(e) => setNewRecipient(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="email@example.com"
                          />
                        </div>
                        <div>
                          <Label>Role</Label>
                          <Select 
                            value={newRecipient.role} 
                            onValueChange={(value) => setNewRecipient(prev => ({ ...prev, role: value }))}
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

                        {/* Creator Selection Section */}
                        {creatorsList.length > 0 && (
                          <div className="space-y-2 pt-3 border-t mt-3">
                            <Label>Or Select Existing Creator</Label>
                            <Input
                              placeholder="Search creators by name or email..."
                              value={creatorSearchTerm}
                              onChange={(e) => setCreatorSearchTerm(e.target.value)}
                            />
                            {isLoadingCreators ? (
                                <p className="text-xs text-gray-500 p-2">Loading creators...</p>
                            ) : filteredCreators.length > 0 ? (
                              <div className="max-h-[200px] overflow-y-auto border rounded-md mt-1">
                                {filteredCreators.map(creator => (
                                  <div
                                    key={creator.id}
                                    className="p-2 hover:bg-gray-100 cursor-pointer"
                                    onClick={() => handleSelectCreator(creator)}
                                  >
                                    <div className="font-medium">{creator.name}</div>
                                    <div className="text-xs text-gray-500">{creator.email}</div>
                                  </div>
                                ))}
                              </div>
                            ) : creatorSearchTerm ? (
                                <p className="text-xs text-gray-500 p-2">No creators found matching your search.</p>
                            ) : (
                                <p className="text-xs text-gray-500 p-2">No creators available for this brand. You can add them manually.</p>
                            )}
                          </div>
                        )}
                        {/* End Creator Selection Section */}

                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => setShowNewRecipientDialog(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleAddRecipient}>
                            Add
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
                        <Badge variant="outline">{recipient.role}</Badge>
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
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Fields Step */}
          {currentStep === 'fields' && (
            <Card>
              <CardHeader>
                <CardTitle>Field Tools</CardTitle>
                <p className='text-sm text-gray-600'>
                  {selectedRecipient 
                    ? `Placing fields for: ${selectedRecipient.name}` 
                    : 'Fields will be unassigned until recipients are added'
                  }
                </p>
              </CardHeader>
              <CardContent className='space-y-2'>
                {FIELD_TOOLS.map((tool) => (
                  <FieldToolDraggableItem 
                    key={tool.type} 
                    tool={tool} 
                    disabled={false} 
                    onClick={() => {
                      setSelectedFieldType(tool.type);
                      console.log(`Selected field type: ${tool.type}${selectedRecipient ? ` for ${selectedRecipient.name}` : ' (unassigned)'}`);
                    }}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Send Step */}
          {currentStep === 'send' && (
            <Card>
              <CardHeader>
                <CardTitle>Send Document</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm">
                    <div className="flex justify-between">
                      <span>Recipients:</span>
                      <span className="font-medium">{recipients.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fields:</span>
                      <span className="font-medium">{fields.length}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Button onClick={handleSend} className="w-full">
                      <Send className="h-4 w-4 mr-2" />
                      Send Contract
                    </Button>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                          <FileText className="h-4 w-4 mr-2" />
                          Save as Template
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Save as Template</DialogTitle>
                        </DialogHeader>
                        <SaveTemplateForm onSave={(data) => onSaveAsTemplate?.(data)} fields={fields} />
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Panel (PDF Viewer Area) */}
        <div className="col-span-8 bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-full">
          {pdfViewerDocumentData ? (
            <PowerBriefPDFViewer
              documentData={pdfViewerDocumentData}
              enableFieldPlacement={isFieldPlacementMode}
              onFieldPlace={handleFieldPlace}
              fields={fields}
              selectedFieldType={selectedFieldType}
              selectedRecipient={selectedRecipient}
              onFieldUpdate={handleFieldUpdate}
              onFieldSelect={handleFieldSelect}
              selectedFieldId={selectedFieldId}
              className="flex-grow min-h-0"
            />
          ) : (
            <div className="flex-grow flex items-center justify-center h-full bg-gray-100 p-8">
              <div className="text-center text-gray-500">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="font-semibold">
                  {documentData ? 'Loading document preview...' : 'No document loaded'}
                </p>
                <p className="text-sm">
                  {documentData ? 
                    'If this takes too long, the PDF might be corrupted or very large.' : 
                    'Please upload a document or select a template to begin.'
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      <DragOverlay modifiers={[restrictToWindowEdges]}>
        {activeDragItem && activeDragItem.data.current?.type && (
          <FieldToolPreview 
            label={activeDragItem.data.current.label as string} 
            Icon={activeDragItem.data.current.icon as React.ElementType} 
            color={activeDragItem.data.current.color as string}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}

// Draggable Field Tool Item for Sidebar
interface FieldToolDraggableItemProps {
  tool: FieldTool;
  disabled: boolean;
  onClick: () => void;
}

function FieldToolDraggableItem({ tool, disabled, onClick }: FieldToolDraggableItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `sidebar-tool-${tool.type}`,
    data: { // Pass all necessary data for rendering preview and for drop logic
      type: tool.type,
      label: tool.label,
      icon: tool.icon,
      color: tool.color,
      isSidebarTool: true // Differentiator from fields on canvas
    },
    disabled: disabled,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 100, // Ensure dragged item is on top
  } : undefined;
  
  if (isDragging) { // Optionally hide original or show placeholder
    return <div ref={setNodeRef} className='p-2 border border-dashed border-gray-300 rounded-md text-gray-400'>Dragging {tool.label}...</div>;
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={disabled ? 'opacity-50' : ''}>
      <Button
        variant='outline'
        className={`w-full justify-start items-center border-${tool.color}-500 text-${tool.color}-700 hover:bg-${tool.color}-50`}
        disabled={disabled}
        onClick={onClick} // This is for the old click-to-select-then-click-on-pdf behavior
      >
        <tool.icon className={`h-4 w-4 mr-2 text-${tool.color}-500`} />
        {tool.label}
        {/* Optionally add a drag handle icon here if listeners are only on the handle */}
      </Button>
    </div>
  );
}

// Preview component for DragOverlay
interface FieldToolPreviewProps {
  label: string;
  Icon: React.ElementType;
  color: string;
}

function FieldToolPreview({label, Icon, color}: FieldToolPreviewProps) {
  return (
    <div className={`p-2 bg-white border-2 border-${color}-500 rounded-md shadow-xl flex items-center`}>
      <Icon className={`h-5 w-5 mr-2 text-${color}-500`} />
      <span className={`font-medium text-${color}-700`}>{label}</span>
    </div>
  );
} 