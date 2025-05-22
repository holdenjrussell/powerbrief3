export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
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
      brands: {
        Row: {
          id: string
          user_id: string
          name: string
          brand_info_data: Json
          target_audience_data: Json
          competition_data: Json
          editing_resources?: Json
          resource_logins?: Json
          dos_and_donts?: Json
          default_video_instructions?: string
          default_designer_instructions?: string
          system_instructions_image?: string
          system_instructions_video?: string
          elevenlabs_api_key?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          brand_info_data?: Json
          target_audience_data?: Json
          competition_data?: Json
          editing_resources?: Json
          resource_logins?: Json
          dos_and_donts?: Json
          default_video_instructions?: string
          default_designer_instructions?: string
          system_instructions_image?: string
          system_instructions_video?: string
          elevenlabs_api_key?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          brand_info_data?: Json
          target_audience_data?: Json
          competition_data?: Json
          editing_resources?: Json
          resource_logins?: Json
          dos_and_donts?: Json
          default_video_instructions?: string
          default_designer_instructions?: string
          system_instructions_image?: string
          system_instructions_video?: string
          elevenlabs_api_key?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brands_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      brief_batches: {
        Row: {
          id: string
          brand_id: string
          user_id: string
          name: string
          status?: string
          shared_with?: string[]
          share_settings?: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          brand_id: string
          user_id: string
          name: string
          status?: string
          shared_with?: string[]
          share_settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          brand_id?: string
          user_id?: string
          name?: string
          status?: string
          shared_with?: string[]
          share_settings?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brief_batches_brand_id_fkey"
            columns: ["brand_id"]
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brief_batches_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      brief_concepts: {
        Row: {
          id: string
          brief_batch_id: string
          user_id: string
          concept_title: string
          clickup_id?: string
          clickup_link?: string
          strategist?: string
          video_editor?: string
          status?: string
          media_url?: string
          media_type?: string
          ai_custom_prompt?: string
          caption_hook_options?: string
          spoken_hook_options?: string
          body_content_structured: Json
          cta_script?: string
          cta_text_overlay?: string
          description?: string
          videoInstructions?: string
          designerInstructions?: string
          hook_type?: string
          hook_count?: number
          order_in_batch: number
          shared_with?: string[]
          share_settings?: Json
          review_status?: string
          review_link?: string
          reviewer_notes?: string
          linked_creator_ids?: string[]
          original_creator_script?: string
          creator_footage?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          brief_batch_id: string
          user_id: string
          concept_title?: string
          clickup_id?: string
          clickup_link?: string
          strategist?: string
          video_editor?: string
          status?: string
          media_url?: string
          media_type?: string
          ai_custom_prompt?: string
          caption_hook_options?: string
          spoken_hook_options?: string
          body_content_structured?: Json
          cta_script?: string
          cta_text_overlay?: string
          description?: string
          videoInstructions?: string
          designerInstructions?: string
          hook_type?: string
          hook_count?: number
          order_in_batch?: number
          shared_with?: string[]
          share_settings?: Json
          review_status?: string
          review_link?: string
          reviewer_notes?: string
          linked_creator_ids?: string[]
          original_creator_script?: string
          creator_footage?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          brief_batch_id?: string
          user_id?: string
          concept_title?: string
          clickup_id?: string
          clickup_link?: string
          strategist?: string
          video_editor?: string
          status?: string
          media_url?: string
          media_type?: string
          ai_custom_prompt?: string
          caption_hook_options?: string
          spoken_hook_options?: string
          body_content_structured?: Json
          cta_script?: string
          cta_text_overlay?: string
          description?: string
          videoInstructions?: string
          designerInstructions?: string
          hook_type?: string
          hook_count?: number
          order_in_batch?: number
          shared_with?: string[]
          share_settings?: Json
          review_status?: string
          review_link?: string
          reviewer_notes?: string
          linked_creator_ids?: string[]
          original_creator_script?: string
          creator_footage?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brief_concepts_brief_batch_id_fkey"
            columns: ["brief_batch_id"]
            referencedRelation: "brief_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brief_concepts_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      ugc_creators: {
        Row: {
          id: string
          user_id: string
          brand_id: string
          name: string
          gender?: string
          status?: string
          products?: Json
          content_types?: Json
          contract_status?: string
          portfolio_link?: string
          per_script_fee?: number
          email?: string
          phone_number?: string
          instagram_handle?: string
          tiktok_handle?: string
          platforms?: Json
          address_line1?: string
          address_line2?: string
          city?: string
          state?: string
          zip?: string
          country?: string
          contacted_by?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          brand_id: string
          name: string
          gender?: string
          status?: string
          products?: Json
          content_types?: Json
          contract_status?: string
          portfolio_link?: string
          per_script_fee?: number
          email?: string
          phone_number?: string
          instagram_handle?: string
          tiktok_handle?: string
          platforms?: Json
          address_line1?: string
          address_line2?: string
          city?: string
          state?: string
          zip?: string
          country?: string
          contacted_by?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          brand_id?: string
          name?: string
          gender?: string
          status?: string
          products?: Json
          content_types?: Json
          contract_status?: string
          portfolio_link?: string
          per_script_fee?: number
          email?: string
          phone_number?: string
          instagram_handle?: string
          tiktok_handle?: string
          platforms?: Json
          address_line1?: string
          address_line2?: string
          city?: string
          state?: string
          zip?: string
          country?: string
          contacted_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_creators_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_creators_brand_id_fkey"
            columns: ["brand_id"]
            referencedRelation: "brands"
            referencedColumns: ["id"]
          }
        ]
      }
      ugc_creator_scripts: {
        Row: {
          id: string
          creator_id: string
          user_id: string
          brand_id: string
          title: string
          script_content: Json
          status?: string
          b_roll_shot_list?: Json
          ai_custom_prompt?: string
          system_instructions?: string
          hook_type?: string
          hook_count?: number
          final_content_link?: string
          linked_brief_concept_id?: string
          linked_brief_batch_id?: string
          original_creator_script?: string
          creator_footage?: string
          public_share_id?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          creator_id: string
          user_id: string
          brand_id: string
          title: string
          script_content?: Json
          status?: string
          b_roll_shot_list?: Json
          ai_custom_prompt?: string
          system_instructions?: string
          hook_type?: string
          hook_count?: number
          final_content_link?: string
          linked_brief_concept_id?: string
          linked_brief_batch_id?: string
          original_creator_script?: string
          creator_footage?: string
          public_share_id?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          creator_id?: string
          user_id?: string
          brand_id?: string
          title?: string
          script_content?: Json
          status?: string
          b_roll_shot_list?: Json
          ai_custom_prompt?: string
          system_instructions?: string
          hook_type?: string
          hook_count?: number
          final_content_link?: string
          linked_brief_concept_id?: string
          linked_brief_batch_id?: string
          original_creator_script?: string
          creator_footage?: string
          public_share_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_creator_scripts_creator_id_fkey"
            columns: ["creator_id"]
            referencedRelation: "ugc_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_creator_scripts_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_creator_scripts_brand_id_fkey"
            columns: ["brand_id"]
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_creator_scripts_linked_brief_concept_id_fkey"
            columns: ["linked_brief_concept_id"]
            referencedRelation: "brief_concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_creator_scripts_linked_brief_batch_id_fkey"
            columns: ["linked_brief_batch_id"]
            referencedRelation: "brief_batches"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      extension: {
        Args: {
          name: string
        }
        Returns: string
      }
      filename: {
        Args: {
          name: string
        }
        Returns: string
      }
      foldername: {
        Args: {
          name: string
        }
        Returns: string[]
      }
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>
        Returns: {
          size: number
          bucket_id: string
        }[]
      }
      search: {
        Args: {
          prefix: string
          bucketname: string
          limits?: number
          levels?: number
          offsets?: number
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          name: string
          id: string
          updated_at: string
          created_at: string
          last_accessed_at: string
          metadata: Json
        }[]
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
