// src/lib/context/GlobalContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createSPASassClient } from '@/lib/supabase/client';


type User = {
    email: string;
    id: string;
    registered_at: Date;
};

interface GlobalContextType {
    loading: boolean;
    user: User | null;  // Add this
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export function GlobalProvider({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);  // Add this

    useEffect(() => {
        let isMounted = true;
        let retryCount = 0;
        const maxRetries = 3;

        async function loadData() {
            console.time('GlobalContext:loadData');
            
            try {
                const supabase = await createSPASassClient();
                const client = supabase.getSupabaseClient();

                // Only use getSession - it's cached and doesn't make network requests
                const { data: { session }, error: sessionError } = await client.auth.getSession();
                
                if (sessionError) {
                    console.warn('Session error:', sessionError);
                    throw sessionError;
                }

                if (!isMounted) return;

                if (session?.user) {
                    console.log('User session found:', session.user.email);
                    setUser({
                        email: session.user.email!,
                        id: session.user.id,
                        registered_at: new Date(session.user.created_at)
                    });
                } else {
                    console.log('No active session found');
                    setUser(null);
                }

            } catch (error) {
                console.error('Error loading user data:', error);
                
                // Retry logic for network failures
                if (retryCount < maxRetries && isMounted) {
                    retryCount++;
                    console.log(`Retrying auth check (${retryCount}/${maxRetries})...`);
                    setTimeout(() => {
                        if (isMounted) loadData();
                    }, 1000 * retryCount); // Exponential backoff
                    return;
                }
                
                setUser(null);
            } finally {
                if (isMounted) {
                    setLoading(false);
                    console.timeEnd('GlobalContext:loadData');
                }
            }
        }

        loadData();

        // Cleanup function
        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <GlobalContext.Provider value={{ loading, user }}>
            {children}
        </GlobalContext.Provider>
    );
}

export const useGlobal = () => {
    const context = useContext(GlobalContext);
    if (context === undefined) {
        throw new Error('useGlobal must be used within a GlobalProvider');
    }
    return context;
};