'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Plus, Loader2 } from "lucide-react";
import { useAuth } from '@/hooks/useAuth';
import { getBrandById } from '@/lib/services/powerbriefService';
import { 
  getUgcCreators, 
  createUgcCreator, 
  getUgcCreatorScriptsByConceptStatus 
} from '@/lib/services/ugcCreatorService';
import { UgcCreator, UgcCreatorScript, UGC_CREATOR_SCRIPT_CONCEPT_STATUSES } from '@/lib/types/ugcCreator';
import CreatorCard from '@/components/ugc-creator/CreatorCard';
import ScriptCard from '@/components/ugc-creator/ScriptCard';

export default function UgcPipelinePage({ params }: { params: { brandId: string } }) {
  const { user } = useAuth();
  const router = useRouter();
  const [brand, setBrand] = useState<any>(null);
  const [creators, setCreators] = useState<UgcCreator[]>([]);
  const [scripts, setScripts] = useState<UgcCreatorScript[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'creator' | 'concept'>('creator');
  const [activeStatus, setActiveStatus] = useState<string>(UGC_CREATOR_SCRIPT_CONCEPT_STATUSES[0]);
  const [showNewCreatorDialog, setShowNewCreatorDialog] = useState(false);
  const [newCreatorName, setNewCreatorName] = useState('');
  const [creatingCreator, setCreatingCreator] = useState(false);

  useEffect(() => {
    const fetchBrandData = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Fetch brand data
        const brandData = await getBrandById(params.brandId);
        setBrand(brandData);
        
        // Fetch creators
        const creatorData = await getUgcCreators(params.brandId);
        setCreators(creatorData);
        
        // Fetch scripts based on view and status
        if (activeView === 'concept') {
          const scriptsData = await getUgcCreatorScriptsByConceptStatus(params.brandId, activeStatus);
          setScripts(scriptsData);
        }
      } catch (err: any) {
        console.error('Failed to fetch data:', err);
        setError('Failed to fetch data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchBrandData();
  }, [user?.id, params.brandId, activeView, activeStatus]);

  const handleCreateCreator = async () => {
    if (!user?.id || !brand || !newCreatorName.trim()) return;
    
    try {
      setCreatingCreator(true);
      
      const newCreator = await createUgcCreator({
        brand_id: brand.id,
        user_id: user.id,
        name: newCreatorName.trim(),
        status: 'Active',
        contract_status: 'not signed'
      });
      
      setCreators(prev => [newCreator, ...prev]);
      setNewCreatorName('');
      setShowNewCreatorDialog(false);
      
      // Navigate to the new creator's page
      router.push(`/app/powerbrief/${brand.id}/ugc-pipeline/creators/${newCreator.id}`);
    } catch (err: any) {
      console.error('Failed to create creator:', err);
      setError('Failed to create creator. Please try again.');
    } finally {
      setCreatingCreator(false);
    }
  };

  const handleViewChange = (view: 'creator' | 'concept') => {
    setActiveView(view);
    if (view === 'concept') {
      setActiveStatus(UGC_CREATOR_SCRIPT_CONCEPT_STATUSES[0]);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="p-6">
        <Alert>
          <AlertDescription>Brand not found.</AlertDescription>
        </Alert>
        <Link href="/app/powerbrief">
          <Button className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Brands
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{brand.name} - UGC Creator Pipeline</h1>
          <p className="text-gray-500">Manage your UGC creators and their assignments</p>
        </div>
        
        <Dialog open={showNewCreatorDialog} onOpenChange={setShowNewCreatorDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Creator
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Creator</DialogTitle>
              <DialogDescription>
                Create a new UGC creator to manage their scripts and content.
              </DialogDescription>
            </DialogHeader>
            
            <div className="my-4">
              <Label htmlFor="creator-name">Creator Name</Label>
              <Input
                id="creator-name"
                value={newCreatorName}
                onChange={(e) => setNewCreatorName(e.target.value)}
                placeholder="Enter creator name"
              />
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowNewCreatorDialog(false)}
                disabled={creatingCreator}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateCreator}
                disabled={creatingCreator || !newCreatorName.trim()}
              >
                {creatingCreator ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Creator'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {error && (
        <Alert className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Tabs
        defaultValue="creator"
        value={activeView}
        onValueChange={(value) => handleViewChange(value as 'creator' | 'concept')}
        className="w-full"
      >
        <TabsList className="mb-6">
          <TabsTrigger value="creator">Creator View</TabsTrigger>
          <TabsTrigger value="concept">Concept View</TabsTrigger>
        </TabsList>
        
        <TabsContent value="creator">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {creators.length > 0 ? (
              creators.map((creator) => (
                <CreatorCard 
                  key={creator.id} 
                  creator={creator} 
                  brandId={params.brandId} 
                />
              ))
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>No Creators</CardTitle>
                  <CardDescription>
                    You haven't added any UGC creators yet. Click the "New Creator" button to get started.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    onClick={() => setShowNewCreatorDialog(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Creator
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="concept">
          <div className="mb-6">
            <Tabs
              defaultValue={UGC_CREATOR_SCRIPT_CONCEPT_STATUSES[0]}
              value={activeStatus}
              onValueChange={setActiveStatus}
              className="w-full"
            >
              <TabsList className="flex flex-wrap">
                {UGC_CREATOR_SCRIPT_CONCEPT_STATUSES.map((status) => (
                  <TabsTrigger key={status} value={status}>
                    {status}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              <div className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {scripts.length > 0 ? (
                    scripts.map((script) => (
                      <ScriptCard 
                        key={script.id} 
                        script={script} 
                        brandId={params.brandId} 
                      />
                    ))
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle>No Scripts</CardTitle>
                        <CardDescription>
                          There are no scripts in the "{activeStatus}" status.
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  )}
                </div>
              </div>
            </Tabs>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 