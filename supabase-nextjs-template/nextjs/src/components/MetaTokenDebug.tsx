"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface MetaTokenDebugProps {
  brandId: string;
  isMetaConnected: boolean;
}

interface TokenInfo {
  isExpired: boolean;
  expiresAt: string | null;
  daysUntilExpiration: number | null;
  hoursUntilExpiration: number | null;
  lastUpdated: string | null;
}

export default function MetaTokenDebug({ brandId, isMetaConnected }: MetaTokenDebugProps) {
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTokenInfo = async () => {
    if (!isMetaConnected || !brandId) return;

    setLoading(true);
    setError(null);

    try {
      // Use the debug brand Meta endpoint since token-status doesn't exist
      const response = await fetch(`/api/debug/brand-meta?brandId=${brandId}`);
      const data = await response.json();

      if (response.ok && data.success) {
        const expiresAt = data.brand.meta_fields_status.expires_at;
        
        let isExpired = false;
        let daysUntilExpiration = null;
        let hoursUntilExpiration = null;

        if (expiresAt) {
          const expirationDate = new Date(expiresAt);
          const now = new Date();
          const timeUntilExpiration = expirationDate.getTime() - now.getTime();
          
          isExpired = timeUntilExpiration <= 0;
          
          if (!isExpired) {
            daysUntilExpiration = Math.floor(timeUntilExpiration / (1000 * 60 * 60 * 24));
            hoursUntilExpiration = Math.floor(timeUntilExpiration / (1000 * 60 * 60));
          }
        }

        const tokenInfo: TokenInfo = {
          isExpired,
          expiresAt,
          daysUntilExpiration,
          hoursUntilExpiration,
          lastUpdated: null
        };

        setTokenInfo(tokenInfo);
      } else {
        setError(data.error || 'Failed to fetch token info');
      }
    } catch (err) {
      setError('Network error while fetching token info');
      console.error('Error fetching token info:', err);
    } finally {
      setLoading(false);
    }
  };

  const triggerRefresh = async () => {
    if (!brandId) return;

    setLoading(true);
    try {
      const response = await fetch('/api/meta/refresh-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ brandId }),
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log('Refresh result:', data);
        // Refresh the token info after successful refresh
        setTimeout(fetchTokenInfo, 1000);
      } else {
        setError(data.error || 'Failed to refresh token');
      }
    } catch (err) {
      setError('Network error during token refresh');
      console.error('Error refreshing token:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokenInfo();
  }, [brandId, isMetaConnected]);

  if (!isMetaConnected) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            Meta Token Debug
          </CardTitle>
          <CardDescription>Meta integration is not connected</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getStatusBadge = () => {
    if (!tokenInfo) return <Badge variant="secondary">Loading...</Badge>;
    
    if (tokenInfo.isExpired) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    
    if (tokenInfo.daysUntilExpiration !== null) {
      if (tokenInfo.daysUntilExpiration > 7) {
        return <Badge variant="default">Healthy</Badge>;
      } else if (tokenInfo.daysUntilExpiration > 1) {
        return <Badge variant="secondary">Expiring Soon</Badge>;
      } else {
        return <Badge variant="destructive">Critical</Badge>;
      }
    }
    
    return <Badge variant="outline">Unknown</Badge>;
  };

  const getStatusIcon = () => {
    if (!tokenInfo) return null;
    
    if (tokenInfo.isExpired) {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
    
    if (tokenInfo.daysUntilExpiration !== null) {
      if (tokenInfo.daysUntilExpiration > 7) {
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      } else {
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      }
    }
    
    return <AlertTriangle className="h-5 w-5 text-gray-500" />;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          Meta Token Debug
          {getStatusBadge()}
        </CardTitle>
        <CardDescription>
          Monitor and debug Meta access token status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
        
        {tokenInfo && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Expires At:</span>
                <p className="text-gray-600">
                  {tokenInfo.expiresAt 
                    ? new Date(tokenInfo.expiresAt).toLocaleString()
                    : 'Unknown'
                  }
                </p>
              </div>
              <div>
                <span className="font-medium">Time Until Expiration:</span>
                <p className="text-gray-600">
                  {tokenInfo.isExpired 
                    ? 'Expired'
                    : tokenInfo.daysUntilExpiration !== null
                      ? `${tokenInfo.daysUntilExpiration} days (${tokenInfo.hoursUntilExpiration} hours)`
                      : 'Unknown'
                  }
                </p>
              </div>
            </div>
            
            {tokenInfo.daysUntilExpiration !== null && tokenInfo.daysUntilExpiration < 7 && !tokenInfo.isExpired && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  Token expires within 7 days. The system will attempt automatic refresh.
                </p>
              </div>
            )}
            
            {tokenInfo.isExpired && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">
                  Token has expired. You may need to reconnect to Meta.
                </p>
              </div>
            )}
          </div>
        )}
        
        <div className="flex gap-2">
          <Button 
            onClick={fetchTokenInfo} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Info
          </Button>
          
          <Button 
            onClick={triggerRefresh} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Trigger Refresh
          </Button>
        </div>
        
        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>Debug Info:</strong></p>
          <p>• Long-lived tokens should last ~60 days</p>
          <p>• Meta automatically extends tokens when used</p>
          <p>• Refresh attempts when within 7 days of expiration</p>
          <p>• Check browser console for detailed logs</p>
        </div>
      </CardContent>
    </Card>
  );
} 