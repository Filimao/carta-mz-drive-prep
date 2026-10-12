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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      admin_emails: {
        Row: {
          created_at: string
          email: string
        }
        Insert: {
          created_at?: string
          email: string
        }
        Update: {
          created_at?: string
          email?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          code: string
          description: string
          emoji: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          code: string
          description: string
          emoji?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          code?: string
          description?: string
          emoji?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          emoji: string
          icon: string
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          emoji?: string
          icon?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          emoji?: string
          icon?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      daily_usage: {
        Row: {
          created_at: string
          day: string
          id: string
          questions_answered: number
          sessions_started: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day?: string
          id?: string
          questions_answered?: number
          sessions_started?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          id?: string
          questions_answered?: number
          sessions_started?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          question_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          question_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          last_study_date: string | null
          phone: string | null
          plan: Database["public"]["Enums"]["plan_tier"]
          plan_expires_at: string | null
          streak_days: number
          terms_accepted_at: string | null
          updated_at: string
          xp: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          last_study_date?: string | null
          phone?: string | null
          plan?: Database["public"]["Enums"]["plan_tier"]
          plan_expires_at?: string | null
          streak_days?: number
          terms_accepted_at?: string | null
          updated_at?: string
          xp?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          last_study_date?: string | null
          phone?: string | null
          plan?: Database["public"]["Enums"]["plan_tier"]
          plan_expires_at?: string | null
          streak_days?: number
          terms_accepted_at?: string | null
          updated_at?: string
          xp?: number
        }
        Relationships: []
      }
      question_imports: {
        Row: {
          created_at: string
          created_by: string
          error_message: string | null
          failed_pages: number[]
          file_name: string
          id: string
          processed_pages: number
          questions_found: number
          status: string
          storage_path: string
          total_pages: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          error_message?: string | null
          failed_pages?: number[]
          file_name: string
          id?: string
          processed_pages?: number
          questions_found?: number
          status?: string
          storage_path: string
          total_pages?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          error_message?: string | null
          failed_pages?: number[]
          file_name?: string
          id?: string
          processed_pages?: number
          questions_found?: number
          status?: string
          storage_path?: string
          total_pages?: number
          updated_at?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          category_id: string | null
          correct_answer: string
          created_at: string
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          explanation: string
          id: string
          image_region: Json | null
          image_url: string | null
          import_id: string | null
          is_published: boolean
          is_verified: boolean
          needs_review: boolean
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question_text: string
          source: Database["public"]["Enums"]["question_source"]
          source_document: string | null
          source_page: number | null
          tip: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          correct_answer: string
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          explanation?: string
          id?: string
          image_region?: Json | null
          image_url?: string | null
          import_id?: string | null
          is_published?: boolean
          is_verified?: boolean
          needs_review?: boolean
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question_text: string
          source?: Database["public"]["Enums"]["question_source"]
          source_document?: string | null
          source_page?: number | null
          tip?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          correct_answer?: string
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          explanation?: string
          id?: string
          image_region?: Json | null
          image_url?: string | null
          import_id?: string | null
          is_published?: boolean
          is_verified?: boolean
          needs_review?: boolean
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          question_text?: string
          source?: Database["public"]["Enums"]["question_source"]
          source_document?: string | null
          source_page?: number | null
          tip?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "question_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_answers: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          question_id: string
          seconds_spent: number
          selected_answer: string | null
          session_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id: string
          seconds_spent?: number
          selected_answer?: string | null
          session_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          seconds_spent?: number
          selected_answer?: string | null
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_sessions: {
        Row: {
          completed_at: string | null
          config: Json
          correct_count: number
          created_at: string
          id: string
          mode: string
          score_percent: number
          seconds_spent: number
          skipped_count: number
          total_questions: number
          user_id: string
          wrong_count: number
        }
        Insert: {
          completed_at?: string | null
          config?: Json
          correct_count?: number
          created_at?: string
          id?: string
          mode?: string
          score_percent?: number
          seconds_spent?: number
          skipped_count?: number
          total_questions?: number
          user_id: string
          wrong_count?: number
        }
        Update: {
          completed_at?: string | null
          config?: Json
          correct_count?: number
          created_at?: string
          id?: string
          mode?: string
          score_percent?: number
          seconds_spent?: number
          skipped_count?: number
          total_questions?: number
          user_id?: string
          wrong_count?: number
        }
        Relationships: []
      }
      review_queue: {
        Row: {
          correct_streak: number
          id: string
          next_review_at: string
          question_id: string
          state: Database["public"]["Enums"]["review_state"]
          times_wrong: number
          updated_at: string
          user_id: string
        }
        Insert: {
          correct_streak?: number
          id?: string
          next_review_at?: string
          question_id: string
          state?: Database["public"]["Enums"]["review_state"]
          times_wrong?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          correct_streak?: number
          id?: string
          next_review_at?: string
          question_id?: string
          state?: Database["public"]["Enums"]["review_state"]
          times_wrong?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_queue_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_requests: {
        Row: {
          amount_mzn: number
          created_at: string
          id: string
          payer_phone: string | null
          payment_method: string
          payment_reference: string | null
          plan: Database["public"]["Enums"]["plan_tier"]
          proof_url: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_mzn: number
          created_at?: string
          id?: string
          payer_phone?: string | null
          payment_method?: string
          payment_reference?: string | null
          plan: Database["public"]["Enums"]["plan_tier"]
          proof_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_mzn?: number
          created_at?: string
          id?: string
          payer_phone?: string | null
          payment_method?: string
          payment_reference?: string | null
          plan?: Database["public"]["Enums"]["plan_tier"]
          proof_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          data_expiracao: string | null
          data_inicio: string
          estado: string
          id: string
          plano: Database["public"]["Enums"]["plan_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_expiracao?: string | null
          data_inicio?: string
          estado?: string
          id?: string
          plano?: Database["public"]["Enums"]["plan_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_expiracao?: string | null
          data_inicio?: string
          estado?: string
          id?: string
          plano?: Database["public"]["Enums"]["plan_tier"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_code: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_code: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_code?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_code_fkey"
            columns: ["badge_code"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["code"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      approve_subscription_request: {
        Args: { _id: string }
        Returns: undefined
      }
      aprovar_pagamento: {
        Args: { p_dias?: number; p_plano: string; p_user_id: string }
        Returns: undefined
      }
      effective_plan: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["plan_tier"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      my_plan_status: { Args: never; Returns: Json }
      registar_progresso: {
        Args: { p_manter_streak?: boolean; p_xp_ganho: number }
        Returns: undefined
      }
      reject_subscription_request: {
        Args: { _id: string; _reason: string }
        Returns: undefined
      }
      start_study_session: {
        Args: { _mode: string; _requested: number }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user"
      difficulty_level: "facil" | "medio" | "dificil"
      plan_tier: "free" | "pro" | "premium"
      question_source: "PDF" | "AUTHORED"
      review_state: "nova" | "aprendendo" | "revisao" | "dominada"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user"],
      difficulty_level: ["facil", "medio", "dificil"],
      plan_tier: ["free", "pro", "premium"],
      question_source: ["PDF", "AUTHORED"],
      review_state: ["nova", "aprendendo", "revisao", "dominada"],
    },
  },
} as const
