import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ClientType, SassClient } from "@/lib/supabase/unified";
export async function createSSRClient() {
    const cookieStore = await cookies();
    return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
        cookies: {
            getAll() {
                return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
                }
                catch (_a) {
                    // The `setAll` method was called from a Server Component.
                    // This can be ignored if you have middleware refreshing
                    // user sessions.
                }
            },
        }
    });
}
export async function createSSRSassClient() {
    const client = await createSSRClient();
    return new SassClient(client, ClientType.SERVER);
}
