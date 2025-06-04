'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { acceptBrandShareInvitation } from '@/lib/services/brandSharingService';
import { createSPAClient } from '@/lib/supabase/client';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

interface PageProps {
  params: Promise<{
    token: string;
  }>;
}

export default function AcceptBrandInvitePage({ params }: PageProps) {
  const resolvedParams = use(params);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [requiresAuth, setRequiresAuth] = useState(false);
  const router = useRouter();
  const supabase = createSPAClient();

  useEffect(() => {
    checkAuthAndAcceptInvitation();
  }, [resolvedParams.token]);

  const checkAuthAndAcceptInvitation = async () => {
    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // User needs to sign in or sign up first
        setRequiresAuth(true);
        setLoading(false);
        return;
      }

      // Try to accept the invitation
      const result = await acceptBrandShareInvitation(resolvedParams.token);
      
      if (result.success) {
        setSuccess(true);
        // Redirect to the brand page after a short delay
        setTimeout(() => {
          if (result.brand_id) {
            router.push(`/app/powerbrief/${result.brand_id}`);
          } else {
            router.push('/app/powerbrief');
          }
        }, 2000);
      } else {
        setError(result.error || 'Failed to accept invitation');
      }
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = () => {
    // Store the invitation token in session storage so we can use it after auth
    sessionStorage.setItem('pendingInvitationToken', resolvedParams.token);
    router.push(`/auth/login?redirect=/app/brands/invite/${resolvedParams.token}`);
  };

  const handleSignUp = () => {
    // Store the invitation token in session storage so we can use it after auth
    sessionStorage.setItem('pendingInvitationToken', resolvedParams.token);
    router.push(`/auth/register?redirect=/app/brands/invite/${resolvedParams.token}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Processing invitation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (requiresAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign in Required</CardTitle>
            <CardDescription>
              You need to sign in or create an account to accept this brand invitation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleSignIn} className="w-full">
              Sign In
            </Button>
            <Button onClick={handleSignUp} variant="outline" className="w-full">
              Create Account
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <XCircle className="h-6 w-6 text-destructive" />
              <CardTitle>Invitation Error</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Link href="/app/powerbrief">
              <Button className="w-full">Go to Brands</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <CardTitle>Invitation Accepted!</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You now have access to the shared brand. Redirecting...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
} 