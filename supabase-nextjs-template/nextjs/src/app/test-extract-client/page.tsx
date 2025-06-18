"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function TestExtractClientPage() {
  const [url, setUrl] = useState('https://example.com');
  const [brandId, setBrandId] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testAuth = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-auth-browser');
      const data = await response.text();
      setResult(`AUTH TEST:\n${data}`);
    } catch (error) {
      setResult(`AUTH ERROR: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testExtract = async () => {
    if (!brandId) {
      setResult('ERROR: Please enter a Brand ID');
      return;
    }

    setLoading(true);
    try {
      console.log('Testing extract with:', { url, brandId });
      
      const response = await fetch('/api/onesheet/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url, 
          brandId,
          crawlLinks: false,
          maxPages: 1
        }),
      });

      const data = await response.text();
      
      if (!response.ok) {
        setResult(`EXTRACT ERROR ${response.status}:\n${data}`);
        return;
      }

      const parsed = JSON.parse(data);
      setResult(`EXTRACT SUCCESS:\n${JSON.stringify(parsed, null, 2)}`);
      
    } catch (error) {
      setResult(`EXTRACT ERROR: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testExtractV2 = async () => {
    if (!brandId) {
      setResult('ERROR: Please enter a Brand ID');
      return;
    }

    setLoading(true);
    try {
      // First, get the user's access token from the Supabase client
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setResult('ERROR: No access token found. Please log in.');
        return;
      }

      console.log('Testing extract v2 with token...');
      
      const response = await fetch('/api/onesheet/extract-v2', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          url, 
          brandId,
          crawlLinks: false,
          maxPages: 1
        }),
      });

      const data = await response.text();
      
      if (!response.ok) {
        setResult(`EXTRACT V2 ERROR ${response.status}:\n${data}`);
        return;
      }

      const parsed = JSON.parse(data);
      setResult(`EXTRACT V2 SUCCESS:\n${JSON.stringify(parsed, null, 2)}`);
      
    } catch (error) {
      setResult(`EXTRACT V2 ERROR: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Test Extract API (Client-Side)</h1>
      
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">URL to test:</label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Brand ID:</label>
          <Input
            value={brandId}
            onChange={(e) => setBrandId(e.target.value)}
            placeholder="Get this from your OneSheet URL: /powerbrief/[BRAND_ID]/onesheet"
          />
          <p className="text-xs text-gray-600 mt-1">
            Find this in your browser URL when viewing OneSheet
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={testAuth}
            disabled={loading}
            variant="outline"
          >
            {loading ? 'Testing...' : 'Test Auth'}
          </Button>
          
          <Button
            onClick={testExtract}
            disabled={loading || !brandId}
            variant="outline"
          >
            {loading ? 'Testing...' : 'Test Extract (Original)'}
          </Button>
          
          <Button
            onClick={testExtractV2}
            disabled={loading || !brandId}
          >
            {loading ? 'Testing...' : 'Test Extract V2 (Fixed)'}
          </Button>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">Result:</label>
        <Textarea
          value={result}
          readOnly
          className="min-h-[400px] font-mono text-sm"
          placeholder="Test results will appear here..."
        />
      </div>
      
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">Instructions:</h3>
        <ol className="text-sm text-blue-800 space-y-1">
          <li>1. Make sure you're logged into the application</li>
          <li>2. Get your Brand ID from the OneSheet URL</li>
          <li>3. Click "Test Auth" first to verify authentication</li>
          <li>4. If auth works, click "Test Extract" to test the extraction</li>
        </ol>
      </div>
    </div>
  );
} 