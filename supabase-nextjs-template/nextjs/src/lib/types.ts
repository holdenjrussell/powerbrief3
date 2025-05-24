[?25l
    Select a project:                                                                                      
                                                                                                           
  >  1. kfeptotzytggemwtkncu [name: holdenjrussell's Project, org: enieffjshukqdwmntzmo, region: us-east-1]
    2. zourruaksidixhbvwjzl [name: holdenjrussell's Project, org: enieffjshukqdwmntzmo, region: us-east-1] 
    3. pxjxwagyrjhrrbesbves [name: brandy-web, org: enieffjshukqdwmntzmo, region: us-west-1]               
    4. xnwotryxuaeakrlelobk [name: payload-cms-brandy, org: enieffjshukqdwmntzmo, region: us-east-1]       
    5. bxjtmpuurroxtdoykwep [name: EZ BRIEF, org: enieffjshukqdwmntzmo, region: us-east-2]                 
    6. tlumcsohnsgqowehwsov [name: AI-Chat, org: enieffjshukqdwmntzmo, region: us-east-2]                  
    7. jypbohpvphcigmfnxmmq [name: powerbrief, org: mbhuijdessfmbnqvbjgl, region: us-east-2]               
                                                                                                           
                                                                                                           
                                                                                                           
                                                                                                           
    ↑/k up • ↓/j down • / filter • q quit • ? more                                                         
                                                                                                           [0D[2K[1A[2K[1A[2K[1A[2K[1A[2K[1A[2K[1A[2K[1A[2K[1A[2K[1A[2K[1A[2K[1A[2K[1A[2K[1A[2K[1A[2K[1A[0D[2K [0D[2K[?25h[?1002l[?1003l[?1006lexport type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      app_config: {
        Row: {
          created_at: string | null
          id: string
          key: string
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      cache: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      categorized_meta_ads: {
        Row: {
          ad_id: string | null
          ad_type_content_bucket: string | null
          ad_type_id: string | null
          angle: string | null
          angle_id: string | null
          audio_hook: string | null
          audio_hook_id: string | null
          batch_number: string | null
          concept_version: string | null
          created_at: string | null
          format: string | null
          framework: string | null
          framework_id: string | null
          funnel_stage: string | null
          funnel_stage_id: string | null
          handle: string | null
          id: string
          iteration_number: string | null
          launch_date: string | null
          linked_element_ids: Json | null
          model: string | null
          parent: string | null
          post_id: string | null
          primary_theme: string | null
          product_name: string | null
          strategist_editor: string | null
          tags: Json | null
          updated_at: string | null
          user_id: string | null
          version: string | null
          visual_hook: string | null
          visual_hook_id: string | null
          wildcard: string | null
        }
        Insert: {
          ad_id?: string | null
          ad_type_content_bucket?: string | null
          ad_type_id?: string | null
          angle?: string | null
          angle_id?: string | null
          audio_hook?: string | null
          audio_hook_id?: string | null
          batch_number?: string | null
          concept_version?: string | null
          created_at?: string | null
          format?: string | null
          framework?: string | null
          framework_id?: string | null
          funnel_stage?: string | null
          funnel_stage_id?: string | null
          handle?: string | null
          id?: string
          iteration_number?: string | null
          launch_date?: string | null
          linked_element_ids?: Json | null
          model?: string | null
          parent?: string | null
          post_id?: string | null
          primary_theme?: string | null
          product_name?: string | null
          strategist_editor?: string | null
          tags?: Json | null
          updated_at?: string | null
          user_id?: string | null
          version?: string | null
          visual_hook?: string | null
          visual_hook_id?: string | null
          wildcard?: string | null
        }
        Update: {
          ad_id?: string | null
          ad_type_content_bucket?: string | null
          ad_type_id?: string | null
          angle?: string | null
          angle_id?: string | null
          audio_hook?: string | null
          audio_hook_id?: string | null
          batch_number?: string | null
          concept_version?: string | null
          created_at?: string | null
          format?: string | null
          framework?: string | null
          framework_id?: string | null
          funnel_stage?: string | null
          funnel_stage_id?: string | null
          handle?: string | null
          id?: string
          iteration_number?: string | null
          launch_date?: string | null
          linked_element_ids?: Json | null
          model?: string | null
          parent?: string | null
          post_id?: string | null
          primary_theme?: string | null
          product_name?: string | null
          strategist_editor?: string | null
          tags?: Json | null
          updated_at?: string | null
          user_id?: string | null
          version?: string | null
          visual_hook?: string | null
          visual_hook_id?: string | null
          wildcard?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categorized_meta_ads_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: true
            referencedRelation: "meta_ads_data"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categorized_meta_ads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      category_types: {
        Row: {
          created_at: string
          description: string | null
          icon_name: string
          id: string
          name: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon_name: string
          id?: string
          name: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon_name?: string
          id?: string
          name?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      elements: {
        Row: {
          abbreviation: string | null
          category_id: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          abbreviation?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          abbreviation?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "elements_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_ads_data: {
        Row: {
          click_to_purchase_rate: number | null
          clicks: number | null
          created_at: string | null
          date_start: string | null
          date_stop: string | null
          fetch_date: string | null
          id: string
          name: string
          purchases: number | null
          revenue: number | null
          roas: number | null
          spend: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          click_to_purchase_rate?: number | null
          clicks?: number | null
          created_at?: string | null
          date_start?: string | null
          date_stop?: string | null
          fetch_date?: string | null
          id: string
          name: string
          purchases?: number | null
          revenue?: number | null
          roas?: number | null
          spend?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          click_to_purchase_rate?: number | null
          clicks?: number | null
          created_at?: string | null
          date_start?: string | null
          date_stop?: string | null
          fetch_date?: string | null
          id?: string
          name?: string
          purchases?: number | null
          revenue?: number | null
          roas?: number | null
          spend?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_ads_data_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      naming_conventions: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          examples: string[] | null
          id: string
          prefix: string
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          examples?: string[] | null
          id?: string
          prefix: string
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          examples?: string[] | null
          id?: string
          prefix?: string
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "naming_conventions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      product_info: {
        Row: {
          core_benefits: string[] | null
          created_at: string | null
          description: string | null
          id: string
          key_features: string[] | null
          name: string
          target_audience: string | null
          unique_selling_points: string[] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          core_benefits?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          key_features?: string[] | null
          name: string
          target_audience?: string | null
          unique_selling_points?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          core_benefits?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          key_features?: string[] | null
          name?: string
          target_audience?: string | null
          unique_selling_points?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_info_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      scripts: {
        Row: {
          ad_type: string | null
          ad_type_id: string | null
          angle: string | null
          angle_id: string | null
          audio_hook: string | null
          audio_hook_id: string | null
          content: string
          created_at: string | null
          framework: string | null
          framework_id: string | null
          funnel_stage: string | null
          funnel_stage_id: string | null
          id: string
          title: string
          updated_at: string | null
          user_id: string | null
          visual_hook: string | null
          visual_hook_id: string | null
        }
        Insert: {
          ad_type?: string | null
          ad_type_id?: string | null
          angle?: string | null
          angle_id?: string | null
          audio_hook?: string | null
          audio_hook_id?: string | null
          content: string
          created_at?: string | null
          framework?: string | null
          framework_id?: string | null
          funnel_stage?: string | null
          funnel_stage_id?: string | null
          id?: string
          title: string
          updated_at?: string | null
          user_id?: string | null
          visual_hook?: string | null
          visual_hook_id?: string | null
        }
        Update: {
          ad_type?: string | null
          ad_type_id?: string | null
          angle?: string | null
          angle_id?: string | null
          audio_hook?: string | null
          audio_hook_id?: string | null
          content?: string
          created_at?: string | null
          framework?: string | null
          framework_id?: string | null
          funnel_stage?: string | null
          funnel_stage_id?: string | null
          id?: string
          title?: string
          updated_at?: string | null
          user_id?: string | null
          visual_hook?: string | null
          visual_hook_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scripts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string | null
          id: string
          meta_ads_end_date: string | null
          meta_ads_start_date: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          meta_ads_end_date?: string | null
          meta_ads_start_date?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          meta_ads_end_date?: string | null
          meta_ads_start_date?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          anthropic_api_key: string | null
          created_at: string | null
          email: string
          gemini_api_key: string | null
          id: string
          meta_access_token: string | null
          meta_ad_account_id: string | null
          name: string | null
          openai_api_key: string | null
          password: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          anthropic_api_key?: string | null
          created_at?: string | null
          email: string
          gemini_api_key?: string | null
          id?: string
          meta_access_token?: string | null
          meta_ad_account_id?: string | null
          name?: string | null
          openai_api_key?: string | null
          password?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          anthropic_api_key?: string | null
          created_at?: string | null
          email?: string
          gemini_api_key?: string | null
          id?: string
          meta_access_token?: string | null
          meta_ad_account_id?: string | null
          name?: string | null
          openai_api_key?: string | null
          password?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
