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
        async function loadData() {
            console.time('GlobalContext:loadData');
            
            try {
                const supabase = await createSPASassClient();
                const client = supabase.getSupabaseClient();

                // Check if we have a cached session first
                const { data: { session } } = await client.auth.getSession();
                console.log('Session check:', session ? 'found' : 'none');

                if (session?.user) {
                    // We have a session, use it directly
                    setUser({
                        email: session.user.email!,
                        id: session.user.id,
                        registered_at: new Date(session.user.created_at)
                    });
                } else {
                    // No session, explicitly check auth state
                    const { data: { user: authUser } } = await client.auth.getUser();
                    
                    if (authUser) {
                        setUser({
                            email: authUser.email!,
                            id: authUser.id,
                            registered_at: new Date(authUser.created_at)
                        });
                    } else {
                    setUser(null);
                    }
                }

            } catch (error) {
                console.error('Error loading user data:', error);
                setUser(null);
            } finally {
                setLoading(false);
                console.timeEnd('GlobalContext:loadData');
            }
        }

        loadData();
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