'use client';

import { useState, useEffect } from 'react';
import { 
  shareBrandWithUser, 
  getBrandSharedUsers, 
  removeBrandShare, 
  updateBrandShareRole,
  createBrandInvitationLink
} from '@/lib/services/brandSharingService';
import { SharedUser, BrandShareRole } from '@/lib/types/brand-sharing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserPlus, Trash2, Mail, Shield, Eye, Link2, Copy, Check } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface BrandSharingManagerProps {
  brandId: string;
  brandName: string;
  isOwner: boolean;
}

export default function BrandSharingManager({ brandId, brandName, isOwner }: BrandSharingManagerProps) {
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<BrandShareRole>('viewer');
  const [inviting, setInviting] = useState(false);
  const [userToRemove, setUserToRemove] = useState<SharedUser | null>(null);
  
  // New state for invitation link functionality
  const [linkEmail, setLinkEmail] = useState('');
  const [linkRole, setLinkRole] = useState<BrandShareRole>('viewer');
  const [invitationLink, setInvitationLink] = useState('');
  const [generatingLink, setGeneratingLink] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (isOwner) {
      loadSharedUsers();
    }
  }, [brandId, isOwner]);

  const loadSharedUsers = async () => {
    try {
      setLoading(true);
      const users = await getBrandSharedUsers(brandId);
      setSharedUsers(users);
    } catch (error) {
      console.error('Error loading shared users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load shared users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail) return;

    try {
      setInviting(true);
      const result = await shareBrandWithUser({
        brand_id: brandId,
        email: inviteEmail,
        role: inviteRole,
      });

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Invitation sent successfully',
        });
        setInviteDialogOpen(false);
        setInviteEmail('');
        setInviteRole('viewer');
        loadSharedUsers();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to send invitation',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error inviting user:', error);
      toast({
        title: 'Error',
        description: 'Failed to send invitation',
        variant: 'destructive',
      });
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveUser = async (user: SharedUser) => {
    try {
      const result = await removeBrandShare(user.share_id);
      
      if (result.success) {
        toast({
          title: 'Success',
          description: 'User access removed',
        });
        loadSharedUsers();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to remove user',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error removing user:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove user',
        variant: 'destructive',
      });
    } finally {
      setUserToRemove(null);
    }
  };

  const handleUpdateRole = async (shareId: string, newRole: BrandShareRole) => {
    try {
      const result = await updateBrandShareRole(shareId, newRole);
      
      if (result.success) {
        toast({
          title: 'Success',
          description: 'User role updated',
        });
        loadSharedUsers();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update role',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update role',
        variant: 'destructive',
      });
    }
  };

  const handleGenerateInvitationLink = async () => {
    if (!linkEmail) return;

    try {
      setGeneratingLink(true);
      const result = await createBrandInvitationLink({
        brand_id: brandId,
        email: linkEmail,
        role: linkRole,
      });

      if (result.success && result.inviteUrl) {
        setInvitationLink(result.inviteUrl);
        toast({
          title: 'Success',
          description: 'Invitation link created successfully',
        });
        loadSharedUsers();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create invitation link',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error generating invitation link:', error);
      toast({
        title: 'Error',
        description: 'Failed to create invitation link',
        variant: 'destructive',
      });
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleCopyInvitationLink = async () => {
    if (!invitationLink) return;

    try {
      await navigator.clipboard.writeText(invitationLink);
      setLinkCopied(true);
      toast({
        title: 'Link Copied!',
        description: 'Invitation link copied to clipboard',
      });
      
      // Reset the copied state after 2 seconds
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast({
        title: 'Error',
        description: 'Failed to copy link to clipboard',
        variant: 'destructive',
      });
    }
  };

  const resetInviteDialog = () => {
    setInviteEmail('');
    setInviteRole('viewer');
    setLinkEmail('');
    setLinkRole('viewer');
    setInvitationLink('');
    setLinkCopied(false);
  };

  if (!isOwner) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Brand Sharing</CardTitle>
          <CardDescription>
            Only the brand owner can manage sharing settings.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Brand Sharing</CardTitle>
              <CardDescription>
                Manage who has access to this brand
              </CardDescription>
            </div>
            <Dialog open={inviteDialogOpen} onOpenChange={(open) => {
              setInviteDialogOpen(open);
              if (!open) resetInviteDialog();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite User
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Invite User to {brandName}</DialogTitle>
                  <DialogDescription>
                    Send an invitation or create a shareable link for this brand.
                  </DialogDescription>
                </DialogHeader>
                
                <Tabs defaultValue="email" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="email">
                      <Mail className="h-4 w-4 mr-2" />
                      Send Email
                    </TabsTrigger>
                    <TabsTrigger value="link">
                      <Link2 className="h-4 w-4 mr-2" />
                      Create Link
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="email" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="user@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Access Level</Label>
                      <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as BrandShareRole)}>
                        <SelectTrigger id="role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">
                            <div className="flex items-center">
                              <Eye className="h-4 w-4 mr-2" />
                              Viewer - Can view but not edit
                            </div>
                          </SelectItem>
                          <SelectItem value="editor">
                            <div className="flex items-center">
                              <Shield className="h-4 w-4 mr-2" />
                              Editor - Full access except delete
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end space-x-2 mt-4">
                      <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleInviteUser} disabled={inviting || !inviteEmail}>
                        {inviting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Mail className="h-4 w-4 mr-2" />
                            Send Invitation
                          </>
                        )}
                      </Button>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="link" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="linkEmail">Email Address (for tracking)</Label>
                      <Input
                        id="linkEmail"
                        type="email"
                        placeholder="user@example.com"
                        value={linkEmail}
                        onChange={(e) => setLinkEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="linkRole">Access Level</Label>
                      <Select value={linkRole} onValueChange={(value) => setLinkRole(value as BrandShareRole)}>
                        <SelectTrigger id="linkRole">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">
                            <div className="flex items-center">
                              <Eye className="h-4 w-4 mr-2" />
                              Viewer - Can view but not edit
                            </div>
                          </SelectItem>
                          <SelectItem value="editor">
                            <div className="flex items-center">
                              <Shield className="h-4 w-4 mr-2" />
                              Editor - Full access except delete
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {!invitationLink ? (
                      <div className="flex justify-end space-x-2 mt-4">
                        <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleGenerateInvitationLink} disabled={generatingLink || !linkEmail}>
                          {generatingLink ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            <>
                              <Link2 className="h-4 w-4 mr-2" />
                              Create Link
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Label>Invitation Link</Label>
                        <div className="flex items-center space-x-2">
                          <Input 
                            value={invitationLink} 
                            readOnly 
                            className="flex-1 text-sm"
                          />
                          <Button 
                            size="sm" 
                            onClick={handleCopyInvitationLink}
                            variant="outline"
                          >
                            {linkCopied ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Share this link with {linkEmail}. They can click it to accept the invitation.
                        </p>
                        <div className="flex justify-end">
                          <Button onClick={() => setInviteDialogOpen(false)}>
                            Done
                          </Button>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sharedUsers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              This brand hasn&apos;t been shared with anyone yet.
            </p>
          ) : (
            <div className="space-y-4">
              {sharedUsers.map((user) => (
                <div key={user.share_id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div>
                      <p className="font-medium">{user.full_name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <Badge variant={user.status === 'accepted' ? 'default' : 'secondary'}>
                      {user.status}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    {user.status === 'accepted' && (
                      <Select 
                        value={user.role} 
                        onValueChange={(value) => handleUpdateRole(user.share_id, value as BrandShareRole)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setUserToRemove(user)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!userToRemove} onOpenChange={() => setUserToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {userToRemove?.full_name}&apos;s access to this brand? 
              They will no longer be able to view or edit this brand.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => userToRemove && handleRemoveUser(userToRemove)}>
              Remove Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 