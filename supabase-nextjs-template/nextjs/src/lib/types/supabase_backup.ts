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
      brand_automation_settings: {
        Row: {
          automation_enabled: boolean | null
          brand_id: string
          business_days: number[] | null
          business_hours_end: string | null
          business_hours_start: string | null
          created_at: string
          default_timezone: string | null
          id: string
          notification_emails: string[] | null
          settings: Json | null
          updated_at: string
          webhook_secret: string | null
        }
        Insert: {
          automation_enabled?: boolean | null
          brand_id: string
          business_days?: number[] | null
          business_hours_end?: string | null
          business_hours_start?: string | null
          created_at?: string
          default_timezone?: string | null
          id?: string
          notification_emails?: string[] | null
          settings?: Json | null
          updated_at?: string
          webhook_secret?: string | null
        }
        Update: {
          automation_enabled?: boolean | null
          brand_id?: string
          business_days?: number[] | null
          business_hours_end?: string | null
          business_hours_start?: string | null
          created_at?: string
          default_timezone?: string | null
          id?: string
          notification_emails?: string[] | null
          settings?: Json | null
          updated_at?: string
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_automation_settings_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: true
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_n8n_workflows: {
        Row: {
          brand_id: string
          configuration: Json | null
          created_at: string
          id: string
          is_active: boolean | null
          updated_at: string
          workflow_name: string
        }
        Insert: {
          brand_id: string
          configuration?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string
          workflow_name: string
        }
        Update: {
          brand_id?: string
          configuration?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string
          workflow_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_n8n_workflows_brand_id_fkey"
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
          expires_at: string | null
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
          expires_at?: string | null
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
          expires_at?: string | null
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
          email_identifier: string | null
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
          email_identifier?: string | null
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
          email_identifier?: string | null
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
          allow_new_concepts: boolean
          brand_id: string
          content_type: string | null
          created_at: string
          id: string
          name: string
          share_settings: Json | null
          starting_concept_number: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allow_new_concepts?: boolean
          brand_id: string
          content_type?: string | null
          created_at?: string
          id?: string
          name: string
          share_settings?: Json | null
          starting_concept_number?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allow_new_concepts?: boolean
          brand_id?: string
          content_type?: string | null
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
          generated_broll: Json | null
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
          generated_broll?: Json | null
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
          generated_broll?: Json | null
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
      contract_audit_logs: {
        Row: {
          action: string
          contract_id: string
          details: Json | null
          id: string
          ip_address: unknown | null
          recipient_id: string | null
          timestamp: string
          user_agent: string | null
        }
        Insert: {
          action: string
          contract_id: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          recipient_id?: string | null
          timestamp?: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          contract_id?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          recipient_id?: string | null
          timestamp?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_audit_logs_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_audit_logs_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "contract_recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_fields: {
        Row: {
          contract_id: string
          created_at: string
          height: number
          id: string
          is_required: boolean | null
          page: number
          placeholder: string | null
          position_x: number
          position_y: number
          recipient_id: string
          type: string
          updated_at: string
          value: string | null
          width: number
        }
        Insert: {
          contract_id: string
          created_at?: string
          height: number
          id?: string
          is_required?: boolean | null
          page: number
          placeholder?: string | null
          position_x: number
          position_y: number
          recipient_id: string
          type: string
          updated_at?: string
          value?: string | null
          width: number
        }
        Update: {
          contract_id?: string
          created_at?: string
          height?: number
          id?: string
          is_required?: boolean | null
          page?: number
          placeholder?: string | null
          position_x?: number
          position_y?: number
          recipient_id?: string
          type?: string
          updated_at?: string
          value?: string | null
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_fields_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_fields_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "contract_recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_recipients: {
        Row: {
          auth_token: string | null
          contract_id: string
          created_at: string
          email: string
          id: string
          ip_address: unknown | null
          name: string
          role: string | null
          signed_at: string | null
          signing_order: number | null
          status: string | null
          updated_at: string
          user_agent: string | null
          viewed_at: string | null
        }
        Insert: {
          auth_token?: string | null
          contract_id: string
          created_at?: string
          email: string
          id?: string
          ip_address?: unknown | null
          name: string
          role?: string | null
          signed_at?: string | null
          signing_order?: number | null
          status?: string | null
          updated_at?: string
          user_agent?: string | null
          viewed_at?: string | null
        }
        Update: {
          auth_token?: string | null
          contract_id?: string
          created_at?: string
          email?: string
          id?: string
          ip_address?: unknown | null
          name?: string
          role?: string | null
          signed_at?: string | null
          signing_order?: number | null
          status?: string | null
          updated_at?: string
          user_agent?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_recipients_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_signing_tokens: {
        Row: {
          contract_id: string
          created_at: string
          expires_at: string
          id: string
          ip_address: unknown | null
          recipient_id: string
          token: string
          used_at: string | null
          user_agent: string | null
        }
        Insert: {
          contract_id: string
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: unknown | null
          recipient_id: string
          token: string
          used_at?: string | null
          user_agent?: string | null
        }
        Update: {
          contract_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          recipient_id?: string
          token?: string
          used_at?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      contract_template_fields: {
        Row: {
          created_at: string
          height: number
          id: string
          is_required: boolean | null
          page: number
          placeholder: string | null
          position_x: number
          position_y: number
          recipient_role: string | null
          template_id: string
          type: string
          updated_at: string
          width: number
        }
        Insert: {
          created_at?: string
          height: number
          id?: string
          is_required?: boolean | null
          page: number
          placeholder?: string | null
          position_x: number
          position_y: number
          recipient_role?: string | null
          template_id: string
          type: string
          updated_at?: string
          width: number
        }
        Update: {
          created_at?: string
          height?: number
          id?: string
          is_required?: boolean | null
          page?: number
          placeholder?: string | null
          position_x?: number
          position_y?: number
          recipient_role?: string | null
          template_id?: string
          type?: string
          updated_at?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_template_fields_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          brand_id: string
          created_at: string
          description: string | null
          document_data: string
          document_name: string
          document_size: number
          fields: Json | null
          id: string
          is_active: boolean | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          description?: string | null
          document_data: string
          document_name: string
          document_size: number
          fields?: Json | null
          id?: string
          is_active?: boolean | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          description?: string | null
          document_data?: string
          document_name?: string
          document_size?: number
          fields?: Json | null
          id?: string
          is_active?: boolean | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          brand_id: string
          completed_at: string | null
          completion_certificate: Json | null
          created_at: string
          creator_id: string | null
          document_data: string
          document_name: string
          document_size: number
          expires_at: string | null
          id: string
          script_id: string | null
          share_token: string | null
          signed_document_data: string | null
          status: string | null
          template_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_id: string
          completed_at?: string | null
          completion_certificate?: Json | null
          created_at?: string
          creator_id?: string | null
          document_data: string
          document_name: string
          document_size: number
          expires_at?: string | null
          id?: string
          script_id?: string | null
          share_token?: string | null
          signed_document_data?: string | null
          status?: string | null
          template_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_id?: string
          completed_at?: string | null
          completion_certificate?: Json | null
          created_at?: string
          creator_id?: string | null
          document_data?: string
          document_name?: string
          document_size?: number
          expires_at?: string | null
          id?: string
          script_id?: string | null
          share_token?: string | null
          signed_document_data?: string | null
          status?: string | null
          template_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "ugc_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "ugc_creator_scripts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
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
      n8n_automation_templates: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_system: boolean | null
          name: string
          optional_variables: Json | null
          required_variables: Json | null
          updated_at: string
          workflow_definition: Json
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          optional_variables?: Json | null
          required_variables?: Json | null
          updated_at?: string
          workflow_definition: Json
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          optional_variables?: Json | null
          required_variables?: Json | null
          updated_at?: string
          workflow_definition?: Json
        }
        Relationships: []
      }
      n8n_execution_logs: {
        Row: {
          brand_id: string
          created_at: string
          creator_id: string | null
          data: Json | null
          duration_ms: number | null
          error_message: string | null
          execution_id: string
          id: string
          status: string
          step_name: string
          workflow_id: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          creator_id?: string | null
          data?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          execution_id: string
          id?: string
          status: string
          step_name: string
          workflow_id: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          creator_id?: string | null
          data?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          execution_id?: string
          id?: string
          status?: string
          step_name?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "n8n_execution_logs_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "n8n_execution_logs_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "ugc_creators"
            referencedColumns: ["id"]
          },
        ]
      }
      onesheet: {
        Row: {
          ad_account_data: Json | null
          ad_performance_data: Json | null
          ai_analysis_results: Json | null
          ai_competitor_data: Json | null
          ai_prompt_templates: Json | null
          ai_research_data: Json | null
          angles: Json | null
          audience_insights: Json | null
          brainstorm_notes: string | null
          brand_id: string
          competitive_notes: string | null
          competitor_analysis: Json | null
          concepts: Json | null
          context_loaded: Json | null
          created_at: string
          creative_outputs: Json | null
          custom_sections: Json | null
          customer_reviews_url: string | null
          hooks: Json | null
          id: string
          key_learnings: Json | null
          landing_page_url: string | null
          last_context_update: string | null
          last_synthesis_update: string | null
          manual_entries: Json | null
          organic_research_data: Json | null
          personas: Json | null
          product: string | null
          prompt_cheatsheet_url: string | null
          research_checklist: Json | null
          social_listening_data: Json | null
          synthesis_data: Json | null
          updated_at: string
          user_id: string
          visuals: Json | null
          workflow_stage: string | null
        }
        Insert: {
          ad_account_data?: Json | null
          ad_performance_data?: Json | null
          ai_analysis_results?: Json | null
          ai_competitor_data?: Json | null
          ai_prompt_templates?: Json | null
          ai_research_data?: Json | null
          angles?: Json | null
          audience_insights?: Json | null
          brainstorm_notes?: string | null
          brand_id: string
          competitive_notes?: string | null
          competitor_analysis?: Json | null
          concepts?: Json | null
          context_loaded?: Json | null
          created_at?: string
          creative_outputs?: Json | null
          custom_sections?: Json | null
          customer_reviews_url?: string | null
          hooks?: Json | null
          id?: string
          key_learnings?: Json | null
          landing_page_url?: string | null
          last_context_update?: string | null
          last_synthesis_update?: string | null
          manual_entries?: Json | null
          organic_research_data?: Json | null
          personas?: Json | null
          product?: string | null
          prompt_cheatsheet_url?: string | null
          research_checklist?: Json | null
          social_listening_data?: Json | null
          synthesis_data?: Json | null
          updated_at?: string
          user_id: string
          visuals?: Json | null
          workflow_stage?: string | null
        }
        Update: {
          ad_account_data?: Json | null
          ad_performance_data?: Json | null
          ai_analysis_results?: Json | null
          ai_competitor_data?: Json | null
          ai_prompt_templates?: Json | null
          ai_research_data?: Json | null
          angles?: Json | null
          audience_insights?: Json | null
          brainstorm_notes?: string | null
          brand_id?: string
          competitive_notes?: string | null
          competitor_analysis?: Json | null
          concepts?: Json | null
          context_loaded?: Json | null
          created_at?: string
          creative_outputs?: Json | null
          custom_sections?: Json | null
          customer_reviews_url?: string | null
          hooks?: Json | null
          id?: string
          key_learnings?: Json | null
          landing_page_url?: string | null
          last_context_update?: string | null
          last_synthesis_update?: string | null
          manual_entries?: Json | null
          organic_research_data?: Json | null
          personas?: Json | null
          product?: string | null
          prompt_cheatsheet_url?: string | null
          research_checklist?: Json | null
          social_listening_data?: Json | null
          synthesis_data?: Json | null
          updated_at?: string
          user_id?: string
          visuals?: Json | null
          workflow_stage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onesheet_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      onesheet_context_data: {
        Row: {
          content_text: string | null
          created_at: string | null
          extracted_data: Json | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          onesheet_id: string | null
          source_name: string | null
          source_type: string
          source_url: string | null
          updated_at: string | null
        }
        Insert: {
          content_text?: string | null
          created_at?: string | null
          extracted_data?: Json | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          onesheet_id?: string | null
          source_name?: string | null
          source_type: string
          source_url?: string | null
          updated_at?: string | null
        }
        Update: {
          content_text?: string | null
          created_at?: string | null
          extracted_data?: Json | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          onesheet_id?: string | null
          source_name?: string | null
          source_type?: string
          source_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onesheet_context_data_onesheet_id_fkey"
            columns: ["onesheet_id"]
            isOneToOne: false
            referencedRelation: "onesheet"
            referencedColumns: ["id"]
          },
        ]
      }
      onesheet_sync_jobs: {
        Row: {
          brand_id: string
          completed_at: string | null
          created_at: string
          created_by: string
          date_range_end: string
          date_range_start: string
          error_message: string | null
          id: string
          onesheet_id: string
          processed_ads: number | null
          started_at: string | null
          status: string
          total_ads: number | null
        }
        Insert: {
          brand_id: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          date_range_end: string
          date_range_start: string
          error_message?: string | null
          id?: string
          onesheet_id: string
          processed_ads?: number | null
          started_at?: string | null
          status?: string
          total_ads?: number | null
        }
        Update: {
          brand_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          date_range_end?: string
          date_range_start?: string
          error_message?: string | null
          id?: string
          onesheet_id?: string
          processed_ads?: number | null
          started_at?: string | null
          status?: string
          total_ads?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "onesheet_sync_jobs_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onesheet_sync_jobs_onesheet_id_fkey"
            columns: ["onesheet_id"]
            isOneToOne: false
            referencedRelation: "onesheet"
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
      sop_videos: {
        Row: {
          created_at: string
          description: string | null
          duration: number | null
          file_name: string
          file_size: number | null
          id: string
          is_active: boolean | null
          original_name: string | null
          sop_id: string
          title: string | null
          updated_at: string
          uploaded_by: string | null
          video_url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration?: number | null
          file_name: string
          file_size?: number | null
          id?: string
          is_active?: boolean | null
          original_name?: string | null
          sop_id: string
          title?: string | null
          updated_at?: string
          uploaded_by?: string | null
          video_url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration?: number | null
          file_name?: string
          file_size?: number | null
          id?: string
          is_active?: boolean | null
          original_name?: string | null
          sop_id?: string
          title?: string | null
          updated_at?: string
          uploaded_by?: string | null
          video_url?: string
        }
        Relationships: []
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
      ugc_ai_coordinator: {
        Row: {
          brand_id: string
          created_at: string
          email_automation_enabled: boolean | null
          enabled: boolean | null
          id: string
          last_activity_at: string | null
          model_config: Json | null
          name: string
          settings: Json | null
          slack_notifications_enabled: boolean | null
          system_prompt: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          email_automation_enabled?: boolean | null
          enabled?: boolean | null
          id?: string
          last_activity_at?: string | null
          model_config?: Json | null
          name?: string
          settings?: Json | null
          slack_notifications_enabled?: boolean | null
          system_prompt?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          email_automation_enabled?: boolean | null
          enabled?: boolean | null
          id?: string
          last_activity_at?: string | null
          model_config?: Json | null
          name?: string
          settings?: Json | null
          slack_notifications_enabled?: boolean | null
          system_prompt?: string | null
          updated_at?: string
          user_id?: string
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
          action_data: Json | null
          action_type: string
          ai_reasoning: string | null
          coordinator_id: string
          created_at: string
          creator_id: string | null
          error_message: string | null
          id: string
          script_id: string | null
          success: boolean | null
        }
        Insert: {
          action_data?: Json | null
          action_type: string
          ai_reasoning?: string | null
          coordinator_id: string
          created_at?: string
          creator_id?: string | null
          error_message?: string | null
          id?: string
          script_id?: string | null
          success?: boolean | null
        }
        Update: {
          action_data?: Json | null
          action_type?: string
          ai_reasoning?: string | null
          coordinator_id?: string
          created_at?: string
          creator_id?: string | null
          error_message?: string | null
          id?: string
          script_id?: string | null
          success?: boolean | null
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
      ugc_brand_job_postings: {
        Row: {
          application_deadline: string | null
          brand_id: string
          compensation_range: string | null
          content_types: string[] | null
          created_at: string
          description: string
          id: string
          is_active: boolean | null
          requirements: string | null
          slots_available: number | null
          slots_filled: number | null
          target_demographics: Json | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          application_deadline?: string | null
          brand_id: string
          compensation_range?: string | null
          content_types?: string[] | null
          created_at?: string
          description: string
          id?: string
          is_active?: boolean | null
          requirements?: string | null
          slots_available?: number | null
          slots_filled?: number | null
          target_demographics?: Json | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          application_deadline?: string | null
          brand_id?: string
          compensation_range?: string | null
          content_types?: string[] | null
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean | null
          requirements?: string | null
          slots_available?: number | null
          slots_filled?: number | null
          target_demographics?: Json | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_brand_job_postings_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_creator_communication_log: {
        Row: {
          ai_coordinator_action_id: string | null
          brand_id: string
          content: string | null
          created_at: string | null
          creator_id: string
          email_message_id: string | null
          email_thread_id: string | null
          id: string
          log_type: string
          metadata: Json | null
          performed_by: string | null
          sequence_enrollment_id: string | null
          source: string
          subject: string | null
        }
        Insert: {
          ai_coordinator_action_id?: string | null
          brand_id: string
          content?: string | null
          created_at?: string | null
          creator_id: string
          email_message_id?: string | null
          email_thread_id?: string | null
          id?: string
          log_type: string
          metadata?: Json | null
          performed_by?: string | null
          sequence_enrollment_id?: string | null
          source: string
          subject?: string | null
        }
        Update: {
          ai_coordinator_action_id?: string | null
          brand_id?: string
          content?: string | null
          created_at?: string | null
          creator_id?: string
          email_message_id?: string | null
          email_thread_id?: string | null
          id?: string
          log_type?: string
          metadata?: Json | null
          performed_by?: string | null
          sequence_enrollment_id?: string | null
          source?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ugc_creator_communication_log_ai_coordinator_action_id_fkey"
            columns: ["ai_coordinator_action_id"]
            isOneToOne: false
            referencedRelation: "ugc_ai_coordinator_actions"
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
            foreignKeyName: "ugc_creator_communication_log_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "ugc_creators"
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
            foreignKeyName: "ugc_creator_communication_log_email_thread_id_fkey"
            columns: ["email_thread_id"]
            isOneToOne: false
            referencedRelation: "ugc_email_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_creator_communication_log_sequence_enrollment_id_fkey"
            columns: ["sequence_enrollment_id"]
            isOneToOne: false
            referencedRelation: "ugc_creator_sequence_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_creator_field_configs: {
        Row: {
          brand_id: string
          created_at: string
          display_order: number | null
          field_description: string | null
          field_group: string | null
          field_label: string
          field_name: string
          field_options: Json | null
          field_placeholder: string | null
          field_type: string
          id: string
          is_protected: boolean | null
          is_required: boolean | null
          is_visible_in_editor: boolean | null
          is_visible_on_form: boolean | null
          updated_at: string
          validation_rules: Json | null
        }
        Insert: {
          brand_id: string
          created_at?: string
          display_order?: number | null
          field_description?: string | null
          field_group?: string | null
          field_label: string
          field_name: string
          field_options?: Json | null
          field_placeholder?: string | null
          field_type: string
          id?: string
          is_protected?: boolean | null
          is_required?: boolean | null
          is_visible_in_editor?: boolean | null
          is_visible_on_form?: boolean | null
          updated_at?: string
          validation_rules?: Json | null
        }
        Update: {
          brand_id?: string
          created_at?: string
          display_order?: number | null
          field_description?: string | null
          field_group?: string | null
          field_label?: string
          field_name?: string
          field_options?: Json | null
          field_placeholder?: string | null
          field_type?: string
          id?: string
          is_protected?: boolean | null
          is_required?: boolean | null
          is_visible_in_editor?: boolean | null
          is_visible_on_form?: boolean | null
          updated_at?: string
          validation_rules?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ugc_creator_field_configs_brand_id_fkey"
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
      ugc_creator_sequence_enrollments: {
        Row: {
          brand_id: string
          completed_at: string | null
          created_at: string | null
          creator_id: string
          current_step: number | null
          enrolled_at: string | null
          enrollment_trigger: string | null
          id: string
          last_step_sent_at: string | null
          metadata: Json | null
          next_send_at: string | null
          sequence_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          brand_id: string
          completed_at?: string | null
          created_at?: string | null
          creator_id: string
          current_step?: number | null
          enrolled_at?: string | null
          enrollment_trigger?: string | null
          id?: string
          last_step_sent_at?: string | null
          metadata?: Json | null
          next_send_at?: string | null
          sequence_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          brand_id?: string
          completed_at?: string | null
          created_at?: string | null
          creator_id?: string
          current_step?: number | null
          enrolled_at?: string | null
          enrollment_trigger?: string | null
          id?: string
          last_step_sent_at?: string | null
          metadata?: Json | null
          next_send_at?: string | null
          sequence_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ugc_creator_sequence_enrollments_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
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
        ]
      }
      ugc_creators: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          age: string | null
          brand_id: string
          city: string | null
          contacted_by: string | null
          content_types: Json | null
          contract_status: string | null
          country: string | null
          created_at: string
          custom_fields: Json | null
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
          user_id: string | null
          zip: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          age?: string | null
          brand_id: string
          city?: string | null
          contacted_by?: string | null
          content_types?: Json | null
          contract_status?: string | null
          country?: string | null
          created_at?: string
          custom_fields?: Json | null
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
          user_id?: string | null
          zip?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          age?: string | null
          brand_id?: string
          city?: string | null
          contacted_by?: string | null
          content_types?: Json | null
          contract_status?: string | null
          country?: string | null
          created_at?: string
          custom_fields?: Json | null
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
          user_id?: string | null
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
      ugc_custom_creator_statuses: {
        Row: {
          brand_id: string
          category: string
          color: string | null
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean | null
          is_final: boolean | null
          status_name: string
          updated_at: string
        }
        Insert: {
          brand_id: string
          category: string
          color?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_final?: boolean | null
          status_name: string
          updated_at?: string
        }
        Update: {
          brand_id?: string
          category?: string
          color?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_final?: boolean | null
          status_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_custom_creator_statuses_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_email_messages: {
        Row: {
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          from_email: string
          html_content: string
          id: string
          message_id: string | null
          sent_at: string | null
          status: string | null
          subject: string
          template_id: string | null
          text_content: string
          thread_id: string
          to_email: string
          variables_used: Json | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          from_email: string
          html_content: string
          id?: string
          message_id?: string | null
          sent_at?: string | null
          status?: string | null
          subject: string
          template_id?: string | null
          text_content: string
          thread_id: string
          to_email: string
          variables_used?: Json | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          from_email?: string
          html_content?: string
          id?: string
          message_id?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string
          template_id?: string | null
          text_content?: string
          thread_id?: string
          to_email?: string
          variables_used?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ugc_email_messages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "ugc_email_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_email_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "ugc_email_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_email_sequence_steps: {
        Row: {
          conditions: Json | null
          created_at: string | null
          custom_html_content: string | null
          custom_subject: string | null
          custom_text_content: string | null
          delay_days: number | null
          delay_hours: number | null
          email_template_id: string | null
          id: string
          name: string
          sequence_id: string
          status_change_action: string | null
          step_order: number
          updated_at: string | null
        }
        Insert: {
          conditions?: Json | null
          created_at?: string | null
          custom_html_content?: string | null
          custom_subject?: string | null
          custom_text_content?: string | null
          delay_days?: number | null
          delay_hours?: number | null
          email_template_id?: string | null
          id?: string
          name: string
          sequence_id: string
          status_change_action?: string | null
          step_order: number
          updated_at?: string | null
        }
        Update: {
          conditions?: Json | null
          created_at?: string | null
          custom_html_content?: string | null
          custom_subject?: string | null
          custom_text_content?: string | null
          delay_days?: number | null
          delay_hours?: number | null
          email_template_id?: string | null
          id?: string
          name?: string
          sequence_id?: string
          status_change_action?: string | null
          step_order?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ugc_email_sequence_steps_email_template_id_fkey"
            columns: ["email_template_id"]
            isOneToOne: false
            referencedRelation: "ugc_email_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_email_sequence_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "ugc_email_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_email_sequences: {
        Row: {
          brand_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          trigger_conditions: Json | null
          trigger_event: string
          updated_at: string | null
        }
        Insert: {
          brand_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          trigger_conditions?: Json | null
          trigger_event: string
          updated_at?: string | null
        }
        Update: {
          brand_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          trigger_conditions?: Json | null
          trigger_event?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ugc_email_sequences_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_email_templates: {
        Row: {
          brand_id: string
          created_at: string
          enabled: boolean | null
          html_content: string
          id: string
          name: string
          pipeline_stage: string
          subject: string
          text_content: string
          trigger_status: string | null
          updated_at: string
          user_id: string
          variables: string[] | null
        }
        Insert: {
          brand_id: string
          created_at?: string
          enabled?: boolean | null
          html_content: string
          id?: string
          name: string
          pipeline_stage: string
          subject: string
          text_content: string
          trigger_status?: string | null
          updated_at?: string
          user_id: string
          variables?: string[] | null
        }
        Update: {
          brand_id?: string
          created_at?: string
          enabled?: boolean | null
          html_content?: string
          id?: string
          name?: string
          pipeline_stage?: string
          subject?: string
          text_content?: string
          trigger_status?: string | null
          updated_at?: string
          user_id?: string
          variables?: string[] | null
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
          brand_id: string
          close_reason: string | null
          closed_at: string | null
          closed_by: string | null
          created_at: string
          creator_id: string
          id: string
          is_primary: boolean | null
          status: string | null
          thread_subject: string
          updated_at: string
        }
        Insert: {
          brand_id: string
          close_reason?: string | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          creator_id: string
          id?: string
          is_primary?: boolean | null
          status?: string | null
          thread_subject: string
          updated_at?: string
        }
        Update: {
          brand_id?: string
          close_reason?: string | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          creator_id?: string
          id?: string
          is_primary?: boolean | null
          status?: string | null
          thread_subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_email_threads_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_email_threads_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "ugc_creators"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_form_field_options: {
        Row: {
          created_at: string
          display_order: number | null
          field_name: string
          form_config_id: string
          id: string
          is_active: boolean | null
          option_label: string
          option_value: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          field_name: string
          form_config_id: string
          id?: string
          is_active?: boolean | null
          option_label: string
          option_value: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          field_name?: string
          form_config_id?: string
          id?: string
          is_active?: boolean | null
          option_label?: string
          option_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_form_field_options_form_config_id_fkey"
            columns: ["form_config_id"]
            isOneToOne: false
            referencedRelation: "ugc_onboarding_form_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_form_submissions: {
        Row: {
          brand_id: string
          created_at: string
          creator_id: string | null
          form_config_id: string
          id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submission_data: Json
          submitted_ip: string | null
          updated_at: string
          user_agent: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          brand_id: string
          created_at?: string
          creator_id?: string | null
          form_config_id: string
          id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submission_data?: Json
          submitted_ip?: string | null
          updated_at?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          brand_id?: string
          created_at?: string
          creator_id?: string | null
          form_config_id?: string
          id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submission_data?: Json
          submitted_ip?: string | null
          updated_at?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ugc_form_submissions_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_form_submissions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "ugc_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_form_submissions_form_config_id_fkey"
            columns: ["form_config_id"]
            isOneToOne: false
            referencedRelation: "ugc_onboarding_form_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_human_intervention_queue: {
        Row: {
          assigned_to: string | null
          brand_id: string
          completed_at: string | null
          completed_by: string | null
          context: Json | null
          created_at: string
          creator_id: string
          description: string | null
          due_date: string | null
          execution_id: string
          id: string
          priority: string | null
          resolution_notes: string | null
          status: string
          step_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          brand_id: string
          completed_at?: string | null
          completed_by?: string | null
          context?: Json | null
          created_at?: string
          creator_id: string
          description?: string | null
          due_date?: string | null
          execution_id: string
          id?: string
          priority?: string | null
          resolution_notes?: string | null
          status?: string
          step_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          brand_id?: string
          completed_at?: string | null
          completed_by?: string | null
          context?: Json | null
          created_at?: string
          creator_id?: string
          description?: string | null
          due_date?: string | null
          execution_id?: string
          id?: string
          priority?: string | null
          resolution_notes?: string | null
          status?: string
          step_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_human_intervention_queue_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_human_intervention_queue_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "ugc_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_human_intervention_queue_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "ugc_workflow_execution_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_human_intervention_queue_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "ugc_workflow_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_human_intervention_queue_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "ugc_workflow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_job_applications: {
        Row: {
          cover_letter: string | null
          created_at: string
          creator_id: string | null
          id: string
          job_id: string
          marketplace_application_id: string | null
          portfolio_samples: string[] | null
          proposed_rate: number | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          cover_letter?: string | null
          created_at?: string
          creator_id?: string | null
          id?: string
          job_id: string
          marketplace_application_id?: string | null
          portfolio_samples?: string[] | null
          proposed_rate?: number | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          cover_letter?: string | null
          created_at?: string
          creator_id?: string | null
          id?: string
          job_id?: string
          marketplace_application_id?: string | null
          portfolio_samples?: string[] | null
          proposed_rate?: number | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_job_applications_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "ugc_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "ugc_brand_job_postings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_job_applications_marketplace_application_id_fkey"
            columns: ["marketplace_application_id"]
            isOneToOne: false
            referencedRelation: "ugc_marketplace_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_marketplace_applications: {
        Row: {
          application_data: Json | null
          consent_email: boolean | null
          consent_sms: boolean | null
          content_types: string[] | null
          created_at: string
          creator_id: string | null
          demographics: Json | null
          email: string
          id: string
          instagram_handle: string | null
          name: string
          phone_number: string | null
          platforms: string[] | null
          portfolio_link: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          tiktok_handle: string | null
          updated_at: string
        }
        Insert: {
          application_data?: Json | null
          consent_email?: boolean | null
          consent_sms?: boolean | null
          content_types?: string[] | null
          created_at?: string
          creator_id?: string | null
          demographics?: Json | null
          email: string
          id?: string
          instagram_handle?: string | null
          name: string
          phone_number?: string | null
          platforms?: string[] | null
          portfolio_link?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          tiktok_handle?: string | null
          updated_at?: string
        }
        Update: {
          application_data?: Json | null
          consent_email?: boolean | null
          consent_sms?: boolean | null
          content_types?: string[] | null
          created_at?: string
          creator_id?: string | null
          demographics?: Json | null
          email?: string
          id?: string
          instagram_handle?: string | null
          name?: string
          phone_number?: string | null
          platforms?: string[] | null
          portfolio_link?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          tiktok_handle?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_marketplace_applications_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "ugc_creators"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_message_templates: {
        Row: {
          ai_prompt: string | null
          brand_id: string
          content: string
          created_at: string
          id: string
          is_ai_generated: boolean | null
          name: string
          subject: string | null
          template_type: string
          updated_at: string
          user_id: string
          variables: string[] | null
        }
        Insert: {
          ai_prompt?: string | null
          brand_id: string
          content: string
          created_at?: string
          id?: string
          is_ai_generated?: boolean | null
          name: string
          subject?: string | null
          template_type: string
          updated_at?: string
          user_id: string
          variables?: string[] | null
        }
        Update: {
          ai_prompt?: string | null
          brand_id?: string
          content?: string
          created_at?: string
          id?: string
          is_ai_generated?: boolean | null
          name?: string
          subject?: string | null
          template_type?: string
          updated_at?: string
          user_id?: string
          variables?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "ugc_message_templates_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_monthly_budgets: {
        Row: {
          brand_id: string
          budget_amount: number
          created_at: string
          id: string
          month_year: string
          notes: string | null
          spent_amount: number | null
          updated_at: string
        }
        Insert: {
          brand_id: string
          budget_amount?: number
          created_at?: string
          id?: string
          month_year: string
          notes?: string | null
          spent_amount?: number | null
          updated_at?: string
        }
        Update: {
          brand_id?: string
          budget_amount?: number
          created_at?: string
          id?: string
          month_year?: string
          notes?: string | null
          spent_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_monthly_budgets_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_onboarding_form_configs: {
        Row: {
          auto_assign_status: string | null
          brand_id: string
          branding: Json | null
          collect_address: boolean | null
          collect_demographics: boolean | null
          collect_portfolio: boolean | null
          collect_social_handles: boolean | null
          created_at: string
          custom_fields: Json | null
          description: string | null
          form_name: string
          id: string
          is_active: boolean | null
          is_public: boolean | null
          notification_emails: string[] | null
          requires_approval: boolean | null
          success_message: string | null
          updated_at: string
          welcome_message: string | null
        }
        Insert: {
          auto_assign_status?: string | null
          brand_id: string
          branding?: Json | null
          collect_address?: boolean | null
          collect_demographics?: boolean | null
          collect_portfolio?: boolean | null
          collect_social_handles?: boolean | null
          created_at?: string
          custom_fields?: Json | null
          description?: string | null
          form_name?: string
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          notification_emails?: string[] | null
          requires_approval?: boolean | null
          success_message?: string | null
          updated_at?: string
          welcome_message?: string | null
        }
        Update: {
          auto_assign_status?: string | null
          brand_id?: string
          branding?: Json | null
          collect_address?: boolean | null
          collect_demographics?: boolean | null
          collect_portfolio?: boolean | null
          collect_social_handles?: boolean | null
          created_at?: string
          custom_fields?: Json | null
          description?: string | null
          form_name?: string
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          notification_emails?: string[] | null
          requires_approval?: boolean | null
          success_message?: string | null
          updated_at?: string
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ugc_onboarding_form_configs_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_payments: {
        Row: {
          amount: number
          brand_id: string
          created_at: string
          created_by: string | null
          creator_id: string
          currency: string | null
          due_date: string | null
          id: string
          invoice_number: string | null
          last_reminder_sent: string | null
          notes: string | null
          paid_by: string | null
          paid_date: string | null
          payment_method: string | null
          payment_type: string
          reminder_sent_count: number | null
          script_id: string | null
          status: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          brand_id: string
          created_at?: string
          created_by?: string | null
          creator_id: string
          currency?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          last_reminder_sent?: string | null
          notes?: string | null
          paid_by?: string | null
          paid_date?: string | null
          payment_method?: string | null
          payment_type: string
          reminder_sent_count?: number | null
          script_id?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          brand_id?: string
          created_at?: string
          created_by?: string | null
          creator_id?: string
          currency?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          last_reminder_sent?: string | null
          notes?: string | null
          paid_by?: string | null
          paid_date?: string | null
          payment_method?: string | null
          payment_type?: string
          reminder_sent_count?: number | null
          script_id?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_payments_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_payments_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "ugc_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_payments_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "ugc_creator_scripts"
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
      ugc_sequence_execution_log: {
        Row: {
          created_at: string | null
          creator_id: string
          email_message_id: string | null
          enrollment_id: string
          error_message: string | null
          executed_at: string | null
          id: string
          scheduled_at: string
          status: string | null
          step_id: string
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          email_message_id?: string | null
          enrollment_id: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          scheduled_at: string
          status?: string | null
          step_id: string
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          email_message_id?: string | null
          enrollment_id?: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          scheduled_at?: string
          status?: string | null
          step_id?: string
        }
        Relationships: [
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
        ]
      }
      ugc_shipment_history: {
        Row: {
          created_at: string
          id: string
          location: string | null
          notes: string | null
          shipment_id: string
          status: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string | null
          notes?: string | null
          shipment_id: string
          status: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          location?: string | null
          notes?: string | null
          shipment_id?: string
          status?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ugc_shipment_history_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "ugc_shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_shipments: {
        Row: {
          brand_id: string
          carrier: string | null
          created_at: string
          created_by: string | null
          creator_id: string
          delivered_at: string | null
          dimensions: Json | null
          estimated_delivery: string | null
          id: string
          priority: string | null
          processed_by: string | null
          products: Json
          shipment_title: string
          shipped_at: string | null
          shipping_address: Json
          shipping_cost: number | null
          shipping_method: string | null
          slack_message_ts: string | null
          slack_notification_sent: boolean | null
          special_instructions: string | null
          status: string
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
          weight_lbs: number | null
          workflow_execution_id: string | null
        }
        Insert: {
          brand_id: string
          carrier?: string | null
          created_at?: string
          created_by?: string | null
          creator_id: string
          delivered_at?: string | null
          dimensions?: Json | null
          estimated_delivery?: string | null
          id?: string
          priority?: string | null
          processed_by?: string | null
          products?: Json
          shipment_title: string
          shipped_at?: string | null
          shipping_address: Json
          shipping_cost?: number | null
          shipping_method?: string | null
          slack_message_ts?: string | null
          slack_notification_sent?: boolean | null
          special_instructions?: string | null
          status?: string
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          weight_lbs?: number | null
          workflow_execution_id?: string | null
        }
        Update: {
          brand_id?: string
          carrier?: string | null
          created_at?: string
          created_by?: string | null
          creator_id?: string
          delivered_at?: string | null
          dimensions?: Json | null
          estimated_delivery?: string | null
          id?: string
          priority?: string | null
          processed_by?: string | null
          products?: Json
          shipment_title?: string
          shipped_at?: string | null
          shipping_address?: Json
          shipping_cost?: number | null
          shipping_method?: string | null
          slack_message_ts?: string | null
          slack_notification_sent?: boolean | null
          special_instructions?: string | null
          status?: string
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          weight_lbs?: number | null
          workflow_execution_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ugc_shipments_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_shipments_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "ugc_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_shipments_workflow_execution_id_fkey"
            columns: ["workflow_execution_id"]
            isOneToOne: false
            referencedRelation: "ugc_workflow_execution_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_shipments_workflow_execution_id_fkey"
            columns: ["workflow_execution_id"]
            isOneToOne: false
            referencedRelation: "ugc_workflow_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_workflow_actions: {
        Row: {
          action_type: string
          created_at: string
          description: string | null
          id: string
          input_schema: Json | null
          is_system: boolean | null
          name: string
          output_schema: Json | null
        }
        Insert: {
          action_type: string
          created_at?: string
          description?: string | null
          id?: string
          input_schema?: Json | null
          is_system?: boolean | null
          name: string
          output_schema?: Json | null
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string | null
          id?: string
          input_schema?: Json | null
          is_system?: boolean | null
          name?: string
          output_schema?: Json | null
        }
        Relationships: []
      }
      ugc_workflow_conditions: {
        Row: {
          condition_type: string
          created_at: string
          expected_value: string | null
          field_name: string | null
          id: string
          next_step_id: string | null
          operator: string
          step_id: string
        }
        Insert: {
          condition_type: string
          created_at?: string
          expected_value?: string | null
          field_name?: string | null
          id?: string
          next_step_id?: string | null
          operator: string
          step_id: string
        }
        Update: {
          condition_type?: string
          created_at?: string
          expected_value?: string | null
          field_name?: string | null
          id?: string
          next_step_id?: string | null
          operator?: string
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_workflow_conditions_next_step_id_fkey"
            columns: ["next_step_id"]
            isOneToOne: false
            referencedRelation: "ugc_workflow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_workflow_conditions_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "ugc_workflow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_workflow_executions: {
        Row: {
          brand_id: string
          completed_at: string | null
          context: Json | null
          created_at: string
          creator_id: string
          current_step_id: string | null
          error_message: string | null
          id: string
          started_at: string
          status: string
          updated_at: string
          workflow_id: string
        }
        Insert: {
          brand_id: string
          completed_at?: string | null
          context?: Json | null
          created_at?: string
          creator_id: string
          current_step_id?: string | null
          error_message?: string | null
          id?: string
          started_at?: string
          status?: string
          updated_at?: string
          workflow_id: string
        }
        Update: {
          brand_id?: string
          completed_at?: string | null
          context?: Json | null
          created_at?: string
          creator_id?: string
          current_step_id?: string | null
          error_message?: string | null
          id?: string
          started_at?: string
          status?: string
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_workflow_executions_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_workflow_executions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "ugc_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_workflow_executions_current_step_id_fkey"
            columns: ["current_step_id"]
            isOneToOne: false
            referencedRelation: "ugc_workflow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_workflow_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "ugc_workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_workflow_step_executions: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          execution_id: string
          id: string
          input_data: Json | null
          output_data: Json | null
          started_at: string | null
          status: string
          step_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          execution_id: string
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          started_at?: string | null
          status?: string
          step_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          execution_id?: string
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          started_at?: string | null
          status?: string
          step_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_workflow_step_executions_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "ugc_workflow_execution_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_workflow_step_executions_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "ugc_workflow_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_workflow_step_executions_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "ugc_workflow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_workflow_steps: {
        Row: {
          canvas_position: Json | null
          config: Json | null
          created_at: string
          description: string | null
          id: string
          name: string
          step_order: number
          step_type: string
          updated_at: string
          workflow_id: string
        }
        Insert: {
          canvas_position?: Json | null
          config?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          step_order: number
          step_type: string
          updated_at?: string
          workflow_id: string
        }
        Update: {
          canvas_position?: Json | null
          config?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          step_order?: number
          step_type?: string
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_workflow_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "ugc_workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_workflow_templates: {
        Row: {
          brand_id: string
          canvas_layout: Json | null
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          trigger_event: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_id: string
          canvas_layout?: Json | null
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          trigger_event: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_id?: string
          canvas_layout?: Json | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          trigger_event?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_workflow_templates_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
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
          tldraw_data: Json | null
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
          tldraw_data?: Json | null
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
          tldraw_data?: Json | null
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
      ugc_human_review_queue: {
        Row: {
          assigned_to: string | null
          brand_id: string | null
          completed_at: string | null
          completed_by: string | null
          context: Json | null
          created_at: string | null
          creator_id: string | null
          description: string | null
          due_date: string | null
          id: string | null
          priority: string | null
          resolution_notes: string | null
          status: string | null
          step_id: string | null
          title: string | null
          updated_at: string | null
          workflow_execution_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          brand_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          context?: Json | null
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string | null
          priority?: string | null
          resolution_notes?: string | null
          status?: string | null
          step_id?: string | null
          title?: string | null
          updated_at?: string | null
          workflow_execution_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          brand_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          context?: Json | null
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string | null
          priority?: string | null
          resolution_notes?: string | null
          status?: string | null
          step_id?: string | null
          title?: string | null
          updated_at?: string | null
          workflow_execution_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ugc_human_intervention_queue_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_human_intervention_queue_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "ugc_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_human_intervention_queue_execution_id_fkey"
            columns: ["workflow_execution_id"]
            isOneToOne: false
            referencedRelation: "ugc_workflow_execution_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_human_intervention_queue_execution_id_fkey"
            columns: ["workflow_execution_id"]
            isOneToOne: false
            referencedRelation: "ugc_workflow_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_human_intervention_queue_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "ugc_workflow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_workflow_execution_view: {
        Row: {
          brand_id: string | null
          completed_at: string | null
          completed_steps: number | null
          completion_percentage: number | null
          context: Json | null
          created_at: string | null
          creator_id: string | null
          current_step_id: string | null
          current_step_name: string | null
          error_message: string | null
          id: string | null
          started_at: string | null
          status: string | null
          total_steps: number | null
          updated_at: string | null
          workflow_id: string | null
        }
        Insert: {
          brand_id?: string | null
          completed_at?: string | null
          completed_steps?: never
          completion_percentage?: never
          context?: Json | null
          created_at?: string | null
          creator_id?: string | null
          current_step_id?: string | null
          current_step_name?: never
          error_message?: string | null
          id?: string | null
          started_at?: string | null
          status?: string | null
          total_steps?: never
          updated_at?: string | null
          workflow_id?: string | null
        }
        Update: {
          brand_id?: string | null
          completed_at?: string | null
          completed_steps?: never
          completion_percentage?: never
          context?: Json | null
          created_at?: string | null
          creator_id?: string | null
          current_step_id?: string | null
          current_step_name?: never
          error_message?: string | null
          id?: string | null
          started_at?: string | null
          status?: string | null
          total_steps?: never
          updated_at?: string | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ugc_workflow_executions_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_workflow_executions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "ugc_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_workflow_executions_current_step_id_fkey"
            columns: ["current_step_id"]
            isOneToOne: false
            referencedRelation: "ugc_workflow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_workflow_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "ugc_workflow_templates"
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
      can_user_edit_brand: {
        Args: { p_brand_id: string; p_user_id?: string }
        Returns: boolean
      }
      check_rls_policies: {
        Args: { table_name: string }
        Returns: {
          policy_name: string
          policy_definition: string
        }[]
      }
      close_email_thread: {
        Args: { p_thread_id: string; p_user_id: string; p_reason?: string }
        Returns: boolean
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
      create_sample_creator_onboarding_workflow: {
        Args: { brand_uuid: string; user_uuid: string }
        Returns: string
      }
      current_user_account_role: {
        Args: { account_id: string }
        Returns: Json
      }
      delete_email_message: {
        Args: { p_message_id: string; p_user_id: string }
        Returns: boolean
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
      get_monthly_budget_summary: {
        Args: { brand_uuid: string; target_month: string }
        Returns: {
          budget_amount: number
          spent_amount: number
          remaining_amount: number
          percentage_used: number
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
      get_or_create_primary_email_thread: {
        Args: { p_creator_id: string; p_brand_id: string; p_subject?: string }
        Returns: string
      }
      get_personal_account: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_user_accessible_brands: {
        Args: { p_user_id?: string }
        Returns: {
          id: string
          name: string
          user_id: string
          access_type: string
          role: string
          created_at: string
          updated_at: string
        }[]
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
      normalize_email_subject: {
        Args: { subject: string }
        Returns: string
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
      update_monthly_budget_spent: {
        Args: {
          brand_uuid: string
          payment_amount: number
          payment_date: string
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
