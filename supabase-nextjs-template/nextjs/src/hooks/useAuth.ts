'use client';

import { useState, useEffect } from 'react';
import { createSPASassClient } from '@/lib/supabase/client';

type User = {
  id: string;
  email: string | null;
  created_at: string;
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAuthData() {
      try {
        setLoading(true);
        setError(null);
        
        const supabase = await createSPASassClient();
        const client = supabase.getSupabaseClient();
        
        // Get user data
        const { data: { user: userData }, error: userError } = await client.auth.getUser();
        
        if (userError) {
          throw userError;
        }
        
        if (userData) {
          setUser({
            id: userData.id,
            email: userData.email,
            created_at: userData.created_at
          });
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Error loading auth data:', err);
        setError(err instanceof Error ? err.message : 'An unknown authentication error occurred');
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadAuthData();
  }, []);

  return { user, loading, error };
} 