import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');

    if (!brandId) {
      return NextResponse.json({ success: false, error: 'Brand ID is required' }, { status: 400 });
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to this brand
    const { data: brandAccess } = await supabase
      .from('user_brand_access')
      .select('*')
      .eq('user_id', user.id)
      .eq('brand_id', brandId)
      .single();

    if (!brandAccess) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const currentDate = new Date();
    const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);

    // Get payment overview data
    const { data: payments } = await supabase
      .from('ugc_payments')
      .select(`
        *,
        ugc_creators!inner(name, email),
        ugc_creator_scripts(title)
      `)
      .eq('brand_id', brandId);

    if (!payments) {
      return NextResponse.json({ success: false, error: 'Failed to fetch payments' }, { status: 500 });
    }

    // Calculate overview metrics
    const totalPaid = payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);

    const totalDue = payments
      .filter(p => p.status === 'pending' && p.due_date && new Date(p.due_date) >= currentDate)
      .reduce((sum, p) => sum + p.amount, 0);

    const totalOverdue = payments
      .filter(p => p.status === 'pending' && p.due_date && new Date(p.due_date) < currentDate)
      .reduce((sum, p) => sum + p.amount, 0);

    // Get monthly budget for current month
    const { data: monthlyBudget } = await supabase
      .from('ugc_monthly_budgets')
      .select('*')
      .eq('brand_id', brandId)
      .eq('month_year', currentMonth.toISOString().split('T')[0])
      .single();

    const budgetSummary = {
      budget_amount: monthlyBudget?.budget_amount || 0,
      spent_amount: monthlyBudget?.spent_amount || 0,
      remaining_amount: (monthlyBudget?.budget_amount || 0) - (monthlyBudget?.spent_amount || 0),
      percentage_used: monthlyBudget?.budget_amount > 0 
        ? Math.round((monthlyBudget.spent_amount / monthlyBudget.budget_amount) * 100) 
        : 0
    };

    // Categorize payments
    const duePayments = payments
      .filter(p => p.status === 'pending' && p.due_date && new Date(p.due_date) >= currentDate)
      .map(p => ({
        ...p,
        creator_name: p.ugc_creators?.name,
        creator_email: p.ugc_creators?.email,
        script_title: p.ugc_creator_scripts?.title
      }))
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());

    const overduePayments = payments
      .filter(p => p.status === 'pending' && p.due_date && new Date(p.due_date) < currentDate)
      .map(p => ({
        ...p,
        creator_name: p.ugc_creators?.name,
        creator_email: p.ugc_creators?.email,
        script_title: p.ugc_creator_scripts?.title
      }))
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());

    const recentPayments = payments
      .filter(p => p.status === 'paid' && p.paid_date && new Date(p.paid_date) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      .map(p => ({
        ...p,
        creator_name: p.ugc_creators?.name,
        creator_email: p.ugc_creators?.email,
        script_title: p.ugc_creator_scripts?.title
      }))
      .sort((a, b) => new Date(b.paid_date!).getTime() - new Date(a.paid_date!).getTime());

    const upcomingPayments = payments
      .filter(p => p.status === 'pending' && p.due_date && new Date(p.due_date) >= currentDate && new Date(p.due_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
      .map(p => ({
        ...p,
        creator_name: p.ugc_creators?.name,
        creator_email: p.ugc_creators?.email,
        script_title: p.ugc_creator_scripts?.title
      }));

    // Generate analytics data
    const monthlySpend = [];
    for (let i = 5; i >= 0; i--) {
      const month = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const nextMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 1);
      
      const monthPayments = payments.filter(p => 
        p.status === 'paid' && 
        p.paid_date && 
        new Date(p.paid_date) >= month && 
        new Date(p.paid_date) < nextMonthDate
      );
      
      monthlySpend.push({
        month: month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        amount: monthPayments.reduce((sum, p) => sum + p.amount, 0)
      });
    }

    const paymentsByType = ['deposit', 'final', 'bonus', 'expense_reimbursement'].map(type => {
      const typePayments = payments.filter(p => p.payment_type === type && p.status === 'paid');
      return {
        type,
        amount: typePayments.reduce((sum, p) => sum + p.amount, 0),
        count: typePayments.length
      };
    });

    // Get creator payment summaries
    const creatorPayments = Object.values(
      payments.reduce((acc: any, payment) => {
        const creatorName = payment.ugc_creators?.name || 'Unknown';
        if (!acc[creatorName]) {
          acc[creatorName] = {
            creator_name: creatorName,
            total_paid: 0,
            pending_amount: 0
          };
        }
        
        if (payment.status === 'paid') {
          acc[creatorName].total_paid += payment.amount;
        } else if (payment.status === 'pending') {
          acc[creatorName].pending_amount += payment.amount;
        }
        
        return acc;
      }, {})
    ).sort((a: any, b: any) => b.total_paid - a.total_paid);

    const dashboardData = {
      overview: {
        totalPaid,
        totalDue,
        totalOverdue,
        monthlyBudget: budgetSummary
      },
      payments: {
        due: duePayments,
        overdue: overduePayments,
        recent: recentPayments,
        upcoming: upcomingPayments
      },
      analytics: {
        monthlySpend,
        paymentsByType,
        creatorPayments
      }
    };

    return NextResponse.json({ success: true, data: dashboardData });

  } catch (error) {
    console.error('Error fetching payments dashboard:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}