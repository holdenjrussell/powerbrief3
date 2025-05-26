"use client";

import { useEffect, useState } from 'react';
import { toast } from '@/components/ui/use-toast';

interface MetaTokenManagerProps {
  brandId: string;
  isMetaConnected: boolean;
}

export default function MetaTokenManager({ brandId, isMetaConnected }: MetaTokenManagerProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Function to check and refresh token if needed
  const checkAndRefreshToken = async () => {
    if (!isMetaConnected || !brandId || isRefreshing) {
      return;
    }

    try {
      setIsRefreshing(true);
      
      const response = await fetch('/api/meta/refresh-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ brandId }),
      });

      const data: { message?: string; daysUntilExpiration?: number; error?: string } = await response.json();

      if (response.ok) {
        if (data.message === 'Token refreshed successfully') {
          console.log('Meta token refreshed successfully');
          const daysText = data.daysUntilExpiration ? `${data.daysUntilExpiration} more days` : 'an extended period';
          toast({
            title: 'Meta Token Refreshed',
            description: `Your Meta integration has been automatically renewed for ${daysText}.`,
            duration: 5000,
          });
        } else {
          console.log('Meta token is still valid:', data.message);
        }
      } else {
        console.error('Failed to refresh Meta token:', data.error);
        
        // Only show error toast for actual failures, not "token still valid" responses
        if (data.error !== 'Token is still valid, no refresh needed') {
          toast({
            title: 'Meta Token Refresh Failed',
            description: 'Your Meta integration may expire soon. Please reconnect if you experience issues.',
            variant: 'destructive',
            duration: 8000,
          });
        }
      }
    } catch (error) {
      console.error('Error checking Meta token:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Check token on component mount and when Meta connection status changes
  useEffect(() => {
    if (isMetaConnected && brandId) {
      // Initial check after a short delay
      const timer = setTimeout(() => {
        checkAndRefreshToken();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isMetaConnected, brandId]);

  // Set up periodic token refresh checks (every 6 hours)
  useEffect(() => {
    if (!isMetaConnected || !brandId) {
      return;
    }

    const interval = setInterval(() => {
      checkAndRefreshToken();
    }, 6 * 60 * 60 * 1000); // 6 hours in milliseconds

    return () => clearInterval(interval);
  }, [isMetaConnected, brandId]);

  // Manual refresh function that can be called from parent components
  const manualRefresh = async () => {
    await checkAndRefreshToken();
  };

  // Expose manual refresh function via ref or callback
  useEffect(() => {
    // Store the manual refresh function on the window object for debugging
    if (typeof window !== 'undefined') {
      (window as typeof window & { refreshMetaToken?: () => Promise<void> }).refreshMetaToken = manualRefresh;
    }
  }, []);

  // This component doesn't render anything visible
  return null;
} 