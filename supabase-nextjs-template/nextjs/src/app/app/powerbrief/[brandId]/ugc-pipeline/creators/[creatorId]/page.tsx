'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Alert,
  AlertDescription,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Badge,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui";
import { ArrowLeft, Loader2, PenLine, User, AtSign, LinkIcon, Film, MapPin, Package, Trash2 } from "lucide-react";
import { useAuth } from '@/hooks/useAuth';
import { getBrandById } from '@/lib/services/powerbriefService';
import { getUgcCreatorById, getUgcCreatorScripts, updateUgcCreator, deleteUgcCreator } from '@/lib/services/ugcCreatorService';
import { 
  UgcCreator, 
  UgcCreatorScript, 
  UGC_CREATOR_ONBOARDING_STATUSES,
  UGC_CREATOR_CONTRACT_STATUSES
} from '@/lib/types/ugcCreator';
import { ScriptCard } from '@/components/ugc-creator';
import { Brand } from '@/lib/types/powerbrief';
import CreatorEmailThreads from '@/components/ugc/CreatorEmailThreads';

// Helper to unwrap params safely
type ParamsType = { brandId: string; creatorId: string };

export default function CreatorDetailPage({ params }: { params: ParamsType | Promise<ParamsType> }) {
  const { user } = useAuth();
  const router = useRouter();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [creator, setCreator] = useState<UgcCreator | null>(null);
  const [scripts, setScripts] = useState<UgcCreatorScript[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('info');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Unwrap params using React.use()
  const unwrappedParams = params instanceof Promise ? React.use(params) : params;
  const { brandId, creatorId } = unwrappedParams;

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Fetch brand data
        const brandData = await getBrandById(brandId);
        setBrand(brandData);
        
        // Fetch creator data
        const creatorData = await getUgcCreatorById(creatorId);
        setCreator(creatorData);
        
        // Fetch creator scripts
        const scriptsData = await getUgcCreatorScripts(creatorId);
        setScripts(scriptsData);
      } catch (err: unknown) {
        console.error('Failed to fetch data:', err);
        setError('Failed to fetch creator data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id, brandId, creatorId]);

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
  
  // Handle status update
  const handleStatusChange = async (newStatus: string) => {
    if (!creator) return;
    
    try {
      setIsUpdatingStatus(true);
      
      const updatedCreator = await updateUgcCreator({
        id: creator.id,
        status: newStatus
      });
      
      setCreator(updatedCreator);
    } catch (error) {
      console.error('Error updating creator status:', error);
      setError('Failed to update creator status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };
  
  // Handle contract status update
  const handleContractStatusChange = async (newStatus: string) => {
    if (!creator) return;
    
    try {
      setIsUpdatingStatus(true);
      
      const updatedCreator = await updateUgcCreator({
        id: creator.id,
        contract_status: newStatus
      });
      
      setCreator(updatedCreator);
    } catch (error) {
      console.error('Error updating creator contract status:', error);
      setError('Failed to update creator contract status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle creator deletion
  const handleDeleteCreator = async () => {
    if (!creator) return;
    
    try {
      setIsDeleting(true);
      
      // Delete the creator
      await deleteUgcCreator(creator.id);
      
      // Close dialog and redirect to UGC pipeline page
      setShowDeleteDialog(false);
      router.push(`/app/powerbrief/${brandId}/ugc-pipeline`);
    } catch (error) {
      console.error('Error deleting creator:', error);
      setError('Failed to delete creator');
      setShowDeleteDialog(false);
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!brand || !creator) {
    return (
      <div className="p-6">
        <Alert>
          <AlertDescription>Creator or brand not found.</AlertDescription>
        </Alert>
        <Link href={`/app/powerbrief/${brandId}/ugc-pipeline`}>
          <Button className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to UGC Pipeline
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link href={`/app/powerbrief/${brandId}/ugc-pipeline`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold ml-4">{creator.name}</h1>
        </div>
        
        <div className="flex gap-2">
          {creator.name !== 'To Be Determined' && (
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
          <Link href={`/app/powerbrief/${brandId}/ugc-pipeline/creators/${creatorId}/edit`}>
            <Button variant="outline" size="sm">
              <PenLine className="h-4 w-4 mr-2" />
              Edit Creator
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Creator</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this creator? This action cannot be undone 
              and will also delete all associated scripts and data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteCreator}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Creator
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {error && (
        <Alert className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Tabs
        defaultValue="info"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="mb-6">
          <TabsTrigger value="info">Creator Info</TabsTrigger>
          <TabsTrigger value="scripts">Scripts ({scripts.length})</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
        </TabsList>
        
        <TabsContent value="info">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Creator Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <div className="mt-1">
                      <Select 
                        value={creator.status || 'New Creator Submission'} 
                        onValueChange={handleStatusChange}
                        disabled={isUpdatingStatus}
                      >
                        <SelectTrigger className="h-8">
                          <Badge variant={getStatusVariant(creator.status)}>
                            {creator.status || 'New Creator Submission'}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Creator Status</SelectLabel>
                            {UGC_CREATOR_ONBOARDING_STATUSES.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Contract Status</p>
                    <div className="mt-1">
                      <Select 
                        value={creator.contract_status || 'not signed'} 
                        onValueChange={handleContractStatusChange}
                        disabled={isUpdatingStatus}
                      >
                        <SelectTrigger className="w-[180px]">
                          <div className="flex items-center">
                            <Badge variant={getContractStatusVariant(creator.contract_status)} className="mr-2">
                              {creator.contract_status || 'not signed'}
                            </Badge>
                            <SelectValue />
                          </div>
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
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Gender</p>
                    <p className="text-lg">{creator.gender || 'Not specified'}</p>
                  </div>
                  {creator.per_script_fee && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Per Script Fee</p>
                      <p className="text-lg">${creator.per_script_fee}</p>
                    </div>
                  )}
                  {creator.contacted_by && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Contacted By</p>
                      <p className="text-lg">{creator.contacted_by}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AtSign className="h-5 w-5 mr-2" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {creator.email && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Email</p>
                      <p className="text-lg">{creator.email}</p>
                    </div>
                  )}
                  {creator.phone_number && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Phone</p>
                      <p className="text-lg">{creator.phone_number}</p>
                    </div>
                  )}
                  {creator.instagram_handle && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Instagram</p>
                      <p className="text-lg">@{creator.instagram_handle}</p>
                    </div>
                  )}
                  {creator.tiktok_handle && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">TikTok</p>
                      <p className="text-lg">@{creator.tiktok_handle}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Address Card */}
            {(creator.address_line1 || creator.city || creator.state || creator.country) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MapPin className="h-5 w-5 mr-2" />
                    Address
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {creator.address_line1 && (
                      <p>{creator.address_line1}</p>
                    )}
                    {creator.address_line2 && (
                      <p>{creator.address_line2}</p>
                    )}
                    {(creator.city || creator.state || creator.zip) && (
                      <p>
                        {creator.city && `${creator.city}, `}
                        {creator.state}
                        {creator.zip && ` ${creator.zip}`}
                      </p>
                    )}
                    {creator.country && (
                      <p>{creator.country}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Products Card */}
            {creator.products && creator.products.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Package className="h-5 w-5 mr-2" />
                    Products
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(creator.products) && creator.products.map((product, index) => (
                      <div key={index} className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm">
                        {product}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {creator.portfolio_link && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <LinkIcon className="h-5 w-5 mr-2" />
                    Portfolio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <a 
                    href={creator.portfolio_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:underline"
                  >
                    {creator.portfolio_link}
                  </a>
                </CardContent>
              </Card>
            )}
            
            {creator.content_types && creator.content_types.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Film className="h-5 w-5 mr-2" />
                    Content Types
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(creator.content_types) && creator.content_types.map((type, index) => (
                      <div key={index} className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm">
                        {type}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Platforms Card */}
            {creator.platforms && creator.platforms.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AtSign className="h-5 w-5 mr-2" />
                    Platforms
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(creator.platforms) && creator.platforms.map((platform, index) => (
                      <div key={index} className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm">
                        {platform}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="scripts">
          <div className="mb-4 flex justify-end">
            <Link href={`/app/powerbrief/${brandId}/ugc-pipeline/creators/${creatorId}/new-script`}>
              <Button>
                <PenLine className="h-4 w-4 mr-2" />
                New Script
              </Button>
            </Link>
          </div>
          
          {scripts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scripts.map((script) => (
                <ScriptCard 
                  key={script.id} 
                  script={script} 
                  brandId={brandId}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Scripts</CardTitle>
                <CardDescription>
                  There are no scripts for this creator yet. Create a new script to get started.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={`/app/powerbrief/${brandId}/ugc-pipeline/creators/${creatorId}/new-script`}>
                  <Button variant="outline">
                    <PenLine className="h-4 w-4 mr-2" />
                    Create First Script
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="communications">
          <CreatorEmailThreads creatorId={creatorId} brandId={brandId} />
        </TabsContent>
      </Tabs>
    </div>
  );
} 