import { Json } from './supabase';

// Contract Template types
export interface ContractTemplate {
  id: string;
  user_id: string;
  brand_id: string;
  title: string;
  description?: string | null;
  document_data: Uint8Array;
  document_name: string;
  document_size: number;
  is_active: boolean;
  fields: ContractField[];
  created_at: string;
  updated_at: string;
}

export interface CreateContractTemplate {
  title: string;
  description?: string;
  document_data: Uint8Array;
  document_name: string;
  document_size: number;
  fields?: ContractField[];
}

// Contract types
export interface Contract {
  id: string;
  template_id?: string | null;
  user_id: string;
  brand_id: string;
  creator_id?: string | null;
  script_id?: string | null;
  title: string;
  status: ContractStatus;
  document_data: Uint8Array;
  document_name: string;
  document_size: number;
  signed_document_data?: Uint8Array | null;
  completion_certificate?: CompletionCertificate | null;
  share_token?: string | null;
  expires_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  recipients?: ContractRecipient[];
  fields?: ContractField[];
  audit_logs?: ContractAuditLog[];
}

export interface CreateContract {
  template_id?: string;
  creator_id?: string;
  script_id?: string;
  title: string;
  document_data: Uint8Array;
  document_name: string;
  document_size: number;
  expires_at?: string;
  recipients: CreateContractRecipient[];
  fields: CreateContractField[];
}

// Contract Recipient types
export interface ContractRecipient {
  id: string;
  contract_id: string;
  name: string;
  email: string;
  role: RecipientRole;
  signing_order: number;
  status: RecipientStatus;
  signed_at?: string | null;
  viewed_at?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  auth_token?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateContractRecipient {
  name: string;
  email: string;
  role?: RecipientRole;
  signing_order?: number;
}

// Contract Field types
export interface ContractField {
  id: string;
  contract_id: string;
  recipient_id: string;
  type: FieldType;
  page: number;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  value?: string | null;
  is_required: boolean;
  placeholder?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateContractField {
  recipient_id: string;
  type: FieldType;
  page: number;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  is_required?: boolean;
  placeholder?: string;
}

// Contract Audit Log types
export interface ContractAuditLog {
  id: string;
  contract_id: string;
  recipient_id?: string | null;
  action: AuditAction;
  details: Json;
  ip_address?: string | null;
  user_agent?: string | null;
  timestamp: string;
}

// Completion Certificate types
export interface CompletionCertificate {
  contract_id: string;
  completed_at: string;
  recipients: {
    name: string;
    email: string;
    signed_at: string;
    ip_address?: string;
    user_agent?: string;
  }[];
  audit_trail: {
    action: string;
    timestamp: string;
    details: Json;
  }[];
  security_hash: string;
}

// Enums and constants
export type ContractStatus = 'draft' | 'sent' | 'partially_signed' | 'completed' | 'voided';

export type RecipientRole = 'signer' | 'cc' | 'viewer';

export type RecipientStatus = 'pending' | 'sent' | 'viewed' | 'signed' | 'declined';

export type FieldType = 'signature' | 'date' | 'text' | 'checkbox' | 'initial';

export type AuditAction = 'created' | 'sent' | 'viewed' | 'signed' | 'declined' | 'completed' | 'voided';

export const CONTRACT_STATUSES: ContractStatus[] = [
  'draft',
  'sent', 
  'partially_signed',
  'completed',
  'voided'
];

export const RECIPIENT_ROLES: RecipientRole[] = [
  'signer',
  'cc',
  'viewer'
];

export const RECIPIENT_STATUSES: RecipientStatus[] = [
  'pending',
  'sent',
  'viewed', 
  'signed',
  'declined'
];

export const FIELD_TYPES: FieldType[] = [
  'signature',
  'date',
  'text',
  'checkbox',
  'initial'
];

export const AUDIT_ACTIONS: AuditAction[] = [
  'created',
  'sent',
  'viewed',
  'signed',
  'declined',
  'completed',
  'voided'
];

// Utility functions
export function getContractStatusColor(status: ContractStatus): string {
  switch (status) {
    case 'draft':
      return 'gray';
    case 'sent':
      return 'blue';
    case 'partially_signed':
      return 'yellow';
    case 'completed':
      return 'green';
    case 'voided':
      return 'red';
    default:
      return 'gray';
  }
}

export function getRecipientStatusColor(status: RecipientStatus): string {
  switch (status) {
    case 'pending':
      return 'gray';
    case 'sent':
      return 'blue';
    case 'viewed':
      return 'yellow';
    case 'signed':
      return 'green';
    case 'declined':
      return 'red';
    default:
      return 'gray';
  }
}

export function isContractComplete(contract: Contract): boolean {
  return contract.status === 'completed';
}

export function canContractBeSigned(contract: Contract): boolean {
  return contract.status === 'sent' || contract.status === 'partially_signed';
}

export function getNextSigningRecipient(recipients: ContractRecipient[]): ContractRecipient | null {
  const signers = recipients
    .filter(r => r.role === 'signer')
    .sort((a, b) => a.signing_order - b.signing_order);
  
  return signers.find(r => r.status === 'sent' || r.status === 'pending') || null;
}

// Contract creation helpers
export interface ContractCreationData {
  title: string;
  templateId?: string;
  creatorId?: string;
  scriptId?: string;
  recipients: ContractRecipient[];
  fields?: SimpleField[];
  expiresInDays?: number;
}

export interface SigningLinkData {
  contractId: string;
  recipientId: string;
  authToken: string;
  contractTitle: string;
  signerName: string;
  signerEmail: string;
  expiresAt?: string;
}

// Add SimpleField interface if not already defined
export interface SimpleField {
  id: string;
  type: string;
  page: number;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  recipientId: string;
  recipientEmail: string;
} 