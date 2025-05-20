import { createBrowserClient } from '@supabase/ssr';
import { ClientType, SassClient } from "@/lib/supabase/unified";
export function createSPAClient() {
    return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
export async function createSPASassClient() {
    const client = createSPAClient();
    return new SassClient(client, ClientType.SPA);
}
