'use client';

import React, { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { useBrand } from '@/lib/context/BrandContext';
import { toast } from '@/components/ui/use-toast';

interface Team {
  id: string;
  brand_id: string;
  name: string;
  is_default: boolean;
  member_count?: number;
}

export default function TeamSelector() {
  const { selectedBrand, selectedTeam, setSelectedTeam } = useBrand();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedBrand?.id) {
      fetchTeams();
    }
  }, [selectedBrand?.id]);

  const fetchTeams = async () => {
    if (!selectedBrand?.id) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/teams?brandId=${selectedBrand.id}`);
      if (!response.ok) throw new Error('Failed to fetch teams');
      
      const data = await response.json();
      setTeams(data.teams || []);
      
      // Set default team if no team is selected
      if (!selectedTeam && data.teams?.length > 0) {
        const defaultTeam = data.teams.find((t: Team) => t.is_default) || data.teams[0];
        setSelectedTeam(defaultTeam);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast({
        title: 'Error',
        description: 'Failed to load teams',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTeamChange = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (team) {
      setSelectedTeam(team);
      toast({
        title: 'Team switched',
        description: `Now viewing ${team.name}`,
      });
    }
  };

  if (!selectedBrand) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Users className="h-4 w-4 text-gray-500" />
      <Select
        value={selectedTeam?.id || ''}
        onValueChange={handleTeamChange}
        disabled={loading || teams.length === 0}
      >
        <SelectTrigger className="w-[160px] min-w-[160px]">
          <SelectValue placeholder={loading ? 'Loading...' : 'Select team'} />
        </SelectTrigger>
        <SelectContent className="z-50 w-[200px]">
          {teams.map((team) => (
            <SelectItem key={team.id} value={team.id} className="cursor-pointer">
              <div className="flex items-center justify-between w-full">
                <span className="font-medium truncate">{team.name}</span>
                {team.is_default && (
                  <Badge variant="secondary" className="text-xs px-1 py-0 ml-2 shrink-0">
                    Default
                  </Badge>
                )}
              </div>
              {team.member_count !== undefined && (
                <div className="text-xs text-gray-500 mt-1">
                  {team.member_count} member{team.member_count !== 1 ? 's' : ''}
                </div>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}