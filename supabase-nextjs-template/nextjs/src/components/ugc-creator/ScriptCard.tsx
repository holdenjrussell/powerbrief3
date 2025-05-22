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
  AlertDescription
} from "@/components/ui";
import { UgcCreatorScript, UgcCreator } from '@/lib/types/ugcCreator';
import { ChevronRight, CheckCircle, AlertCircle, User, PenSquare, Trash2, Edit, Package, FileText, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Add a constant for the TBD creator ID (this is a reliable UUID that won't change)
const TBD_CREATOR_ID = '00000000-0000-0000-0000-000000000000';

interface ScriptCardProps {
  script: UgcCreatorScript;
  brandId?: string;
  showActionButtons?: boolean;
  onApprove?: (scriptId: string) => void;
  onRequestRevision?: (scriptId: string, notes: string) => void;
  onAssign?: (scriptId: string, creatorIds: string[]) => void;
  onCreatorApprove?: (scriptId: string) => void;
  onCreatorReject?: (scriptId: string, notes: string) => void;
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
  onDelete,
  creators = []
}: ScriptCardProps) {
  const router = useRouter();
  const [showRevisionDialog, setShowRevisionDialog] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedCreatorId, setSelectedCreatorId] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCreatorRejectDialog, setShowCreatorRejectDialog] = useState(false);
  const [creatorRejectionNotes, setCreatorRejectionNotes] = useState('');
  
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
              {script.status === 'CREATOR_REASSIGNMENT' || script.creator_id === TBD_CREATOR_ID ? (
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
          
          {script.status === 'CREATOR_REASSIGNMENT' && script.revision_notes && script.concept_status === 'Creator Assignment' && (
            <div className="mt-2 p-2 bg-amber-50 border-l-4 border-amber-400 rounded-md">
              <p className="text-xs font-medium text-amber-700 mb-1">Creator Rejection Notes:</p>
              <p className="text-xs text-gray-700">{script.revision_notes}</p>
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
                  <Select
                    value={selectedCreatorId}
                    onValueChange={setSelectedCreatorId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a creator" />
                    </SelectTrigger>
                    <SelectContent>
                      {creators.length > 0 ? (
                        creators.map((creator) => (
                          <SelectItem key={creator.id} value={creator.id}>
                            {creator.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-creators" disabled>
                          No creators available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowAssignDialog(false)}
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
              
              if (assignedCreator && !assignedCreator.product_shipped) {
                return (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-md mb-3">
                    <h4 className="font-medium text-amber-800 flex items-center mb-2">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Action Required
                    </h4>
                    <p className="text-sm text-amber-700 mb-2">
                      Ship product to creator before proceeding with approval/rejection.
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
                );
              }
              
              // Check for contract not signed or not sent
              if (assignedCreator && (!assignedCreator.contract_status || assignedCreator.contract_status === 'not signed')) {
                return (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md mb-3">
                    <h4 className="font-medium text-red-800 flex items-center mb-2">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Contract Required
                    </h4>
                    <p className="text-sm text-red-700 mb-2">
                      Contract must be signed before proceeding with approval/rejection.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-full border-red-200 text-red-700 hover:bg-red-100"
                      onClick={() => {
                        if (brandId) {
                          router.push(`/app/powerbrief/${brandId}/ugc-pipeline/creators/${assignedCreator.id}`);
                        }
                      }}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Update Contract Status
                    </Button>
                  </div>
                );
              }
              
              // Check for contract sent but not signed
              if (assignedCreator && assignedCreator.contract_status === 'contract sent') {
                return (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md mb-3">
                    <h4 className="font-medium text-yellow-800 flex items-center mb-2">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Contract Pending
                    </h4>
                    <p className="text-sm text-yellow-700 mb-2">
                      Contract has been sent but not yet signed. Approval/rejection should wait until contract is signed.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-full border-yellow-200 text-yellow-700 hover:bg-yellow-100"
                      onClick={() => {
                        if (brandId) {
                          router.push(`/app/powerbrief/${brandId}/ugc-pipeline/creators/${assignedCreator.id}`);
                        }
                      }}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Check Contract Status
                    </Button>
                  </div>
                );
              }
              
              return (
                <div className="flex gap-2 w-full">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex-1 text-green-600 border-green-600 hover:bg-green-50"
                    onClick={handleCreatorApproveClick}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Creator Approved
                  </Button>
                  
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
                          Provide notes on why the creator rejected the script.
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
              );
            })()}
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
    </Card>
  );
} 