// Types for UGC Dashboard components - Payments, Contracts, and Shipments

// Payment Management Types
export interface UgcPayment {
  id: string;
  brand_id: string;
  creator_id: string;
  script_id?: string;
  payment_type: 'deposit' | 'final' | 'bonus' | 'expense_reimbursement';
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled';
  due_date?: string;
  paid_date?: string;
  payment_method?: string;
  transaction_id?: string;
  invoice_number?: string;
  notes?: string;
  reminder_sent_count: number;
  last_reminder_sent?: string;
  created_by?: string;
  paid_by?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  creator_name?: string;
  creator_email?: string;
  script_title?: string;
}

export interface UgcMonthlyBudget {
  id: string;
  brand_id: string;
  month_year: string; // YYYY-MM-DD format (first day of month)
  budget_amount: number;
  spent_amount: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface BudgetSummary {
  budget_amount: number;
  spent_amount: number;
  remaining_amount: number;
  percentage_used: number;
}

export interface PaymentDashboardData {
  overview: {
    totalPaid: number;
    totalDue: number;
    totalOverdue: number;
    monthlyBudget: BudgetSummary;
  };
  payments: {
    due: UgcPayment[];
    overdue: UgcPayment[];
    recent: UgcPayment[];
    upcoming: UgcPayment[];
  };
  analytics: {
    monthlySpend: Array<{ month: string; amount: number }>;
    paymentsByType: Array<{ type: string; amount: number; count: number }>;
    creatorPayments: Array<{ creator_name: string; total_paid: number; pending_amount: number }>;
  };
}

// Contract data structure for dynamic fields
export interface ContractFieldValue {
  field_name: string;
  field_type: 'text' | 'number' | 'date' | 'boolean' | 'email';
  value: string | number | boolean;
  required: boolean;
}

// Contract Management Types
export interface UgcContract {
  id: string;
  brand_id: string;
  creator_id: string;
  workflow_execution_id?: string;
  template_id?: string;
  opensign_document_id?: string;
  contract_title: string;
  contract_type: 'creator_agreement' | 'nda' | 'usage_rights' | 'custom';
  status: 'draft' | 'sent' | 'viewed' | 'signed' | 'completed' | 'expired' | 'cancelled';
  contract_data: Record<string, ContractFieldValue>;
  signing_url?: string;
  signed_document_url?: string;
  sent_at?: string;
  viewed_at?: string;
  signed_at?: string;
  expires_at?: string;
  reminder_count: number;
  last_reminder_sent?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  creator_name?: string;
  creator_email?: string;
  template_name?: string;
}

export interface UgcContractTemplate {
  id: string;
  brand_id: string;
  name: string;
  description?: string;
  contract_type: 'creator_agreement' | 'nda' | 'usage_rights' | 'custom';
  template_content: string;
  required_fields: string[];
  optional_fields: string[];
  opensign_template_id?: string;
  is_active: boolean;
  version: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ContractDashboardData {
  overview: {
    totalContracts: number;
    pendingSignatures: number;
    signedThisMonth: number;
    expiringSoon: number;
  };
  contracts: {
    pending: UgcContract[];
    expiring: UgcContract[];
    recent: UgcContract[];
  };
  templates: UgcContractTemplate[];
}

// Shipment Management Types
export interface UgcShipment {
  id: string;
  brand_id: string;
  creator_id: string;
  workflow_execution_id?: string;
  shipment_title: string;
  products: ShipmentProduct[];
  shipping_address: ShippingAddress;
  status: 'pending' | 'processing' | 'packed' | 'shipped' | 'in_transit' | 'delivered' | 'returned' | 'cancelled';
  priority: 'low' | 'standard' | 'high' | 'urgent';
  shipping_method?: string;
  carrier?: string;
  tracking_number?: string;
  tracking_url?: string;
  estimated_delivery?: string;
  shipped_at?: string;
  delivered_at?: string;
  shipping_cost?: number;
  weight_lbs?: number;
  dimensions?: ShipmentDimensions;
  special_instructions?: string;
  slack_notification_sent: boolean;
  slack_message_ts?: string;
  created_by?: string;
  processed_by?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  creator_name?: string;
  creator_email?: string;
  history?: UgcShipmentHistory[];
}

export interface ShipmentProduct {
  id: string;
  name: string;
  sku?: string;
  quantity: number;
  description?: string;
  value?: number;
}

export interface ShippingAddress {
  name: string;
  company?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone?: string;
}

export interface ShipmentDimensions {
  length: number;
  width: number;
  height: number;
  unit: 'in' | 'cm';
}

export interface UgcShipmentHistory {
  id: string;
  shipment_id: string;
  status: string;
  notes?: string;
  location?: string;
  updated_by?: string;
  created_at: string;
}

export interface ShipmentDashboardData {
  overview: {
    totalShipments: number;
    pendingShipments: number;
    inTransit: number;
    deliveredThisMonth: number;
  };
  shipments: {
    pending: UgcShipment[];
    processing: UgcShipment[];
    inTransit: UgcShipment[];
    recent: UgcShipment[];
  };
  analytics: {
    shippingCosts: Array<{ month: string; cost: number }>;
    carrierPerformance: Array<{ carrier: string; deliveries: number; avgDays: number }>;
  };
}

// Slack Integration Types
export interface SlackShipmentNotification {
  creatorName: string;
  creatorEmail: string;
  shippingAddress: ShippingAddress;
  products: ShipmentProduct[];
  priority: string;
  dashboardLink: string;
  shipmentId: string;
}

export interface SlackMessage {
  text: string;
  blocks: SlackBlock[];
}

export interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
  };
  elements?: SlackElement[];
}

export interface SlackElement {
  type: string;
  text?: {
    type: string;
    text: string;
  };
  url?: string;
  style?: string;
  action_id?: string;
}

// OpenSign Integration Types
export interface OpenSignConfig {
  apiUrl: string;
  apiKey: string;
  webhookUrl: string;
}

export interface OpenSignDocument {
  id: string;
  name: string;
  status: string;
  signers: OpenSignSigner[];
  created_at: string;
  completed_at?: string;
  document_url?: string;
}

export interface OpenSignSigner {
  email: string;
  name: string;
  role: string;
  status: 'pending' | 'signed' | 'declined';
  signed_at?: string;
}

export interface OpenSignTemplate {
  id: string;
  name: string;
  fields: OpenSignField[];
  created_at: string;
}

export interface OpenSignField {
  id: string;
  name: string;
  type: 'text' | 'signature' | 'date' | 'checkbox';
  required: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
}

// Dashboard Navigation Types
export type DashboardView = 'payments' | 'contracts' | 'shipments';

export interface DashboardTab {
  id: DashboardView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

// Form Types for Creating/Editing
export interface CreatePaymentForm {
  creator_id: string;
  script_id?: string;
  payment_type: UgcPayment['payment_type'];
  amount: number;
  currency: string;
  due_date?: string;
  payment_method?: string;
  notes?: string;
}

export interface CreateContractForm {
  creator_id: string;
  template_id: string;
  contract_title: string;
  contract_data: Record<string, ContractFieldValue>;
  expires_in_days?: number;
}

export interface CreateShipmentForm {
  creator_id: string;
  shipment_title: string;
  products: ShipmentProduct[];
  shipping_address: ShippingAddress;
  priority: UgcShipment['priority'];
  shipping_method?: string;
  special_instructions?: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Filter and Sort Types
export interface PaymentFilters {
  status?: UgcPayment['status'][];
  payment_type?: UgcPayment['payment_type'][];
  creator_id?: string;
  date_range?: {
    start: string;
    end: string;
  };
}

export interface ContractFilters {
  status?: UgcContract['status'][];
  contract_type?: UgcContract['contract_type'][];
  creator_id?: string;
  template_id?: string;
}

export interface ShipmentFilters {
  status?: UgcShipment['status'][];
  priority?: UgcShipment['priority'][];
  creator_id?: string;
  carrier?: string;
}

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: string;
  direction: SortDirection;
}

// Export utility types
export type PaymentStatus = UgcPayment['status'];
export type PaymentType = UgcPayment['payment_type'];
export type ContractStatus = UgcContract['status'];
export type ContractType = UgcContract['contract_type'];
export type ShipmentStatus = UgcShipment['status'];
export type ShipmentPriority = UgcShipment['priority'];