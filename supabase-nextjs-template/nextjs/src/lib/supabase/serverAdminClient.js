import { createServerClient } from '@supabase/ssr';
export async function createServerAdminClient() {
    return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.PRIVATE_SUPABASE_SERVICE_KEY, {
        cookies: {
            getAll: () => [],
            setAll: () => { },
        },
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
        db: {
            schema: 'public'
        },
    });
}
