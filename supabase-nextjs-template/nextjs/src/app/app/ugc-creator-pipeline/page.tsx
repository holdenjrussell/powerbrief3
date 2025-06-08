"use client";

import React, { useEffect } from 'react';
import { useBrand } from '@/lib/context/BrandContext';
import { Card, CardContent } from '@/components/ui/card';
import { Building2 } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function UGCCreatorPipelinePage() {
    const { selectedBrand, isLoading } = useBrand();
    const router = useRouter();

    // Handle redirect in useEffect for client components
    useEffect(() => {
        if (!isLoading && selectedBrand) {
            router.replace(`/app/powerbrief/${selectedBrand.id}/ugc-pipeline`);
        }
    }, [selectedBrand, isLoading, router]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[200px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
        );
    }

    if (!selectedBrand) {
        return (
            <div className="space-y-6 p-6">
                <Card>
                    <CardContent className="p-8 text-center text-gray-500">
                        <Building2 className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No brand selected</h3>
                        <p className="max-w-md mx-auto">
                            Please select a brand from the dropdown above to access the UGC Creator Pipeline.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Show loading while redirecting
    return (
        <div className="flex justify-center items-center min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            <span className="ml-2 text-gray-600">Redirecting...</span>
        </div>
    );
} 