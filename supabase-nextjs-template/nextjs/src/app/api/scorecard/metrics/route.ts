import { NextRequest, NextResponse } from 'next/server';
import { CreateMetricRequest, MetricWithData } from '@/lib/types/scorecard';

// Mock data for development - replace with real database calls after migration
const MOCK_METRICS: MetricWithData[] = [
  {
    id: '1',
    user_id: 'user1',
    name: 'Channel Spend',
    type: 'meta_api',
    meta_metric_name: 'spend',
    weekly_goal: 10000,
    monthly_goal: 40000,
    quarterly_goal: 120000,
    annual_goal: 480000,
    status_calculation_method: 'average_based',
    display_format: 'currency',
    decimal_places: 2,
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    current_value: 8500,
    average_value: 9200,
    status: 'at_risk',
    goal_for_period: 10000,
    data_points: []
  },
  {
    id: '2',
    user_id: 'user1',
    name: 'Channel ROAS',
    type: 'meta_api',
    meta_metric_name: 'purchase_roas',
    weekly_goal: 2,
    monthly_goal: 2,
    quarterly_goal: 2,
    annual_goal: 2,
    status_calculation_method: 'average_based',
    display_format: 'number',
    decimal_places: 2,
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    current_value: 1.63,
    average_value: 1.59,
    status: 'off_track',
    goal_for_period: 2,
    data_points: []
  },
  {
    id: '3',
    user_id: 'user1',
    name: 'Prospecting ROAS',
    type: 'meta_api',
    meta_metric_name: 'purchase_roas',
    weekly_goal: 1.80,
    monthly_goal: 1.80,
    quarterly_goal: 1.80,
    annual_goal: 1.80,
    status_calculation_method: 'average_based',
    display_format: 'number',
    decimal_places: 2,
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    current_value: 1.59,
    average_value: 1.56,
    status: 'off_track',
    goal_for_period: 1.80,
    data_points: []
  },
  {
    id: '4',
    user_id: 'user1',
    name: 'Retargeting ROAS',
    type: 'meta_api',
    meta_metric_name: 'purchase_roas',
    weekly_goal: 2.5,
    monthly_goal: 2.5,
    quarterly_goal: 2.5,
    annual_goal: 2.5,
    status_calculation_method: 'average_based',
    display_format: 'number',
    decimal_places: 2,
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    current_value: 2.76,
    average_value: 2.73,
    status: 'on_track',
    goal_for_period: 2.5,
    data_points: []
  },
  {
    id: '5',
    user_id: 'user1',
    name: 'CTR (Link Clicks)',
    type: 'meta_api',
    meta_metric_name: 'ctr',
    weekly_goal: 1.25,
    monthly_goal: 1.25,
    quarterly_goal: 1.25,
    annual_goal: 1.25,
    status_calculation_method: 'average_based',
    display_format: 'percentage',
    decimal_places: 2,
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    current_value: 1.36,
    average_value: 1.42,
    status: 'on_track',
    goal_for_period: 1.25,
    data_points: []
  }
];

export async function GET() {
  try {
    // Return mock data for now
    return NextResponse.json({ metrics: MOCK_METRICS });
  } catch (error) {
    console.error('Error in scorecard metrics GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateMetricRequest = await request.json();

    // Validate required fields
    if (!body.name || !body.type) {
      return NextResponse.json({ error: 'Name and type are required' }, { status: 400 });
    }

    if (body.type === 'meta_api' && !body.meta_metric_name) {
      return NextResponse.json({ error: 'Meta metric name is required for Meta API metrics' }, { status: 400 });
    }

    if (body.type === 'custom' && !body.custom_formula) {
      return NextResponse.json({ error: 'Custom formula is required for custom metrics' }, { status: 400 });
    }

    // Create mock metric
    const newMetric: MetricWithData = {
      id: Math.random().toString(36).substr(2, 9),
      user_id: 'current-user',
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status_calculation_method: body.status_calculation_method || 'average_based',
      display_format: body.display_format || 'number',
      decimal_places: body.decimal_places || 2,
      current_value: 0,
      average_value: 0,
      status: 'off_track',
      data_points: []
    };

    return NextResponse.json({ metric: newMetric }, { status: 201 });

  } catch (error) {
    console.error('Error in scorecard metrics POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Metric ID is required' }, { status: 400 });
    }

    // Mock update - in real implementation, update database
    return NextResponse.json({ 
      metric: { 
        ...body, 
        updated_at: new Date().toISOString() 
      } 
    });

  } catch (error) {
    console.error('Error in scorecard metrics PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Metric ID is required' }, { status: 400 });
    }

    // Mock delete - in real implementation, delete from database
    return NextResponse.json({ message: 'Metric deleted successfully' });

  } catch (error) {
    console.error('Error in scorecard metrics DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 