export type MetricType = 'meta_api' | 'custom';
export type TimePeriod = 'weekly' | 'monthly' | 'quarterly' | 'annual';
export type DisplayFormat = 'number' | 'currency' | 'percentage';
export type StatusCalculationMethod = 'average_based' | 'trend_based' | 'threshold_based';
export type MetricStatus = 'on_track' | 'at_risk' | 'off_track';

// Campaign filter operators
export type FilterOperator = 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'equals' | 'not_equals';

export interface CampaignFilter {
  operator: FilterOperator;
  value: string;
  case_sensitive?: boolean;
}

export interface AdSetFilter {
  operator: FilterOperator;
  value: string;
  case_sensitive?: boolean;
}

export interface AdFilter {
  operator: FilterOperator;
  value: string;
  case_sensitive?: boolean;
}

export interface ScorecardMetric {
  id: string;
  brand_id: string;
  team_id?: string;
  metric_key: string;
  display_name: string;
  description?: string;
  metric_type: 'meta_api' | 'calculated';
  formula: MetricFormula[];
  goal_value?: number;
  goal_operator?: 'gte' | 'gt' | 'lte' | 'lt' | 'eq';
  weekly_goal_value?: number;
  weekly_goal_operator?: 'gte' | 'gt' | 'lte' | 'lt' | 'eq';
  monthly_goal_value?: number;
  monthly_goal_operator?: 'gte' | 'gt' | 'lte' | 'lt' | 'eq';
  quarterly_goal_value?: number;
  quarterly_goal_operator?: 'gte' | 'gt' | 'lte' | 'lt' | 'eq';
  is_percentage?: boolean;
  is_currency?: boolean;
  decimal_places?: number;
  created_at: string;
  updated_at: string;
}

export interface MetricFormula {
  type: 'metric' | 'operator' | 'number';
  value: string;
}

export interface MetricData {
  metric_id: string;
  period_start: string;
  period_end: string;
  value: number;
  raw_data?: Record<string, unknown>;
}

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

export interface MetricWithData extends ScorecardMetric {
  data?: {
    current: number;
    average: number;
    trend?: 'up' | 'down' | 'stable';
    periods: Array<{
      period: string;
      value: number;
    }>;
  };
}

// Predefined metrics - hardcoded list
export const PREDEFINED_METRICS: Omit<ScorecardMetric, 'id' | 'brand_id' | 'team_id' | 'created_at' | 'updated_at'>[] = [
  // Core Performance Metrics
  {
    metric_key: 'purchase_roas',
    display_name: 'Purchase ROAS',
    description: 'Return on ad spend from all purchase sources',
    metric_type: 'calculated',
    formula: [
      { type: 'metric', value: 'purchase_value' },
      { type: 'operator', value: '/' },
      { type: 'metric', value: 'spend' }
    ],
    decimal_places: 2,
    goal_operator: 'gte'
  },
  {
    metric_key: 'purchase_value',
    display_name: 'Purchase Value',
    description: 'Total value from all purchase sources',
    metric_type: 'meta_api',
    formula: [{ type: 'metric', value: 'purchase_value' }],
    is_currency: true,
    decimal_places: 2,
    goal_operator: 'gte'
  },
  {
    metric_key: 'revenue',
    display_name: 'Revenue',
    description: 'Total revenue from all purchase sources',
    metric_type: 'meta_api',
    formula: [{ type: 'metric', value: 'purchase_value' }],
    is_currency: true,
    decimal_places: 2,
    goal_operator: 'gte'
  },
  {
    metric_key: 'spend',
    display_name: 'Ad Spend',
    description: 'Total amount spent on ads',
    metric_type: 'meta_api',
    formula: [{ type: 'metric', value: 'spend' }],
    is_currency: true,
    decimal_places: 2,
    goal_operator: 'lte'
  },
  {
    metric_key: 'purchases',
    display_name: 'Purchases',
    description: 'Total number of purchases',
    metric_type: 'meta_api',
    formula: [{ type: 'metric', value: 'purchases' }],
    decimal_places: 0,
    goal_operator: 'gte'
  },
  {
    metric_key: 'cost_per_purchase',
    display_name: 'Cost per Purchase',
    description: 'Average cost for each purchase',
    metric_type: 'calculated',
    formula: [
      { type: 'metric', value: 'spend' },
      { type: 'operator', value: '/' },
      { type: 'metric', value: 'purchases' }
    ],
    is_currency: true,
    decimal_places: 2,
    goal_operator: 'lte'
  },
  
  // Engagement Metrics
  {
    metric_key: 'ctr',
    display_name: 'CTR (All)',
    description: 'Click-through rate for all clicks',
    metric_type: 'meta_api',
    formula: [{ type: 'metric', value: 'ctr' }],
    is_percentage: true,
    decimal_places: 2,
    goal_operator: 'gte'
  },
  {
    metric_key: 'link_ctr',
    display_name: 'Link CTR',
    description: 'Click-through rate for link clicks only',
    metric_type: 'calculated',
    formula: [
      { type: 'metric', value: 'link_clicks' },
      { type: 'operator', value: '/' },
      { type: 'metric', value: 'impressions' },
      { type: 'operator', value: '*' },
      { type: 'number', value: '100' }
    ],
    is_percentage: true,
    decimal_places: 2,
    goal_operator: 'gte'
  },
  {
    metric_key: 'cpm',
    display_name: 'CPM',
    description: 'Cost per 1,000 impressions',
    metric_type: 'meta_api',
    formula: [{ type: 'metric', value: 'cpm' }],
    is_currency: true,
    decimal_places: 2,
    goal_operator: 'lte'
  },
  {
    metric_key: 'cpc',
    display_name: 'CPC (All)',
    description: 'Cost per click (all clicks)',
    metric_type: 'meta_api',
    formula: [{ type: 'metric', value: 'cpc' }],
    is_currency: true,
    decimal_places: 2,
    goal_operator: 'lte'
  }
];

// Meta API field mappings
export const META_FIELD_MAPPINGS: Record<string, string> = {
  'spend': 'spend',
  'impressions': 'impressions',
  'clicks': 'clicks',
  'cpm': 'cpm',
  'cpc': 'cpc',
  'ctr': 'ctr',
  'purchases': 'actions:omni_purchase',
  'purchase_value': 'action_values:omni_purchase',
  'purchase_roas': 'purchase_roas',
  'link_clicks': 'inline_link_clicks',
  'unique_link_clicks': 'unique_inline_link_clicks',
  'cost_per_unique_link_click': 'cost_per_unique_inline_link_click',
  'cost_per_purchase': 'cost_per_action_type:omni_purchase'
};

// Helper to format metric values
export function formatMetricValue(value: number | undefined | null, metric: ScorecardMetric): string {
  if (value === undefined || value === null || isNaN(value)) return '--';
  
  if (metric.is_percentage) {
    return `${value.toFixed(metric.decimal_places || 2)}%`;
  } else if (metric.is_currency) {
    return `$${value.toLocaleString(undefined, { 
      minimumFractionDigits: metric.decimal_places || 2, 
      maximumFractionDigits: metric.decimal_places || 2 
    })}`;
  } else if (metric.metric_key.includes('roas')) {
    return `${value.toFixed(metric.decimal_places || 2)}x`;
  } else {
    return value.toLocaleString(undefined, { 
      maximumFractionDigits: metric.decimal_places || 0 
    });
  }
}

// Helper to get metric status
export function getMetricStatus(current: number, goal?: number, operator?: string): 'on-track' | 'at-risk' | 'off-track' | 'none' {
  if (!goal || !operator) return 'none';
  
  let isOnTrack = false;
  switch (operator) {
    case 'gte':
      isOnTrack = current >= goal;
      break;
    case 'gt':
      isOnTrack = current > goal;
      break;
    case 'lte':
      isOnTrack = current <= goal;
      break;
    case 'lt':
      isOnTrack = current < goal;
      break;
    case 'eq':
      isOnTrack = current === goal;
      break;
    default:
      isOnTrack = current >= goal;
  }
  
  if (isOnTrack) return 'on-track';
  
  const percentageOff = Math.abs((current - goal) / goal) * 100;
  if (percentageOff > 20) return 'off-track';
  return 'at-risk';
}

export interface ScorecardViewOptions {
  time_period: TimePeriod;
  show_goals: boolean;
  sort_by: 'name' | 'status' | 'value';
  filter_status?: MetricStatus;
}

// Updated Meta API metrics with user's requested fields
export const META_API_METRICS = [
  // Meta Platform Metrics (organized by category)
  
  // Spend & Revenue Metrics
  {
    name: 'Spend',
    meta_metric_name: 'spend',
    meta_level: 'account' as const,
    display_format: 'currency' as const,
    decimal_places: 2,
    description: 'Total advertising spend across all campaigns',
    requires_configuration: true,
    platform: 'meta'
  },
  {
    name: 'Revenue',
    meta_metric_name: 'omni_purchase_value', // Changed to omni purchase value for all purchase sources
    meta_level: 'account' as const,
    display_format: 'currency' as const,
    decimal_places: 2,
    description: 'Total revenue from all purchase sources (website, app, offline)',
    requires_configuration: true,
    platform: 'meta'
  },
  {
    name: 'Purchases',
    meta_metric_name: 'omni_purchase', // Changed to omni purchase for all purchase sources
    meta_level: 'account' as const,
    display_format: 'number' as const,
    decimal_places: 0,
    description: 'Total number of purchases from all sources',
    requires_configuration: true,
    platform: 'meta'
  },
  
  // ROAS Metrics
  {
    name: 'Purchase ROAS',
    meta_metric_name: 'omni_purchase_roas', // Changed to omni purchase ROAS
    meta_level: 'account' as const,
    display_format: 'number' as const,
    decimal_places: 2,
    description: 'Return on ad spend for all purchase sources',
    requires_configuration: true,
    default_campaign_filter: { operator: 'contains' as FilterOperator, value: 'prospecting', case_sensitive: false },
    platform: 'meta'
  },
  {
    name: 'Prospecting ROAS',
    meta_metric_name: 'omni_purchase_roas', // Changed to omni purchase ROAS
    meta_level: 'campaign' as const,
    display_format: 'number' as const,
    decimal_places: 2,
    description: 'ROAS for prospecting campaigns (all purchase sources)',
    requires_configuration: true,
    default_campaign_filter: { operator: 'contains' as FilterOperator, value: 'prospecting', case_sensitive: false },
    platform: 'meta'
  },
  {
    name: 'Retargeting ROAS',
    meta_metric_name: 'omni_purchase_roas', // Changed to omni purchase ROAS
    meta_level: 'campaign' as const,
    display_format: 'number' as const,
    decimal_places: 2,
    description: 'ROAS for retargeting campaigns (all purchase sources)',
    requires_configuration: true,
    default_campaign_filter: { operator: 'contains' as FilterOperator, value: 'retargeting', case_sensitive: false },
    platform: 'meta'
  },
  
  // Click Metrics
  {
    name: 'Link Clicks',
    meta_metric_name: 'link_clicks', // Updated from 'link_click'
    meta_level: 'account' as const,
    display_format: 'number' as const,
    decimal_places: 0,
    description: 'Total link clicks',
    requires_configuration: true,
    platform: 'meta'
  },
  {
    name: 'Cost Per Link Click',
    meta_metric_name: 'cpc',
    meta_level: 'account' as const,
    display_format: 'currency' as const,
    decimal_places: 2,
    description: 'Cost per link click',
    requires_configuration: true,
    platform: 'meta'
  },
  {
    name: 'Link Click Through Rate',
    meta_metric_name: 'ctr',
    meta_level: 'account' as const,
    display_format: 'percentage' as const,
    decimal_places: 2,
    description: 'Click-through rate for link clicks',
    requires_configuration: true,
    platform: 'meta'
  },
  
  // Impression & Reach Metrics
  {
    name: 'Impressions',
    meta_metric_name: 'impressions',
    meta_level: 'account' as const,
    display_format: 'number' as const,
    decimal_places: 0,
    description: 'Total ad impressions',
    requires_configuration: true,
    platform: 'meta'
  },
  {
    name: 'Reach',
    meta_metric_name: 'reach',
    meta_level: 'account' as const,
    display_format: 'number' as const,
    decimal_places: 0,
    description: 'Total unique people reached',
    requires_configuration: true,
    platform: 'meta'
  },
  {
    name: 'Frequency',
    meta_metric_name: 'frequency',
    meta_level: 'account' as const,
    display_format: 'number' as const,
    decimal_places: 2,
    description: 'Average number of times each person saw your ads',
    requires_configuration: true,
    platform: 'meta'
  },
  
  // Video Metrics
  {
    name: '3 Second Video Views',
    meta_metric_name: 'video_3s_watched_actions_value', // Correct Meta API field
    meta_level: 'account' as const,
    display_format: 'number' as const,
    decimal_places: 0,
    description: 'Number of 3-second video views',
    requires_configuration: true,
    platform: 'meta'
  },
  {
    name: 'ThruPlays',
    meta_metric_name: 'video_thruplay_watched_actions_value', // Correct Meta API field
    meta_level: 'account' as const,
    display_format: 'number' as const,
    decimal_places: 0,
    description: 'Number of video ThruPlays (watched to completion or 15+ seconds)',
    requires_configuration: true,
    platform: 'meta'
  },
  
  // Cost Metrics
  {
    name: 'Cost Per Purchase',
    meta_metric_name: 'cost_per_purchase',
    meta_level: 'account' as const,
    display_format: 'currency' as const,
    decimal_places: 2,
    description: 'Average cost per purchase',
    requires_configuration: true,
    platform: 'meta'
  },
  {
    name: 'CPM',
    meta_metric_name: 'cpm',
    meta_level: 'account' as const,
    display_format: 'currency' as const,
    decimal_places: 2,
    description: 'Cost per thousand impressions',
    requires_configuration: true,
    platform: 'meta'
  }
];

export interface CreateMetricRequest {
  name: string;
  description?: string;
  type: MetricType;
  meta_metric_name?: string;
  meta_ad_account_id?: string;
  meta_level?: 'account' | 'campaign' | 'adset' | 'ad';
  meta_breakdowns?: string[];
  custom_metrics_used?: string[];
  weekly_goal?: number;
  monthly_goal?: number;
  quarterly_goal?: number;
  annual_goal?: number;
  status_calculation_method?: StatusCalculationMethod;
  display_format?: DisplayFormat;
  decimal_places?: number;
}

export interface UpdateMetricRequest extends Partial<CreateMetricRequest> {
  id: string;
}

// Types for API requests/responses
export interface MetricDataRequest {
  brandId: string;
  teamId?: string;
  metrics: string[]; // Array of metric keys
  dateRanges: Array<{
    start: string;
    end: string;
  }>;
}

export interface MetricDataResponse {
  success: boolean;
  data: Record<string, Array<{
    period: string;
    value: number;
    raw_data?: Record<string, unknown>;
  }>>;
  errors?: Array<{
    metric_key: string;
    error: string;
  }>;
} 