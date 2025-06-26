'use client';

import React from 'react';
import { useTeam } from '@/lib/context/TeamContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { Users } from 'lucide-react';

export default function TeamSelector() {
  const { teams, selectedTeam, setSelectedTeam, loading } = useTeam();

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Users className="h-4 w-4" />
        <span>Loading teams...</span>
      </div>
    );
  }

  if (teams.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Users className="h-4 w-4 text-gray-600" />
      <Select
        value={selectedTeam?.id || 'all'}
        onValueChange={(value) => {
          if (value === 'all') {
            setSelectedTeam(null);
          } else {
            const team = teams.find(t => t.id === value);
            if (team) setSelectedTeam(team);
          }
        }}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select a team" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Teams</SelectItem>
          {teams.map((team) => (
            <SelectItem key={team.id} value={team.id}>
              {team.name}
              {team.is_default && ' (Default)'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
} 