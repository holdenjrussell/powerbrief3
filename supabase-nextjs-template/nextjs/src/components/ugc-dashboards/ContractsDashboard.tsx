'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  PenTool, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  Plus,
  Send,
  Eye,
  Download,
  Search,
  Filter,
  Settings,
  Copy,
  ExternalLink
} from 'lucide-react';
import { 
  UgcContract, 
  ContractDashboardData, 
  CreateContractForm, 
  UgcContractTemplate,
  ContractFieldValue
} from '@/lib/types/ugcDashboards';

interface ContractsDashboardProps {
  brandId: string;
}

export default function ContractsDashboard({ brandId }: ContractsDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<ContractDashboardData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateContract, setShowCreateContract] = useState(false);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [selectedContract, setSelectedContract] = useState<UgcContract | null>(null);

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
  }, [brandId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ugc/contracts/dashboard?brandId=${brandId}`);
      const data = await response.json();
      if (data.success) {
        setDashboardData(data.data);
      }
    } catch (error) {
      console.error('Error loading contracts dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContract = async (formData: CreateContractForm) => {
    try {
      const response = await fetch('/api/ugc/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, brand_id: brandId }),
      });
      
      if (response.ok) {
        setShowCreateContract(false);
        loadDashboardData();
      }
    } catch (error) {
      console.error('Error creating contract:', error);
    }
  };

  const handleSendContract = async (contractId: string) => {
    try {
      const response = await fetch(`/api/ugc/contracts/${contractId}/send`, {
        method: 'POST',
      });
      
      if (response.ok) {
        loadDashboardData();
      }
    } catch (error) {
      console.error('Error sending contract:', error);
    }
  };

  const handleSendReminder = async (contractId: string) => {
    try {
      const response = await fetch(`/api/ugc/contracts/${contractId}/reminder`, {
        method: 'POST',
      });
      
      if (response.ok) {
        loadDashboardData();
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
    }
  };

  const handleCancelContract = async (contractId: string) => {
    try {
      const response = await fetch(`/api/ugc/contracts/${contractId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      
      if (response.ok) {
        loadDashboardData();
      }
    } catch (error) {
      console.error('Error cancelling contract:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Contracts Dashboard</h1>
          <p className="text-gray-600">Manage contracts, templates, and digital signatures</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showCreateTemplate} onOpenChange={setShowCreateTemplate}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Templates
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <CreateTemplateModal />
            </DialogContent>
          </Dialog>
          <Dialog open={showCreateContract} onOpenChange={setShowCreateContract}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Contract
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <CreateContractModal 
                templates={dashboardData?.templates || []}
                onSubmit={handleCreateContract} 
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Overview Cards */}
      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Contracts</CardTitle>
              <FileText className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {dashboardData.overview.totalContracts}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Signatures</CardTitle>
              <PenTool className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {dashboardData.overview.pendingSignatures}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Signed This Month</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {dashboardData.overview.signedThisMonth}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {dashboardData.overview.expiringSoon}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Contracts Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending Signatures</TabsTrigger>
          <TabsTrigger value="expiring">Expiring Soon</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search contracts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>

        {dashboardData && (
          <>
            <TabsContent value="pending">
              <ContractsList 
                contracts={dashboardData.contracts.pending}
                onSend={handleSendContract}
                onReminder={handleSendReminder}
                onView={setSelectedContract}
                searchTerm={searchTerm}
                showActions
              />
            </TabsContent>

            <TabsContent value="expiring">
              <ContractsList 
                contracts={dashboardData.contracts.expiring}
                onSend={handleSendContract}
                onReminder={handleSendReminder}
                onView={setSelectedContract}
                searchTerm={searchTerm}
                showUrgent
              />
            </TabsContent>

            <TabsContent value="recent">
              <ContractsList 
                contracts={dashboardData.contracts.recent}
                onSend={handleSendContract}
                onReminder={handleSendReminder}
                onView={setSelectedContract}
                searchTerm={searchTerm}
                readonly
              />
            </TabsContent>

            <TabsContent value="templates">
              <TemplatesList 
                templates={dashboardData.templates}
                searchTerm={searchTerm}
              />
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Contract Details Modal */}
      {selectedContract && (
        <Dialog open={!!selectedContract} onOpenChange={() => setSelectedContract(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <ContractDetailsModal contract={selectedContract} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Helper functions
function getStatusBadge(status: UgcContract['status']) {
  const variants = {
    draft: 'secondary',
    sent: 'default',
    viewed: 'default',
    signed: 'default',
    completed: 'default',
    expired: 'destructive',
    cancelled: 'outline',
  } as const;

  const colors = {
    draft: 'bg-gray-100 text-gray-800',
    sent: 'bg-blue-100 text-blue-800',
    viewed: 'bg-purple-100 text-purple-800',
    signed: 'bg-green-100 text-green-800',
    completed: 'bg-green-100 text-green-800',
    expired: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
  };

  return (
    <Badge variant={variants[status]} className={colors[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function getContractTypeIcon(type: UgcContract['contract_type']) {
  switch (type) {
    case 'creator_agreement':
      return <FileText className="h-4 w-4 text-blue-500" />;
    case 'nda':
      return <Eye className="h-4 w-4 text-purple-500" />;
    case 'usage_rights':
      return <Copy className="h-4 w-4 text-green-500" />;
    default:
      return <FileText className="h-4 w-4 text-gray-500" />;
  }
}

// Contracts List Component
interface ContractsListProps {
  contracts: UgcContract[];
  onSend: (id: string) => void;
  onReminder: (id: string) => void;
  onView: (contract: UgcContract) => void;
  searchTerm: string;
  showActions?: boolean;
  showUrgent?: boolean;
  readonly?: boolean;
}

function ContractsList({ 
  contracts, 
  onSend, 
  onReminder, 
  onView,
  searchTerm, 
  showActions = false,
  showUrgent = false,
  readonly = false 
}: ContractsListProps) {
  const filteredContracts = contracts.filter(contract =>
    contract.creator_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.creator_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.contract_title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (filteredContracts.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="text-gray-500">No contracts found</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {filteredContracts.map((contract) => (
        <Card key={contract.id} className={showUrgent ? 'border-red-200' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {getContractTypeIcon(contract.contract_type)}
                <div>
                  <div className="font-medium">{contract.contract_title}</div>
                  <div className="text-sm text-gray-600">{contract.creator_name}</div>
                  <div className="text-sm text-gray-500">{contract.creator_email}</div>
                  {contract.expires_at && (
                    <div className="text-sm text-gray-500">
                      Expires: {new Date(contract.expires_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm font-medium capitalize">
                    {contract.contract_type.replace('_', ' ')}
                  </div>
                  {contract.sent_at && (
                    <div className="text-sm text-gray-500">
                      Sent: {new Date(contract.sent_at).toLocaleDateString()}
                    </div>
                  )}
                  {contract.signed_at && (
                    <div className="text-sm text-green-600">
                      Signed: {new Date(contract.signed_at).toLocaleDateString()}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {getStatusBadge(contract.status)}
                  
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onView(contract)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    
                    {contract.signing_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(contract.signing_url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}

                    {!readonly && showActions && contract.status === 'draft' && (
                      <Button
                        size="sm"
                        onClick={() => onSend(contract.id)}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    )}

                    {!readonly && contract.status === 'sent' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onReminder(contract.id)}
                      >
                        <Clock className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Templates List Component
function TemplatesList({ templates, searchTerm }: { templates: UgcContractTemplate[]; searchTerm: string }) {
  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredTemplates.map((template) => (
        <Card key={template.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{template.name}</CardTitle>
              {getContractTypeIcon(template.contract_type)}
            </div>
            {template.description && (
              <CardDescription>{template.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm text-gray-600">
                Type: {template.contract_type.replace('_', ' ')}
              </div>
              <div className="text-sm text-gray-600">
                Version: {template.version}
              </div>
              <div className="text-sm text-gray-600">
                Required fields: {template.required_fields.length}
              </div>
              <div className="text-sm text-gray-600">
                Optional fields: {template.optional_fields.length}
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button size="sm" variant="outline" className="flex-1">
                Edit
              </Button>
              <Button size="sm" className="flex-1">
                Use Template
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Create Contract Modal Component
function CreateContractModal({ 
  templates, 
  onSubmit 
}: { 
  templates: UgcContractTemplate[];
  onSubmit: (data: CreateContractForm) => void;
}) {
  const [formData, setFormData] = useState<CreateContractForm>({
    creator_id: '',
    template_id: '',
    contract_title: '',
    contract_data: {},
  });
  const [selectedTemplate, setSelectedTemplate] = useState<UgcContractTemplate | null>(null);

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    setSelectedTemplate(template || null);
    setFormData(prev => ({ 
      ...prev, 
      template_id: templateId,
      contract_title: template ? `${template.name} - Creator Agreement` : ''
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Create New Contract</DialogTitle>
        <DialogDescription>
          Generate a new contract for a creator using a template.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div>
          <Label htmlFor="creator">Creator</Label>
          <Select onValueChange={(value) => setFormData(prev => ({ ...prev, creator_id: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select creator" />
            </SelectTrigger>
            <SelectContent>
              {/* This would be populated with actual creators */}
              <SelectItem value="creator1">Creator 1</SelectItem>
              <SelectItem value="creator2">Creator 2</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="template">Contract Template</Label>
          <Select onValueChange={handleTemplateChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select template" />
            </SelectTrigger>
            <SelectContent>
              {templates.map(template => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name} ({template.contract_type.replace('_', ' ')})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="title">Contract Title</Label>
          <Input
            value={formData.contract_title}
            onChange={(e) => setFormData(prev => ({ ...prev, contract_title: e.target.value }))}
            placeholder="Enter contract title"
            required
          />
        </div>

        {selectedTemplate && (
          <div className="space-y-4">
            <h4 className="font-medium">Template Fields</h4>
            {selectedTemplate.required_fields.map((field) => (
              <div key={field}>
                <Label htmlFor={field}>{field} *</Label>
                <Input
                  placeholder={`Enter ${field}`}
                  onChange={(e) => {
                    const fieldValue: ContractFieldValue = {
                      field_name: field,
                      field_type: 'text',
                      value: e.target.value,
                      required: true
                    };
                    setFormData(prev => ({
                      ...prev,
                      contract_data: {
                        ...prev.contract_data,
                        [field]: fieldValue
                      }
                    }));
                  }}
                  required
                />
              </div>
            ))}
            {selectedTemplate.optional_fields.map((field) => (
              <div key={field}>
                <Label htmlFor={field}>{field}</Label>
                <Input
                  placeholder={`Enter ${field} (optional)`}
                  onChange={(e) => {
                    const fieldValue: ContractFieldValue = {
                      field_name: field,
                      field_type: 'text',
                      value: e.target.value,
                      required: false
                    };
                    setFormData(prev => ({
                      ...prev,
                      contract_data: {
                        ...prev.contract_data,
                        [field]: fieldValue
                      }
                    }));
                  }}
                />
              </div>
            ))}
          </div>
        )}

        <div>
          <Label htmlFor="expires_in_days">Expires In (Days)</Label>
          <Input
            type="number"
            placeholder="30"
            onChange={(e) => setFormData(prev => ({ ...prev, expires_in_days: parseInt(e.target.value) }))}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline">Cancel</Button>
        <Button type="submit">Create Contract</Button>
      </div>
    </form>
  );
}

// Create Template Modal Component
function CreateTemplateModal() {
  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>Create Contract Template</DialogTitle>
        <DialogDescription>
          Create a reusable contract template with dynamic fields.
        </DialogDescription>
      </DialogHeader>
      
      <div className="text-center py-8 text-gray-500">
        Template creation interface would go here.
        This would include rich text editor, field management, and OpenSign integration.
      </div>
    </div>
  );
}

// Contract Details Modal Component
function ContractDetailsModal({ contract }: { contract: UgcContract }) {
  return (
    <div className="space-y-6">
      <DialogHeader>
        <DialogTitle>{contract.contract_title}</DialogTitle>
        <DialogDescription>
          Contract details and status information
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Creator</Label>
          <div className="text-sm">{contract.creator_name}</div>
          <div className="text-sm text-gray-500">{contract.creator_email}</div>
        </div>
        <div>
          <Label>Status</Label>
          <div className="mt-1">{getStatusBadge(contract.status)}</div>
        </div>
        <div>
          <Label>Contract Type</Label>
          <div className="text-sm capitalize">{contract.contract_type.replace('_', ' ')}</div>
        </div>
        <div>
          <Label>Created</Label>
          <div className="text-sm">{new Date(contract.created_at).toLocaleDateString()}</div>
        </div>
      </div>

      {contract.signing_url && (
        <div>
          <Label>Signing URL</Label>
          <div className="flex gap-2 mt-1">
            <Input value={contract.signing_url} readOnly />
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(contract.signing_url, '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {Object.keys(contract.contract_data).length > 0 && (
        <div>
          <Label>Contract Data</Label>
          <div className="mt-2 space-y-2">
            {Object.entries(contract.contract_data).map(([key, value]) => (
              <div key={key} className="flex justify-between p-2 bg-gray-50 rounded">
                <span className="font-medium">{value.field_name}:</span>
                <span>{String(value.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {contract.signed_document_url && (
          <Button variant="outline" onClick={() => window.open(contract.signed_document_url, '_blank')}>
            <Download className="h-4 w-4 mr-2" />
            Download Signed
          </Button>
        )}
        {contract.signing_url && (
          <Button onClick={() => window.open(contract.signing_url, '_blank')}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in OpenSign
          </Button>
        )}
      </div>
    </div>
  );
}