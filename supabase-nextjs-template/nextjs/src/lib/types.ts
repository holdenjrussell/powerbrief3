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
      ad_batches: {
        Row: {
          ad_account_id: string | null
          ad_set_id: string | null
          advantage_plus_creative: Json | null
          brand_id: string
          call_to_action: string | null
          campaign_id: string | null
          created_at: string
          description: string | null
          destination_url: string | null
          fb_page_id: string | null
          headline: string | null
          id: string
          ig_account_id: string | null
          info_labels: Json | null
          is_active: boolean | null
          last_accessed_at: string | null
          name: string
          pixel_id: string | null
          primary_text: string | null
          site_links: Json | null
          status: string | null
          updated_at: string
          url_params: string | null
          user_id: string
        }
        Insert: {
          ad_account_id?: string | null
          ad_set_id?: string | null
          advantage_plus_creative?: Json | null
          brand_id: string
          call_to_action?: string | null
          campaign_id?: string | null
          created_at?: string
          description?: string | null
          destination_url?: string | null
          fb_page_id?: string | null
          headline?: string | null
          id?: string
          ig_account_id?: string | null
          info_labels?: Json | null
          is_active?: boolean | null
          last_accessed_at?: string | null
          name: string
          pixel_id?: string | null
          primary_text?: string | null
          site_links?: Json | null
          status?: string | null
          updated_at?: string
          url_params?: string | null
          user_id: string
        }
        Update: {
          ad_account_id?: string | null
          ad_set_id?: string | null
          advantage_plus_creative?: Json | null
          brand_id?: string
          call_to_action?: string | null
          campaign_id?: string | null
          created_at?: string
          description?: string | null
          destination_url?: string | null
          fb_page_id?: string | null
          headline?: string | null
          id?: string
          ig_account_id?: string | null
          info_labels?: Json | null
          is_active?: boolean | null
          last_accessed_at?: string | null
          name?: string
          pixel_id?: string | null
          primary_text?: string | null
          site_links?: Json | null
          status?: string | null
          updated_at?: string
          url_params?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_batches_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_configurations: {
        Row: {
          brand_id: string
          created_at: string | null
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          settings: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          brand_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          settings?: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          brand_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          settings?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_configurations_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
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
          thumbnail_timestamp: number | null
          thumbnail_url: string | null
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
          thumbnail_timestamp?: number | null
          thumbnail_url?: string | null
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
          thumbnail_timestamp?: number | null
          thumbnail_url?: string | null
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
          ad_batch_id: string | null
          ad_name: string
          ad_set_id: string | null
          ad_set_name: string | null
          advantage_plus_creative: Json | null
          app_status: string
          brand_id: string
          call_to_action: string | null
          campaign_id: string | null
          campaign_name: string | null
          created_at: string
          description: string | null
          destination_url: string | null
          headline: string | null
          id: string
          info_labels: Json | null
          meta_status: string
          primary_text: string | null
          site_links: Json | null
          strategist: string | null
          updated_at: string
          user_id: string
          video_editor: string | null
        }
        Insert: {
          ad_batch_id?: string | null
          ad_name: string
          ad_set_id?: string | null
          ad_set_name?: string | null
          advantage_plus_creative?: Json | null
          app_status?: string
          brand_id: string
          call_to_action?: string | null
          campaign_id?: string | null
          campaign_name?: string | null
          created_at?: string
          description?: string | null
          destination_url?: string | null
          headline?: string | null
          id?: string
          info_labels?: Json | null
          meta_status: string
          primary_text?: string | null
          site_links?: Json | null
          strategist?: string | null
          updated_at?: string
          user_id: string
          video_editor?: string | null
        }
        Update: {
          ad_batch_id?: string | null
          ad_name?: string
          ad_set_id?: string | null
          ad_set_name?: string | null
          advantage_plus_creative?: Json | null
          app_status?: string
          brand_id?: string
          call_to_action?: string | null
          campaign_id?: string | null
          campaign_name?: string | null
          created_at?: string
          description?: string | null
          destination_url?: string | null
          headline?: string | null
          id?: string
          info_labels?: Json | null
          meta_status?: string
          primary_text?: string | null
          site_links?: Json | null
          strategist?: string | null
          updated_at?: string
          user_id?: string
          video_editor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_drafts_ad_batch_id_fkey"
            columns: ["ad_batch_id"]
            isOneToOne: false
            referencedRelation: "ad_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_drafts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      adspy_searches: {
        Row: {
          brand_id: string
          created_at: string
          id: string
          last_used_at: string
          page_searched: number | null
          search_name: string | null
          search_params: Json
          total_results: number | null
          user_id: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          id?: string
          last_used_at?: string
          page_searched?: number | null
          search_name?: string | null
          search_params: Json
          total_results?: number | null
          user_id: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          id?: string
          last_used_at?: string
          page_searched?: number | null
          search_name?: string | null
          search_params?: Json
          total_results?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "adspy_searches_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          brand_id: string | null
          content: string
          created_at: string
          id: string
          priority: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_id?: string | null
          content: string
          created_at?: string
          id?: string
          priority?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_id?: string | null
          content?: string
          created_at?: string
          id?: string
          priority?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_shares: {
        Row: {
          accepted_at: string | null
          brand_id: string
          created_at: string
          id: string
          invitation_token: string | null
          role: string
          shared_by_user_id: string
          shared_with_email: string
          shared_with_user_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          brand_id: string
          created_at?: string
          id?: string
          invitation_token?: string | null
          role?: string
          shared_by_user_id: string
          shared_with_email: string
          shared_with_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          brand_id?: string
          created_at?: string
          id?: string
          invitation_token?: string | null
          role?: string
          shared_by_user_id?: string
          shared_with_email?: string
          shared_with_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_shares_brand_id_fkey"
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
          adspy_enabled: boolean | null
          adspy_password_encrypted: string | null
          adspy_token: string | null
          adspy_token_expires_at: string | null
          adspy_username: string | null
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
          meta_ad_accounts: Json | null
          meta_default_ad_account_id: string | null
          meta_default_facebook_page_id: string | null
          meta_default_instagram_account_id: string | null
          meta_default_pixel_id: string | null
          meta_facebook_page_id: string | null
          meta_facebook_pages: Json | null
          meta_instagram_accounts: Json | null
          meta_instagram_actor_id: string | null
          meta_manual_instagram_labels: Json | null
          meta_manual_instagram_pairings: Json | null
          meta_manual_page_labels: Json | null
          meta_page_backed_instagram_accounts: Json | null
          meta_pixel_id: string | null
          meta_pixels: Json | null
          meta_use_page_as_actor: boolean | null
          meta_user_id: string | null
          name: string
          naming_convention_settings: Json | null
          organization_id: string | null
          resource_logins: Json | null
          slack_channel_config: Json | null
          slack_channel_name: string | null
          slack_notifications_enabled: boolean | null
          slack_webhook_url: string | null
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
          adspy_enabled?: boolean | null
          adspy_password_encrypted?: string | null
          adspy_token?: string | null
          adspy_token_expires_at?: string | null
          adspy_username?: string | null
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
          meta_ad_accounts?: Json | null
          meta_default_ad_account_id?: string | null
          meta_default_facebook_page_id?: string | null
          meta_default_instagram_account_id?: string | null
          meta_default_pixel_id?: string | null
          meta_facebook_page_id?: string | null
          meta_facebook_pages?: Json | null
          meta_instagram_accounts?: Json | null
          meta_instagram_actor_id?: string | null
          meta_manual_instagram_labels?: Json | null
          meta_manual_instagram_pairings?: Json | null
          meta_manual_page_labels?: Json | null
          meta_page_backed_instagram_accounts?: Json | null
          meta_pixel_id?: string | null
          meta_pixels?: Json | null
          meta_use_page_as_actor?: boolean | null
          meta_user_id?: string | null
          name: string
          naming_convention_settings?: Json | null
          organization_id?: string | null
          resource_logins?: Json | null
          slack_channel_config?: Json | null
          slack_channel_name?: string | null
          slack_notifications_enabled?: boolean | null
          slack_webhook_url?: string | null
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
          adspy_enabled?: boolean | null
          adspy_password_encrypted?: string | null
          adspy_token?: string | null
          adspy_token_expires_at?: string | null
          adspy_username?: string | null
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
          meta_ad_accounts?: Json | null
          meta_default_ad_account_id?: string | null
          meta_default_facebook_page_id?: string | null
          meta_default_instagram_account_id?: string | null
          meta_default_pixel_id?: string | null
          meta_facebook_page_id?: string | null
          meta_facebook_pages?: Json | null
          meta_instagram_accounts?: Json | null
          meta_instagram_actor_id?: string | null
          meta_manual_instagram_labels?: Json | null
          meta_manual_instagram_pairings?: Json | null
          meta_manual_page_labels?: Json | null
          meta_page_backed_instagram_accounts?: Json | null
          meta_pixel_id?: string | null
          meta_pixels?: Json | null
          meta_use_page_as_actor?: boolean | null
          meta_user_id?: string | null
          name?: string
          naming_convention_settings?: Json | null
          organization_id?: string | null
          resource_logins?: Json | null
          slack_channel_config?: Json | null
          slack_channel_name?: string | null
          slack_notifications_enabled?: boolean | null
          slack_webhook_url?: string | null
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
          starting_concept_number: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          id?: string
          name: string
          share_settings?: Json | null
          starting_concept_number?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          id?: string
          name?: string
          share_settings?: Json | null
          starting_concept_number?: number | null
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
          asset_upload_status: string | null
          body_content_structured: Json | null
          brief_batch_id: string
          brief_revision_comments: string | null
          clickup_id: string | null
          clickup_link: string | null
          concept_title: string | null
          created_at: string
          creative_coordinator: string | null
          creator_footage: string | null
          cta_script: string | null
          cta_text_overlay: string | null
          custom_editor_name: string | null
          custom_links: Json | null
          date_assigned: string | null
          description: string | null
          designer_instructions: string | null
          designerinstructions: string | null
          designerInstructions: string | null
          editor_id: string | null
          hook_count: number | null
          hook_type: string | null
          id: string
          linked_creator_ids: string[] | null
          media_type: string | null
          media_url: string | null
          order_in_batch: number | null
          original_creator_script: string | null
          prerequisites: Json | null
          product_id: string | null
          review_comments: string | null
          review_link: string | null
          review_status: string | null
          reviewer_notes: string | null
          revision_count: number
          selected_ad_batch_id: string | null
          share_settings: Json | null
          spoken_hook_options: Json | null
          status: string | null
          strategist: string | null
          text_hook_options: Json | null
          updated_at: string
          uploaded_assets: Json | null
          user_id: string
          video_editor: string | null
          video_instructions: string | null
          videoinstructions: string | null
          videoInstructions: string | null
        }
        Insert: {
          ai_custom_prompt?: string | null
          asset_upload_status?: string | null
          body_content_structured?: Json | null
          brief_batch_id: string
          brief_revision_comments?: string | null
          clickup_id?: string | null
          clickup_link?: string | null
          concept_title?: string | null
          created_at?: string
          creative_coordinator?: string | null
          creator_footage?: string | null
          cta_script?: string | null
          cta_text_overlay?: string | null
          custom_editor_name?: string | null
          custom_links?: Json | null
          date_assigned?: string | null
          description?: string | null
          designer_instructions?: string | null
          designerinstructions?: string | null
          designerInstructions?: string | null
          editor_id?: string | null
          hook_count?: number | null
          hook_type?: string | null
          id?: string
          linked_creator_ids?: string[] | null
          media_type?: string | null
          media_url?: string | null
          order_in_batch?: number | null
          original_creator_script?: string | null
          prerequisites?: Json | null
          product_id?: string | null
          review_comments?: string | null
          review_link?: string | null
          review_status?: string | null
          reviewer_notes?: string | null
          revision_count?: number
          selected_ad_batch_id?: string | null
          share_settings?: Json | null
          spoken_hook_options?: Json | null
          status?: string | null
          strategist?: string | null
          text_hook_options?: Json | null
          updated_at?: string
          uploaded_assets?: Json | null
          user_id: string
          video_editor?: string | null
          video_instructions?: string | null
          videoinstructions?: string | null
          videoInstructions?: string | null
        }
        Update: {
          ai_custom_prompt?: string | null
          asset_upload_status?: string | null
          body_content_structured?: Json | null
          brief_batch_id?: string
          brief_revision_comments?: string | null
          clickup_id?: string | null
          clickup_link?: string | null
          concept_title?: string | null
          created_at?: string
          creative_coordinator?: string | null
          creator_footage?: string | null
          cta_script?: string | null
          cta_text_overlay?: string | null
          custom_editor_name?: string | null
          custom_links?: Json | null
          date_assigned?: string | null
          description?: string | null
          designer_instructions?: string | null
          designerinstructions?: string | null
          designerInstructions?: string | null
          editor_id?: string | null
          hook_count?: number | null
          hook_type?: string | null
          id?: string
          linked_creator_ids?: string[] | null
          media_type?: string | null
          media_url?: string | null
          order_in_batch?: number | null
          original_creator_script?: string | null
          prerequisites?: Json | null
          product_id?: string | null
          review_comments?: string | null
          review_link?: string | null
          review_status?: string | null
          reviewer_notes?: string | null
          revision_count?: number
          selected_ad_batch_id?: string | null
          share_settings?: Json | null
          spoken_hook_options?: Json | null
          status?: string | null
          strategist?: string | null
          text_hook_options?: Json | null
          updated_at?: string
          uploaded_assets?: Json | null
          user_id?: string
          video_editor?: string | null
          video_instructions?: string | null
          videoinstructions?: string | null
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
          {
            foreignKeyName: "brief_concepts_editor_id_fkey"
            columns: ["editor_id"]
            isOneToOne: false
            referencedRelation: "editors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brief_concepts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brief_concepts_selected_ad_batch_id_fkey"
            columns: ["selected_ad_batch_id"]
            isOneToOne: false
            referencedRelation: "ad_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_favorites: {
        Row: {
          ad_account_id: string
          brand_id: string
          campaign_id: string
          campaign_name: string | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ad_account_id: string
          brand_id: string
          campaign_id: string
          campaign_name?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ad_account_id?: string
          brand_id?: string
          campaign_id?: string
          campaign_name?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_favorites_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      concept_comments: {
        Row: {
          author_email: string | null
          author_name: string
          comment_text: string
          concept_id: string
          created_at: string
          id: string
          is_resolved: boolean
          parent_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          revision_version: number
          timestamp_seconds: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          author_email?: string | null
          author_name: string
          comment_text: string
          concept_id: string
          created_at?: string
          id?: string
          is_resolved?: boolean
          parent_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          revision_version?: number
          timestamp_seconds: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          author_email?: string | null
          author_name?: string
          comment_text?: string
          concept_id?: string
          created_at?: string
          id?: string
          is_resolved?: boolean
          parent_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          revision_version?: number
          timestamp_seconds?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "concept_comments_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "brief_concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concept_comments_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concept_editors"
            referencedColumns: ["concept_id"]
          },
          {
            foreignKeyName: "concept_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "concept_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      editors: {
        Row: {
          brand_id: string
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          role: string | null
          specialties: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          role?: string | null
          specialties?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          role?: string | null
          specialties?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "editors_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_todos: {
        Row: {
          created_at: string
          id: string
          issue_id: string
          todo_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          issue_id: string
          todo_id: string
        }
        Update: {
          created_at?: string
          id?: string
          issue_id?: string
          todo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_todos_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_todos_todo_id_fkey"
            columns: ["todo_id"]
            isOneToOne: false
            referencedRelation: "todos"
            referencedColumns: ["id"]
          },
        ]
      }
      issues: {
        Row: {
          assignee_id: string | null
          brand_id: string | null
          created_at: string
          description: string | null
          id: string
          issue_type: string | null
          priority_order: number | null
          status: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assignee_id?: string | null
          brand_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          issue_type?: string | null
          priority_order?: number | null
          status?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assignee_id?: string | null
          brand_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          issue_type?: string | null
          priority_order?: number | null
          status?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "issues_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
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
      page_types: {
        Row: {
          brand_id: string
          created_at: string | null
          description: string | null
          example_images: string[] | null
          example_urls: string[] | null
          id: string
          is_default: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          brand_id: string
          created_at?: string | null
          description?: string | null
          example_images?: string[] | null
          example_urls?: string[] | null
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          brand_id?: string
          created_at?: string | null
          description?: string | null
          example_images?: string[] | null
          example_urls?: string[] | null
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_types_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand_id: string
          category: string | null
          created_at: string
          currency: string | null
          description: string | null
          id: string
          identifier: string | null
          image_url: string | null
          is_active: boolean | null
          msrp: number | null
          name: string
          price: number | null
          product_url: string | null
          sale_price: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_id: string
          category?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          identifier?: string | null
          image_url?: string | null
          is_active?: boolean | null
          msrp?: number | null
          name: string
          price?: number | null
          product_url?: string | null
          sale_price?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_id?: string
          category?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          identifier?: string | null
          image_url?: string | null
          is_active?: boolean | null
          msrp?: number | null
          name?: string
          price?: number | null
          product_url?: string | null
          sale_price?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      scorecard_manual_data: {
        Row: {
          created_at: string | null
          id: string
          metric_id: string
          period_label: string
          updated_at: string | null
          value: number
          value_type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          metric_id: string
          period_label: string
          updated_at?: string | null
          value: number
          value_type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metric_id?: string
          period_label?: string
          updated_at?: string | null
          value?: number
          value_type?: string | null
        }
        Relationships: []
      }
      scorecard_meta_cache: {
        Row: {
          base_metric_key: string
          brand_id: string
          created_at: string
          date: string
          fetched_at: string
          id: string
          metric_config_hash: string
          updated_at: string
          value: number | null
        }
        Insert: {
          base_metric_key: string
          brand_id: string
          created_at?: string
          date: string
          fetched_at?: string
          id?: string
          metric_config_hash: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          base_metric_key?: string
          brand_id?: string
          created_at?: string
          date?: string
          fetched_at?: string
          id?: string
          metric_config_hash?: string
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scorecard_meta_cache_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      scorecard_metric_data: {
        Row: {
          calculation_details: Json | null
          created_at: string | null
          id: string
          metric_id: string
          period_end_date: string
          period_start_date: string
          raw_meta_data: Json | null
          time_period: string
          updated_at: string | null
          value: number
        }
        Insert: {
          calculation_details?: Json | null
          created_at?: string | null
          id?: string
          metric_id: string
          period_end_date: string
          period_start_date: string
          raw_meta_data?: Json | null
          time_period: string
          updated_at?: string | null
          value: number
        }
        Update: {
          calculation_details?: Json | null
          created_at?: string | null
          id?: string
          metric_id?: string
          period_end_date?: string
          period_start_date?: string
          raw_meta_data?: Json | null
          time_period?: string
          updated_at?: string | null
          value?: number
        }
        Relationships: []
      }
      scorecard_metrics: {
        Row: {
          brand_id: string | null
          created_at: string
          id: string
          metric_config: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_id?: string | null
          created_at?: string
          id?: string
          metric_config: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_id?: string | null
          created_at?: string
          id?: string
          metric_config?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scorecard_metrics_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
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
      social_media_content: {
        Row: {
          adspy_ad_id: string | null
          adspy_metadata: Json | null
          brand_id: string
          content_type: string
          created_at: string
          description: string | null
          dimensions: Json | null
          download_count: number | null
          duration: number | null
          file_name: string
          file_size: number | null
          file_url: string
          folder_name: string | null
          id: string
          is_favorite: boolean | null
          last_downloaded_at: string | null
          mime_type: string | null
          notes: string | null
          original_filename: string | null
          platform: string
          sent_to_ad_batch: boolean | null
          sent_to_ad_batch_at: string | null
          sent_to_ad_batch_by: string | null
          source_type: string | null
          source_url: string
          tags: string[] | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          adspy_ad_id?: string | null
          adspy_metadata?: Json | null
          brand_id: string
          content_type: string
          created_at?: string
          description?: string | null
          dimensions?: Json | null
          download_count?: number | null
          duration?: number | null
          file_name: string
          file_size?: number | null
          file_url: string
          folder_name?: string | null
          id?: string
          is_favorite?: boolean | null
          last_downloaded_at?: string | null
          mime_type?: string | null
          notes?: string | null
          original_filename?: string | null
          platform: string
          sent_to_ad_batch?: boolean | null
          sent_to_ad_batch_at?: string | null
          sent_to_ad_batch_by?: string | null
          source_type?: string | null
          source_url: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          adspy_ad_id?: string | null
          adspy_metadata?: Json | null
          brand_id?: string
          content_type?: string
          created_at?: string
          description?: string | null
          dimensions?: Json | null
          download_count?: number | null
          duration?: number | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          folder_name?: string | null
          id?: string
          is_favorite?: boolean | null
          last_downloaded_at?: string | null
          mime_type?: string | null
          notes?: string | null
          original_filename?: string | null
          platform?: string
          sent_to_ad_batch?: boolean | null
          sent_to_ad_batch_at?: string | null
          sent_to_ad_batch_by?: string | null
          source_type?: string | null
          source_url?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_media_content_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      todo_issues: {
        Row: {
          created_at: string
          id: string
          issue_id: string
          todo_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          issue_id: string
          todo_id: string
        }
        Update: {
          created_at?: string
          id?: string
          issue_id?: string
          todo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "todo_issues_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todo_issues_todo_id_fkey"
            columns: ["todo_id"]
            isOneToOne: false
            referencedRelation: "todos"
            referencedColumns: ["id"]
          },
        ]
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
      todos: {
        Row: {
          assignee_id: string | null
          brand_id: string | null
          completed: boolean | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assignee_id?: string | null
          brand_id?: string | null
          completed?: boolean | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assignee_id?: string | null
          brand_id?: string | null
          completed?: boolean | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "todos_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
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
          creator_id: string | null
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
          creator_id?: string | null
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
          creator_id?: string | null
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
          {
            foreignKeyName: "ugc_creator_scripts_linked_brief_concept_id_fkey"
            columns: ["linked_brief_concept_id"]
            isOneToOne: false
            referencedRelation: "concept_editors"
            referencedColumns: ["concept_id"]
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
      ugc_email_templates: {
        Row: {
          id: string
          brand_id: string
          user_id: string
          name: string
          subject: string
          html_content: string
          text_content: string
          variables: string[] | null
          trigger_status: string | null
          pipeline_stage: string
          enabled: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          brand_id: string
          user_id: string
          name: string
          subject: string
          html_content: string
          text_content: string
          variables?: string[] | null
          trigger_status?: string | null
          pipeline_stage: string
          enabled?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          brand_id?: string
          user_id?: string
          name?: string
          subject?: string
          html_content?: string
          text_content?: string
          variables?: string[] | null
          trigger_status?: string | null
          pipeline_stage?: string
          enabled?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_email_templates_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_email_threads: {
        Row: {
          id: string
          creator_id: string
          brand_id: string
          thread_subject: string
          status: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          creator_id: string
          brand_id: string
          thread_subject: string
          status?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          creator_id?: string
          brand_id?: string
          thread_subject?: string
          status?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_email_threads_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "ugc_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_email_threads_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_email_messages: {
        Row: {
          id: string
          thread_id: string
          message_id: string | null
          from_email: string
          to_email: string
          subject: string
          html_content: string
          text_content: string
          sent_at: string | null
          status: string | null
          template_id: string | null
          variables_used: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          thread_id: string
          message_id?: string | null
          from_email: string
          to_email: string
          subject: string
          html_content: string
          text_content: string
          sent_at?: string | null
          status?: string | null
          template_id?: string | null
          variables_used?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          thread_id?: string
          message_id?: string | null
          from_email?: string
          to_email?: string
          subject?: string
          html_content?: string
          text_content?: string
          sent_at?: string | null
          status?: string | null
          template_id?: string | null
          variables_used?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_email_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "ugc_email_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_email_messages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "ugc_email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_ai_coordinator: {
        Row: {
          id: string
          brand_id: string
          user_id: string
          name: string | null
          enabled: boolean | null
          settings: Json | null
          system_prompt: string | null
          model_config: Json | null
          slack_notifications_enabled: boolean | null
          email_automation_enabled: boolean | null
          last_activity_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          brand_id: string
          user_id: string
          name?: string | null
          enabled?: boolean | null
          settings?: Json | null
          system_prompt?: string | null
          model_config?: Json | null
          slack_notifications_enabled?: boolean | null
          email_automation_enabled?: boolean | null
          last_activity_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          brand_id?: string
          user_id?: string
          name?: string | null
          enabled?: boolean | null
          settings?: Json | null
          system_prompt?: string | null
          model_config?: Json | null
          slack_notifications_enabled?: boolean | null
          email_automation_enabled?: boolean | null
          last_activity_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_ai_coordinator_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_ai_coordinator_actions: {
        Row: {
          id: string
          coordinator_id: string
          creator_id: string | null
          script_id: string | null
          action_type: string
          action_data: Json | null
          success: boolean | null
          error_message: string | null
          ai_reasoning: string | null
          created_at: string
        }
        Insert: {
          id?: string
          coordinator_id: string
          creator_id?: string | null
          script_id?: string | null
          action_type: string
          action_data?: Json | null
          success?: boolean | null
          error_message?: string | null
          ai_reasoning?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          coordinator_id?: string
          creator_id?: string | null
          script_id?: string | null
          action_type?: string
          action_data?: Json | null
          success?: boolean | null
          error_message?: string | null
          ai_reasoning?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_ai_coordinator_actions_coordinator_id_fkey"
            columns: ["coordinator_id"]
            isOneToOne: false
            referencedRelation: "ugc_ai_coordinator"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_ai_coordinator_actions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "ugc_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_ai_coordinator_actions_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "ugc_creator_scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_email_sequences: {
        Row: {
          id: string
          name: string
          description: string | null
          brand_id: string
          trigger_event: string
          trigger_conditions: Json | null
          is_active: boolean | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          brand_id: string
          trigger_event: string
          trigger_conditions?: Json | null
          is_active?: boolean | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          brand_id?: string
          trigger_event?: string
          trigger_conditions?: Json | null
          is_active?: boolean | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ugc_email_sequences_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_email_sequences_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_email_sequence_steps: {
        Row: {
          id: string
          sequence_id: string
          step_order: number
          name: string
          delay_days: number | null
          delay_hours: number | null
          email_template_id: string | null
          custom_subject: string | null
          custom_html_content: string | null
          custom_text_content: string | null
          status_change_action: string | null
          conditions: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sequence_id: string
          step_order: number
          name: string
          delay_days?: number | null
          delay_hours?: number | null
          email_template_id?: string | null
          custom_subject?: string | null
          custom_html_content?: string | null
          custom_text_content?: string | null
          status_change_action?: string | null
          conditions?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sequence_id?: string
          step_order?: number
          name?: string
          delay_days?: number | null
          delay_hours?: number | null
          email_template_id?: string | null
          custom_subject?: string | null
          custom_html_content?: string | null
          custom_text_content?: string | null
          status_change_action?: string | null
          conditions?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_email_sequence_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "ugc_email_sequences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_email_sequence_steps_email_template_id_fkey"
            columns: ["email_template_id"]
            isOneToOne: false
            referencedRelation: "ugc_email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_creator_sequence_enrollments: {
        Row: {
          id: string
          creator_id: string
          sequence_id: string
          brand_id: string
          current_step: number | null
          status: string | null
          enrolled_at: string
          next_send_at: string | null
          completed_at: string | null
          last_step_sent_at: string | null
          enrollment_trigger: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          creator_id: string
          sequence_id: string
          brand_id: string
          current_step?: number | null
          status?: string | null
          enrolled_at?: string
          next_send_at?: string | null
          completed_at?: string | null
          last_step_sent_at?: string | null
          enrollment_trigger?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          creator_id?: string
          sequence_id?: string
          brand_id?: string
          current_step?: number | null
          status?: string | null
          enrolled_at?: string
          next_send_at?: string | null
          completed_at?: string | null
          last_step_sent_at?: string | null
          enrollment_trigger?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_creator_sequence_enrollments_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "ugc_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_creator_sequence_enrollments_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "ugc_email_sequences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_creator_sequence_enrollments_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_creator_communication_log: {
        Row: {
          id: string
          creator_id: string
          brand_id: string
          log_type: string
          source: string
          subject: string | null
          content: string | null
          metadata: Json | null
          email_thread_id: string | null
          email_message_id: string | null
          sequence_enrollment_id: string | null
          ai_coordinator_action_id: string | null
          performed_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          creator_id: string
          brand_id: string
          log_type: string
          source: string
          subject?: string | null
          content?: string | null
          metadata?: Json | null
          email_thread_id?: string | null
          email_message_id?: string | null
          sequence_enrollment_id?: string | null
          ai_coordinator_action_id?: string | null
          performed_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          creator_id?: string
          brand_id?: string
          log_type?: string
          source?: string
          subject?: string | null
          content?: string | null
          metadata?: Json | null
          email_thread_id?: string | null
          email_message_id?: string | null
          sequence_enrollment_id?: string | null
          ai_coordinator_action_id?: string | null
          performed_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_creator_communication_log_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "ugc_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_creator_communication_log_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_creator_communication_log_email_thread_id_fkey"
            columns: ["email_thread_id"]
            isOneToOne: false
            referencedRelation: "ugc_email_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_creator_communication_log_email_message_id_fkey"
            columns: ["email_message_id"]
            isOneToOne: false
            referencedRelation: "ugc_email_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_creator_communication_log_sequence_enrollment_id_fkey"
            columns: ["sequence_enrollment_id"]
            isOneToOne: false
            referencedRelation: "ugc_creator_sequence_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_creator_communication_log_ai_coordinator_action_id_fkey"
            columns: ["ai_coordinator_action_id"]
            isOneToOne: false
            referencedRelation: "ugc_ai_coordinator_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_creator_communication_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_sequence_execution_log: {
        Row: {
          id: string
          enrollment_id: string
          step_id: string
          creator_id: string
          scheduled_at: string
          executed_at: string | null
          status: string | null
          email_message_id: string | null
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          enrollment_id: string
          step_id: string
          creator_id: string
          scheduled_at: string
          executed_at?: string | null
          status?: string | null
          email_message_id?: string | null
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          enrollment_id?: string
          step_id?: string
          creator_id?: string
          scheduled_at?: string
          executed_at?: string | null
          status?: string | null
          email_message_id?: string | null
          error_message?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_sequence_execution_log_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "ugc_creator_sequence_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_sequence_execution_log_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "ugc_email_sequence_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_sequence_execution_log_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "ugc_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_sequence_execution_log_email_message_id_fkey"
            columns: ["email_message_id"]
            isOneToOne: false
            referencedRelation: "ugc_email_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      wireframe_modules: {
        Row: {
          alignment: string | null
          content: Json
          created_at: string | null
          id: string
          is_content_placeholder: boolean | null
          is_design_descriptor: boolean | null
          order_index: number
          position: Json
          type: string
          updated_at: string | null
          wireframe_id: string
        }
        Insert: {
          alignment?: string | null
          content: Json
          created_at?: string | null
          id?: string
          is_content_placeholder?: boolean | null
          is_design_descriptor?: boolean | null
          order_index: number
          position: Json
          type: string
          updated_at?: string | null
          wireframe_id: string
        }
        Update: {
          alignment?: string | null
          content?: Json
          created_at?: string | null
          id?: string
          is_content_placeholder?: boolean | null
          is_design_descriptor?: boolean | null
          order_index?: number
          position?: Json
          type?: string
          updated_at?: string | null
          wireframe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wireframe_modules_wireframe_id_fkey"
            columns: ["wireframe_id"]
            isOneToOne: false
            referencedRelation: "wireframes"
            referencedColumns: ["id"]
          },
        ]
      }
      wireframe_shares: {
        Row: {
          created_at: string | null
          created_by: string
          expires_at: string | null
          id: string
          is_editable: boolean | null
          share_id: string
          wireframe_id: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          expires_at?: string | null
          id?: string
          is_editable?: boolean | null
          share_id: string
          wireframe_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          expires_at?: string | null
          id?: string
          is_editable?: boolean | null
          share_id?: string
          wireframe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wireframe_shares_wireframe_id_fkey"
            columns: ["wireframe_id"]
            isOneToOne: false
            referencedRelation: "wireframes"
            referencedColumns: ["id"]
          },
        ]
      }
      wireframes: {
        Row: {
          ai_generated_content: Json | null
          brand_id: string
          competitor_snapshot_url: string | null
          created_at: string | null
          extracted_modules: Json | null
          id: string
          name: string
          page_type_id: string | null
          share_settings: Json | null
          status: string | null
          structure: Json
          system_instructions: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_generated_content?: Json | null
          brand_id: string
          competitor_snapshot_url?: string | null
          created_at?: string | null
          extracted_modules?: Json | null
          id?: string
          name: string
          page_type_id?: string | null
          share_settings?: Json | null
          status?: string | null
          structure?: Json
          system_instructions?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_generated_content?: Json | null
          brand_id?: string
          competitor_snapshot_url?: string | null
          created_at?: string | null
          extracted_modules?: Json | null
          id?: string
          name?: string
          page_type_id?: string | null
          share_settings?: Json | null
          status?: string | null
          structure?: Json
          system_instructions?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wireframes_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wireframes_page_type_id_fkey"
            columns: ["page_type_id"]
            isOneToOne: false
            referencedRelation: "page_types"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      concept_editors: {
        Row: {
          brief_batch_id: string | null
          concept_id: string | null
          editor_email: string | null
          editor_id: string | null
          editor_name: string | null
          editor_role: string | null
          editor_specialties: string[] | null
          editor_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brief_concepts_brief_batch_id_fkey"
            columns: ["brief_batch_id"]
            isOneToOne: false
            referencedRelation: "brief_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brief_concepts_editor_id_fkey"
            columns: ["editor_id"]
            isOneToOne: false
            referencedRelation: "editors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_brand_share_invitation: {
        Args: { p_invitation_token: string }
        Returns: Json
      }
      accept_invitation: {
        Args: { lookup_invitation_token: string }
        Returns: Json
      }
      check_rls_policies: {
        Args: { table_name: string }
        Returns: {
          policy_name: string
          policy_definition: string
        }[]
      }
      create_account: {
        Args: { slug?: string; name?: string }
        Returns: Json
      }
      create_default_page_types: {
        Args: { p_brand_id: string; p_user_id: string }
        Returns: undefined
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
      get_brand_editors: {
        Args: { brand_uuid: string }
        Returns: {
          id: string
          name: string
          email: string
          role: string
          specialties: string[]
          is_active: boolean
          notes: string
        }[]
      }
      get_brand_shared_users: {
        Args: { p_brand_id: string }
        Returns: {
          share_id: string
          user_id: string
          email: string
          full_name: string
          role: string
          status: string
          shared_at: string
          accepted_at: string
        }[]
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
