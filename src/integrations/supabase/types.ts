export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      account_sync_logs: {
        Row: {
          account_id: string
          completed_at: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          started_at: string
          status: string
          sync_type: string
          trades_synced: number | null
          user_id: string
        }
        Insert: {
          account_id: string
          completed_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          started_at?: string
          status?: string
          sync_type?: string
          trades_synced?: number | null
          user_id: string
        }
        Update: {
          account_id?: string
          completed_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          started_at?: string
          status?: string
          sync_type?: string
          trades_synced?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_sync_logs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "trading_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      account_trade_history: {
        Row: {
          account_id: string
          asset: string
          closed_at: string | null
          created_at: string
          direction: string
          duration_minutes: number | null
          entry_price: number
          exit_price: number | null
          external_trade_id: string | null
          id: string
          lot_size: number
          metadata: Json | null
          opened_at: string
          profit_loss: number | null
          status: string
          stop_loss: number | null
          take_profit: number | null
          user_id: string
        }
        Insert: {
          account_id: string
          asset: string
          closed_at?: string | null
          created_at?: string
          direction: string
          duration_minutes?: number | null
          entry_price?: number
          exit_price?: number | null
          external_trade_id?: string | null
          id?: string
          lot_size?: number
          metadata?: Json | null
          opened_at?: string
          profit_loss?: number | null
          status?: string
          stop_loss?: number | null
          take_profit?: number | null
          user_id: string
        }
        Update: {
          account_id?: string
          asset?: string
          closed_at?: string | null
          created_at?: string
          direction?: string
          duration_minutes?: number | null
          entry_price?: number
          exit_price?: number | null
          external_trade_id?: string | null
          id?: string
          lot_size?: number
          metadata?: Json | null
          opened_at?: string
          profit_loss?: number | null
          status?: string
          stop_loss?: number | null
          take_profit?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_trade_history_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "trading_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chart_reviews: {
        Row: {
          account_size: number | null
          ai_model_used: string | null
          analysis: Json | null
          asset: string
          created_at: string
          custom_account_size: number | null
          didactic_description: string | null
          didactic_tags: string[] | null
          didactic_title: string | null
          didactic_visible: boolean
          id: string
          is_didactic_example: boolean
          parent_review_id: string | null
          request_type: string
          review_mode: string
          review_tier: string
          screenshot_url: string | null
          status: Database["public"]["Enums"]["review_status"]
          timeframe: string
          updated_at: string
          user_id: string
          user_note: string | null
        }
        Insert: {
          account_size?: number | null
          ai_model_used?: string | null
          analysis?: Json | null
          asset: string
          created_at?: string
          custom_account_size?: number | null
          didactic_description?: string | null
          didactic_tags?: string[] | null
          didactic_title?: string | null
          didactic_visible?: boolean
          id?: string
          is_didactic_example?: boolean
          parent_review_id?: string | null
          request_type: string
          review_mode?: string
          review_tier?: string
          screenshot_url?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          timeframe: string
          updated_at?: string
          user_id: string
          user_note?: string | null
        }
        Update: {
          account_size?: number | null
          ai_model_used?: string | null
          analysis?: Json | null
          asset?: string
          created_at?: string
          custom_account_size?: number | null
          didactic_description?: string | null
          didactic_tags?: string[] | null
          didactic_title?: string | null
          didactic_visible?: boolean
          id?: string
          is_didactic_example?: boolean
          parent_review_id?: string | null
          request_type?: string
          review_mode?: string
          review_tier?: string
          screenshot_url?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          timeframe?: string
          updated_at?: string
          user_id?: string
          user_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_chart_reviews_parent_review_id_fkey"
            columns: ["parent_review_id"]
            isOneToOne: false
            referencedRelation: "ai_chart_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_conversations: {
        Row: {
          created_at: string
          id: string
          mode: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mode?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mode?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          image_url: string | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_review_ratings: {
        Row: {
          created_at: string
          id: string
          is_useful: boolean
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_useful: boolean
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_useful?: boolean
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_review_ratings_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "ai_chart_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          id: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      course_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          sort_order: number
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      course_lessons: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          created_at: string
          description: string | null
          id: string
          module_id: string
          sort_order: number
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          module_id: string
          sort_order?: number
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          module_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          id: string
          sort_order: number
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "course_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_review_usage: {
        Row: {
          created_at: string
          id: string
          month_year: string
          quota_limit: number
          reviews_used: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          month_year: string
          quota_limit?: number
          reviews_used?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          month_year?: string
          quota_limit?: number
          reviews_used?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          access_expires_at: string | null
          access_started_at: string | null
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          license_status: string
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          access_expires_at?: string | null
          access_started_at?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          license_status?: string
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          access_expires_at?: string | null
          access_started_at?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          license_status?: string
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          attachment_url: string | null
          created_at: string
          id: string
          is_admin: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          is_admin?: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          is_admin?: boolean
          message?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          category: string
          created_at: string
          id: string
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trade_journal_entries: {
        Row: {
          account_id: string | null
          created_at: string
          did_well: string | null
          emotion: string | null
          free_note: string | null
          id: string
          initial_idea: string | null
          lesson_learned: string | null
          mistakes: string | null
          motivation: string | null
          screenshot_url: string | null
          trade_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          did_well?: string | null
          emotion?: string | null
          free_note?: string | null
          id?: string
          initial_idea?: string | null
          lesson_learned?: string | null
          mistakes?: string | null
          motivation?: string | null
          screenshot_url?: string | null
          trade_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          did_well?: string | null
          emotion?: string | null
          free_note?: string | null
          id?: string
          initial_idea?: string | null
          lesson_learned?: string | null
          mistakes?: string | null
          motivation?: string | null
          screenshot_url?: string | null
          trade_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_journal_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "trading_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_journal_entries_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "account_trade_history"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_accounts: {
        Row: {
          account_name: string
          account_number: string | null
          balance: number | null
          broker: string | null
          connection_status: string
          created_at: string
          daily_pnl: number | null
          drawdown: number | null
          equity: number | null
          id: string
          investor_password: string | null
          last_successful_sync_at: string | null
          last_sync_at: string | null
          last_sync_error: string | null
          metadata: Json | null
          open_positions_count: number | null
          platform: string
          profit_factor: number | null
          profit_loss: number | null
          provider_account_id: string | null
          provider_type: string
          read_only_mode: boolean
          server: string | null
          sync_status: string
          updated_at: string
          user_id: string
          user_note: string | null
          weekly_pnl: number | null
          win_rate: number | null
        }
        Insert: {
          account_name: string
          account_number?: string | null
          balance?: number | null
          broker?: string | null
          connection_status?: string
          created_at?: string
          daily_pnl?: number | null
          drawdown?: number | null
          equity?: number | null
          id?: string
          investor_password?: string | null
          last_successful_sync_at?: string | null
          last_sync_at?: string | null
          last_sync_error?: string | null
          metadata?: Json | null
          open_positions_count?: number | null
          platform?: string
          profit_factor?: number | null
          profit_loss?: number | null
          provider_account_id?: string | null
          provider_type?: string
          read_only_mode?: boolean
          server?: string | null
          sync_status?: string
          updated_at?: string
          user_id: string
          user_note?: string | null
          weekly_pnl?: number | null
          win_rate?: number | null
        }
        Update: {
          account_name?: string
          account_number?: string | null
          balance?: number | null
          broker?: string | null
          connection_status?: string
          created_at?: string
          daily_pnl?: number | null
          drawdown?: number | null
          equity?: number | null
          id?: string
          investor_password?: string | null
          last_successful_sync_at?: string | null
          last_sync_at?: string | null
          last_sync_error?: string | null
          metadata?: Json | null
          open_positions_count?: number | null
          platform?: string
          profit_factor?: number | null
          profit_loss?: number | null
          provider_account_id?: string | null
          provider_type?: string
          read_only_mode?: boolean
          server?: string | null
          sync_status?: string
          updated_at?: string
          user_id?: string
          user_note?: string | null
          weekly_pnl?: number | null
          win_rate?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_status: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["user_status"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_license_valid: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "member"
      review_status: "pending" | "completed" | "failed"
      ticket_status: "open" | "pending" | "resolved"
      user_status: "pending" | "approved" | "suspended"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "member"],
      review_status: ["pending", "completed", "failed"],
      ticket_status: ["open", "pending", "resolved"],
      user_status: ["pending", "approved", "suspended"],
    },
  },
} as const
