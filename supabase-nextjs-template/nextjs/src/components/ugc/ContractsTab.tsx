'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Alert,
  AlertDescription,
} from "@/components/ui";
import { 
  Plus, 
  FileText, 
  Send, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Upload,
  Eye,
  Edit
} from 'lucide-react';
import { Contract, ContractTemplate, getContractStatusColor } from '@/lib/types/contracts';
import { UgcCreator } from '@/lib/types/ugcCreator';

interface ContractsTabProps {
  brandId: string;
  creators: UgcCreator[];
  onRefresh?: () => void;
}

export default function ContractsTab({ brandId, creators, onRefresh }: ContractsTabProps) {
  const [activeTab, setActiveTab] = useState('contracts');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Template creation state
  const [showNewTemplateDialog, setShowNewTemplateDialog] = useState(false);
  const [newTemplateData, setNewTemplateData] = useState({
    title: '',
    description: '',
    file: null as File | null,
  });
  const [creatingTemplate, setCreatingTemplate] = useState(false);

  // Contract creation state
  const [showNewContractDialog, setShowNewContractDialog] = useState(false);
  const [newContractData, setNewContractData] = useState({
    title: '',
    templateId: '',
    creatorId: '',
    recipients: [{ name: '', email: '', role: 'signer' as const }],
    expiresInDays: '30',
    file: null as File | null,
  });
  const [creatingContract, setCreatingContract] = useState(false);

  // Template editing state
  const [showEditTemplateDialog, setShowEditTemplateDialog] = useState(false);
  const [editTemplateData, setEditTemplateData] = useState({
    id: '',
    title: '',
    description: '',
    file: null as File | null,
  });
  const [updatingTemplate, setUpdatingTemplate] = useState(false);

  useEffect(() => {
    fetchData();
  }, [brandId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch contracts and templates in parallel
      const [contractsResponse, templatesResponse] = await Promise.all([
        fetch(`/api/contracts?brandId=${brandId}`),
        fetch(`/api/contracts/templates?brandId=${brandId}`)
      ]);

      if (!contractsResponse.ok || !templatesResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const contractsData = await contractsResponse.json();
      const templatesData = await templatesResponse.json();

      setContracts(contractsData.contracts || []);
      setTemplates(templatesData.templates || []);
    } catch (error) {
      console.error('Error fetching contracts data:', error);
      setError('Failed to load contracts data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplateData.title || !newTemplateData.file) {
      setError('Please provide a title and upload a PDF file');
      return;
    }

    try {
      setCreatingTemplate(true);
      setError('');

      const formData = new FormData();
      formData.append('brandId', brandId);
      formData.append('title', newTemplateData.title);
      formData.append('description', newTemplateData.description);
      formData.append('document', newTemplateData.file);

      const response = await fetch('/api/contracts/templates', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create template');
      }

      // Reset form and refresh data
      setNewTemplateData({
        title: '',
        description: '',
        file: null,
      });
      setShowNewTemplateDialog(false);
      await fetchData();
      onRefresh?.();

    } catch (error) {
      console.error('Error creating template:', error);
      setError(error instanceof Error ? error.message : 'Failed to create template');
    } finally {
      setCreatingTemplate(false);
    }
  };

  const handleEditTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setEditTemplateData({
        id: template.id,
        title: template.title,
        description: template.description || '',
        file: null,
      });
      setShowEditTemplateDialog(true);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editTemplateData.title) {
      setError('Please provide a title');
      return;
    }

    try {
      setUpdatingTemplate(true);
      setError('');

      const formData = new FormData();
      formData.append('brandId', brandId);
      formData.append('title', editTemplateData.title);
      formData.append('description', editTemplateData.description);
      
      if (editTemplateData.file) {
        formData.append('document', editTemplateData.file);
      }

      const response = await fetch(`/api/contracts/templates/${editTemplateData.id}`, {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update template');
      }

      setShowEditTemplateDialog(false);
      await fetchData();
      onRefresh?.();

    } catch (error) {
      console.error('Error updating template:', error);
      setError(error instanceof Error ? error.message : 'Failed to update template');
    } finally {
      setUpdatingTemplate(false);
    }
  };

  const handleCreateContract = async () => {
    if (!newContractData.title || (!newContractData.templateId && !newContractData.file)) {
      setError('Please provide a title and either select a template or upload a file');
      return;
    }

    // Auto-populate recipient from selected creator
    let recipients = [...newContractData.recipients];
    if (newContractData.creatorId) {
      const selectedCreator = creators.find(c => c.id === newContractData.creatorId);
      if (selectedCreator) {
        recipients = [{
          name: selectedCreator.name,
          email: selectedCreator.email,
          role: 'signer' as const
        }];
      }
    }

    try {
      setCreatingContract(true);
      setError('');

      const formData = new FormData();
      formData.append('brandId', brandId);
      formData.append('title', newContractData.title);
      formData.append('recipients', JSON.stringify(recipients));
      formData.append('expiresInDays', newContractData.expiresInDays);

      if (newContractData.creatorId) {
        formData.append('creatorId', newContractData.creatorId);
      }

      if (newContractData.templateId) {
        formData.append('templateId', newContractData.templateId);
      } else if (newContractData.file) {
        formData.append('document', newContractData.file);
      }

      const response = await fetch('/api/contracts', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create contract');
      }

      // Reset form and refresh data
      setNewContractData({
        title: '',
        templateId: '',
        creatorId: '',
        recipients: [{ name: '', email: '', role: 'signer' as const }],
        expiresInDays: '30',
        file: null,
      });
      setShowNewContractDialog(false);
      await fetchData();
      onRefresh?.();

    } catch (error) {
      console.error('Error creating contract:', error);
      setError(error instanceof Error ? error.message : 'Failed to create contract');
    } finally {
      setCreatingContract(false);
    }
  };

  const handleSendContract = async (contractId: string) => {
    try {
      setError('');
      const response = await fetch(`/api/contracts/${contractId}/send`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send contract');
      }

      await fetchData();
      onRefresh?.();
    } catch (error) {
      console.error('Error sending contract:', error);
      setError(error instanceof Error ? error.message : 'Failed to send contract');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <Edit className="h-4 w-4" />;
      case 'sent':
        return <Send className="h-4 w-4" />;
      case 'partially_signed':
        return <Clock className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'voided':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading contracts...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contract Management</CardTitle>
        <CardDescription>
          Manage contract templates and send contracts to creators for signing
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="contracts">Contracts</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="contracts" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Active Contracts</h3>
              <div className="flex gap-2">
                <Dialog open={showNewContractDialog} onOpenChange={setShowNewContractDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Quick Contract
                    </Button>
                  </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Contract</DialogTitle>
                    <DialogDescription>
                      Create a contract from a template or upload a new document
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="contract-title">Contract Title</Label>
                      <Input
                        id="contract-title"
                        value={newContractData.title}
                        onChange={(e) => setNewContractData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Enter contract title"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="template-select">Use Template (Optional)</Label>
                        <Select 
                          value={newContractData.templateId} 
                          onValueChange={(value) => setNewContractData(prev => ({ ...prev, templateId: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select template" />
                          </SelectTrigger>
                          <SelectContent>
                            {templates.map((template) => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="creator-select">Link to Creator (Optional)</Label>
                        <Select 
                          value={newContractData.creatorId} 
                          onValueChange={(value) => setNewContractData(prev => ({ ...prev, creatorId: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select creator" />
                          </SelectTrigger>
                          <SelectContent>
                            {creators.map((creator) => (
                              <SelectItem key={creator.id} value={creator.id}>
                                {creator.name} ({creator.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {!newContractData.templateId && (
                      <div>
                        <Label htmlFor="contract-file">Upload Contract Document</Label>
                        <Input
                          id="contract-file"
                          type="file"
                          accept=".pdf"
                          onChange={(e) => setNewContractData(prev => ({ 
                            ...prev, 
                            file: e.target.files?.[0] || null 
                          }))}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Upload a PDF if not using a template
                        </p>
                      </div>
                    )}

                    <div>
                      <Label htmlFor="expires-in">Expires In (Days)</Label>
                      <Input
                        id="expires-in"
                        type="number"
                        value={newContractData.expiresInDays}
                        onChange={(e) => setNewContractData(prev => ({ ...prev, expiresInDays: e.target.value }))}
                        placeholder="30"
                        min="1"
                        max="365"
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowNewContractDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateContract} disabled={creatingContract}>
                      {creatingContract ? 'Creating...' : 'Create Contract'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button 
                onClick={() => window.open(`/app/powerbrief/${brandId}/contracts/editor/new`, '_blank')}
                title="Create with PowerBrief Editor"
              >
                🎯 PowerBrief Editor
              </Button>
            </div>
            </div>

            <div className="space-y-4">
              {contracts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No contracts found</p>
                    <p className="text-sm">Create your first contract to get started</p>
                  </div>
                </div>
              ) : (
                contracts.map((contract) => (
                  <Card key={contract.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium">{contract.title}</div>
                          {contract.creator_id && (
                            <div className="text-sm text-gray-500">
                              Creator: {creators.find(c => c.id === contract.creator_id)?.name || 'Unknown'}
                            </div>
                          )}
                          <div className="flex gap-4 mt-2 text-sm text-gray-500">
                            <span>{contract.recipients?.length || 0} recipient(s)</span>
                            <span>{contract.recipients?.filter(r => r.status === 'signed').length || 0} signed</span>
                            <span>Created: {new Date(contract.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={getContractStatusColor(contract.status) as 'default'}
                            className="flex items-center gap-1"
                          >
                            {getStatusIcon(contract.status)}
                            {contract.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <div className="flex gap-2">
                            {contract.status === 'draft' && (
                              <Button 
                                size="sm" 
                                onClick={() => handleSendContract(contract.id)}
                              >
                                <Send className="h-4 w-4 mr-1" />
                                Send
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => window.open(`/api/contracts/preview/${contract.id}`, '_blank')}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Contract Templates</h3>
              <Dialog open={showNewTemplateDialog} onOpenChange={setShowNewTemplateDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Template
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Contract Template</DialogTitle>
                    <DialogDescription>
                      Upload a PDF document to use as a reusable contract template
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="template-title">Template Title</Label>
                      <Input
                        id="template-title"
                        value={newTemplateData.title}
                        onChange={(e) => setNewTemplateData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Enter template title"
                      />
                    </div>

                    <div>
                      <Label htmlFor="template-description">Description (Optional)</Label>
                      <Textarea
                        id="template-description"
                        value={newTemplateData.description}
                        onChange={(e) => setNewTemplateData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Enter template description"
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="template-file">Upload PDF Document</Label>
                      <Input
                        id="template-file"
                        type="file"
                        accept=".pdf"
                        onChange={(e) => setNewTemplateData(prev => ({ 
                          ...prev, 
                          file: e.target.files?.[0] || null 
                        }))}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowNewTemplateDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateTemplate} disabled={creatingTemplate}>
                      {creatingTemplate ? 'Creating...' : 'Create Template'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.length === 0 ? (
                <div className="col-span-full text-center py-8">
                  <div className="text-gray-500">
                    <Upload className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No templates found</p>
                    <p className="text-sm">Create your first template to get started</p>
                  </div>
                </div>
              ) : (
                templates.map((template) => (
                  <Card key={template.id}>
                    <CardHeader>
                      <CardTitle className="text-base">{template.title}</CardTitle>
                      {template.description && (
                        <CardDescription>{template.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-gray-500 mb-4">
                        <p>Created: {new Date(template.created_at).toLocaleDateString()}</p>
                        <p>Size: {Math.round(template.document_size / 1024)} KB</p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => window.open(`/api/contracts/templates/preview/${template.id}`, '_blank')}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Preview
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEditTemplate(template.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="default"
                          onClick={() => window.open(`/app/powerbrief/${brandId}/contracts/editor/${template.id}`, '_blank')}
                          title="Open in PowerBrief Editor"
                        >
                          🎯
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Edit Template Dialog */}
        <Dialog open={showEditTemplateDialog} onOpenChange={setShowEditTemplateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Contract Template</DialogTitle>
              <DialogDescription>
                Update template details and optionally replace the document
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-template-title">Template Title</Label>
                <Input
                  id="edit-template-title"
                  value={editTemplateData.title}
                  onChange={(e) => setEditTemplateData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter template title"
                />
              </div>

              <div>
                <Label htmlFor="edit-template-description">Description (Optional)</Label>
                <Textarea
                  id="edit-template-description"
                  value={editTemplateData.description}
                  onChange={(e) => setEditTemplateData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter template description"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="edit-template-file">Replace PDF Document (Optional)</Label>
                <Input
                  id="edit-template-file"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setEditTemplateData(prev => ({ 
                    ...prev, 
                    file: e.target.files?.[0] || null 
                  }))}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to keep the current document
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditTemplateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateTemplate} disabled={updatingTemplate}>
                {updatingTemplate ? 'Updating...' : 'Update Template'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
} 