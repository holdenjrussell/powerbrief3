'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  TrendingUp, 
  AlertTriangle, 
  Calendar as CalendarIcon,
  Plus,
  Download,
  Filter,
  Search,
  Clock,
  CheckCircle,
  Send
} from 'lucide-react';
import { format, addDays, startOfMonth } from 'date-fns';
import { 
  UgcPayment, 
  PaymentDashboardData, 
  CreatePaymentForm, 
  BudgetSummary,
  UgcMonthlyBudget
} from '@/lib/types/ugcDashboards';

interface PaymentsDashboardProps {
  brandId: string;
}

export default function PaymentsDashboard({ brandId }: PaymentsDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<PaymentDashboardData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [monthlyBudget, setMonthlyBudget] = useState<UgcMonthlyBudget | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreatePayment, setShowCreatePayment] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
    loadMonthlyBudget();
  }, [brandId, selectedMonth]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ugc/payments/dashboard?brandId=${brandId}`);
      const data = await response.json();
      if (data.success) {
        setDashboardData(data.data);
      }
    } catch (error) {
      console.error('Error loading payments dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlyBudget = async () => {
    try {
      const monthYear = format(selectedMonth, 'yyyy-MM-01');
      const response = await fetch(`/api/ugc/payments/budget?brandId=${brandId}&month=${monthYear}`);
      const data = await response.json();
      if (data.success) {
        setMonthlyBudget(data.data);
      }
    } catch (error) {
      console.error('Error loading monthly budget:', error);
    }
  };

  const handleCreatePayment = async (formData: CreatePaymentForm) => {
    try {
      const response = await fetch('/api/ugc/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, brand_id: brandId }),
      });
      
      if (response.ok) {
        setShowCreatePayment(false);
        loadDashboardData();
      }
    } catch (error) {
      console.error('Error creating payment:', error);
    }
  };

  const handleUpdateBudget = async (budgetAmount: number, notes?: string) => {
    try {
      const monthYear = format(selectedMonth, 'yyyy-MM-01');
      const response = await fetch('/api/ugc/payments/budget', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: brandId,
          month_year: monthYear,
          budget_amount: budgetAmount,
          notes,
        }),
      });
      
      if (response.ok) {
        setShowBudgetModal(false);
        loadMonthlyBudget();
      }
    } catch (error) {
      console.error('Error updating budget:', error);
    }
  };

  const handleMarkAsPaid = async (paymentId: string) => {
    try {
      const response = await fetch(`/api/ugc/payments/${paymentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'paid',
          paid_date: new Date().toISOString(),
        }),
      });
      
      if (response.ok) {
        loadDashboardData();
        loadMonthlyBudget();
      }
    } catch (error) {
      console.error('Error marking payment as paid:', error);
    }
  };

  const handleSendReminder = async (paymentId: string) => {
    try {
      const response = await fetch(`/api/ugc/payments/${paymentId}/reminder`, {
        method: 'POST',
      });
      
      if (response.ok) {
        loadDashboardData();
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
    }
  };

  const exportPayments = async () => {
    try {
      const response = await fetch(`/api/ugc/payments/export?brandId=${brandId}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payments-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
    } catch (error) {
      console.error('Error exporting payments:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Payments Dashboard</h1>
          <p className="text-gray-600">Track payments, budgets, and financial analytics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportPayments}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={showCreatePayment} onOpenChange={setShowCreatePayment}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <CreatePaymentModal onSubmit={handleCreatePayment} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Budget Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Monthly Budget</CardTitle>
            <CardDescription>
              {format(selectedMonth, 'MMMM yyyy')}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {format(selectedMonth, 'MMM yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedMonth}
                  onSelect={(date) => date && setSelectedMonth(startOfMonth(date))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Dialog open={showBudgetModal} onOpenChange={setShowBudgetModal}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Set Budget
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <BudgetModal 
                  currentBudget={monthlyBudget}
                  onSubmit={handleUpdateBudget}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {monthlyBudget && dashboardData ? (
            <BudgetOverview 
              budget={monthlyBudget}
              summary={dashboardData.overview.monthlyBudget}
            />
          ) : (
            <div className="text-center py-8 text-gray-500">
              No budget set for this month
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overview Cards */}
      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${dashboardData.overview.totalPaid.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Due</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                ${dashboardData.overview.totalDue.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                ${dashboardData.overview.totalOverdue.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Budget Used</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {dashboardData.overview.monthlyBudget.percentage_used}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payments Tabs */}
      <Tabs defaultValue="due" className="space-y-4">
        <TabsList>
          <TabsTrigger value="due">Due Payments</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search payments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>

        {dashboardData && (
          <>
            <TabsContent value="due">
              <PaymentsList 
                payments={dashboardData.payments.due}
                onMarkAsPaid={handleMarkAsPaid}
                onSendReminder={handleSendReminder}
                searchTerm={searchTerm}
              />
            </TabsContent>

            <TabsContent value="overdue">
              <PaymentsList 
                payments={dashboardData.payments.overdue}
                onMarkAsPaid={handleMarkAsPaid}
                onSendReminder={handleSendReminder}
                searchTerm={searchTerm}
                showUrgent
              />
            </TabsContent>

            <TabsContent value="recent">
              <PaymentsList 
                payments={dashboardData.payments.recent}
                onMarkAsPaid={handleMarkAsPaid}
                onSendReminder={handleSendReminder}
                searchTerm={searchTerm}
                readonly
              />
            </TabsContent>

            <TabsContent value="analytics">
              <PaymentAnalytics analytics={dashboardData.analytics} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

// Helper functions
function getStatusBadge(status: UgcPayment['status']) {
  const variants = {
    pending: 'secondary',
    processing: 'default',
    paid: 'default',
    failed: 'destructive',
    cancelled: 'outline',
  } as const;

  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
  };

  return (
    <Badge variant={variants[status]} className={colors[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function getPriorityIcon(payment: UgcPayment) {
  const dueDate = payment.due_date ? new Date(payment.due_date) : null;
  const isOverdue = dueDate && dueDate < new Date();
  const isDueSoon = dueDate && dueDate < addDays(new Date(), 7);

  if (isOverdue) {
    return <AlertTriangle className="h-4 w-4 text-red-500" />;
  }
  if (isDueSoon) {
    return <Clock className="h-4 w-4 text-yellow-500" />;
  }
  return null;
}

// Budget Overview Component
function BudgetOverview({ budget, summary }: { budget: UgcMonthlyBudget; summary: BudgetSummary }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <div className="text-2xl font-bold">${summary.budget_amount.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Monthly Budget</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold text-green-600">
            ${summary.remaining_amount.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Remaining</div>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Spent: ${summary.spent_amount.toLocaleString()}</span>
          <span>{summary.percentage_used}%</span>
        </div>
        <Progress value={summary.percentage_used} className="h-2" />
      </div>

      {budget.notes && (
        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
          {budget.notes}
        </div>
      )}
    </div>
  );
}

// Payments List Component
interface PaymentsListProps {
  payments: UgcPayment[];
  onMarkAsPaid: (id: string) => void;
  onSendReminder: (id: string) => void;
  searchTerm: string;
  showUrgent?: boolean;
  readonly?: boolean;
}

function PaymentsList({ 
  payments, 
  onMarkAsPaid, 
  onSendReminder, 
  searchTerm, 
  showUrgent = false,
  readonly = false 
}: PaymentsListProps) {
  const filteredPayments = payments.filter(payment =>
    payment.creator_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.creator_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.script_title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (filteredPayments.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="text-gray-500">No payments found</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {filteredPayments.map((payment) => (
        <Card key={payment.id} className={showUrgent ? 'border-red-200' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {getPriorityIcon(payment)}
                <div>
                  <div className="font-medium">{payment.creator_name}</div>
                  <div className="text-sm text-gray-600">{payment.creator_email}</div>
                  {payment.script_title && (
                    <div className="text-sm text-gray-500">{payment.script_title}</div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-semibold">${payment.amount.toLocaleString()}</div>
                  <div className="text-sm text-gray-600 capitalize">
                    {payment.payment_type.replace('_', ' ')}
                  </div>
                  {payment.due_date && (
                    <div className="text-sm text-gray-500">
                      Due: {format(new Date(payment.due_date), 'MMM d, yyyy')}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {getStatusBadge(payment.status)}
                  
                  {!readonly && payment.status === 'pending' && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onSendReminder(payment.id)}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => onMarkAsPaid(payment.id)}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Create Payment Modal Component
function CreatePaymentModal({ onSubmit }: { onSubmit: (data: CreatePaymentForm) => void }) {
  const [formData, setFormData] = useState<CreatePaymentForm>({
    creator_id: '',
    payment_type: 'deposit',
    amount: 0,
    currency: 'USD',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Create New Payment</DialogTitle>
        <DialogDescription>
          Add a new payment to track for a creator.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div>
          <Label htmlFor="creator">Creator</Label>
          <Select onValueChange={(value) => setFormData(prev => ({ ...prev, creator_id: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select creator" />
            </SelectTrigger>
            <SelectContent>
              {/* This would be populated with actual creators */}
              <SelectItem value="creator1">Creator 1</SelectItem>
              <SelectItem value="creator2">Creator 2</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="payment_type">Payment Type</Label>
          <Select 
            value={formData.payment_type}
            onValueChange={(value: CreatePaymentForm['payment_type']) => 
              setFormData(prev => ({ ...prev, payment_type: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="deposit">Deposit</SelectItem>
              <SelectItem value="final">Final Payment</SelectItem>
              <SelectItem value="bonus">Bonus</SelectItem>
              <SelectItem value="expense_reimbursement">Expense Reimbursement</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="amount">Amount</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
            required
          />
        </div>

        <div>
          <Label htmlFor="due_date">Due Date (Optional)</Label>
          <Input
            type="date"
            onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
          />
        </div>

        <div>
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Textarea
            placeholder="Additional notes..."
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline">Cancel</Button>
        <Button type="submit">Create Payment</Button>
      </div>
    </form>
  );
}

// Budget Modal Component
function BudgetModal({ 
  currentBudget, 
  onSubmit 
}: { 
  currentBudget: UgcMonthlyBudget | null;
  onSubmit: (amount: number, notes?: string) => void;
}) {
  const [amount, setAmount] = useState(currentBudget?.budget_amount || 0);
  const [notes, setNotes] = useState(currentBudget?.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(amount, notes);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Set Monthly Budget</DialogTitle>
        <DialogDescription>
          Set your budget for this month to track spending.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div>
          <Label htmlFor="amount">Budget Amount</Label>
          <Input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value))}
            required
          />
        </div>

        <div>
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Textarea
            placeholder="Budget notes or goals..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline">Cancel</Button>
        <Button type="submit">Save Budget</Button>
      </div>
    </form>
  );
}

// Payment Analytics Component
function PaymentAnalytics({ analytics }: { analytics: PaymentDashboardData['analytics'] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Monthly Spending Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.monthlySpend.map((item, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm font-medium">{item.month}</span>
                <span className="text-sm">${item.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payments by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.paymentsByType.map((item, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm font-medium capitalize">
                  {item.type.replace('_', ' ')}
                </span>
                <div className="text-right">
                  <div className="text-sm font-semibold">${item.amount.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">{item.count} payments</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Creator Payment Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.creatorPayments.map((item, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="font-medium">{item.creator_name}</span>
                <div className="text-right">
                  <div className="text-sm font-semibold text-green-600">
                    Paid: ${item.total_paid.toLocaleString()}
                  </div>
                  {item.pending_amount > 0 && (
                    <div className="text-sm text-yellow-600">
                      Pending: ${item.pending_amount.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}