"use client";

import { useState } from 'react';
import { Button, Input, Textarea } from '@/components/ui';

export default function TestExtractPage() {
  const [url, setUrl] = useState('https://example.com');
  const [brandId, setBrandId] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testExtract = async () => {
    setLoading(true);
    setResult('');
    
    try {
      console.log('Testing extraction with:', { url, brandId });
      console.log('Environment check:', {
        hasGoogleApiKey: !!process.env.GOOGLE_API_KEY,
        hasGeminiApiKey: !!process.env.GEMINI_API_KEY
      });
      
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

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      const data = await response.text();
      console.log('Raw response:', data);
      
      if (!response.ok) {
        setResult(`ERROR ${response.status}: ${data}`);
        return;
      }

      const parsed = JSON.parse(data);
      setResult(JSON.stringify(parsed, null, 2));
      
    } catch (error) {
      console.error('Test error:', error);
      setResult(`ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Test Extract API</h1>
      
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
            placeholder="Enter your brand ID"
          />
        </div>
        
        <Button
          onClick={testExtract}
          disabled={loading || !url || !brandId}
        >
          {loading ? 'Testing...' : 'Test Extract'}
        </Button>
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
    </div>
  );
} 