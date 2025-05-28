import { redirect } from 'next/navigation';

export async function GET() {
  // Redirect to the actual AdRipper page
  redirect('/app/adripper');
} 