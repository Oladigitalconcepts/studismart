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
      coin_purchases: {
        Row: {
          amount_minor: number
          coins: number
          created_at: string
          credited_at: string | null
          currency: string
          id: string
          pack_id: string
          provider: string
          raw: Json
          reference: string
          status: string
          user_id: string
        }
        Insert: {
          amount_minor: number
          coins: number
          created_at?: string
          credited_at?: string | null
          currency: string
          id?: string
          pack_id: string
          provider?: string
          raw?: Json
          reference: string
          status?: string
          user_id: string
        }
        Update: {
          amount_minor?: number
          coins?: number
          created_at?: string
          credited_at?: string | null
          currency?: string
          id?: string
          pack_id?: string
          provider?: string
          raw?: Json
          reference?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      coin_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          idempotency_key: string | null
          kind: string
          meta: Json
          reason: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          idempotency_key?: string | null
          kind: string
          meta?: Json
          reason: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          idempotency_key?: string | null
          kind?: string
          meta?: Json
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      materials: {
        Row: {
          created_at: string
          duration_seconds: number | null
          error: string | null
          id: string
          is_favorite: boolean
          last_opened_at: string | null
          notebook_id: string | null
          raw_text: string | null
          source_type: string
          status: string
          storage_path: string | null
          tags: string[]
          title: string
          transcript: string | null
          transcript_segments: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          error?: string | null
          id?: string
          is_favorite?: boolean
          last_opened_at?: string | null
          notebook_id?: string | null
          raw_text?: string | null
          source_type: string
          status?: string
          storage_path?: string | null
          tags?: string[]
          title: string
          transcript?: string | null
          transcript_segments?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          error?: string | null
          id?: string
          is_favorite?: boolean
          last_opened_at?: string | null
          notebook_id?: string | null
          raw_text?: string | null
          source_type?: string
          status?: string
          storage_path?: string | null
          tags?: string[]
          title?: string
          transcript?: string | null
          transcript_segments?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      mission_progress: {
        Row: {
          claimed_at: string | null
          count: number
          day: string
          id: string
          mission_key: string
          user_id: string
        }
        Insert: {
          claimed_at?: string | null
          count?: number
          day?: string
          id?: string
          mission_key: string
          user_id: string
        }
        Update: {
          claimed_at?: string | null
          count?: number
          day?: string
          id?: string
          mission_key?: string
          user_id?: string
        }
        Relationships: []
      }
      notebook_chats: {
        Row: {
          created_at: string
          id: string
          notebook_id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notebook_id: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notebook_id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notebook_guides: {
        Row: {
          faqs: Json
          generated_at: string
          glossary: Json
          id: string
          notebook_id: string
          summary: string
          topics: Json
          user_id: string
        }
        Insert: {
          faqs?: Json
          generated_at?: string
          glossary?: Json
          id?: string
          notebook_id: string
          summary?: string
          topics?: Json
          user_id: string
        }
        Update: {
          faqs?: Json
          generated_at?: string
          glossary?: Json
          id?: string
          notebook_id?: string
          summary?: string
          topics?: Json
          user_id?: string
        }
        Relationships: []
      }
      notebook_messages: {
        Row: {
          chat_id: string
          citations: Json
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          chat_id: string
          citations?: Json
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          chat_id?: string
          citations?: Json
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notebook_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "notebook_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      notebooks: {
        Row: {
          color: string
          course_code: string | null
          created_at: string
          description: string | null
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          course_code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          course_code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          updated_at?: string
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
      skill_lessons: {
        Row: {
          body: string
          coin_reward: number
          duration_min: number
          id: string
          position: number
          skill_id: string
          title: string
          xp_reward: number
        }
        Insert: {
          body?: string
          coin_reward?: number
          duration_min?: number
          id?: string
          position: number
          skill_id: string
          title: string
          xp_reward?: number
        }
        Update: {
          body?: string
          coin_reward?: number
          duration_min?: number
          id?: string
          position?: number
          skill_id?: string
          title?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "skill_lessons_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          color: string
          cost_coins: number
          created_at: string
          description: string
          icon: string
          id: string
          lessons_count: number
          level: string
          popular: boolean
          rating: number
          slug: string
          sort_order: number
          title: string
        }
        Insert: {
          color?: string
          cost_coins?: number
          created_at?: string
          description: string
          icon?: string
          id?: string
          lessons_count?: number
          level?: string
          popular?: boolean
          rating?: number
          slug: string
          sort_order?: number
          title: string
        }
        Update: {
          color?: string
          cost_coins?: number
          created_at?: string
          description?: string
          icon?: string
          id?: string
          lessons_count?: number
          level?: string
          popular?: boolean
          rating?: number
          slug?: string
          sort_order?: number
          title?: string
        }
        Relationships: []
      }
      slide_decks: {
        Row: {
          created_at: string
          id: string
          slides: Json
          study_pack_id: string
          study_plan: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          slides?: Json
          study_pack_id: string
          study_plan?: Json
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          slides?: Json
          study_pack_id?: string
          study_plan?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "slide_decks_study_pack_id_fkey"
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
      tutor_cache: {
        Row: {
          action: string
          created_at: string
          hash: string
          hits: number
          model: string | null
          response: string
          tutor_id: string
        }
        Insert: {
          action: string
          created_at?: string
          hash: string
          hits?: number
          model?: string | null
          response: string
          tutor_id: string
        }
        Update: {
          action?: string
          created_at?: string
          hash?: string
          hits?: number
          model?: string | null
          response?: string
          tutor_id?: string
        }
        Relationships: []
      }
      tutor_chats: {
        Row: {
          created_at: string
          id: string
          title: string | null
          tutor_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          tutor_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          tutor_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tutor_daily_usage: {
        Row: {
          day: string
          free_count: number
          user_id: string
        }
        Insert: {
          day: string
          free_count?: number
          user_id: string
        }
        Update: {
          day?: string
          free_count?: number
          user_id?: string
        }
        Relationships: []
      }
      tutor_messages: {
        Row: {
          action: string | null
          cached: boolean
          chat_id: string
          coins_spent: number
          content: string
          created_at: string
          id: string
          model: string | null
          role: string
          user_id: string
        }
        Insert: {
          action?: string | null
          cached?: boolean
          chat_id: string
          coins_spent?: number
          content: string
          created_at?: string
          id?: string
          model?: string | null
          role: string
          user_id: string
        }
        Update: {
          action?: string | null
          cached?: boolean
          chat_id?: string
          coins_spent?: number
          content?: string
          created_at?: string
          id?: string
          model?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "tutor_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      user_skills: {
        Row: {
          completed_lessons: number
          id: string
          last_lesson_at: string | null
          skill_id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          completed_lessons?: number
          id?: string
          last_lesson_at?: string | null
          skill_id: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          completed_lessons?: number
          id?: string
          last_lesson_at?: string | null
          skill_id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          coins: number
          created_at: string
          last_login_date: string | null
          level: number
          streak_days: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          coins?: number
          created_at?: string
          last_login_date?: string | null
          level?: number
          streak_days?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          coins?: number
          created_at?: string
          last_login_date?: string | null
          level?: number
          streak_days?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_coins: {
        Args: { _amount: number; _kind: string; _meta?: Json; _reason: string }
        Returns: {
          coins: number
          created_at: string
          last_login_date: string | null
          level: number
          streak_days: number
          updated_at: string
          user_id: string
          xp: number
        }
        SetofOptions: {
          from: "*"
          to: "wallets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_mission: {
        Args: {
          _idempotency_key?: string
          _mission_key: string
          _reward?: number
          _target?: number
        }
        Returns: {
          coins: number
          created_at: string
          last_login_date: string | null
          level: number
          streak_days: number
          updated_at: string
          user_id: string
          xp: number
        }
        SetofOptions: {
          from: "*"
          to: "wallets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      credit_purchase: {
        Args: { _reference: string }
        Returns: {
          coins: number
          created_at: string
          last_login_date: string | null
          level: number
          streak_days: number
          updated_at: string
          user_id: string
          xp: number
        }
        SetofOptions: {
          from: "*"
          to: "wallets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      daily_check_in: {
        Args: { _reward?: number }
        Returns: {
          coins: number
          created_at: string
          last_login_date: string | null
          level: number
          streak_days: number
          updated_at: string
          user_id: string
          xp: number
        }
        SetofOptions: {
          from: "*"
          to: "wallets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ensure_wallet: {
        Args: never
        Returns: {
          coins: number
          created_at: string
          last_login_date: string | null
          level: number
          streak_days: number
          updated_at: string
          user_id: string
          xp: number
        }
        SetofOptions: {
          from: "*"
          to: "wallets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      purchase_status: {
        Args: { _reference: string }
        Returns: {
          coins: number
          status: string
        }[]
      }
      spend_coins_for_tutor: {
        Args: {
          _amount: number
          _idempotency_key: string
          _reason: string
          _user_id: string
        }
        Returns: {
          coins: number
          created_at: string
          last_login_date: string | null
          level: number
          streak_days: number
          updated_at: string
          user_id: string
          xp: number
        }
        SetofOptions: {
          from: "*"
          to: "wallets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
