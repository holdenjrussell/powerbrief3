import Link from 'next/link';
import { useState } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent,
  CardFooter,
  Button,
  Badge,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectValue,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  Input,
  Label,
  Textarea
} from "@/components/ui";
import { ChevronRight, User2, ShoppingBag, FileVideo, AtSign, Package, ExternalLink, Instagram, FileText, Send, FileCheck } from 'lucide-react';
import { UgcCreator, UGC_CREATOR_ONBOARDING_STATUSES, UGC_CREATOR_CONTRACT_STATUSES, UGC_CREATOR_PRODUCT_SHIPMENT_STATUSES } from '@/lib/types/ugcCreator';
import { ContractTemplate } from '@/lib/types/contracts';
import { updateUgcCreator } from '@/lib/services/ugcCreatorService';

interface CreatorCardProps {
  creator: UgcCreator;
  brandId: string;
  onUpdate?: (updatedCreator: UgcCreator) => void;
  scriptCounts?: Record<string, number>;
}

export default function CreatorCard({ creator, brandId, onUpdate, scriptCounts }: CreatorCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showContractDialog, setShowContractDialog] = useState(false);
  const [contractTemplates, setContractTemplates] = useState<ContractTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [sendingContract] = useState(false);
  const [contractData, setContractData] = useState({
    title: '',
    templateId: '',
    customDocument: null as File | null,
    message: ''
  });
  
  // Function to get badge variant based on status
  const getStatusVariant = (status: string | undefined) => {
    if (!status) return "default";
    
    // Success statuses (completed onboarding steps)
    if (['READY FOR SCRIPTS', 'Call Scheduled'].includes(status)) {
      return "success";
    }
    
    // In progress statuses
    if (['Schedule Call', 'Call Schedule Attempted', 'Backlog', 'Approved for Next Steps'].includes(status)) {
      return "default";
    }
    
    // Early stage statuses
    if (['New Creator Submission', 'Cold Outreach', 'Primary Screen'].includes(status)) {
      return "secondary";
    }
    
    return "outline";
  };
  
  const getContractStatusVariant = (status: string | undefined) => {
    if (!status) return "default";
    
    if (status === 'contract signed') {
      return "success";
    }
    
    if (status === 'contract sent') {
      return "default";
    }
    
    if (status === 'not signed') {
      return "secondary";
    }
    
    return "outline";
  };
  
  const getProductShipmentStatusVariant = (status: string | undefined, shipped: boolean | undefined) => {
    if (shipped) return "success";
    
    if (!status) return "default";
    
    if (['Delivered', 'Shipped'].includes(status)) {
      return "success";
    }
    
    if (['Processing'].includes(status)) {
      return "default";
    }
    
    if (['Not Shipped', 'Returned'].includes(status)) {
      return "secondary";
    }
    
    return "outline";
  };
  
  // Handle status update
  const handleStatusChange = async (newStatus: string) => {
    try {
      setIsUpdating(true);
      
      const updatedCreator = await updateUgcCreator({
        id: creator.id,
        brand_id: brandId, // Pass brand_id for n8n workflow trigger
        status: newStatus
      });
      
      if (onUpdate) {
        onUpdate(updatedCreator);
      }
    } catch (error) {
      console.error('Error updating creator status:', error);
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Handle contract status update
  const handleContractStatusChange = async (newStatus: string) => {
    try {
      setIsUpdating(true);
      
      const updatedCreator = await updateUgcCreator({
        id: creator.id,
        contract_status: newStatus
      });
      
      if (onUpdate) {
        onUpdate(updatedCreator);
      }
    } catch (error) {
      console.error('Error updating creator contract status:', error);
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Handle product shipment status update
  const handleProductShipmentStatusChange = async (newStatus: string) => {
    try {
      setIsUpdating(true);
      
      const updatedCreator = await updateUgcCreator({
        id: creator.id,
        product_shipment_status: newStatus,
        // Auto-set product_shipped to true if status is Shipped or Delivered
        product_shipped: ['Shipped', 'Delivered'].includes(newStatus)
      });
      
      if (onUpdate) {
        onUpdate(updatedCreator);
      }
    } catch (error) {
      console.error('Error updating product shipment status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Fetch contract templates
  const fetchContractTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const response = await fetch(`/api/contracts/templates?brandId=${brandId}`);
      if (response.ok) {
        const data = await response.json();
        setContractTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error fetching contract templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Handle sending contract to creator
  const handleSendContract = async () => {
    // Temporarily redirect to contracts dashboard instead of sending
    setShowContractDialog(false);
    
    // Redirect to contracts tab in UGC pipeline (default to templates tab)
    window.open(`/app/powerbrief/${brandId}/ugc-pipeline?status=Send+Script+to+Creator&view=contracts&tab=templates`, '_blank');
    
    /* COMMENTED OUT - Contract sending temporarily disabled
    if (!contractData.title || (!contractData.templateId && !contractData.customDocument)) {
      return;
    }

    try {
      setSendingContract(true);
      
      let contractFields: any[] = [];
      
      // If using a template, fetch its fields first
      if (contractData.templateId) {
        const templateResponse = await fetch(`/api/contracts/templates/${contractData.templateId}`);
        if (templateResponse.ok) {
          const { template } = await templateResponse.json();
          console.log('Template fetched:', template);
          
          // Convert template fields to contract fields format
          contractFields = (template.template_fields || []).map((field: any) => ({
            type: field.type,
            page: field.page,
            positionX: field.position_x,
            positionY: field.position_y,
            width: field.width,
            height: field.height,
            recipientEmail: creator.email,
            recipientId: 'placeholder' // Will be updated by the API
          }));
          
          console.log('Contract fields prepared:', contractFields);
        }
      }
      
      // Create contract
      const formData = new FormData();
      formData.append('brandId', brandId);
      formData.append('title', contractData.title);
      formData.append('creatorId', creator.id);
      formData.append('recipients', JSON.stringify([{
        name: creator.name,
        email: creator.email,
        role: 'signer'
      }]));
      formData.append('fields', JSON.stringify(contractFields));
      
      if (contractData.templateId) {
        formData.append('templateId', contractData.templateId);
      } else if (contractData.customDocument) {
        formData.append('document', contractData.customDocument);
      }

      const createResponse = await fetch('/api/contracts', {
        method: 'POST',
        body: formData,
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create contract');
      }

      const { contract } = await createResponse.json();

      // Send the contract
      const sendResponse = await fetch(`/api/contracts/${contract.id}/send`, {
        method: 'POST',
      });

      if (!sendResponse.ok) {
        throw new Error('Failed to send contract');
      }

      // Update creator's contract status
      await handleContractStatusChange('contract sent');

      // Reset form and close dialog
      setContractData({
        title: '',
        templateId: '',
        customDocument: null,
        message: ''
      });
      setShowContractDialog(false);

    } catch (error) {
      console.error('Error sending contract:', error);
    } finally {
      setSendingContract(false);
    }
    */
  };

  // Open contract dialog and fetch templates
  const handleOpenContractDialog = () => {
    setShowContractDialog(true);
    setContractData({
      title: `UGC Creator Agreement - ${creator.name}`,
      templateId: '',
      customDocument: null,
      message: `Hi ${creator.name},\n\nPlease review and sign the attached contract. Let us know if you have any questions!\n\nBest regards,`
    });
    fetchContractTemplates();
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span className="truncate">{creator.name}</span>
        </CardTitle>
        <CardDescription className="flex flex-wrap gap-2">
          <Select 
            value={creator.status || 'New Creator Submission'} 
            onValueChange={handleStatusChange}
            disabled={isUpdating}
          >
            <SelectTrigger className="h-auto w-auto p-0 border-none bg-transparent hover:bg-transparent focus:ring-0 focus:ring-offset-0">
              <Badge variant={getStatusVariant(creator.status)} className="cursor-pointer">
                {creator.status || 'New Creator Submission'}
              </Badge>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Creator Status</SelectLabel>
                {UGC_CREATOR_ONBOARDING_STATUSES.map(status => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          
          <Select 
            value={creator.contract_status || 'not signed'} 
            onValueChange={handleContractStatusChange}
            disabled={isUpdating}
          >
            <SelectTrigger className="h-auto w-auto p-0 border-none bg-transparent hover:bg-transparent focus:ring-0 focus:ring-offset-0">
              <Badge variant={getContractStatusVariant(creator.contract_status)} className="cursor-pointer">
                {creator.contract_status || 'not signed'}
              </Badge>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Contract Status</SelectLabel>
                {UGC_CREATOR_CONTRACT_STATUSES.map(status => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          
          <Select 
            value={creator.product_shipment_status || 'Not Shipped'} 
            onValueChange={handleProductShipmentStatusChange}
            disabled={isUpdating}
          >
            <SelectTrigger className="h-auto w-auto p-0 border-none bg-transparent hover:bg-transparent focus:ring-0 focus:ring-offset-0">
              <Badge variant={getProductShipmentStatusVariant(creator.product_shipment_status, creator.product_shipped)} className="cursor-pointer">
                <Package className="h-3 w-3 mr-1" />
                {creator.product_shipped ? 'Product Shipped' : (creator.product_shipment_status || 'Not Shipped')}
              </Badge>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Product Shipment</SelectLabel>
                {UGC_CREATOR_PRODUCT_SHIPMENT_STATUSES.map(status => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {creator.gender && (
            <div className="flex items-center text-sm">
              <User2 className="h-4 w-4 mr-2 text-gray-500" />
              <span>{creator.gender}</span>
            </div>
          )}
          
          {creator.products && creator.products.length > 0 && (
            <div className="flex items-center text-sm">
              <ShoppingBag className="h-4 w-4 mr-2 text-gray-500" />
              <span>{creator.products.slice(0, 2).join(', ')}{creator.products.length > 2 ? '...' : ''}</span>
            </div>
          )}
          
          {creator.content_types && creator.content_types.length > 0 && (
            <div className="flex items-center text-sm">
              <FileVideo className="h-4 w-4 mr-2 text-gray-500" />
              <span>{creator.content_types.slice(0, 2).join(', ')}{creator.content_types.length > 2 ? '...' : ''}</span>
            </div>
          )}
          
          {creator.email && (
            <div className="flex items-center text-sm">
              <AtSign className="h-4 w-4 mr-2 text-gray-500" />
              <span className="truncate">{creator.email}</span>
            </div>
          )}
          
          {creator.phone_number && (
            <div className="flex items-center text-sm">
              <AtSign className="h-4 w-4 mr-2 text-gray-500" />
              <span className="truncate">{creator.phone_number}</span>
            </div>
          )}
          
          {creator.instagram_handle && (
            <div className="flex items-center text-sm">
              <Instagram className="h-4 w-4 mr-2 text-gray-500" />
              <a 
                href={`https://instagram.com/${creator.instagram_handle.replace(/^@/, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline truncate"
                onClick={(e) => e.stopPropagation()}
              >
                @{creator.instagram_handle.replace(/^@/, '')}
              </a>
            </div>
          )}
          
          {creator.tiktok_handle && (
            <div className="flex items-center text-sm">
              <svg className="h-4 w-4 mr-2 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.321 5.562a5.124 5.124 0 0 1-.443-.258 6.228 6.228 0 0 1-1.137-.966c-.849-.849-1.294-1.903-1.294-3.056V.91h-3.239v14.19c0 2.084-1.695 3.779-3.779 3.779s-3.779-1.695-3.779-3.779 1.695-3.779 3.779-3.779c.211 0 .418.017.621.051v-3.301a7.084 7.084 0 0 0-.621-.027C4.771 7.044.944 10.871.944 15.529s3.827 8.485 8.485 8.485 8.485-3.827 8.485-8.485V9.831a9.109 9.109 0 0 0 5.165 1.591v-3.239a5.85 5.85 0 0 1-3.758-2.621z"/>
              </svg>
              <a 
                href={`https://tiktok.com/@${creator.tiktok_handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline truncate"
                onClick={(e) => e.stopPropagation()}
              >
                @{creator.tiktok_handle}
              </a>
            </div>
          )}
          
          {creator.portfolio_link && (
            <div className="flex items-center text-sm">
              <ExternalLink className="h-4 w-4 mr-2 text-gray-500" />
              <a 
                href={creator.portfolio_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline truncate"
                onClick={(e) => e.stopPropagation()}
              >
                Portfolio
              </a>
            </div>
          )}
          
          {/* Script counts display */}
          {scriptCounts && Object.keys(scriptCounts).length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center text-sm font-medium mb-2">
                <FileCheck className="h-4 w-4 mr-2 text-gray-500" />
                <span>Scripts Assigned</span>
              </div>
              <div className="space-y-1">
                {Object.entries(scriptCounts).map(([status, count]) => {
                  // Define colors for each status
                  const statusColors: Record<string, string> = {
                    'Send Script to Creator': 'text-blue-600',
                    'Creator Shooting': 'text-purple-600',
                    'Content Approval': 'text-orange-600',
                    'To Edit': 'text-green-600'
                  };
                  
                  const color = statusColors[status] || 'text-gray-600';
                  
                  return (
                    <div key={status} className="flex items-center justify-between text-xs">
                      <span className={color}>{status}:</span>
                      <span className={`font-medium ${color}`}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Link href={`/app/powerbrief/${brandId}/ugc-pipeline/creators/${creator.id}`} className="flex-1">
          <Button variant="outline" className="w-full justify-between">
            View Creator
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
        
        {creator.contract_status === 'not signed' && (
          <Dialog open={showContractDialog} onOpenChange={setShowContractDialog}>
            <DialogTrigger asChild>
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleOpenContractDialog}
                className="px-3"
              >
                <FileText className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Send Contract to {creator.name}</DialogTitle>
                <DialogDescription>
                  Send a contract for digital signature
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="contract-title">Contract Title</Label>
                  <Input
                    id="contract-title"
                    value={contractData.title}
                    onChange={(e) => setContractData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter contract title"
                  />
                </div>

                <div>
                  <Label htmlFor="template-select">Use Template</Label>
                  <Select 
                    value={contractData.templateId} 
                    onValueChange={(value) => setContractData(prev => ({ ...prev, templateId: value, customDocument: null }))}
                    disabled={loadingTemplates}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingTemplates ? "Loading templates..." : "Select a template"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No template (upload custom document)</SelectItem>
                      {contractTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {!contractData.templateId && (
                  <div>
                    <Label htmlFor="custom-document">Upload Custom Document</Label>
                    <Input
                      id="custom-document"
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setContractData(prev => ({ 
                        ...prev, 
                        customDocument: e.target.files?.[0] || null 
                      }))}
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="message">Email Message</Label>
                  <Textarea
                    id="message"
                    value={contractData.message}
                    onChange={(e) => setContractData(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Enter message to include in the email"
                    rows={4}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowContractDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSendContract} 
                  disabled={sendingContract || !contractData.title || (!contractData.templateId && !contractData.customDocument)}
                >
                  {sendingContract ? (
                    <>
                      <Send className="h-4 w-4 mr-2 animate-pulse" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Contract
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardFooter>
    </Card>
  );
} 