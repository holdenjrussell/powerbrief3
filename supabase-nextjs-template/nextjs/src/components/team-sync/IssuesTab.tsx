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
  SelectValue
} from '@/components/ui';
import { 
  Plus, 
  AlertTriangle,
  Clock,
  User,
  Edit,
  Trash2,
  ArrowUp,
  ArrowDown,
  Link,
  CheckCircle,
  XCircle,
  Circle,
  CheckSquare,
  CheckSquare2
} from 'lucide-react';
import { linkifyText } from './utils/linkify';

interface Issue {
  id: string;
  user_id: string;
  brand_id?: string;
  title: string;
  description: string;
  issue_type: 'short_term' | 'long_term';
  status: 'open' | 'in_progress' | 'resolved';
  priority_order: number;
  assignee_id: string | null;
  created_at: string;
  updated_at: string;
  assignee?: { email: string };
  creator?: { email: string };
}

interface Todo {
  id: string;
  user_id: string;
  brand_id?: string;
  title: string;
  description: string;
  completed: boolean;
  due_date: string | null;
  assignee_id: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  assignee?: { email: string };
  creator?: { email: string };
}

interface BrandUser {
  id: string | null;
  full_name: string;
  email: string;
  role: string;
  is_owner: boolean;
  is_pending?: boolean;
}

interface IssuesTabProps {
  brandId: string;
}

const statusColors = {
  open: 'bg-red-100 text-red-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800'
};

const statusIcons = {
  open: Circle,
  in_progress: Clock,
  resolved: CheckCircle
};

const typeColors = {
  short_term: 'bg-blue-100 text-blue-800',
  long_term: 'bg-purple-100 text-purple-800'
};

export default function IssuesTab({ brandId }: IssuesTabProps) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLinkTodoDialogOpen, setIsLinkTodoDialogOpen] = useState(false);
  const [linkingIssue, setLinkingIssue] = useState<Issue | null>(null);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [linkedTodos, setLinkedTodos] = useState<{[issueId: string]: Todo[]}>({});
  const [brandUsers, setBrandUsers] = useState<BrandUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    issue_type: 'short_term' as 'short_term' | 'long_term',
    assignee_id: 'none'
  });
  const [todoFormData, setTodoFormData] = useState({
    title: '',
    description: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    due_date: '',
    assignee_id: 'none'
  });

  const fetchLinkedTodos = async (issueId: string) => {
    try {
      const response = await fetch(`/api/team-sync/link-issue-todo?issue_id=${issueId}`);
      const data = await response.json();
      if (response.ok) {
        setLinkedTodos(prev => ({ ...prev, [issueId]: data.linkedTodos || [] }));
      }
    } catch (error) {
      console.error('Error fetching linked todos:', error);
    }
  };

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/team-sync/issues?brandId=${brandId}`);
      const data = await response.json();
      if (response.ok) {
        setIssues(data.issues);
      } else {
        console.error('Failed to fetch issues:', data.error);
      }
    } catch (error) {
      console.error('Error fetching issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodos = async () => {
    try {
      const response = await fetch(`/api/team-sync/todos?brandId=${brandId}`);
      if (response.ok) {
        // Todos fetched successfully but not used in this component
      }
    } catch (error) {
      console.error('Error fetching todos:', error);
    }
  };

  const fetchBrandUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await fetch(`/api/team-sync/brand-users?brandId=${brandId}`);
      const data = await response.json();
      if (response.ok) {
        setBrandUsers(data.users || []);
      } else {
        console.error('Failed to fetch brand users:', data.error);
      }
    } catch (error) {
      console.error('Error fetching brand users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchIssues();
    fetchTodos();
    fetchBrandUsers();
  }, [brandId]);

  // Fetch linked todos for all issues when issues are loaded
  useEffect(() => {
    if (issues.length > 0) {
      issues.forEach(issue => {
        fetchLinkedTodos(issue.id);
      });
    }
  }, [issues]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const method = editingIssue ? 'PUT' : 'POST';
      // Convert "none" or "pending" assignee_id to null for API
      const processedFormData = {
        ...formData,
        assignee_id: (formData.assignee_id === 'none' || formData.assignee_id.startsWith('pending-')) ? null : formData.assignee_id
      };
      const body = editingIssue 
        ? { ...processedFormData, id: editingIssue.id, brand_id: brandId }
        : { ...processedFormData, brand_id: brandId };

      const response = await fetch('/api/team-sync/issues', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      
      if (response.ok) {
        await fetchIssues();
        setIsDialogOpen(false);
        setEditingIssue(null);
        setFormData({ title: '', description: '', issue_type: 'short_term', assignee_id: 'none' });
      } else {
        console.error('Failed to save issue:', data.error);
      }
    } catch (error) {
      console.error('Error saving issue:', error);
    }
  };

  const handleStatusChange = async (issue: Issue, newStatus: 'open' | 'in_progress' | 'resolved') => {
    try {
      const response = await fetch('/api/team-sync/issues', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: issue.id, status: newStatus })
      });

      if (response.ok) {
        await fetchIssues();
      } else {
        const data = await response.json();
        console.error('Failed to update issue status:', data.error);
      }
    } catch (error) {
      console.error('Error updating issue status:', error);
    }
  };

  const handlePriorityChange = async (issue: Issue, direction: 'up' | 'down') => {
    const sortedIssues = [...issues].sort((a, b) => a.priority_order - b.priority_order);
    const currentIndex = sortedIssues.findIndex(i => i.id === issue.id);
    
    let newOrder = issue.priority_order;
    if (direction === 'up' && currentIndex > 0) {
      newOrder = sortedIssues[currentIndex - 1].priority_order - 1;
    } else if (direction === 'down' && currentIndex < sortedIssues.length - 1) {
      newOrder = sortedIssues[currentIndex + 1].priority_order + 1;
    }

    try {
      const response = await fetch('/api/team-sync/issues', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: issue.id, priority_order: newOrder })
      });

      if (response.ok) {
        await fetchIssues();
      } else {
        const data = await response.json();
        console.error('Failed to update issue priority:', data.error);
      }
    } catch (error) {
      console.error('Error updating issue priority:', error);
    }
  };

  const handleEdit = (issue: Issue) => {
    setEditingIssue(issue);
    setFormData({
      title: issue.title,
      description: issue.description,
      issue_type: issue.issue_type,
      assignee_id: issue.assignee_id || 'none'
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this issue?')) return;

    try {
      const response = await fetch(`/api/team-sync/issues?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchIssues();
      } else {
        const data = await response.json();
        console.error('Failed to delete issue:', data.error);
      }
    } catch (error) {
      console.error('Error deleting issue:', error);
    }
  };

  const handleCreateLinkedTodo = async (issue: Issue) => {
    setLinkingIssue(issue);
    setTodoFormData({
      title: `Todo: ${issue.title}`,
      description: `Related to issue: ${issue.description || 'No description provided'}`,
      priority: 'normal',
      due_date: '',
      assignee_id: issue.assignee_id || 'none'
    });
    setIsLinkTodoDialogOpen(true);
  };

  const handleSubmitLinkedTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkingIssue) return;
    
    try {
      // Convert "none" or "pending" assignee_id to null for API
      const processedTodoFormData = {
        ...todoFormData,
        assignee_id: (todoFormData.assignee_id === 'none' || todoFormData.assignee_id.startsWith('pending-')) ? null : todoFormData.assignee_id
      };
      
      // Create a new todo
      const todoResponse = await fetch('/api/team-sync/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...processedTodoFormData, brand_id: brandId })
      });

      const todoData = await todoResponse.json();
      
      if (todoResponse.ok) {
        // Link the todo to the issue
        const linkResponse = await fetch('/api/team-sync/link-issue-todo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            issue_id: linkingIssue.id,
            todo_id: todoData.todo.id
          })
        });

        if (linkResponse.ok) {
          setIsLinkTodoDialogOpen(false);
          setLinkingIssue(null);
          setTodoFormData({ title: '', description: '', priority: 'normal', due_date: '', assignee_id: 'none' });
          alert('Todo created and linked successfully!');
        }
      }
    } catch (error) {
      console.error('Error creating linked todo:', error);
    }
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', issue_type: 'short_term', assignee_id: 'none' });
    setEditingIssue(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading issues...</div>
      </div>
    );
  }

  // Sort issues by priority order for display
  const sortedIssues = [...issues].sort((a, b) => a.priority_order - b.priority_order);
  const openIssues = sortedIssues.filter(issue => issue.status !== 'resolved');
  const resolvedIssues = sortedIssues.filter(issue => issue.status === 'resolved');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Team Issues</h2>
          <p className="text-gray-600">Track and prioritize team issues and blockers</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Issue
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingIssue ? 'Edit Issue' : 'Create New Issue'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter issue title"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter issue description"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="issue_type">Type</Label>
                <Select 
                  value={formData.issue_type} 
                  onValueChange={(value: 'short_term' | 'long_term') => 
                    setFormData({ ...formData, issue_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short_term">Short Term</SelectItem>
                    <SelectItem value="long_term">Long Term</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="assignee">Assignee (Optional)</Label>
                <Select 
                  value={formData.assignee_id} 
                  onValueChange={(value: string) => 
                    setFormData({ ...formData, assignee_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingUsers ? "Loading users..." : "Select assignee"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Assignee</SelectItem>
                    {brandUsers.map((user) => (
                      <SelectItem 
                        key={user.id || `issue-pending-${user.email}`} 
                        value={user.id || `pending-${user.email}`}
                        disabled={!user.id}
                      >
                        {user.full_name} ({user.email})
                        {user.is_pending && ' - Pending'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  {editingIssue ? 'Update' : 'Create'} Issue
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Link Todo Dialog */}
      <Dialog open={isLinkTodoDialogOpen} onOpenChange={(open) => {
        setIsLinkTodoDialogOpen(open);
        if (!open) {
          setLinkingIssue(null);
          setTodoFormData({ title: '', description: '', priority: 'normal', due_date: '', assignee_id: 'none' });
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-blue-600" />
              Create Linked Todo
            </DialogTitle>
            {linkingIssue && (
              <p className="text-sm text-gray-600">
                Creating a todo linked to: &ldquo;{linkingIssue.title}&rdquo;
              </p>
            )}
          </DialogHeader>
          <form onSubmit={handleSubmitLinkedTodo} className="space-y-4">
            <div>
              <Label htmlFor="todo_title">Todo Title</Label>
              <Input
                id="todo_title"
                value={todoFormData.title}
                onChange={(e) => setTodoFormData({ ...todoFormData, title: e.target.value })}
                placeholder="Enter todo title"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="todo_description">Todo Description</Label>
              <Textarea
                id="todo_description"
                value={todoFormData.description}
                onChange={(e) => setTodoFormData({ ...todoFormData, description: e.target.value })}
                placeholder="Describe what needs to be done"
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="todo_priority">Priority</Label>
              <Select 
                value={todoFormData.priority} 
                onValueChange={(value: 'low' | 'normal' | 'high' | 'urgent') => 
                  setTodoFormData({ ...todoFormData, priority: value })
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
            
            <div>
              <Label htmlFor="todo_due_date">Due Date (Optional)</Label>
              <Input
                id="todo_due_date"
                type="date"
                value={todoFormData.due_date}
                onChange={(e) => setTodoFormData({ ...todoFormData, due_date: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="todo_assignee">Assignee (Optional)</Label>
              <Select 
                value={todoFormData.assignee_id} 
                onValueChange={(value: string) => 
                  setTodoFormData({ ...todoFormData, assignee_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingUsers ? "Loading users..." : "Select assignee"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Assignee</SelectItem>
                  {brandUsers.map((user) => (
                    <SelectItem 
                      key={user.id || `todo-pending-${user.email}`} 
                      value={user.id || `pending-${user.email}`}
                      disabled={!user.id}
                    >
                      {user.full_name} ({user.email})
                      {user.is_pending && ' - Pending'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsLinkTodoDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                <CheckSquare2 className="h-4 w-4 mr-2" />
                Create & Link Todo
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Issues</p>
                <p className="text-2xl font-semibold">{issues.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <Circle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Open</p>
                <p className="text-2xl font-semibold">{issues.filter(i => i.status === 'open').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-50 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-semibold">{issues.filter(i => i.status === 'in_progress').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Resolved</p>
                <p className="text-2xl font-semibold">{resolvedIssues.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Open Issues */}
      {openIssues.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Open Issues (by Priority)</h3>
          {openIssues.map((issue, index) => {
            const StatusIcon = statusIcons[issue.status];
            return (
              <Card key={issue.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 rounded-lg bg-primary-50">
                        <StatusIcon className="h-4 w-4 text-primary-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle 
                            className="text-lg cursor-pointer hover:text-blue-600"
                            onClick={() => alert(`Issue: ${issue.title}\n\nDescription: ${issue.description || 'No description'}\n\nType: ${issue.issue_type}\n\nStatus: ${issue.status}\n\nPriority Order: ${issue.priority_order}\n\nCreated: ${new Date(issue.created_at).toLocaleDateString()}`)}
                          >
                            {issue.title}
                          </CardTitle>
                          <Badge className={statusColors[issue.status]}>
                            {issue.status.replace('_', ' ')}
                          </Badge>
                          <Badge className={typeColors[issue.issue_type]}>
                            {issue.issue_type.replace('_', ' ')}
                          </Badge>
                        </div>
                        {issue.description && (
                          <p className="text-gray-600 text-sm mb-2">{linkifyText(issue.description)}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{issue.creator?.email || 'Unknown'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{new Date(issue.created_at).toLocaleDateString()}</span>
                          </div>
                          {issue.assignee && (
                            <div className="flex items-center gap-1">
                              <span>Assigned to: {issue.assignee.email}</span>
                            </div>
                          )}
                        </div>
                        {/* Linked Todos */}
                        {linkedTodos[issue.id] && linkedTodos[issue.id].length > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-500 mb-1">Linked Todos:</p>
                            <div className="flex flex-wrap gap-1">
                              {linkedTodos[issue.id].map((todo: Todo) => (
                                <Badge 
                                  key={todo.id} 
                                  variant="outline" 
                                  className="text-xs cursor-pointer hover:bg-gray-50"
                                  onClick={() => alert(`Todo: ${todo.title}\n\nDescription: ${todo.description || 'No description'}\n\nPriority: ${todo.priority}\n\nCompleted: ${todo.completed ? 'Yes' : 'No'}`)}
                                >
                                  {todo.title} {todo.completed && '✓'}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {/* Priority controls */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePriorityChange(issue, 'up')}
                        disabled={index === 0}
                        title="Move up in priority"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePriorityChange(issue, 'down')}
                        disabled={index === openIssues.length - 1}
                        title="Move down in priority"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      
                      {/* Status controls */}
                      <Select 
                        value={issue.status} 
                        onValueChange={(value: 'open' | 'in_progress' | 'resolved') => 
                          handleStatusChange(issue, value)
                        }
                      >
                        <SelectTrigger className="w-auto">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCreateLinkedTodo(issue)}
                        className="flex items-center gap-1"
                      >
                        <Link className="h-3 w-3" />
                        Create Linked To Do
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(issue)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(issue.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}

      {/* Resolved Issues */}
      {resolvedIssues.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Resolved Issues</h3>
          {resolvedIssues.map((issue) => {
            const StatusIcon = statusIcons[issue.status];
            return (
              <Card key={issue.id} className="hover:shadow-md transition-shadow opacity-75">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 rounded-lg bg-green-50">
                        <StatusIcon className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-lg line-through text-gray-500">{issue.title}</CardTitle>
                          <Badge className={statusColors[issue.status]}>
                            {issue.status.replace('_', ' ')}
                          </Badge>
                          <Badge className={typeColors[issue.issue_type]}>
                            {issue.issue_type.replace('_', ' ')}
                          </Badge>
                        </div>
                        {issue.description && (
                          <p className="text-gray-500 text-sm mb-2 line-through">{linkifyText(issue.description)}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{issue.creator?.email || 'Unknown'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            <span>Resolved {new Date(issue.updated_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStatusChange(issue, 'open')}
                        title="Reopen issue"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(issue.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {issues.length === 0 && (
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No issues yet</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating your first issue.</p>
          <div className="mt-6">
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Issue
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 