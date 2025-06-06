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
  Checkbox
} from '@/components/ui';
import { 
  Plus, 
  CheckSquare,
  Clock,
  User,
  Edit,
  Trash2,
  Calendar,
  Link,
  AlertTriangle
} from 'lucide-react';

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

interface TodosTabProps {
  brandId: string;
}

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  normal: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
};

export default function TodosTab({ brandId }: TodosTabProps) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLinkIssueDialogOpen, setIsLinkIssueDialogOpen] = useState(false);
  const [linkingTodo, setLinkingTodo] = useState<Todo | null>(null);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [linkedIssues, setLinkedIssues] = useState<{[todoId: string]: Issue[]}>({});
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    due_date: '',
    assignee_id: ''
  });
  const [issueFormData, setIssueFormData] = useState({
    title: '',
    description: '',
    issue_type: 'short_term' as 'short_term' | 'long_term',
    assignee_id: ''
  });

  const fetchTodos = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/team-sync/todos?brandId=${brandId}`);
      const data = await response.json();
      if (response.ok) {
        setTodos(data.todos);
      } else {
        console.error('Failed to fetch todos:', data.error);
      }
    } catch (error) {
      console.error('Error fetching todos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLinkedIssues = async (todoId: string) => {
    try {
      const response = await fetch(`/api/team-sync/link-issue-todo?todo_id=${todoId}`);
      const data = await response.json();
      if (response.ok) {
        setLinkedIssues(prev => ({ ...prev, [todoId]: data.linkedIssues || [] }));
      }
    } catch (error) {
      console.error('Error fetching linked issues:', error);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, [brandId]);

  // Fetch linked issues for all todos when todos are loaded
  useEffect(() => {
    if (todos.length > 0) {
      todos.forEach(todo => {
        fetchLinkedIssues(todo.id);
      });
    }
  }, [todos]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const method = editingTodo ? 'PUT' : 'POST';
      const body = editingTodo 
        ? { ...formData, id: editingTodo.id, brand_id: brandId }
        : { ...formData, brand_id: brandId };

      const response = await fetch('/api/team-sync/todos', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      
      if (response.ok) {
        await fetchTodos();
        setIsDialogOpen(false);
        setEditingTodo(null);
        setFormData({ title: '', description: '', due_date: '', assignee_id: '', priority: 'normal' });
      } else {
        console.error('Failed to save todo:', data.error);
      }
    } catch (error) {
      console.error('Error saving todo:', error);
    }
  };

  const handleToggleComplete = async (todo: Todo) => {
    try {
      const response = await fetch('/api/team-sync/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: todo.id, completed: !todo.completed })
      });

      if (response.ok) {
        await fetchTodos();
      } else {
        const data = await response.json();
        console.error('Failed to update todo:', data.error);
      }
    } catch (error) {
      console.error('Error updating todo:', error);
    }
  };

  const handleEdit = (todo: Todo) => {
    setEditingTodo(todo);
    setFormData({
      title: todo.title,
      description: todo.description,
      due_date: todo.due_date ? todo.due_date.split('T')[0] : '',
      assignee_id: todo.assignee_id || '',
      priority: todo.priority
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this todo?')) return;

    try {
      const response = await fetch(`/api/team-sync/todos?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchTodos();
      } else {
        const data = await response.json();
        console.error('Failed to delete todo:', data.error);
      }
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  };

  const handleCreateLinkedIssue = async (todo: Todo) => {
    setLinkingTodo(todo);
    setIssueFormData({
      title: `Issue: ${todo.title}`,
      description: `Related to todo: ${todo.description || 'No description provided'}`,
      issue_type: 'short_term',
      assignee_id: todo.assignee_id || ''
    });
    setIsLinkIssueDialogOpen(true);
  };

  const handleSubmitLinkedIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkingTodo) return;
    
    try {
      // Create a new issue
      const issueResponse = await fetch('/api/team-sync/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...issueFormData, brand_id: brandId })
      });

      const issueData = await issueResponse.json();
      
      if (issueResponse.ok) {
        // Link the issue to the todo
        const linkResponse = await fetch('/api/team-sync/link-issue-todo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            issue_id: issueData.issue.id,
            todo_id: linkingTodo.id
          })
        });

        if (linkResponse.ok) {
          setIsLinkIssueDialogOpen(false);
          setLinkingTodo(null);
          setIssueFormData({ title: '', description: '', issue_type: 'short_term', assignee_id: '' });
          // You might want to show a success message or refresh linked items
          alert('Issue created and linked successfully!');
        }
      }
    } catch (error) {
      console.error('Error creating linked issue:', error);
    }
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', due_date: '', assignee_id: '', priority: 'normal' });
    setEditingTodo(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading todos...</div>
      </div>
    );
  }

  const completedTodos = todos.filter(todo => todo.completed);
  const pendingTodos = todos.filter(todo => !todo.completed);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Team To-Dos</h2>
          <p className="text-gray-600">Manage tasks and track progress</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New To-Do
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingTodo ? 'Edit To-Do' : 'Create New To-Do'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter todo title"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter todo description"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
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
                  {editingTodo ? 'Update' : 'Create'} To-Do
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Link Issue Dialog */}
      <Dialog open={isLinkIssueDialogOpen} onOpenChange={(open) => {
        setIsLinkIssueDialogOpen(open);
        if (!open) {
          setLinkingTodo(null);
          setIssueFormData({ title: '', description: '', issue_type: 'short_term', assignee_id: '' });
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Create Linked Issue
            </DialogTitle>
            {linkingTodo && (
              <p className="text-sm text-gray-600">
                Creating an issue linked to: &ldquo;{linkingTodo.title}&rdquo;
              </p>
            )}
          </DialogHeader>
          <form onSubmit={handleSubmitLinkedIssue} className="space-y-4">
            <div>
              <Label htmlFor="issue_title">Issue Title</Label>
              <Input
                id="issue_title"
                value={issueFormData.title}
                onChange={(e) => setIssueFormData({ ...issueFormData, title: e.target.value })}
                placeholder="Enter issue title"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="issue_description">Issue Description</Label>
              <Textarea
                id="issue_description"
                value={issueFormData.description}
                onChange={(e) => setIssueFormData({ ...issueFormData, description: e.target.value })}
                placeholder="Describe the issue in detail"
                rows={4}
              />
            </div>
            
            <div>
              <Label htmlFor="issue_type">Issue Type</Label>
              <Select 
                value={issueFormData.issue_type} 
                onValueChange={(value: 'short_term' | 'long_term') => 
                  setIssueFormData({ ...issueFormData, issue_type: value })
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
              <Label htmlFor="issue_assignee">Assignee (Optional)</Label>
              <Input
                id="issue_assignee"
                value={issueFormData.assignee_id}
                onChange={(e) => setIssueFormData({ ...issueFormData, assignee_id: e.target.value })}
                placeholder="Enter assignee ID"
              />
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsLinkIssueDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Create & Link Issue
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <CheckSquare className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Tasks</p>
                <p className="text-2xl font-semibold">{todos.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-semibold">{pendingTodos.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckSquare className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-semibold">{completedTodos.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Todos */}
      {pendingTodos.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Pending Tasks</h3>
          {pendingTodos.map((todo) => (
            <Card key={todo.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <Checkbox
                      checked={todo.completed}
                      onCheckedChange={() => handleToggleComplete(todo)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle 
                          className="text-lg cursor-pointer hover:text-blue-600" 
                          onClick={() => alert(`Todo: ${todo.title}\n\nDescription: ${todo.description || 'No description'}\n\nPriority: ${todo.priority}\n\nDue Date: ${todo.due_date ? new Date(todo.due_date).toLocaleDateString() : 'No due date'}\n\nCompleted: ${todo.completed ? 'Yes' : 'No'}`)}
                        >
                          {todo.title}
                        </CardTitle>
                        <Badge className={priorityColors[todo.priority]}>
                          {todo.priority}
                        </Badge>
                      </div>
                      {todo.description && (
                        <p className="text-gray-600 text-sm mb-2">{todo.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{todo.creator?.email || 'Unknown'}</span>
                        </div>
                        {todo.due_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(todo.due_date).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                      {/* Linked Issues */}
                      {linkedIssues[todo.id] && linkedIssues[todo.id].length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <p className="text-xs text-gray-500 mb-1">Linked Issues:</p>
                          <div className="flex flex-wrap gap-1">
                            {linkedIssues[todo.id].map((issue: Issue) => (
                              <Badge 
                                key={issue.id} 
                                variant="outline" 
                                className="text-xs cursor-pointer hover:bg-gray-50"
                                onClick={() => alert(`Issue: ${issue.title}\n\nDescription: ${issue.description || 'No description'}\n\nType: ${issue.issue_type}\n\nStatus: ${issue.status}\n\nPriority Order: ${issue.priority_order}`)}
                              >
                                {issue.title}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCreateLinkedIssue(todo)}
                      className="flex items-center gap-1"
                    >
                      <Link className="h-3 w-3" />
                      Create Linked Issue
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(todo)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(todo.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Completed Todos */}
      {completedTodos.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Completed Tasks</h3>
          {completedTodos.map((todo) => (
            <Card key={todo.id} className="hover:shadow-md transition-shadow opacity-75">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <Checkbox
                      checked={todo.completed}
                      onCheckedChange={() => handleToggleComplete(todo)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-lg line-through text-gray-500">{todo.title}</CardTitle>
                        <Badge className={priorityColors[todo.priority]}>
                          {todo.priority}
                        </Badge>
                      </div>
                      {todo.description && (
                        <p className="text-gray-500 text-sm mb-2 line-through">{todo.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{todo.creator?.email || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>Completed {new Date(todo.updated_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(todo.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {todos.length === 0 && (
        <div className="text-center py-12">
          <CheckSquare className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No todos yet</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating your first todo.</p>
          <div className="mt-6">
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First To-Do
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 