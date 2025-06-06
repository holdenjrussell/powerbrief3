'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Button,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  Input,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Alert,
  AlertDescription,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui";
import { 
  ArrowLeft, 
  Mail, 
  Send, 
  Clock, 
  Search, 
  User,
  MessageSquare,
  Plus,
  MoreVertical,
  Archive,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Settings,
  Zap
} from "lucide-react";
import { useAuth } from 'src/hooks/useAuth';
import { getBrandById } from 'src/lib/services/powerbriefService';
import { Brand } from 'src/lib/types/powerbrief';
import AdvancedEmailInbox from 'src/components/ugc/AdvancedEmailInbox';

// Helper to unwrap params safely
type ParamsType = { brandId: string };

export default function EmailInboxPage({ params }: { params: ParamsType | Promise<ParamsType> }) {
  const { user } = useAuth();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Unwrap params using React.use()
  const unwrappedParams = params instanceof Promise ? React.use(params) : params;
  const { brandId } = unwrappedParams;

  useEffect(() => {
    const fetchBrandData = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const brandData = await getBrandById(brandId);
        setBrand(brandData);
      } catch (err: unknown) {
        console.error('Failed to fetch brand data:', err);
        setError('Failed to fetch brand data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchBrandData();
  }, [user?.id, brandId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !brand) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || 'Brand not found.'}
          </AlertDescription>
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
    <div className="p-6 h-screen flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link href={`/app/powerbrief/${brandId}/ugc-pipeline`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="ml-4">
            <h1 className="text-2xl font-bold">Creator Inbox</h1>
            <p className="text-gray-600">{brand.name}</p>
          </div>
        </div>
      </div>
      
      <div className="flex-1">
        <AdvancedEmailInbox 
          brandId={brand.id}
          brandName={brand.name}
        />
      </div>
    </div>
  );
} 