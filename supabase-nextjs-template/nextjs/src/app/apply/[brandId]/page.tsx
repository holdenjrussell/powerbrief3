'use client';

import React, { useState, useEffect } from 'react';
import CreatorApplicationForm from '@/components/ugc/public/CreatorApplicationForm';
import { Loader2 } from 'lucide-react';

interface PageProps {
  params: { brandId: string } | Promise<{ brandId: string }>;
}

export default function CreatorApplicationPage({ params }: PageProps) {
  const [brandId, setBrandId] = useState<string>('');
  const [paramsPending, setParamsPending] = useState(true);

  useEffect(() => {
    const unwrapParams = async () => {
      const resolvedParams = await Promise.resolve(params);
      setBrandId(resolvedParams.brandId);
      setParamsPending(false);
    };
    
    unwrapParams();
  }, [params]);

  // Don't render anything until params are resolved
  if (paramsPending || !brandId) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <CreatorApplicationForm 
        brandId={brandId}
      />
    </div>
  );
} 