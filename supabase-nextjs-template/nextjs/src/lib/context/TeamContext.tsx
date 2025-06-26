'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createSPAClient } from '@/lib/supabase/client';
import { useGlobal } from './GlobalContext';
import { useBrand } from './BrandContext';

interface Team {
  id: string;
  name: string;
  brand_id: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface TeamFeatureAccess {
  [key: string]: boolean;
}

interface TeamContextValue {
  teams: Team[];
  selectedTeam: Team | null;
  setSelectedTeam: (team: Team | null) => void;
  loading: boolean;
  error: string | null;
  featureAccess: TeamFeatureAccess;
  hasFeatureAccess: (featureKey: string) => boolean;
  isTeamMember: (userId: string) => boolean;
  teamMembers: string[]; // Array of user IDs
}

const TeamContext = createContext<TeamContextValue | undefined>(undefined);

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const { user } = useGlobal();
  const { selectedBrand } = useBrand();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [featureAccess, setFeatureAccess] = useState<TeamFeatureAccess>({});
  const [teamMembers, setTeamMembers] = useState<string[]>([]);

  // Fetch teams for the selected brand
  useEffect(() => {
    const fetchTeams = async () => {
      if (!selectedBrand?.id || !user?.id) {
        setTeams([]);
        setSelectedTeam(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const supabase = createSPAClient();

        // Get teams for the brand where user is a member
        const { data: userTeams, error: teamsError } = await supabase
          .from('team_members')
          .select(`
            team_id,
            teams!inner(
              id,
              name,
              brand_id,
              is_default,
              created_at,
              updated_at
            )
          `)
          .eq('user_id', user.id)
          .eq('teams.brand_id', selectedBrand.id);

        if (teamsError) throw teamsError;

        const teams = userTeams?.map(ut => ut.teams).filter(Boolean) || [];
        setTeams(teams);

        // Set default team or first team
        const defaultTeam = teams.find(t => t.is_default);
        setSelectedTeam(defaultTeam || teams[0] || null);
      } catch (err) {
        console.error('Error fetching teams:', err);
        setError('Failed to load teams');
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, [selectedBrand?.id, user?.id]);

  // Fetch feature access and team members for selected team
  useEffect(() => {
    const fetchTeamData = async () => {
      if (!selectedTeam?.id) {
        setFeatureAccess({});
        setTeamMembers([]);
        return;
      }

      try {
        const supabase = createSPAClient();

        // Fetch feature access
        const { data: features, error: featuresError } = await supabase
          .from('team_feature_access')
          .select('feature_key, has_access')
          .eq('team_id', selectedTeam.id);

        if (featuresError) throw featuresError;

        const access: TeamFeatureAccess = {};
        features?.forEach(f => {
          access[f.feature_key] = f.has_access;
        });
        setFeatureAccess(access);

        // Fetch team members
        const { data: members, error: membersError } = await supabase
          .from('team_members')
          .select('user_id')
          .eq('team_id', selectedTeam.id);

        if (membersError) throw membersError;

        setTeamMembers(members?.map(m => m.user_id) || []);
      } catch (err) {
        console.error('Error fetching team data:', err);
      }
    };

    fetchTeamData();
  }, [selectedTeam?.id]);

  const hasFeatureAccess = (featureKey: string): boolean => {
    // If no team is selected, default to true (no restrictions)
    if (!selectedTeam) return true;
    
    // Check feature access, default to true if not specified
    return featureAccess[featureKey] ?? true;
  };

  const isTeamMember = (userId: string): boolean => {
    return teamMembers.includes(userId);
  };

  const value: TeamContextValue = {
    teams,
    selectedTeam,
    setSelectedTeam,
    loading,
    error,
    featureAccess,
    hasFeatureAccess,
    isTeamMember,
    teamMembers
  };

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
} 