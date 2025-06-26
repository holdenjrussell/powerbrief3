'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Label,
  Input,
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui';
import { 
  Plus, 
  Edit,
  Trash2,
  Users,
  User,
  Shield,
  UserMinus,
  Building2
} from 'lucide-react';

interface Team {
  id: string;
  name: string;
  brand_id: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  _count?: {
    team_members: number;
  };
}

interface TeamMember {
  id: string;
  email: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  role?: string;
  isOwner?: boolean;
  shareId?: string;
  acceptedAt?: string;
  // Legacy fields for compatibility
  first_name?: string | null;
  last_name?: string | null;
}

interface FeatureAccess {
  key: string;
  label: string;
  has_access: boolean;
}

interface TeamManagementProps {
  brandId: string;
}

const FEATURES = [
  { key: 'powerbrief_onesheet', name: 'PowerBrief - OneSheet', category: 'PowerBrief' },
  { key: 'powerbrief_ads', name: 'PowerBrief - Ads', category: 'PowerBrief' },
  { key: 'powerbrief_web_assets', name: 'PowerBrief - Web Assets', category: 'PowerBrief' },
  { key: 'powerbrief_email', name: 'PowerBrief - Email', category: 'PowerBrief' },
  { key: 'powerbrief_sms', name: 'PowerBrief - SMS', category: 'PowerBrief' },
  { key: 'powerbrief_organic_social', name: 'PowerBrief - Organic Social', category: 'PowerBrief' },
  { key: 'powerbrief_blog', name: 'PowerBrief - Blog', category: 'PowerBrief' },
  { key: 'powerframe', name: 'PowerFrame', category: 'Tools' },
  { key: 'ugc_creator_pipeline', name: 'UGC Creator Pipeline', category: 'Tools' },
  { key: 'team_sync', name: 'Team Sync', category: 'Tools' },
  { key: 'asset_reviews', name: 'Asset Reviews', category: 'Tools' },
  { key: 'ad_ripper', name: 'Ad Ripper', category: 'Tools' },
  { key: 'ad_upload_tool', name: 'Ad Upload Tool', category: 'Tools' },
  { key: 'url_to_markdown', name: 'URL to Markdown', category: 'Tools' }
];

export default function TeamManagement({ brandId }: TeamManagementProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<TeamMember[]>([]);
  const [featureAccess, setFeatureAccess] = useState<Record<string, FeatureAccess>>({});
  const [loading, setLoading] = useState(true);
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamFormData, setTeamFormData] = useState({
    name: ''
  });

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/teams?brandId=${brandId}`);
      const data = await response.json();
      if (response.ok && data.teams) {
        setTeams(data.teams);
        if (data.teams.length > 0 && !selectedTeam) {
          setSelectedTeam(data.teams[0]);
        }
      } else {
        console.error('Failed to fetch teams:', data.error);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async (teamId: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/members`);
      const data = await response.json();
      if (response.ok && data.members) {
        setTeamMembers(data.members);
      } else {
        console.error('Failed to fetch team members:', data.error);
        setTeamMembers([]); // Set to empty array on error
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
      setTeamMembers([]); // Set to empty array on error
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const response = await fetch(`/api/brands/${brandId}/users`);
      const data = await response.json();
      if (response.ok && data.users) {
        setAvailableUsers(data.users);
      } else {
        console.error('Failed to fetch available users:', data.error);
        setAvailableUsers([]); // Set to empty array on error
      }
    } catch (error) {
      console.error('Error fetching available users:', error);
      setAvailableUsers([]); // Set to empty array on error
    }
  };

  const fetchFeatureAccess = async (teamId: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/features`);
      const data = await response.json();
      if (response.ok && data.features) {
        setFeatureAccess(data.features);
      } else {
        console.error('Failed to fetch feature access:', data.error);
        setFeatureAccess({}); // Set to empty object on error
      }
    } catch (error) {
      console.error('Error fetching feature access:', error);
      setFeatureAccess({}); // Set to empty object on error
    }
  };

  useEffect(() => {
    fetchTeams();
    fetchAvailableUsers();
  }, [brandId]);

  useEffect(() => {
    if (selectedTeam) {
      fetchTeamMembers(selectedTeam.id);
      fetchFeatureAccess(selectedTeam.id);
    }
  }, [selectedTeam]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          brandId: brandId,
          name: teamFormData.name 
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        await fetchTeams();
        setIsTeamDialogOpen(false);
        setTeamFormData({ name: '' });
      } else {
        console.error('Failed to create team:', data.error);
      }
    } catch (error) {
      console.error('Error creating team:', error);
    }
  };

  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;
    
    try {
      const response = await fetch(`/api/teams/${editingTeam.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: teamFormData.name })
      });

      const data = await response.json();
      
      if (response.ok) {
        await fetchTeams();
        setIsTeamDialogOpen(false);
        setEditingTeam(null);
        setTeamFormData({ name: '' });
      } else {
        console.error('Failed to update team:', data.error);
      }
    } catch (error) {
      console.error('Error updating team:', error);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team? This action cannot be undone.')) return;

    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchTeams();
        if (selectedTeam?.id === teamId) {
          setSelectedTeam(null);
        }
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete team');
      }
    } catch (error) {
      console.error('Error deleting team:', error);
    }
  };

  const handleAddMember = async (userId: string) => {
    if (!selectedTeam) return;

    try {
      const response = await fetch(`/api/teams/${selectedTeam.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_ids: [userId] })
      });

      if (response.ok) {
        await fetchTeamMembers(selectedTeam.id);
      } else {
        const data = await response.json();
        console.error('Failed to add team member:', data.error);
      }
    } catch (error) {
      console.error('Error adding team member:', error);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedTeam) return;

    try {
      const response = await fetch(`/api/teams/${selectedTeam.id}/members/${userId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchTeamMembers(selectedTeam.id);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to remove team member');
      }
    } catch (error) {
      console.error('Error removing team member:', error);
    }
  };

  const handleToggleFeature = async (featureKey: string, hasAccess: boolean) => {
    if (!selectedTeam) return;

    try {
      // Create features object for the API
      const updatedFeatures = { ...featureAccess };
      updatedFeatures[featureKey] = {
        key: featureKey,
        label: updatedFeatures[featureKey]?.label || featureKey,
        has_access: hasAccess
      };

      const response = await fetch(`/api/teams/${selectedTeam.id}/features`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          features: Object.fromEntries(
            Object.entries(updatedFeatures).map(([key, feature]) => [key, feature.has_access])
          )
        })
      });

      if (response.ok) {
        await fetchFeatureAccess(selectedTeam.id);
      } else {
        const data = await response.json();
        console.error('Failed to update feature access:', data.error);
      }
    } catch (error) {
      console.error('Error updating feature access:', error);
    }
  };

  const availableUsersNotInTeam = (availableUsers || []).filter(
    user => !(teamMembers || []).find(member => member.id === user.id)
  );

  const getFeatureAccess = (featureKey: string) => {
    const access = featureAccess[featureKey];
    return access ? access.has_access : true; // Default to true if not found
  };

  const getMemberName = (member: TeamMember) => {
    // Try fullName first (from new API)
    if (member.fullName) {
      return member.fullName;
    }
    // Fall back to first_name/last_name (legacy)
    if (member.first_name && member.last_name) {
      return `${member.first_name} ${member.last_name}`;
    }
    // Default to email
    return member.email;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading teams...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Team Management</h2>
          <p className="text-gray-600">Manage teams, members, and feature access</p>
        </div>
        <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="flex items-center gap-2"
              onClick={() => {
                setEditingTeam(null);
                setTeamFormData({ name: '' });
              }}
            >
              <Plus className="h-4 w-4" />
              New Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTeam ? 'Edit Team' : 'Create New Team'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={editingTeam ? handleUpdateTeam : handleCreateTeam} className="space-y-4">
              <div>
                <Label htmlFor="name">Team Name</Label>
                <Input
                  id="name"
                  value={teamFormData.name}
                  onChange={(e) => setTeamFormData({ name: e.target.value })}
                  placeholder="Enter team name"
                  required
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsTeamDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  {editingTeam ? 'Update' : 'Create'} Team
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Teams List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Teams</CardTitle>
              <CardDescription>Select a team to manage</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    onClick={() => setSelectedTeam(team)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors cursor-pointer ${
                      selectedTeam?.id === team.id ? 'bg-primary-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{team.name}</div>
                        <div className="text-sm text-gray-500">
                          {team._count?.team_members || 0} members
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {team.is_default && (
                          <Badge variant="secondary">Default</Badge>
                        )}
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTeam(team);
                              setTeamFormData({ name: team.name });
                              setIsTeamDialogOpen(true);
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          {!team.is_default && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTeam(team.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Details */}
        <div className="md:col-span-2">
          {selectedTeam ? (
            <Tabs defaultValue="members" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="members" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Members
                </TabsTrigger>
                <TabsTrigger value="features" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Feature Access
                </TabsTrigger>
              </TabsList>

              <TabsContent value="members" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>Manage who has access to {selectedTeam.name}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Current Members */}
                    <div className="space-y-2 mb-4">
                      {teamMembers.map((member) => (
                        <div key={member.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                              <User className="h-4 w-4 text-primary-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{getMemberName(member)}</div>
                              <div className="text-sm text-gray-500">{member.email}</div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMember(member.id)}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    {/* Add Members */}
                    {availableUsersNotInTeam.length > 0 && (
                      <div className="pt-4 border-t">
                        <Label className="text-sm text-gray-600 mb-2 block">Add Members</Label>
                        <Select onValueChange={handleAddMember}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a user to add" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableUsersNotInTeam.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                <div>
                                  <div className="font-medium">{getMemberName(user)}</div>
                                  <div className="text-sm text-gray-500">{user.email}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="features" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Feature Access</CardTitle>
                    <CardDescription>Control which features {selectedTeam.name} can access</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {Object.entries(
                        FEATURES.reduce((acc, feature) => {
                          if (!acc[feature.category]) {
                            acc[feature.category] = [];
                          }
                          acc[feature.category].push(feature);
                          return acc;
                        }, {} as Record<string, typeof FEATURES>)
                      ).map(([category, features]) => (
                        <div key={category}>
                          <h4 className="font-medium text-gray-900 mb-3">{category}</h4>
                          <div className="space-y-2">
                            {features.map((feature) => (
                              <div key={feature.key} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                                <Label htmlFor={feature.key} className="font-normal cursor-pointer">
                                  {feature.name}
                                </Label>
                                <Switch
                                  id={feature.key}
                                  checked={getFeatureAccess(feature.key)}
                                  onCheckedChange={(checked) => handleToggleFeature(feature.key, checked)}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Select a team to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}