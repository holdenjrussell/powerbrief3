'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
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
  Edit,
  Trash2
} from 'lucide-react';
import { Contract, ContractTemplate, getContractStatusColor } from '@/lib/types/contracts';
import { UgcCreator } from '@/lib/types/ugcCreator';

interface ContractsTabProps {
  brandId: string;
  creators: UgcCreator[];
  onRefresh?: () => void;
}

export default function ContractsTab({ brandId, creators, onRefresh }: ContractsTabProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState('contracts');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Watch for URL parameter changes and update active tab
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'templates' || tabParam === 'contracts') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Handle tab change and update URL
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    
    // Update URL with new tab parameter
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', newTab);
    router.replace(`${pathname}?${params.toString()}`);
  };



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

  // Delete confirmation state
  const [showDeleteContractDialog, setShowDeleteContractDialog] = useState(false);
  const [showDeleteTemplateDialog, setShowDeleteTemplateDialog] = useState(false);
  const [deleteContractId, setDeleteContractId] = useState('');
  const [deleteTemplateId, setDeleteTemplateId] = useState('');
  const [deletingContract, setDeletingContract] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState(false);

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

  const handleDeleteContract = async () => {
    if (!deleteContractId) return;

    try {
      setDeletingContract(true);
      setError('');

      const response = await fetch(`/api/contracts/${deleteContractId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete contract');
      }

      setShowDeleteContractDialog(false);
      setDeleteContractId('');
      await fetchData();
      onRefresh?.();
    } catch (error) {
      console.error('Error deleting contract:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete contract');
    } finally {
      setDeletingContract(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!deleteTemplateId) return;

    try {
      setDeletingTemplate(true);
      setError('');

      const response = await fetch(`/api/contracts/templates/${deleteTemplateId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete template');
      }

      setShowDeleteTemplateDialog(false);
      setDeleteTemplateId('');
      await fetchData();
      onRefresh?.();
    } catch (error) {
      console.error('Error deleting template:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete template');
    } finally {
      setDeletingTemplate(false);
    }
  };

  const confirmDeleteContract = (contractId: string) => {
    setDeleteContractId(contractId);
    setShowDeleteContractDialog(true);
  };

  const confirmDeleteTemplate = (templateId: string) => {
    setDeleteTemplateId(templateId);
    setShowDeleteTemplateDialog(true);
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

        <Tabs value={activeTab} onValueChange={handleTabChange}>
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
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      New Contract
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
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => confirmDeleteContract(contract.id)}
                            >
                              <Trash2 className="h-4 w-4" />
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
                          variant="outline"
                          onClick={() => confirmDeleteTemplate(template.id)}
                          title="Delete Template"
                        >
                          <Trash2 className="h-4 w-4" />
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

        {/* Delete Contract Confirmation Dialog */}
        <Dialog open={showDeleteContractDialog} onOpenChange={setShowDeleteContractDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Contract</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this contract? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteContractDialog(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteContract} 
                disabled={deletingContract}
              >
                {deletingContract ? 'Deleting...' : 'Delete Contract'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Template Confirmation Dialog */}
        <Dialog open={showDeleteTemplateDialog} onOpenChange={setShowDeleteTemplateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Template</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this template? This action cannot be undone.
                {deleteTemplateId && (
                  <span className="block mt-2 text-sm">
                    Note: Templates currently used by contracts cannot be deleted.
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteTemplateDialog(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteTemplate} 
                disabled={deletingTemplate}
              >
                {deletingTemplate ? 'Deleting...' : 'Delete Template'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
} 