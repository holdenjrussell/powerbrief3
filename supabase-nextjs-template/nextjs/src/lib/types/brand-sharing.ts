export type BrandShareRole = 'viewer' | 'editor';
export type BrandShareStatus = 'pending' | 'accepted' | 'rejected';

export interface BrandShare {
  id: string;
  brand_id: string;
  shared_by_user_id: string;
  shared_with_user_id: string | null;
  shared_with_email: string;
  role: BrandShareRole;
  status: BrandShareStatus;
  invitation_token: string;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
}

export interface BrandShareWithDetails extends BrandShare {
  brand?: {
    id: string;
    name: string;
  };
  shared_by_user?: {
    email: string;
    full_name?: string;
  };
  shared_with_user?: {
    email: string;
    full_name?: string;
  };
}

export interface SharedUser {
  share_id: string;
  user_id: string | null;
  email: string;
  full_name: string;
  role: BrandShareRole;
  status: BrandShareStatus;
  shared_at: string;
  accepted_at: string | null;
}

export interface CreateBrandShareRequest {
  brand_id: string;
  email: string;
  role: BrandShareRole;
}

export interface AcceptBrandShareResult {
  success: boolean;
  error?: string;
  brand_id?: string;
  share_id?: string;
} 