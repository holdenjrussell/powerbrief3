export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ad_draft_assets: {
        Row: {
          ad_draft_id: string
          created_at: string
          id: string
          meta_hash: string | null
          meta_upload_error: string | null
          meta_video_id: string | null
          name: string
          supabase_url: string
          type: string
        }
        Insert: {
          ad_draft_id: string
          created_at?: string
          id?: string
          meta_hash?: string | null
          meta_upload_error?: string | null
          meta_video_id?: string | null
          name: string
          supabase_url: string
          type: string
        }
        Update: {
          ad_draft_id?: string
          created_at?: string
          id?: string
          meta_hash?: string | null
          meta_upload_error?: string | null
          meta_video_id?: string | null
          name?: string
          supabase_url?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_draft_assets_ad_draft_id_fkey"
            columns: ["ad_draft_id"]
            isOneToOne: false
            referencedRelation: "ad_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_drafts: {
        Row: {
          ad_name: string
          ad_set_id: string | null
          app_status: string
          brand_id: string
          call_to_action: string | null
          campaign_id: string | null
          created_at: string
          description: string | null
          destination_url: string | null
          headline: string | null
          id: string
          meta_status: string
          primary_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ad_name: string
          ad_set_id?: string | null
          app_status?: string
          brand_id: string
          call_to_action?: string | null
          campaign_id?: string | null
          created_at?: string
          description?: string | null
          destination_url?: string | null
          headline?: string | null
          id?: string
          meta_status: string
          primary_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ad_name?: string
          ad_set_id?: string | null
          app_status?: string
          brand_id?: string
          call_to_action?: string | null
          campaign_id?: string | null
          created_at?: string
          description?: string | null
          destination_url?: string | null
          headline?: string | null
          id?: string
          meta_status?: string
          primary_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_drafts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          ad_account_id: string | null
          brand_info_data: Json | null
          competition_data: Json | null
          created_at: string
          default_designer_instructions: string | null
          default_video_instructions: string | null
          dos_and_donts: Json | null
          editing_resources: Json | null
          elevenlabs_api_key: string | null
          id: string
          meta_access_token: string | null
          meta_access_token_auth_tag: string | null
          meta_access_token_expires_at: string | null
          meta_access_token_iv: string | null
          meta_ad_account_id: string | null
          meta_facebook_page_id: string | null
          meta_instagram_actor_id: string | null
          meta_pixel_id: string | null
          meta_user_id: string | null
          name: string
          organization_id: string | null
          resource_logins: Json | null
          system_instructions_image: string | null
          system_instructions_video: string | null
          target_audience_data: Json | null
          ugc_company_description: string | null
          ugc_default_system_instructions: string | null
          ugc_filming_instructions: string | null
          ugc_guide_description: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ad_account_id?: string | null
          brand_info_data?: Json | null
          competition_data?: Json | null
          created_at?: string
          default_designer_instructions?: string | null
          default_video_instructions?: string | null
          dos_and_donts?: Json | null
          editing_resources?: Json | null
          elevenlabs_api_key?: string | null
          id?: string
          meta_access_token?: string | null
          meta_access_token_auth_tag?: string | null
          meta_access_token_expires_at?: string | null
          meta_access_token_iv?: string | null
          meta_ad_account_id?: string | null
          meta_facebook_page_id?: string | null
          meta_instagram_actor_id?: string | null
          meta_pixel_id?: string | null
          meta_user_id?: string | null
          name: string
          organization_id?: string | null
          resource_logins?: Json | null
          system_instructions_image?: string | null
          system_instructions_video?: string | null
          target_audience_data?: Json | null
          ugc_company_description?: string | null
          ugc_default_system_instructions?: string | null
          ugc_filming_instructions?: string | null
          ugc_guide_description?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ad_account_id?: string | null
          brand_info_data?: Json | null
          competition_data?: Json | null
          created_at?: string
          default_designer_instructions?: string | null
          default_video_instructions?: string | null
          dos_and_donts?: Json | null
          editing_resources?: Json | null
          elevenlabs_api_key?: string | null
          id?: string
          meta_access_token?: string | null
          meta_access_token_auth_tag?: string | null
          meta_access_token_expires_at?: string | null
          meta_access_token_iv?: string | null
          meta_ad_account_id?: string | null
          meta_facebook_page_id?: string | null
          meta_instagram_actor_id?: string | null
          meta_pixel_id?: string | null
          meta_user_id?: string | null
          name?: string
          organization_id?: string | null
          resource_logins?: Json | null
          system_instructions_image?: string | null
          system_instructions_video?: string | null
          target_audience_data?: Json | null
          ugc_company_description?: string | null
          ugc_default_system_instructions?: string | null
          ugc_filming_instructions?: string | null
          ugc_guide_description?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brands_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      brief_batches: {
        Row: {
          brand_id: string
          created_at: string
          id: string
          name: string
          share_settings: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          id?: string
          name: string
          share_settings?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          id?: string
          name?: string
          share_settings?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brief_batches_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brief_concepts: {
        Row: {
          ai_custom_prompt: string | null
          body_content_structured: Json | null
          brief_batch_id: string
          caption_hook_options: string | null
          clickup_id: string | null
          clickup_link: string | null
          concept_title: string | null
          created_at: string
          creator_footage: string | null
          cta_script: string | null
          cta_text_overlay: string | null
          description: string | null
          designer_instructions: string | null
          designerInstructions: string | null
          hook_count: number | null
          hook_type: string | null
          id: string
          linked_creator_ids: string[] | null
          media_type: string | null
          media_url: string | null
          order_in_batch: number | null
          original_creator_script: string | null
          review_link: string | null
          review_status: string | null
          reviewer_notes: string | null
          share_settings: Json | null
          spoken_hook_options: string | null
          status: string | null
          strategist: string | null
          updated_at: string
          user_id: string
          video_editor: string | null
          video_instructions: string | null
          videoInstructions: string | null
        }
        Insert: {
          ai_custom_prompt?: string | null
          body_content_structured?: Json | null
          brief_batch_id: string
          caption_hook_options?: string | null
          clickup_id?: string | null
          clickup_link?: string | null
          concept_title?: string | null
          created_at?: string
          creator_footage?: string | null
          cta_script?: string | null
          cta_text_overlay?: string | null
          description?: string | null
          designer_instructions?: string | null
          designerInstructions?: string | null
          hook_count?: number | null
          hook_type?: string | null
          id?: string
          linked_creator_ids?: string[] | null
          media_type?: string | null
          media_url?: string | null
          order_in_batch?: number | null
          original_creator_script?: string | null
          review_link?: string | null
          review_status?: string | null
          reviewer_notes?: string | null
          share_settings?: Json | null
          spoken_hook_options?: string | null
          status?: string | null
          strategist?: string | null
          updated_at?: string
          user_id: string
          video_editor?: string | null
          video_instructions?: string | null
          videoInstructions?: string | null
        }
        Update: {
          ai_custom_prompt?: string | null
          body_content_structured?: Json | null
          brief_batch_id?: string
          caption_hook_options?: string | null
          clickup_id?: string | null
          clickup_link?: string | null
          concept_title?: string | null
          created_at?: string
          creator_footage?: string | null
          cta_script?: string | null
          cta_text_overlay?: string | null
          description?: string | null
          designer_instructions?: string | null
          designerInstructions?: string | null
          hook_count?: number | null
          hook_type?: string | null
          id?: string
          linked_creator_ids?: string[] | null
          media_type?: string | null
          media_url?: string | null
          order_in_batch?: number | null
          original_creator_script?: string | null
          review_link?: string | null
          review_status?: string | null
          reviewer_notes?: string | null
          share_settings?: Json | null
          spoken_hook_options?: string | null
          status?: string | null
          strategist?: string | null
          updated_at?: string
          user_id?: string
          video_editor?: string | null
          video_instructions?: string | null
          videoInstructions?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brief_concepts_brief_batch_id_fkey"
            columns: ["brief_batch_id"]
            isOneToOne: false
            referencedRelation: "brief_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string | null
          role: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id?: string | null
          role: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string | null
          role?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          settings: Json | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          settings?: Json | null
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          settings?: Json | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      share_activities: {
        Row: {
          created_at: string | null
          id: string
          recipient_email: string | null
          resource_id: string
          resource_type: string
          share_id: string
          share_url: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          recipient_email?: string | null
          resource_id: string
          resource_type: string
          share_id: string
          share_url: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          recipient_email?: string | null
          resource_id?: string
          resource_type?: string
          share_id?: string
          share_url?: string
          user_id?: string
        }
        Relationships: []
      }
      todo_list: {
        Row: {
          created_at: string
          description: string | null
          done: boolean
          done_at: string | null
          id: number
          owner: string
          title: string
          urgent: boolean
        }
        Insert: {
          created_at?: string
          description?: string | null
          done?: boolean
          done_at?: string | null
          id?: number
          owner: string
          title: string
          urgent?: boolean
        }
        Update: {
          created_at?: string
          description?: string | null
          done?: boolean
          done_at?: string | null
          id?: number
          owner?: string
          title?: string
          urgent?: boolean
        }
        Relationships: []
      }
      ugc_creator_scripts: {
        Row: {
          ai_custom_prompt: string | null
          b_roll_shot_list: Json | null
          brand_id: string
          company_description: string | null
          concept_status: string | null
          created_at: string
          creative_strategist: string | null
          creator_footage: string | null
          creator_id: string
          cta: string | null
          deposit_amount: number | null
          deposit_paid_date: string | null
          filming_instructions: string | null
          final_content_link: string | null
          final_payment_amount: number | null
          final_payment_paid_date: string | null
          guide_description: string | null
          hook_body: string | null
          hook_count: number | null
          hook_type: string | null
          id: string
          inspiration_video_notes: string | null
          inspiration_video_url: string | null
          is_ai_generated: boolean | null
          linked_brief_batch_id: string | null
          linked_brief_concept_id: string | null
          media_type: string | null
          metadata: Json | null
          original_creator_script: string | null
          payment_notes: string | null
          payment_status: string | null
          public_share_id: string | null
          revision_notes: string | null
          script_content: Json | null
          status: string | null
          system_instructions: string | null
          title: string
          ugc_guide_description: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_custom_prompt?: string | null
          b_roll_shot_list?: Json | null
          brand_id: string
          company_description?: string | null
          concept_status?: string | null
          created_at?: string
          creative_strategist?: string | null
          creator_footage?: string | null
          creator_id: string
          cta?: string | null
          deposit_amount?: number | null
          deposit_paid_date?: string | null
          filming_instructions?: string | null
          final_content_link?: string | null
          final_payment_amount?: number | null
          final_payment_paid_date?: string | null
          guide_description?: string | null
          hook_body?: string | null
          hook_count?: number | null
          hook_type?: string | null
          id?: string
          inspiration_video_notes?: string | null
          inspiration_video_url?: string | null
          is_ai_generated?: boolean | null
          linked_brief_batch_id?: string | null
          linked_brief_concept_id?: string | null
          media_type?: string | null
          metadata?: Json | null
          original_creator_script?: string | null
          payment_notes?: string | null
          payment_status?: string | null
          public_share_id?: string | null
          revision_notes?: string | null
          script_content?: Json | null
          status?: string | null
          system_instructions?: string | null
          title: string
          ugc_guide_description?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_custom_prompt?: string | null
          b_roll_shot_list?: Json | null
          brand_id?: string
          company_description?: string | null
          concept_status?: string | null
          created_at?: string
          creative_strategist?: string | null
          creator_footage?: string | null
          creator_id?: string
          cta?: string | null
          deposit_amount?: number | null
          deposit_paid_date?: string | null
          filming_instructions?: string | null
          final_content_link?: string | null
          final_payment_amount?: number | null
          final_payment_paid_date?: string | null
          guide_description?: string | null
          hook_body?: string | null
          hook_count?: number | null
          hook_type?: string | null
          id?: string
          inspiration_video_notes?: string | null
          inspiration_video_url?: string | null
          is_ai_generated?: boolean | null
          linked_brief_batch_id?: string | null
          linked_brief_concept_id?: string | null
          media_type?: string | null
          metadata?: Json | null
          original_creator_script?: string | null
          payment_notes?: string | null
          payment_status?: string | null
          public_share_id?: string | null
          revision_notes?: string | null
          script_content?: Json | null
          status?: string | null
          system_instructions?: string | null
          title?: string
          ugc_guide_description?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_creator_scripts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_creator_scripts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "ugc_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_creator_scripts_linked_brief_batch_id_fkey"
            columns: ["linked_brief_batch_id"]
            isOneToOne: false
            referencedRelation: "brief_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_creator_scripts_linked_brief_concept_id_fkey"
            columns: ["linked_brief_concept_id"]
            isOneToOne: false
            referencedRelation: "brief_concepts"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_creators: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          brand_id: string
          city: string | null
          contacted_by: string | null
          content_types: Json | null
          contract_status: string | null
          country: string | null
          created_at: string
          email: string | null
          gender: string | null
          id: string
          instagram_handle: string | null
          name: string
          per_script_fee: number | null
          phone_number: string | null
          platforms: Json | null
          portfolio_link: string | null
          product_shipment_status: string | null
          product_shipped: boolean | null
          products: Json | null
          state: string | null
          status: string | null
          tiktok_handle: string | null
          tracking_number: string | null
          updated_at: string
          user_id: string
          zip: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          brand_id: string
          city?: string | null
          contacted_by?: string | null
          content_types?: Json | null
          contract_status?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          gender?: string | null
          id?: string
          instagram_handle?: string | null
          name: string
          per_script_fee?: number | null
          phone_number?: string | null
          platforms?: Json | null
          portfolio_link?: string | null
          product_shipment_status?: string | null
          product_shipped?: boolean | null
          products?: Json | null
          state?: string | null
          status?: string | null
          tiktok_handle?: string | null
          tracking_number?: string | null
          updated_at?: string
          user_id: string
          zip?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          brand_id?: string
          city?: string | null
          contacted_by?: string | null
          content_types?: Json | null
          contract_status?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          gender?: string | null
          id?: string
          instagram_handle?: string | null
          name?: string
          per_script_fee?: number | null
          phone_number?: string | null
          platforms?: Json | null
          portfolio_link?: string | null
          product_shipment_status?: string | null
          product_shipped?: boolean | null
          products?: Json | null
          state?: string | null
          status?: string | null
          tiktok_handle?: string | null
          tracking_number?: string | null
          updated_at?: string
          user_id?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ugc_creators_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_script_shares: {
        Row: {
          brand_id: string
          created_at: string
          creator_id: string
          id: string
          scripts: Json | null
          share_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          creator_id: string
          id?: string
          scripts?: Json | null
          share_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          creator_id?: string
          id?: string
          scripts?: Json | null
          share_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_script_shares_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_script_shares_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "ugc_creators"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: {
        Args: { lookup_invitation_token: string }
        Returns: Json
      }
      create_account: {
        Args: { slug?: string; name?: string }
        Returns: Json
      }
      create_invitation: {
        Args: {
          account_id: string
          account_role: "owner" | "member"
          invitation_type: "one_time" | "24_hour"
        }
        Returns: Json
      }
      current_user_account_role: {
        Args: { account_id: string }
        Returns: Json
      }
      delete_invitation: {
        Args: { invitation_id: string }
        Returns: undefined
      }
      get_account: {
        Args: { account_id: string }
        Returns: Json
      }
      get_account_billing_status: {
        Args: { account_id: string }
        Returns: Json
      }
      get_account_by_slug: {
        Args: { slug: string }
        Returns: Json
      }
      get_account_id: {
        Args: { slug: string }
        Returns: string
      }
      get_account_invitations: {
        Args: {
          account_id: string
          results_limit?: number
          results_offset?: number
        }
        Returns: Json
      }
      get_account_members: {
        Args: {
          account_id: string
          results_limit?: number
          results_offset?: number
        }
        Returns: Json
      }
      get_accounts: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_my_todo_list: {
        Args: {
          page_num: number
          page_size_num: number
          sort_column: string
          filter_done_status?: boolean
        }
        Returns: {
          created_at: string
          description: string | null
          done: boolean
          done_at: string | null
          id: number
          owner: string
          title: string
          urgent: boolean
        }[]
      }
      get_personal_account: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_user_organizations: {
        Args: { user_id_param: string }
        Returns: {
          created_at: string
          id: string
          name: string
          settings: Json | null
          type: string
          updated_at: string
        }[]
      }
      is_member_of_organization: {
        Args: { org_id: string }
        Returns: boolean
      }
      is_user_authenticated: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      lookup_invitation: {
        Args: { lookup_invitation_token: string }
        Returns: Json
      }
      remove_account_member: {
        Args: { account_id: string; user_id: string }
        Returns: undefined
      }
      service_role_upsert_customer_subscription: {
        Args: { account_id: string; customer?: Json; subscription?: Json }
        Returns: undefined
      }
      update_account: {
        Args: {
          account_id: string
          slug?: string
          name?: string
          public_metadata?: Json
          replace_metadata?: boolean
        }
        Returns: Json
      }
      update_account_user_role: {
        Args: {
          account_id: string
          user_id: string
          new_account_role: "owner" | "member"
          make_primary_owner?: boolean
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
