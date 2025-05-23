import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('Meta OAuth Callback Triggered');

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (error) {
    console.error('Meta OAuth Error:', { error, errorDescription });
    // Redirect to an error page or show an error message
    // For now, just return a simple error response
    return NextResponse.json(
      { success: false, error: error, error_description: errorDescription },
      { status: 400 }
    );
  }

  if (code) {
    console.log('Meta OAuth Code Received:', code);
    // TODO:
    // 1. Verify the 'state' parameter (if you used one) to prevent CSRF.
    // 2. Exchange the authorization code for an access token.
    // 3. Store the access token securely.
    // 4. Fetch user's Meta assets (ad accounts, pages, etc.).
    // 5. Redirect the user to a success page or back to the app.

    // For now, just return a success message
    return NextResponse.json({ success: true, code }, { status: 200 });
  }

  // If neither code nor error is present, it's an unexpected situation
  console.warn('Meta OAuth Callback: No code or error received.');
  return NextResponse.json(
    { success: false, error: 'Invalid callback parameters' },
    { status: 400 }
  );
} 