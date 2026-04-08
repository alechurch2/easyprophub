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
      account_connection_requests: {
        Row: {
          account_type: string | null
          admin_note: string | null
          broker: string
          created_at: string
          id: string
          note: string | null
          platform: string
          reviewed_at: string | null
          reviewed_by: string | null
          server: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type?: string | null
          admin_note?: string | null
          broker: string
          created_at?: string
          id?: string
          note?: string | null
          platform?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          server?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: string | null
          admin_note?: string | null
          broker?: string
          created_at?: string
          id?: string
          note?: string | null
          platform?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          server?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
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
          source_review_id: string | null
          source_signal_id: string | null
          source_type: string | null
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
          source_review_id?: string | null
          source_signal_id?: string | null
          source_type?: string | null
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
          source_review_id?: string | null
          source_signal_id?: string | null
          source_type?: string | null
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
          {
            foreignKeyName: "account_trade_history_source_review_id_fkey"
            columns: ["source_review_id"]
            isOneToOne: false
            referencedRelation: "ai_chart_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_trade_history_source_signal_id_fkey"
            columns: ["source_signal_id"]
            isOneToOne: false
            referencedRelation: "shared_signals"
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
          risk_percent: number | null
          screenshot_url: string | null
          status: Database["public"]["Enums"]["review_status"]
          timeframe: string
          updated_at: string
          user_id: string
          user_note: string | null
          uses_ai_overlay: boolean
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
          risk_percent?: number | null
          screenshot_url?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          timeframe: string
          updated_at?: string
          user_id: string
          user_note?: string | null
          uses_ai_overlay?: boolean
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
          risk_percent?: number | null
          screenshot_url?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          timeframe?: string
          updated_at?: string
          user_id?: string
          user_note?: string | null
          uses_ai_overlay?: boolean
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
      ai_usage_limits: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          limit_type: string
          limit_value: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          limit_type: string
          limit_value?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          limit_type?: string
          limit_value?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ai_usage_log: {
        Row: {
          created_at: string
          estimated_cost: number | null
          function_type: string
          id: string
          metadata: Json | null
          model: string
          tokens_input: number | null
          tokens_output: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          estimated_cost?: number | null
          function_type: string
          id?: string
          metadata?: Json | null
          model: string
          tokens_input?: number | null
          tokens_output?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          estimated_cost?: number | null
          function_type?: string
          id?: string
          metadata?: Json | null
          model?: string
          tokens_input?: number | null
          tokens_output?: number | null
          user_id?: string
        }
        Relationships: []
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
      broker_support_requests: {
        Row: {
          admin_note: string | null
          approved_broker_id: string | null
          broker_name: string
          created_at: string
          id: string
          note: string | null
          platform: string
          reference_link: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          server: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          approved_broker_id?: string | null
          broker_name: string
          created_at?: string
          id?: string
          note?: string | null
          platform?: string
          reference_link?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          server?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          approved_broker_id?: string | null
          broker_name?: string
          created_at?: string
          id?: string
          note?: string | null
          platform?: string
          reference_link?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          server?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "broker_support_requests_approved_broker_id_fkey"
            columns: ["approved_broker_id"]
            isOneToOne: false
            referencedRelation: "supported_brokers"
            referencedColumns: ["id"]
          },
        ]
      }
      course_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          min_license_level: Database["public"]["Enums"]["license_level"]
          sort_order: number
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          min_license_level?: Database["public"]["Enums"]["license_level"]
          sort_order?: number
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          min_license_level?: Database["public"]["Enums"]["license_level"]
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
          min_license_level: Database["public"]["Enums"]["license_level"]
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
          min_license_level?: Database["public"]["Enums"]["license_level"]
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
          min_license_level?: Database["public"]["Enums"]["license_level"]
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
          min_license_level: Database["public"]["Enums"]["license_level"]
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
          min_license_level?: Database["public"]["Enums"]["license_level"]
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
          min_license_level?: Database["public"]["Enums"]["license_level"]
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
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
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
      order_execution_logs: {
        Row: {
          account_id: string
          asset: string
          created_at: string
          direction: string
          entry_price: number
          error_message: string | null
          id: string
          lot_size: number
          order_type: string
          provider_response: Json | null
          review_id: string | null
          status: string
          stop_loss: number | null
          take_profit: number | null
          user_id: string
        }
        Insert: {
          account_id: string
          asset: string
          created_at?: string
          direction: string
          entry_price: number
          error_message?: string | null
          id?: string
          lot_size: number
          order_type?: string
          provider_response?: Json | null
          review_id?: string | null
          status?: string
          stop_loss?: number | null
          take_profit?: number | null
          user_id: string
        }
        Update: {
          account_id?: string
          asset?: string
          created_at?: string
          direction?: string
          entry_price?: number
          error_message?: string | null
          id?: string
          lot_size?: number
          order_type?: string
          provider_response?: Json | null
          review_id?: string | null
          status?: string
          stop_loss?: number | null
          take_profit?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_execution_logs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "trading_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_execution_logs_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "ai_chart_reviews"
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
      product_analytics_events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          metadata: Json | null
          page: string | null
          section: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          metadata?: Json | null
          page?: string | null
          section?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          metadata?: Json | null
          page?: string | null
          section?: string | null
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
      shared_signals: {
        Row: {
          asset: string
          created_at: string | null
          created_by: string
          direction: string
          entry_price: number
          expires_at: string | null
          explanation: string | null
          id: string
          is_archived: boolean | null
          is_published: boolean | null
          lot_size_suggestion: number | null
          modified_at: string | null
          modified_by: string | null
          order_type: string
          original_payload: Json | null
          published_at: string | null
          review_id: string | null
          review_mode: string | null
          review_tier: string | null
          signal_quality: string | null
          signal_source: string
          signal_status: string
          signal_strength: number | null
          status_updated_at: string | null
          stop_loss: number
          take_profit: number
          updated_at: string | null
        }
        Insert: {
          asset: string
          created_at?: string | null
          created_by: string
          direction: string
          entry_price: number
          expires_at?: string | null
          explanation?: string | null
          id?: string
          is_archived?: boolean | null
          is_published?: boolean | null
          lot_size_suggestion?: number | null
          modified_at?: string | null
          modified_by?: string | null
          order_type?: string
          original_payload?: Json | null
          published_at?: string | null
          review_id?: string | null
          review_mode?: string | null
          review_tier?: string | null
          signal_quality?: string | null
          signal_source?: string
          signal_status?: string
          signal_strength?: number | null
          status_updated_at?: string | null
          stop_loss: number
          take_profit: number
          updated_at?: string | null
        }
        Update: {
          asset?: string
          created_at?: string | null
          created_by?: string
          direction?: string
          entry_price?: number
          expires_at?: string | null
          explanation?: string | null
          id?: string
          is_archived?: boolean | null
          is_published?: boolean | null
          lot_size_suggestion?: number | null
          modified_at?: string | null
          modified_by?: string | null
          order_type?: string
          original_payload?: Json | null
          published_at?: string | null
          review_id?: string | null
          review_mode?: string | null
          review_tier?: string | null
          signal_quality?: string | null
          signal_source?: string
          signal_status?: string
          signal_strength?: number | null
          status_updated_at?: string | null
          stop_loss?: number
          take_profit?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_signals_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "ai_chart_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      standard_review_usage: {
        Row: {
          created_at: string
          id: string
          month_year: string
          reviews_used: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          month_year: string
          reviews_used?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          month_year?: string
          reviews_used?: number
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
      supported_brokers: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          platforms: string[]
          servers: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          platforms?: string[]
          servers?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          platforms?: string[]
          servers?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      telegram_bot_state: {
        Row: {
          id: number
          update_offset: number
          updated_at: string
        }
        Insert: {
          id: number
          update_offset?: number
          updated_at?: string
        }
        Update: {
          id?: number
          update_offset?: number
          updated_at?: string
        }
        Relationships: []
      }
      telegram_link_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      trade_ai_reviews: {
        Row: {
          ai_model_used: string | null
          analysis: Json | null
          created_at: string
          id: string
          source_review_id: string | null
          source_signal_id: string | null
          status: string
          trade_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_model_used?: string | null
          analysis?: Json | null
          created_at?: string
          id?: string
          source_review_id?: string | null
          source_signal_id?: string | null
          status?: string
          trade_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_model_used?: string | null
          analysis?: Json | null
          created_at?: string
          id?: string
          source_review_id?: string | null
          source_signal_id?: string | null
          status?: string
          trade_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_ai_reviews_source_review_id_fkey"
            columns: ["source_review_id"]
            isOneToOne: false
            referencedRelation: "ai_chart_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_ai_reviews_source_signal_id_fkey"
            columns: ["source_signal_id"]
            isOneToOne: false
            referencedRelation: "shared_signals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_ai_reviews_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "account_trade_history"
            referencedColumns: ["id"]
          },
        ]
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
          credential_mode: string
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
          trading_execution_enabled: boolean
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
          credential_mode?: string
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
          trading_execution_enabled?: boolean
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
          credential_mode?: string
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
          trading_execution_enabled?: boolean
          updated_at?: string
          user_id?: string
          user_note?: string | null
          weekly_pnl?: number | null
          win_rate?: number | null
        }
        Relationships: []
      }
      user_account_limits: {
        Row: {
          id: string
          max_accounts: number
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          id?: string
          max_accounts?: number
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          id?: string
          max_accounts?: number
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_broker_overrides: {
        Row: {
          broker_name: string
          created_at: string
          granted_by: string | null
          id: string
          user_id: string
        }
        Insert: {
          broker_name: string
          created_at?: string
          granted_by?: string | null
          id?: string
          user_id: string
        }
        Update: {
          broker_name?: string
          created_at?: string
          granted_by?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_license_settings: {
        Row: {
          account_center_enabled: boolean
          ai_assistant_enabled: boolean
          chart_review_monthly_limit: number
          id: string
          license_level: Database["public"]["Enums"]["license_level"]
          premium_review_monthly_limit: number
          trade_execution_enabled: boolean
          training_access_level: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          account_center_enabled?: boolean
          ai_assistant_enabled?: boolean
          chart_review_monthly_limit?: number
          id?: string
          license_level?: Database["public"]["Enums"]["license_level"]
          premium_review_monthly_limit?: number
          trade_execution_enabled?: boolean
          training_access_level?: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          account_center_enabled?: boolean
          ai_assistant_enabled?: boolean
          chart_review_monthly_limit?: number
          id?: string
          license_level?: Database["public"]["Enums"]["license_level"]
          premium_review_monthly_limit?: number
          trade_execution_enabled?: boolean
          training_access_level?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_notification_preferences: {
        Row: {
          created_at: string
          email_signals_enabled: boolean
          id: string
          telegram_chat_id: string | null
          telegram_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_signals_enabled?: boolean
          id?: string
          telegram_chat_id?: string | null
          telegram_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_signals_enabled?: boolean
          id?: string
          telegram_chat_id?: string | null
          telegram_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_onboarding_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          status: string
          step_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          status?: string
          step_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          status?: string
          step_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_risk_preferences: {
        Row: {
          created_at: string
          default_risk_percent: number
          id: string
          linked_account_id: string | null
          manual_account_size: number | null
          risk_reference_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_risk_percent?: number
          id?: string
          linked_account_id?: string | null
          manual_account_size?: number | null
          risk_reference_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_risk_percent?: number
          id?: string
          linked_account_id?: string | null
          manual_account_size?: number | null
          risk_reference_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_risk_preferences_linked_account_id_fkey"
            columns: ["linked_account_id"]
            isOneToOne: false
            referencedRelation: "trading_accounts"
            referencedColumns: ["id"]
          },
        ]
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
      check_account_limit: { Args: { _user_id: string }; Returns: Json }
      decrypt_investor_password: {
        Args: { _account_id: string }
        Returns: string
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_user_email_for_notification: {
        Args: { _user_id: string }
        Returns: string
      }
      get_user_license_settings: { Args: { _user_id: string }; Returns: Json }
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
      increment_review_usage: {
        Args: {
          _month_year: string
          _premium_quota_limit?: number
          _tier?: string
          _user_id: string
        }
        Returns: undefined
      }
      is_broker_allowed: {
        Args: { _broker_name: string; _user_id: string }
        Returns: boolean
      }
      is_license_valid: { Args: { _user_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "member"
      license_level: "free" | "pro" | "live"
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
      license_level: ["free", "pro", "live"],
      review_status: ["pending", "completed", "failed"],
      ticket_status: ["open", "pending", "resolved"],
      user_status: ["pending", "approved", "suspended"],
    },
  },
} as const
