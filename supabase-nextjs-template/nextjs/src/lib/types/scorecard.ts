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
  user_id: string;
  name: string;
  description?: string;
  type: MetricType;
  
  // Meta API specific fields
  meta_metric_name?: string; // 'spend', 'impressions', 'clicks', 'roas', etc.
  meta_ad_account_id?: string;
  meta_level?: 'account' | 'campaign' | 'adset' | 'ad';
  meta_breakdowns?: string[];
  
  // Campaign filtering
  campaign_name_filters?: CampaignFilter[];
  is_default_metric?: boolean;
  requires_configuration?: boolean;
  
  // Custom metric fields
  custom_formula?: CustomFormula;
  custom_metrics_used?: string[];
  
  // Goals
  weekly_goal?: number;
  monthly_goal?: number;
  quarterly_goal?: number;
  annual_goal?: number;
  
  status_calculation_method: StatusCalculationMethod;
  display_format: DisplayFormat;
  decimal_places: number;
  
  created_at: string;
  updated_at: string;
}

export interface CustomFormula {
  operation: 'add' | 'subtract' | 'multiply' | 'divide';
  operands: (string | number | CustomFormula)[]; // Can be metric IDs, constants, or nested formulas
  description?: string;
}

export interface MetricData {
  id: string;
  metric_id: string;
  time_period: TimePeriod;
  period_start_date: string;
  period_end_date: string;
  value: number;
  raw_meta_data?: Record<string, unknown>;
  calculation_details?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MetricWithData extends ScorecardMetric {
  current_value?: number;
  average_value?: number;
  status: MetricStatus;
  data_points: MetricData[];
  goal_for_period?: number;
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
  custom_formula?: CustomFormula;
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