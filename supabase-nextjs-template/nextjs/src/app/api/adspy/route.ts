import { NextRequest, NextResponse } from 'next/server';
import { 
  searchAdSpy, 
  storeAdSpyCredentials,
  getValidAdSpyToken,
  saveAdSpySearch,
  downloadAdSpyAd,
  testAdSpyConnection,
  type AdSpyCredentials,
  type AdSpySearchParams 
} from '@/lib/services/adspyService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, brandId, userId } = body;

    switch (action) {
      case 'authenticate': {
        const { credentials }: { credentials: AdSpyCredentials } = body;
        
        try {
          console.log('Testing AdSpy credentials...');
          
          // Use the test function for better error handling
          const testResult = await testAdSpyConnection(credentials);
          
          if (!testResult.success) {
            return NextResponse.json({ 
              success: false, 
              error: testResult.message 
            }, { status: 401 });
          }

          // If test successful, store credentials
          await storeAdSpyCredentials(brandId, credentials);
          
          return NextResponse.json({ 
            success: true, 
            message: 'AdSpy credentials stored successfully',
            subscriptionValid: testResult.subscriptionValid
          });
        } catch (error) {
          console.error('AdSpy authentication error:', error);
          return NextResponse.json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Authentication failed' 
          }, { status: 401 });
        }
      }

      case 'search': {
        const { searchParams }: { searchParams: AdSpySearchParams } = body;
        
        try {
          // Get valid token for the brand
          const token = await getValidAdSpyToken(brandId);
          if (!token) {
            return NextResponse.json({ 
              success: false, 
              error: 'No valid AdSpy credentials found. Please authenticate first.' 
            }, { status: 401 });
          }

          // Perform search
          const results = await searchAdSpy(token, searchParams);
          
          // Save search to history
          await saveAdSpySearch(brandId, userId, searchParams, undefined, results.total_count);
          
          return NextResponse.json({ 
            success: true, 
            results 
          });
        } catch (error) {
          return NextResponse.json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Search failed' 
          }, { status: 500 });
        }
      }

      case 'download': {
        const { ads } = body;
        
        try {
          const results = [];
          
          for (const ad of ads) {
            try {
              await downloadAdSpyAd(brandId, userId, ad);
              results.push({ adId: ad.id, status: 'success' });
            } catch (error) {
              console.error(`Failed to download ad ${ad.id}:`, error);
              results.push({ 
                adId: ad.id, 
                status: 'error', 
                error: error instanceof Error ? error.message : 'Download failed' 
              });
            }
          }
          
          return NextResponse.json({ 
            success: true, 
            results 
          });
        } catch (error) {
          return NextResponse.json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Download failed' 
          }, { status: 500 });
        }
      }

      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid action' 
        }, { status: 400 });
    }
  } catch (error) {
    console.error('AdSpy API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 