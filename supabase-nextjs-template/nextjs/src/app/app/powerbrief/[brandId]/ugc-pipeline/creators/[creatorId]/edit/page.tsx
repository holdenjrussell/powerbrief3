'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from '@/hooks/useAuth';
import { getBrandById } from '@/lib/services/powerbriefService';
import { getUgcCreatorById, updateUgcCreator } from '@/lib/services/ugcCreatorService';
import { CreatorForm } from '@/components/ugc-creator';
import { UgcCreator } from '@/lib/types/ugcCreator';
import { Brand } from '@/lib/types/powerbrief';

// Helper to unwrap params safely
type ParamsType = { brandId: string; creatorId: string };

export default function EditCreatorPage({ params }: { params: ParamsType | Promise<ParamsType> }) {
  const { user } = useAuth();
  const router = useRouter();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [creator, setCreator] = useState<UgcCreator | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
      } catch (err: unknown) {
        console.error('Failed to fetch data:', err);
        setError('Failed to fetch creator data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id, brandId, creatorId]);

  const handleUpdateCreator = async (formData: any) => {
    if (!user?.id || !creator) return;
    
    try {
      setIsSubmitting(true);
      setError(null);
      setSuccess(null);
      
      // Update creator
      await updateUgcCreator({
        id: creator.id,
        ...formData
      });
      
      setSuccess('Creator updated successfully');
      
      // Redirect after a brief delay
      setTimeout(() => {
        router.push(`/app/powerbrief/${brandId}/ugc-pipeline/creators/${creatorId}`);
      }, 1500);
    } catch (err: unknown) {
      console.error('Failed to update creator:', err);
      setError('Failed to update creator. Please try again.');
    } finally {
      setIsSubmitting(false);
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
      <div className="flex items-center mb-6">
        <Link href={`/app/powerbrief/${brandId}/ugc-pipeline/creators/${creatorId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Creator
          </Button>
        </Link>
        <h1 className="text-2xl font-bold ml-4">Edit {creator.name}</h1>
      </div>
      
      {error && (
        <Alert className="mb-4 bg-destructive/15">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="mb-4 bg-success/15">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Edit Creator Information</CardTitle>
        </CardHeader>
        <CardContent>
          <CreatorForm
            creator={creator}
            onSubmit={handleUpdateCreator}
            isSubmitting={isSubmitting}
            brandId={brandId}
          />
        </CardContent>
      </Card>
    </div>
  );
} 