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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Alert,
  AlertDescription,
  Input,
  Label
} from "@/components/ui";
import { UgcCreatorScript, UgcCreator, UGC_SCRIPT_PAYMENT_STATUSES } from '@/lib/types/ugcCreator';
import { ContractTemplate } from '@/lib/types/contracts';
import { ChevronRight, CheckCircle, AlertCircle, User, PenSquare, Trash2, Edit, Package, FileText, Sparkles, DollarSign, Calendar, Send, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Remove the TBD_CREATOR_ID constant since the API handles this now
// const TBD_CREATOR_ID = '00000000-0000-0000-0000-000000000000';

interface ScriptCardProps {
  script: UgcCreatorScript;
  brandId?: string;
  showActionButtons?: boolean;
  onApprove?: (scriptId: string) => void;
  onRequestRevision?: (scriptId: string, notes: string) => void;
  onAssign?: (scriptId: string, creatorIds: string[]) => void;
  onCreatorApprove?: (scriptId: string) => void;
  onCreatorReject?: (scriptId: string, notes: string) => void;
  onApproveContent?: (scriptId: string) => void;
  onRequestContentRevision?: (scriptId: string, notes: string) => void;
  onSubmitContent?: (scriptId: string, contentLink: string) => void;
  onDelete?: (scriptId: string) => void;
  creators?: UgcCreator[];
}

export default function ScriptCard({ 
  script, 
  brandId, 
  showActionButtons = false,
  onApprove,
  onRequestRevision,
  onAssign,
  onCreatorApprove,
  onCreatorReject,
  onApproveContent,
  onRequestContentRevision,
  onSubmitContent,
  onDelete,
  creators = []
}: ScriptCardProps) {
  const router = useRouter();
  const [showRevisionDialog, setShowRevisionDialog] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedCreatorId, setSelectedCreatorId] = useState('');
  const [creatorSearchQuery, setCreatorSearchQuery] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCreatorRejectDialog, setShowCreatorRejectDialog] = useState(false);
  const [creatorRejectionNotes, setCreatorRejectionNotes] = useState('');
  const [showContentRevisionDialog, setShowContentRevisionDialog] = useState(false);
  const [contentRevisionNotes, setContentRevisionNotes] = useState('');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [depositAmount, setDepositAmount] = useState(script.deposit_amount?.toString() || '');
  const [finalPaymentAmount, setFinalPaymentAmount] = useState(script.final_payment_amount?.toString() || '');
  const [paymentNotes, setPaymentNotes] = useState(script.payment_notes || '');
  const [paymentStatus, setPaymentStatus] = useState(script.payment_status || 'No Payment Due');
  
  // Content submission state for Creator Shooting
  const [showContentSubmissionDialog, setShowContentSubmissionDialog] = useState(false);
  const [contentSubmissionLink, setContentSubmissionLink] = useState('');
  const [isSubmittingContent, setIsSubmittingContent] = useState(false);

  // Contract template state
  const [showSendContractDialog, setShowSendContractDialog] = useState(false);
  const [contractTemplates, setContractTemplates] = useState<ContractTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [sendingContract, setSendingContract] = useState(false);

  // Function to get badge variant based on status
  const getStatusVariant = (status: string | undefined) => {
    if (!status) return "default";
    
    if (['COMPLETED', 'CONTENT UPLOADED', 'READY FOR PAYMENT', 'APPROVED'].includes(status)) {
      return "success";
    }
    
    if (['SCRIPT ASSIGNED', 'CREATOR FILMING', 'FINAL CONTENT UPLOAD'].includes(status)) {
      return "default";
    }
    
    if (['BACKLOG', 'COLD OUTREACH', 'PRIMARY SCREEN', 'PENDING_APPROVAL'].includes(status)) {
      return "secondary";
    }
    
    if (['CREATOR_REASSIGNMENT'].includes(status)) {
      return "warning";
    }
    
    if (['INACTIVE/REJECTED', 'REVISION_REQUESTED'].includes(status)) {
      return "destructive";
    }
    
    return "outline";
  };

  const handleApproveClick = () => {
    if (onApprove) {
      onApprove(script.id);
    }
  };

  const handleRevisionSubmit = () => {
    if (onRequestRevision && revisionNotes.trim()) {
      onRequestRevision(script.id, revisionNotes);
      setShowRevisionDialog(false);
      setRevisionNotes('');
    }
  };

  const handleAssignSubmit = () => {
    if (onAssign && selectedCreatorId) {
      // Make sure we're passing a non-empty array of creator IDs
      const creatorIds = [selectedCreatorId].filter(id => id.trim() !== '');
      
      // Only proceed if we have at least one valid creator ID
      if (creatorIds.length > 0) {
        onAssign(script.id, creatorIds);
        setShowAssignDialog(false);
        setSelectedCreatorId('');
        setCreatorSearchQuery('');
      } else {
        // Show an error message if no valid creator IDs
        console.error('No valid creator IDs selected');
        // You could add state to show an error message in the UI
      }
    }
  };
  
  const handleCreatorApproveClick = () => {
    if (onCreatorApprove) {
      onCreatorApprove(script.id);
    }
  };

  const handleCreatorRejectSubmit = () => {
    if (onCreatorReject && creatorRejectionNotes.trim()) {
      onCreatorReject(script.id, creatorRejectionNotes);
      setShowCreatorRejectDialog(false);
      setCreatorRejectionNotes('');
    }
  };

  // Content approval handlers
  const handleApproveContentClick = () => {
    if (onApproveContent) {
      onApproveContent(script.id);
    }
  };

  const handleContentRevisionSubmit = () => {
    if (onRequestContentRevision && contentRevisionNotes.trim()) {
      onRequestContentRevision(script.id, contentRevisionNotes);
      setShowContentRevisionDialog(false);
      setContentRevisionNotes('');
    }
  };

  // Content submission handler for Creator Shooting status
  const handleContentSubmissionSubmit = async () => {
    if (onSubmitContent && contentSubmissionLink.trim()) {
      setIsSubmittingContent(true);
      try {
        await onSubmitContent(script.id, contentSubmissionLink.trim());
        setShowContentSubmissionDialog(false);
        setContentSubmissionLink('');
      } catch (error) {
        console.error('Error submitting content:', error);
        // Handle error state if needed
      } finally {
        setIsSubmittingContent(false);
      }
    }
  };

  // Payment handlers
  const handleSavePaymentDetails = async () => {
    try {
      const response = await fetch(`/api/ugc/scripts/${script.id}/payment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deposit_amount: parseFloat(depositAmount) || 0,
          final_payment_amount: parseFloat(finalPaymentAmount) || 0,
          payment_notes: paymentNotes,
          payment_status: paymentStatus,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save payment details');
      }

      setShowPaymentDialog(false);
      // Note: In a real app, you'd want to refresh the script data here
    } catch (error) {
      console.error('Error saving payment details:', error);
    }
  };

  const handleMarkDepositPaid = async () => {
    try {
      const response = await fetch(`/api/ugc/scripts/${script.id}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mark_deposit_paid: true
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark deposit as paid');
      }
      
      // Refresh the page to show updated payment information
      window.location.reload();
    } catch (error) {
      console.error('Error marking deposit as paid:', error);
    }
  };

  const handleMarkFinalPaymentPaid = async () => {
    try {
      const response = await fetch(`/api/ugc/scripts/${script.id}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mark_final_payment_paid: true
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark final payment as paid');
      }
      
      // Refresh the page to show updated payment information
      window.location.reload();
    } catch (error) {
      console.error('Error marking final payment as paid:', error);
    }
  };

  const handleEditScript = () => {
    if (brandId) {
      router.push(`/app/powerbrief/${brandId}/ugc-pipeline/scripts/${script.id}/edit`);
    } else {
      // If we don't have a brandId, try to extract it from the current URL
      // This is a client-side approach, so it will only work in the browser
      if (typeof window !== 'undefined') {
        const pathSegments = window.location.pathname.split('/');
        // Try to find brandId in the current URL
        const brandIdIndex = pathSegments.findIndex(segment => segment === 'powerbrief') + 1;
        
        if (brandIdIndex > 0 && brandIdIndex < pathSegments.length) {
          const currentBrandId = pathSegments[brandIdIndex];
          router.push(`/app/powerbrief/${currentBrandId}/ugc-pipeline/scripts/${script.id}/edit`);
        } else {
          // If we can't determine the brandId, we could:
          // 1. Show an error
          console.error('Could not determine brand ID for editing script');
          // 2. Redirect to a fallback page
          router.push(`/app/powerbrief`);
        }
      }
    }
  };

  const handleDeleteScript = async () => {
    try {
      setIsDeleting(true);
      
      const response = await fetch(`/api/ugc/scripts/${script.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete script');
      }
      
      // Close dialog
      setShowDeleteDialog(false);
      
      // If onDelete callback is provided, call it
      if (onDelete) {
        onDelete(script.id);
      } else {
        // Fallback to refresh if no callback provided
        router.refresh();
      }
      
    } catch (error) {
      console.error('Error deleting script:', error);
      // Handle error here (could add an error state and show message)
    } finally {
      setIsDeleting(false);
    }
  };

  // Contract template handlers
  const fetchContractTemplates = async () => {
    if (!brandId) return;
    
    setLoadingTemplates(true);
    try {
      const response = await fetch(`/api/contracts/templates?brandId=${brandId}`);
      if (!response.ok) throw new Error('Failed to fetch templates');
      
      const data = await response.json();
      setContractTemplates(data.templates || []);
    } catch (error) {
      console.error('Error fetching contract templates:', error);
      setContractTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleOpenSendContractDialog = () => {
    setShowSendContractDialog(true);
    fetchContractTemplates();
  };

  const handleSendContract = async () => {
    // Temporarily redirect to contracts dashboard instead of sending
    if (!brandId) return;
    
    // Close dialog first
    setShowSendContractDialog(false);
    setSelectedTemplateId('');
    
    // Redirect to contracts tab in UGC pipeline
    window.open(`/app/powerbrief/${brandId}/ugc-pipeline?status=Send+Script+to+Creator&view=contracts`, '_blank');
    
    /* COMMENTED OUT - Contract sending temporarily disabled
    if (!selectedTemplateId || !brandId) return;
    
    const assignedCreator = creators.find(c => c.id === script.creator_id);
    if (!assignedCreator?.email) return;

    setSendingContract(true);
    try {
      // First, fetch the template to get its fields
      const templateResponse = await fetch(`/api/contracts/templates/${selectedTemplateId}`);
      if (!templateResponse.ok) {
        throw new Error('Failed to fetch template');
      }
      
      const { template } = await templateResponse.json();
      console.log('Template fetched:', template);
      
      // Convert template fields to contract fields format
      const contractFields = (template.template_fields || []).map((field: any) => ({
        type: field.type,
        page: field.page,
        positionX: field.position_x,
        positionY: field.position_y,
        width: field.width,
        height: field.height,
        recipientEmail: assignedCreator.email,
        recipientId: 'placeholder' // Will be updated by the API
      }));
      
      console.log('Contract fields prepared:', contractFields);

      // Create contract from template with fields
      const formData = new FormData();
      formData.append('brandId', brandId);
      formData.append('title', `UGC Script Contract - ${script.title}`);
      formData.append('creatorId', assignedCreator.id);
      formData.append('scriptId', script.id);
      formData.append('templateId', selectedTemplateId);
      formData.append('recipients', JSON.stringify([{
        name: assignedCreator.name,
        email: assignedCreator.email,
        role: 'signer'
      }]));
      formData.append('fields', JSON.stringify(contractFields));

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

      // Close dialog and reset state
      setShowSendContractDialog(false);
      setSelectedTemplateId('');
      
      // Refresh the page or update creator data
      window.location.reload();
      
    } catch (error) {
      console.error('Error sending contract:', error);
      alert('Failed to send contract. Please try again.');
    } finally {
      setSendingContract(false);
    }
    */
  };

  const handleResendContract = async () => {
    const assignedCreator = creators.find(c => c.id === script.creator_id);
    if (!assignedCreator?.email || !brandId) return;

    // Find existing contract for this creator and script
    try {
      const response = await fetch(`/api/contracts?creatorId=${assignedCreator.id}&scriptId=${script.id}`);
      if (!response.ok) return;
      
      const data = await response.json();
      const existingContract = data.contracts?.[0];
      
      if (existingContract) {
        // Resend existing contract
        const sendResponse = await fetch(`/api/contracts/${existingContract.id}/send`, {
          method: 'POST',
        });
        
        if (sendResponse.ok) {
          alert('Contract resent successfully!');
        }
      }
    } catch (error) {
      console.error('Error resending contract:', error);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className={`border-t-4 ${
        script.status === 'CREATOR_REASSIGNMENT' 
          ? 'border-amber-500' 
          : script.creator_id && creators.find(c => c.id === script.creator_id)?.product_shipped 
            ? 'border-green-400' 
            : 'border-amber-400'
      }`}>
        <CardTitle className="flex justify-between items-center">
          <span className="truncate text-lg">
            {script.status === 'CREATOR_REASSIGNMENT' && (
              <AlertCircle className="h-4 w-4 text-amber-500 mr-1 inline" />
            )}
            {script.title}
          </span>
          <Badge variant={getStatusVariant(script.status)}>
            {script.status === 'CREATOR_REASSIGNMENT' ? 'NEEDS REASSIGNMENT' : script.status || 'NEW'}
          </Badge>
        </CardTitle>
        <CardDescription className="flex items-center">
          {script.concept_status || 'Creator Script'}
          {script.is_ai_generated && (
            <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-200">
              <Sparkles className="h-3 w-3 mr-1" />
              AI GENERATED
            </Badge>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {script.creator_id && (
            <div className="text-sm flex items-start">
              <span className="font-medium whitespace-nowrap">Creator:</span>
              {script.status === 'CREATOR_REASSIGNMENT' || creators.find(c => c.id === script.creator_id)?.name === 'To Be Determined' ? (
                <span className="ml-2 text-amber-600 font-medium inline-block">
                  {script.status === 'CREATOR_REASSIGNMENT' ? 'TBD (Needs Reassignment)' : 'TBD (To Be Determined)'}
                </span>
              ) : (
                <span className="ml-2">{creators.find(c => c.id === script.creator_id)?.name || `ID: ${script.creator_id.slice(0, 8)}...`}</span>
              )}
            </div>
          )}
          
          {script.creative_strategist && (
            <div className="text-sm flex items-start">
              <span className="font-medium whitespace-nowrap">Creative Strategist:</span>
              <span className="ml-2">{script.creative_strategist}</span>
            </div>
          )}
          
          {/* Product Shipment Status */}
          {script.creator_id && creators.length > 0 && (
            <>
              {/* Find the assigned creator for this script */}
              {(() => {
                const assignedCreator = creators.find(c => c.id === script.creator_id);
                
                if (assignedCreator) {
                  return (
                    <>
                      {/* Product Shipment Status */}
                      {assignedCreator.products && assignedCreator.products.length > 0 && (
                        <div className="mt-2">
                          {assignedCreator.product_shipped ? (
                            <div className="p-2 bg-green-50 border-l-4 border-green-400 rounded-md flex items-center">
                              <Package className="h-4 w-4 text-green-600 mr-2" />
                              <div>
                                <p className="text-xs font-medium text-green-700">Product Shipped</p>
                                <p className="text-xs text-gray-700">
                                  {assignedCreator.products.join(', ')}
                                  {assignedCreator.tracking_number && ` - Tracking: ${assignedCreator.tracking_number}`}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="p-2 bg-red-50 border-l-4 border-red-400 rounded-md flex items-center">
                              <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                              <div>
                                <p className="text-xs font-medium text-red-700">Product Not Shipped</p>
                                <p className="text-xs text-gray-700">
                                  {assignedCreator.products.join(', ')}
                                  {assignedCreator.product_shipment_status && ` - Status: ${assignedCreator.product_shipment_status}`}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Contract Status */}
                      <div className="mt-2">
                        {!assignedCreator.contract_status && (
                          <div className="p-2 bg-red-50 border-l-4 border-red-400 rounded-md flex items-center">
                            <FileText className="h-4 w-4 text-red-600 mr-2" />
                            <p className="text-xs font-medium text-red-700">Contract Not Signed</p>
                          </div>
                        )}
                        
                        {assignedCreator.contract_status === 'SENT' && (
                          <div className="p-2 bg-yellow-50 border-l-4 border-yellow-400 rounded-md flex items-center">
                            <FileText className="h-4 w-4 text-yellow-600 mr-2" />
                            <p className="text-xs font-medium text-yellow-700">Contract Sent But Not Signed</p>
                          </div>
                        )}
                        
                        {assignedCreator.contract_status === 'SIGNED' && (
                          <div className="p-2 bg-green-50 border-l-4 border-green-400 rounded-md flex items-center">
                            <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                            <p className="text-xs font-medium text-green-700">Contract Signed</p>
                          </div>
                        )}
                      </div>
                    </>
                  );
                }
                return null;
              })()}
            </>
          )}
          
          {script.hook_body && (
            <div className="text-sm flex items-start">
              <span className="font-medium whitespace-nowrap">Hook:</span>
              <span className="ml-2 line-clamp-1">{script.hook_body}</span>
            </div>
          )}
          
          {script.final_content_link && (
            <div className="text-sm flex items-start">
              <span className="font-medium whitespace-nowrap">Content:</span>
              <a 
                href={script.final_content_link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-2 text-blue-500 hover:underline"
              >
                View Content
              </a>
            </div>
          )}
          
          {script.public_share_id && (
            <div className="text-sm flex items-start">
              <span className="font-medium whitespace-nowrap">Public Link:</span>
              <a 
                href={`/public/ugc-script/${script.public_share_id}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-2 text-blue-500 hover:underline"
              >
                Share Link
              </a>
            </div>
          )}
          
          {script.status === 'REVISION_REQUESTED' && script.revision_notes && (
            <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded-md">
              <p className="text-xs font-medium text-red-700 mb-1">Revision Notes:</p>
              <p className="text-xs text-gray-700">{script.revision_notes}</p>
            </div>
          )}
          
          {script.concept_status === 'Creator Shooting' && script.revision_notes && (
            <div className="mt-2 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-md">
              <p className="text-xs font-medium text-yellow-800 mb-1">Content Revision Feedback:</p>
              <p className="text-xs text-gray-700">{script.revision_notes}</p>
            </div>
          )}
          
          {script.status === 'CREATOR_REASSIGNMENT' && script.revision_notes && script.concept_status === 'Creator Assignment' && (
            <div className="mt-2 p-2 bg-amber-50 border-l-4 border-amber-400 rounded-md">
              <p className="text-xs font-medium text-amber-700 mb-1">Creator Rejection Notes:</p>
              <p className="text-xs text-gray-700">{script.revision_notes}</p>
            </div>
          )}
          
          {/* Payment Tracking Section */}
          {script.concept_status && ['Send Script to Creator', 'Creator Shooting', 'Content Approval', 'To Edit'].includes(script.concept_status) && (
            <div className="mt-2 p-3 bg-blue-50 border-l-4 border-blue-400 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-medium text-blue-800 flex items-center">
                  <DollarSign className="h-3 w-3 mr-1" />
                  Payment Tracking
                </h4>
                <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-6 px-2 text-xs">
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Payment Details</DialogTitle>
                      <DialogDescription>
                        Manage payment information for this script.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="payment-status">Payment Status</Label>
                        <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {UGC_SCRIPT_PAYMENT_STATUSES.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="deposit-amount">Deposit Amount ($)</Label>
                          <Input
                            id="deposit-amount"
                            type="number"
                            step="0.01"
                            min="0"
                            value={depositAmount}
                            onChange={(e) => setDepositAmount(e.target.value)}
                            placeholder="0.00"
                            className="mt-1"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="final-payment">Final Payment ($)</Label>
                          <Input
                            id="final-payment"
                            type="number"
                            step="0.01"
                            min="0"
                            value={finalPaymentAmount}
                            onChange={(e) => setFinalPaymentAmount(e.target.value)}
                            placeholder="0.00"
                            className="mt-1"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="payment-notes">Payment Notes</Label>
                        <Textarea
                          id="payment-notes"
                          value={paymentNotes}
                          onChange={(e) => setPaymentNotes(e.target.value)}
                          placeholder="Add payment notes..."
                          className="mt-1"
                          rows={3}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSavePaymentDetails}>
                        Save Payment Details
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-blue-700">Status:</span>
                  <Badge variant="outline" className="text-xs">
                    {script.payment_status || 'No Payment Due'}
                  </Badge>
                </div>
                
                {(script.deposit_amount || script.final_payment_amount) && (
                  <div className="text-xs text-blue-700 space-y-1">
                    {script.deposit_amount && (
                      <div className="flex justify-between items-center">
                        <span>Deposit: ${script.deposit_amount.toFixed(2)}</span>
                        <div className="flex items-center">
                          {script.deposit_paid_date ? (
                            <div className="flex items-center text-green-600">
                              <Calendar className="h-3 w-3 mr-1" />
                              <span className="text-xs">Paid</span>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-5 px-2 text-xs"
                              onClick={handleMarkDepositPaid}
                            >
                              Mark Paid
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                    {script.final_payment_amount && (
                      <div className="flex justify-between items-center">
                        <span>Final: ${script.final_payment_amount.toFixed(2)}</span>
                        <div className="flex items-center">
                          {script.final_payment_paid_date ? (
                            <div className="flex items-center text-green-600">
                              <Calendar className="h-3 w-3 mr-1" />
                              <span className="text-xs">Paid</span>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-5 px-2 text-xs"
                              onClick={handleMarkFinalPaymentPaid}
                            >
                              Mark Paid
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        {showActionButtons && script.concept_status === 'Script Approval' && (
          <div className="flex gap-2 w-full mb-2">
            <Button 
              variant="outline" 
              size="sm"
              className="flex-1 text-green-600 border-green-600 hover:bg-green-50"
              onClick={handleApproveClick}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve
            </Button>
            
            <Dialog open={showRevisionDialog} onOpenChange={setShowRevisionDialog}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex-1 text-red-600 border-red-600 hover:bg-red-50"
                >
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Request Revision
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request Script Revision</DialogTitle>
                  <DialogDescription>
                    Provide detailed notes on what needs to be revised.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Textarea
                    value={revisionNotes}
                    onChange={(e) => setRevisionNotes(e.target.value)}
                    placeholder="Enter revision notes..."
                    rows={5}
                  />
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowRevisionDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleRevisionSubmit}
                    disabled={!revisionNotes.trim()}
                  >
                    Submit Revision Request
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
        
        {showActionButtons && script.concept_status === 'Creator Assignment' && onAssign && (
          <div className="w-full mb-2">
            <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full"
                >
                  <User className="h-4 w-4 mr-1" />
                  Assign to Creator
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {script.status === 'CREATOR_REASSIGNMENT' ? (
                      <div className="flex items-center text-amber-600">
                        <AlertCircle className="h-5 w-5 mr-2" />
                        Reassign Rejected Script
                      </div>
                    ) : (
                      'Assign Script to Creator'
                    )}
                  </DialogTitle>
                  <DialogDescription>
                    {script.status === 'CREATOR_REASSIGNMENT' && script.revision_notes ? (
                      <>This script was rejected by a previous creator. See notes below:</>
                    ) : (
                      <>Select a creator to assign this script to.</>
                    )}
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  {script.status === 'CREATOR_REASSIGNMENT' && script.revision_notes && (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                      <p className="text-sm font-medium text-amber-800 mb-1">Rejection Reason:</p>
                      <p className="text-sm text-gray-700">{script.revision_notes}</p>
                    </div>
                  )}
                  
                  {/* Search Input */}
                  <div className="mb-4">
                    <Input
                      placeholder="Search creators by name or email..."
                      value={creatorSearchQuery}
                      onChange={(e) => setCreatorSearchQuery(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  
                  {/* Creator List */}
                  <div className="space-y-2">
                    <Label>Select Creator:</Label>
                    <div className="max-h-48 overflow-y-auto border rounded-lg p-2">
                      {creators.length > 0 ? (
                        creators
                          .filter(creator => {
                            if (!creatorSearchQuery) return true;
                            const query = creatorSearchQuery.toLowerCase();
                            return (
                              (creator.name && creator.name.toLowerCase().includes(query)) ||
                              (creator.email && creator.email.toLowerCase().includes(query))
                            );
                          })
                          .map((creator) => (
                            <div
                              key={creator.id}
                              className={`p-3 rounded-md cursor-pointer border transition-colors ${
                                selectedCreatorId === creator.id
                                  ? 'bg-blue-50 border-blue-200'
                                  : 'hover:bg-gray-50 border-gray-200'
                              }`}
                              onClick={() => setSelectedCreatorId(creator.id)}
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">{creator.name || 'Unnamed'}</span>
                                <span className="text-sm text-gray-500">{creator.email}</span>
                                <span className="text-xs text-gray-400">{creator.status}</span>
                              </div>
                            </div>
                          ))
                      ) : (
                        <div className="text-center py-4 text-gray-500">
                          <p>No creators available</p>
                        </div>
                      )}
                      
                      {creators.length > 0 && creators.filter(creator => {
                        if (!creatorSearchQuery) return true;
                        const query = creatorSearchQuery.toLowerCase();
                        return (
                          (creator.name && creator.name.toLowerCase().includes(query)) ||
                          (creator.email && creator.email.toLowerCase().includes(query))
                        );
                      }).length === 0 && creatorSearchQuery && (
                        <div className="text-center py-4 text-gray-500">
                          <p>No creators found matching &quot;{creatorSearchQuery}&quot;</p>
                          <p className="text-sm">Try a different search term</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowAssignDialog(false);
                      setSelectedCreatorId('');
                      setCreatorSearchQuery('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAssignSubmit}
                    disabled={!selectedCreatorId}
                  >
                    Assign Creator
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
        
        {showActionButtons && script.concept_status === 'Send Script to Creator' && onCreatorApprove && onCreatorReject && (
          <div className="w-full mb-2">
            {(() => {
              // Find the assigned creator for this script
              const assignedCreator = creators.find(c => c.id === script.creator_id);
              
              // Check if requirements are met for approval
              const productShipped = assignedCreator?.product_shipped;
              const contractSigned = assignedCreator?.contract_status === 'contract signed';
              const contractPending = assignedCreator?.contract_status === 'contract sent';
              const contractMissing = !assignedCreator?.contract_status || assignedCreator?.contract_status === 'not signed';
              
              // Always show the action buttons, but conditionally disable/modify approval button
              return (
                <div className="w-full">
                  {/* Show warnings for approval requirements, but don't block rejection */}
                  {assignedCreator && !productShipped && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-md mb-3">
                      <h4 className="font-medium text-amber-800 flex items-center mb-2">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Product Shipment Required for Approval
                      </h4>
                      <p className="text-sm text-amber-700 mb-2">
                        Ship product to creator before approval. Rejection can proceed without shipment.
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full border-amber-200 text-amber-700 hover:bg-amber-100"
                        onClick={() => {
                          if (brandId) {
                            router.push(`/app/powerbrief/${brandId}/ugc-pipeline/creators/${assignedCreator.id}`);
                          }
                        }}
                      >
                        <Package className="h-4 w-4 mr-1" />
                        Update Product Shipment
                      </Button>
                    </div>
                  )}
                  
                  {assignedCreator && contractMissing && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md mb-3">
                      <h4 className="font-medium text-red-800 flex items-center mb-2">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Contract Required for Approval
                      </h4>
                      <p className="text-sm text-red-700 mb-2">
                        Contract must be signed before approval. Rejection can proceed without contract.
                      </p>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex-1 border-red-200 text-red-700 hover:bg-red-100"
                          onClick={handleOpenSendContractDialog}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Send Contract
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-red-200 text-red-700 hover:bg-red-100"
                          onClick={() => {
                            if (brandId) {
                              router.push(`/app/powerbrief/${brandId}/ugc-pipeline/creators/${assignedCreator.id}`);
                            }
                          }}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          View Creator
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {assignedCreator && contractPending && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md mb-3">
                      <h4 className="font-medium text-yellow-800 flex items-center mb-2">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Contract Pending for Approval
                      </h4>
                      <p className="text-sm text-yellow-700 mb-2">
                        Contract has been sent but not yet signed. Approval requires signed contract. Rejection can proceed without waiting.
                      </p>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex-1 border-yellow-200 text-yellow-700 hover:bg-yellow-100"
                          onClick={handleResendContract}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Resend Contract
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-yellow-200 text-yellow-700 hover:bg-yellow-100"
                          onClick={() => {
                            if (brandId) {
                              router.push(`/app/powerbrief/${brandId}/ugc-pipeline/creators/${assignedCreator.id}`);
                            }
                          }}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          View Creator
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2 w-full">
                    {/* Approval button - disabled if requirements not met */}
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1 text-green-600 border-green-600 hover:bg-green-50 disabled:text-gray-400 disabled:border-gray-300"
                      onClick={handleCreatorApproveClick}
                      disabled={!productShipped || !contractSigned}
                      title={!productShipped || !contractSigned ? "Product must be shipped and contract signed for approval" : undefined}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Creator Approved
                    </Button>
                    
                    {/* Rejection button - always enabled for reassignment flow */}
                    <Dialog open={showCreatorRejectDialog} onOpenChange={setShowCreatorRejectDialog}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex-1 text-red-600 border-red-600 hover:bg-red-50"
                        >
                          <AlertCircle className="h-4 w-4 mr-1" />
                          Creator Rejected
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Creator Rejected Script</DialogTitle>
                          <DialogDescription>
                            Provide notes on why the creator rejected the script. The script will be marked for reassignment.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                          <Textarea
                            value={creatorRejectionNotes}
                            onChange={(e) => setCreatorRejectionNotes(e.target.value)}
                            placeholder="Enter rejection notes..."
                            rows={5}
                          />
                        </div>
                        <DialogFooter>
                          <Button 
                            variant="outline" 
                            onClick={() => setShowCreatorRejectDialog(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleCreatorRejectSubmit}
                            disabled={!creatorRejectionNotes.trim()}
                          >
                            Submit Rejection
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
        
        {/* Creator Shooting Section - Submit Content from Backend */}
        {showActionButtons && script.concept_status === 'Creator Shooting' && onSubmitContent && (
          <div className="w-full mb-2">
            {script.final_content_link ? (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-800">Content Submitted</p>
                    <p className="text-xs text-green-600 mt-1">
                      <a 
                        href={script.final_content_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        View submitted content
                      </a>
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-blue-600 border-blue-600 hover:bg-blue-50"
                    onClick={() => setShowContentSubmissionDialog(true)}
                  >
                    Update Content
                  </Button>
                </div>
              </div>
            ) : (
              <Button 
                variant="outline" 
                size="sm"
                className="w-full text-blue-600 border-blue-600 hover:bg-blue-50"
                onClick={() => setShowContentSubmissionDialog(true)}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Submit Content for Approval
              </Button>
            )}
            
            <Dialog open={showContentSubmissionDialog} onOpenChange={setShowContentSubmissionDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Submit Creator Content</DialogTitle>
                  <DialogDescription>
                    {script.final_content_link 
                      ? 'Update the content link for this script.'
                      : 'Provide a link to the creator\'s finished content for approval.'
                    }
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  {script.final_content_link && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-sm text-blue-800">
                        <strong>Current content:</strong>{' '}
                        <a 
                          href={script.final_content_link} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-blue-600 hover:underline"
                        >
                          {script.final_content_link}
                        </a>
                      </p>
                    </div>
                  )}
                  <div>
                    <Label htmlFor="content-link">Content Link</Label>
                    <Input
                      id="content-link"
                      type="url"
                      value={contentSubmissionLink}
                      onChange={(e) => setContentSubmissionLink(e.target.value)}
                      placeholder="https://..."
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Share a link to the content (Google Drive, Dropbox, Frame.io, etc.)
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowContentSubmissionDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleContentSubmissionSubmit}
                    disabled={!contentSubmissionLink.trim() || isSubmittingContent}
                  >
                    {isSubmittingContent ? 'Submitting...' : 'Submit Content'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
        
        {/* Content Approval Section */}
        {showActionButtons && script.concept_status === 'Content Approval' && onApproveContent && onRequestContentRevision && (
          <div className="flex gap-2 w-full mb-2">
            <Button 
              variant="outline" 
              size="sm"
              className="flex-1 text-green-600 border-green-600 hover:bg-green-50"
              onClick={handleApproveContentClick}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve Content
            </Button>
            
            <Dialog open={showContentRevisionDialog} onOpenChange={setShowContentRevisionDialog}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex-1 text-red-600 border-red-600 hover:bg-red-50"
                >
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Request Revision
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request Content Revision</DialogTitle>
                  <DialogDescription>
                    Provide detailed feedback on what needs to be revised in the submitted content.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Textarea
                    value={contentRevisionNotes}
                    onChange={(e) => setContentRevisionNotes(e.target.value)}
                    placeholder="Enter revision feedback..."
                    rows={5}
                  />
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowContentRevisionDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleContentRevisionSubmit}
                    disabled={!contentRevisionNotes.trim()}
                  >
                    Send Revision Request
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
        
        {/* Edit and Delete Buttons */}
        {showActionButtons && (
          <div className="flex gap-2 w-full mb-2">
            <Button 
              variant="outline" 
              size="sm"
              className="flex-1"
              onClick={handleEditScript}
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit Script
            </Button>
            
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex-1 text-red-600 border-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Script</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete this script? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Alert variant="destructive">
                    <AlertDescription>
                      This will permanently delete the script and all associated data.
                    </AlertDescription>
                  </Alert>
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowDeleteDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={handleDeleteScript}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Script'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
        
        {brandId && !script.status?.includes('REVISION_REQUESTED') && (
          <Link href={`/app/powerbrief/${brandId}/ugc-pipeline/scripts/${script.id}`} className="w-full">
            <Button variant="outline" className="w-full justify-between">
              View Script
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        )}
        
        {/* Consolidated Edit Script button that appears for REVISION_REQUESTED status */}
        {script.status === 'REVISION_REQUESTED' && (
          <Button variant="outline" className="w-full" onClick={handleEditScript}>
            <PenSquare className="h-4 w-4 mr-2" />
            Edit Script
          </Button>
        )}
      </CardFooter>

      {/* Contract Template Selection Dialog */}
      <Dialog open={showSendContractDialog} onOpenChange={setShowSendContractDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Contract for Creator</DialogTitle>
            <DialogDescription>
              This will open the contracts tab where you can create and send a contract to the creator.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800 font-medium mb-2">Quick Contract Creation</p>
              <p className="text-sm text-blue-700">
                You will be redirected to the contracts tab where you can:
              </p>
              <ul className="text-sm text-blue-700 mt-2 ml-4 list-disc">
                <li>Select or create a contract template</li>
                <li>Add the creator details</li>
                <li>Send the contract for digital signature</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowSendContractDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSendContract}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Contracts Tab
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
} 