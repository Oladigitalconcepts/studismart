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
          id: string
          language: string
          notify_new_features: boolean
          notify_practice_streaks: boolean
          notify_study_reminders: boolean
          notify_weekly_summary: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          updated_at: string
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
          id: string
          language?: string
          notify_new_features?: boolean
          notify_practice_streaks?: boolean
          notify_study_reminders?: boolean
          notify_weekly_summary?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string
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
          id?: string
          language?: string
          notify_new_features?: boolean
          notify_practice_streaks?: boolean
          notify_study_reminders?: boolean
          notify_weekly_summary?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string
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
