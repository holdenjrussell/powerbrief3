import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
export async function updateSession(request) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
        cookies: {
            get(name) {
                var _a;
                return (_a = request.cookies.get(name)) === null || _a === void 0 ? void 0 : _a.value;
            },
            set(name, value, options) {
                // If the cookie is updated, update the request and response
                request.cookies.set(Object.assign({ name,
                    value }, options));
                response = NextResponse.next({
                    request: {
                        headers: request.headers,
                    },
                });
                response.cookies.set(Object.assign({ name,
                    value }, options));
            },
            remove(name, options) {
                // If the cookie is removed, update the request and response
                request.cookies.set(Object.assign({ name, value: '' }, options));
                response = NextResponse.next({
                    request: {
                        headers: request.headers,
                    },
                });
                response.cookies.set(Object.assign({ name, value: '' }, options));
            },
        },
    });
    // This will refresh session if expired - required for Server Components
    // https://supabase.com/docs/guides/auth/server-side/nextjs
    await supabase.auth.getUser();
    return response;
}
