'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Label,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch
} from '@/components/ui';
import { 
  Plus, 
  Megaphone,
  Clock,
  User,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  Info,
  Globe,
  Check
} from 'lucide-react';
import { linkifyTextWithWhitespace } from './utils/linkify';
import { useBrand } from '@/lib/context/BrandContext';

interface Announcement {
  id: string;
  user_id: string;
  brand_id?: string;
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_resolved?: boolean;
  is_global?: boolean;
  target_team_ids?: string[];
  created_at: string;
  updated_at: string;
  profiles?: {
    email: string;
  };
}

interface AnnouncementsTabProps {
  brandId: string;
}

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  normal: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
};

const priorityIcons = {
  low: Info,
  normal: CheckCircle,
  high: AlertCircle,
  urgent: AlertCircle
};

export default function AnnouncementsTab({ brandId }: AnnouncementsTabProps) {
  const { selectedTeam } = useBrand();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    is_global: false
  });

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ brandId });
      if (selectedTeam) {
        params.append('teamId', selectedTeam.id);
      }
      const response = await fetch(`/api/team-sync/announcements?${params}`);
      const data = await response.json();
      if (response.ok) {
        setAnnouncements(data.announcements);
      } else {
        console.error('Failed to fetch announcements:', data.error);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [brandId, selectedTeam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const method = editingAnnouncement ? 'PUT' : 'POST';
      const body = editingAnnouncement 
        ? { ...formData, id: editingAnnouncement.id, brand_id: brandId }
        : { 
            ...formData, 
            brand_id: brandId,
            target_team_ids: formData.is_global ? [] : (selectedTeam ? [selectedTeam.id] : [])
          };

      const response = await fetch('/api/team-sync/announcements', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      
      if (response.ok) {
        await fetchAnnouncements();
        setIsDialogOpen(false);
        setEditingAnnouncement(null);
        setFormData({ title: '', content: '', priority: 'normal', is_global: false });
      } else {
        console.error('Failed to save announcement:', data.error);
      }
    } catch (error) {
      console.error('Error saving announcement:', error);
    }
  };

  const handleResolve = async (id: string, is_resolved: boolean) => {
    try {
      const response = await fetch('/api/team-sync/announcements', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_resolved })
      });

      if (response.ok) {
        await fetchAnnouncements();
      } else {
        const data = await response.json();
        console.error('Failed to update announcement:', data.error);
      }
    } catch (error) {
      console.error('Error updating announcement:', error);
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority,
      is_global: announcement.is_global || false
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    try {
      const response = await fetch(`/api/team-sync/announcements?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchAnnouncements();
      } else {
        const data = await response.json();
        console.error('Failed to delete announcement:', data.error);
      }
    } catch (error) {
      console.error('Error deleting announcement:', error);
    }
  };

  const resetForm = () => {
    setFormData({ title: '', content: '', priority: 'normal', is_global: false });
    setEditingAnnouncement(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading announcements...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Team Announcements</h2>
          <p className="text-gray-600">
            {selectedTeam 
              ? `Showing announcements for ${selectedTeam.name}`
              : 'Select a team to filter announcements'
            }
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Announcement
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingAnnouncement ? 'Edit Announcement' : 'Create New Announcement'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter announcement title"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Enter announcement content"
                  rows={4}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(value: 'low' | 'normal' | 'high' | 'urgent') => 
                    setFormData({ ...formData, priority: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_global"
                  checked={formData.is_global}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_global: checked })}
                />
                <Label htmlFor="is_global" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Make this a global announcement (visible to all teams)
                </Label>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  {editingAnnouncement ? 'Update' : 'Create'} Announcement
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Announcements List */}
      {announcements.length > 0 ? (
        <div className="space-y-4">
          {announcements.map((announcement) => {
            const PriorityIcon = priorityIcons[announcement.priority];
            return (
              <Card 
                key={announcement.id} 
                className={`hover:shadow-md transition-shadow ${announcement.is_resolved ? 'opacity-60' : ''}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 rounded-lg bg-primary-50">
                        <PriorityIcon className="h-4 w-4 text-primary-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-lg">{announcement.title}</CardTitle>
                          <Badge className={priorityColors[announcement.priority]}>
                            {announcement.priority}
                          </Badge>
                          {announcement.is_global && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              Global
                            </Badge>
                          )}
                          {announcement.is_resolved && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Check className="h-3 w-3" />
                              Resolved
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{announcement.profiles?.email || 'Team Member'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{new Date(announcement.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResolve(announcement.id, !announcement.is_resolved)}
                      >
                        {announcement.is_resolved ? (
                          <AlertCircle className="h-4 w-4" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(announcement)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(announcement.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-gray-700 whitespace-pre-wrap">{linkifyTextWithWhitespace(announcement.content)}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <Megaphone className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No announcements yet</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating your first announcement.</p>
          <div className="mt-6">
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Announcement
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 