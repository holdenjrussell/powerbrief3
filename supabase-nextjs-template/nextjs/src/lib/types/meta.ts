export interface Campaign {
  id: string;
  name: string;
  status: string; // e.g., \"ACTIVE\", \"PAUSED\", \"ARCHIVED\"
  objective: string; // e.g., \"LINK_CLICKS\", \"CONVERSIONS\", \"BRAND_AWARENESS\"
  buying_type?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  bid_strategy?: string;
  start_time?: string;
  stop_time?: string;
  created_time?: string;
  updated_time?: string;
  // Add other campaign-specific fields as needed from the Meta API
}

export interface AdSet {
  id: string;
  name: string;
  status: string;
  campaign_id: string;
  daily_budget?: string;
  lifetime_budget?: string;
  bid_strategy?: string;
  start_time?: string;
  end_time?: string; // Note: Meta uses end_time for ad sets
  created_time?: string;
  updated_time?: string;
  targeting?: Record<string, unknown>; // Can be a complex object
  // Add other ad set-specific fields as needed
}

// You might also want a generic type for API responses from Meta if they share a structure
export interface MetaApiResponse<T> {
  data: T[];
  paging?: {
    cursors?: {
      before?: string;
      after?: string;
    };
    next?: string;
    previous?: string;
  };
  summary?: Record<string, unknown>; // If summary is sometimes present
} 