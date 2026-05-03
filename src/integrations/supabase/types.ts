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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      answer_attempts: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          question_id: string
          topic: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct: boolean
          question_id: string
          topic?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          topic?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answer_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          created_at: string
          error: string | null
          id: string
          raw_text: string | null
          source_type: string
          status: string
          storage_path: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          raw_text?: string | null
          source_type: string
          status?: string
          storage_path?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          raw_text?: string | null
          source_type?: string
          status?: string
          storage_path?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json
          id: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      practice_attempts: {
        Row: {
          correct: number
          duration_seconds: number
          finished_at: string
          id: string
          study_pack_id: string | null
          total: number
          user_id: string
        }
        Insert: {
          correct?: number
          duration_seconds?: number
          finished_at?: string
          id?: string
          study_pack_id?: string | null
          total?: number
          user_id: string
        }
        Update: {
          correct?: number
          duration_seconds?: number
          finished_at?: string
          id?: string
          study_pack_id?: string | null
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_attempts_study_pack_id_fkey"
            columns: ["study_pack_id"]
            isOneToOne: false
            referencedRelation: "study_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          course_code: string | null
          created_at: string
          display_name: string | null
          email_product_updates: boolean
          email_security_alerts: boolean
          email_study_tips: boolean
          email_weekly_digest: boolean
          exam_date: string | null
          id: string
          language: string
          last_streak_milestone: number
          level: string | null
          notify_new_features: boolean
          notify_practice_streaks: boolean
          notify_study_reminders: boolean
          notify_weekly_summary: boolean
          push_enabled: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          reminder_time: string | null
          updated_at: string
          weekly_goal: number
        }
        Insert: {
          avatar_url?: string | null
          course_code?: string | null
          created_at?: string
          display_name?: string | null
          email_product_updates?: boolean
          email_security_alerts?: boolean
          email_study_tips?: boolean
          email_weekly_digest?: boolean
          exam_date?: string | null
          id: string
          language?: string
          last_streak_milestone?: number
          level?: string | null
          notify_new_features?: boolean
          notify_practice_streaks?: boolean
          notify_study_reminders?: boolean
          notify_weekly_summary?: boolean
          push_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          reminder_time?: string | null
          updated_at?: string
          weekly_goal?: number
        }
        Update: {
          avatar_url?: string | null
          course_code?: string | null
          created_at?: string
          display_name?: string | null
          email_product_updates?: boolean
          email_security_alerts?: boolean
          email_study_tips?: boolean
          email_weekly_digest?: boolean
          exam_date?: string | null
          id?: string
          language?: string
          last_streak_milestone?: number
          level?: string | null
          notify_new_features?: boolean
          notify_practice_streaks?: boolean
          notify_study_reminders?: boolean
          notify_weekly_summary?: boolean
          push_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          reminder_time?: string | null
          updated_at?: string
          weekly_goal?: number
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          correct_index: number
          created_at: string
          difficulty: string | null
          explanation: string | null
          id: string
          options: Json
          question: string
          study_pack_id: string
          topic: string | null
          user_id: string
        }
        Insert: {
          correct_index: number
          created_at?: string
          difficulty?: string | null
          explanation?: string | null
          id?: string
          options: Json
          question: string
          study_pack_id: string
          topic?: string | null
          user_id: string
        }
        Update: {
          correct_index?: number
          created_at?: string
          difficulty?: string | null
          explanation?: string | null
          id?: string
          options?: Json
          question?: string
          study_pack_id?: string
          topic?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_study_pack_id_fkey"
            columns: ["study_pack_id"]
            isOneToOne: false
            referencedRelation: "study_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_quiz_attempts: {
        Row: {
          answers: Json
          correct: number
          duration_seconds: number
          finished_at: string
          id: string
          shared_quiz_id: string
          taker_id: string
          total: number
        }
        Insert: {
          answers?: Json
          correct?: number
          duration_seconds?: number
          finished_at?: string
          id?: string
          shared_quiz_id: string
          taker_id: string
          total?: number
        }
        Update: {
          answers?: Json
          correct?: number
          duration_seconds?: number
          finished_at?: string
          id?: string
          shared_quiz_id?: string
          taker_id?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "shared_quiz_attempts_shared_quiz_id_fkey"
            columns: ["shared_quiz_id"]
            isOneToOne: false
            referencedRelation: "shared_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_quizzes: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          question_ids: string[]
          reveal_mode: string
          study_pack_id: string
          time_limit_seconds: number
          title: string
          token: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          question_ids: string[]
          reveal_mode?: string
          study_pack_id: string
          time_limit_seconds?: number
          title: string
          token: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          question_ids?: string[]
          reveal_mode?: string
          study_pack_id?: string
          time_limit_seconds?: number
          title?: string
          token?: string
        }
        Relationships: []
      }
      study_packs: {
        Row: {
          created_at: string
          id: string
          material_id: string
          summary: string
          topics: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          material_id: string
          summary?: string
          topics?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          material_id?: string
          summary?: string
          topics?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_packs_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      test_configs: {
        Row: {
          created_at: string
          id: string
          num_questions: number
          reveal_mode: string
          study_pack_id: string
          time_limit_seconds: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          num_questions: number
          reveal_mode: string
          study_pack_id: string
          time_limit_seconds: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          num_questions?: number
          reveal_mode?: string
          study_pack_id?: string
          time_limit_seconds?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      weekly_leaderboard: {
        Args: never
        Returns: {
          accuracy: number
          avatar_url: string
          display_name: string
          rank: number
          score: number
          sessions: number
          total_correct: number
          total_questions: number
          total_seconds: number
          user_id: string
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
    Enums: {},
  },
} as const
