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
      faq_entries: {
        Row: {
          id: string
          question: string
          answer: string
          sort_order: number
          is_active: boolean
          keywords: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          question: string
          answer: string
          sort_order?: number
          is_active?: boolean
          keywords?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          question?: string
          answer?: string
          sort_order?: number
          is_active?: boolean
          keywords?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      learning_game_items: {
        Row: {
          back_text: string | null
          correct_option: string | null
          created_at: string
          front_text: string | null
          game_id: string
          id: string
          option_a: string | null
          option_b: string | null
          option_c: string | null
          option_d: string | null
          position: number
          question_text: string | null
        }
        Insert: {
          back_text?: string | null
          correct_option?: string | null
          created_at?: string
          front_text?: string | null
          game_id: string
          id?: string
          option_a?: string | null
          option_b?: string | null
          option_c?: string | null
          option_d?: string | null
          position?: number
          question_text?: string | null
        }
        Update: {
          back_text?: string | null
          correct_option?: string | null
          created_at?: string
          front_text?: string | null
          game_id?: string
          id?: string
          option_a?: string | null
          option_b?: string | null
          option_c?: string | null
          option_d?: string | null
          position?: number
          question_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_game_items_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "learning_games"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_games: {
        Row: {
          content_kind: Database["public"]["Enums"]["game_content_kind"]
          created_at: string
          created_by: string
          description: string | null
          game_type: Database["public"]["Enums"]["game_type"]
          id: string
          subject_id: string
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["content_visibility"]
        }
        Insert: {
          content_kind?: Database["public"]["Enums"]["game_content_kind"]
          created_at?: string
          created_by: string
          description?: string | null
          game_type: Database["public"]["Enums"]["game_type"]
          id?: string
          subject_id: string
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["content_visibility"]
        }
        Update: {
          content_kind?: Database["public"]["Enums"]["game_content_kind"]
          created_at?: string
          created_by?: string
          description?: string | null
          game_type?: Database["public"]["Enums"]["game_type"]
          id?: string
          subject_id?: string
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["content_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "learning_games_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_videos: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          duration_seconds: number | null
          id: string
          subject_id: string
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["content_visibility"]
          youtube_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          subject_id: string
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["content_visibility"]
          youtube_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          subject_id?: string
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["content_visibility"]
          youtube_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_videos_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_student_links: {
        Row: {
          created_at: string
          id: string
          parent_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parent_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parent_id?: string
          student_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          grade: string | null
          id: string
          is_active: boolean
          phone: string | null
          total_points: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          grade?: string | null
          id: string
          is_active?: boolean
          phone?: string | null
          total_points?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          grade?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          total_points?: number
          updated_at?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          correct_option: string
          created_at: string
          created_by: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          explanation: string | null
          id: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          points: number
          question_text: string
          subject_id: string
          updated_at: string
        }
        Insert: {
          correct_option: string
          created_at?: string
          created_by?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          explanation?: string | null
          id?: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          points?: number
          question_text: string
          subject_id: string
          updated_at?: string
        }
        Update: {
          correct_option?: string
          created_at?: string
          created_by?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          explanation?: string | null
          id?: string
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          points?: number
          question_text?: string
          subject_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          attempted_at: string
          client_id: string | null
          id: string
          is_correct: boolean
          points_earned: number
          question_id: string
          selected_option: string
          student_id: string
        }
        Insert: {
          attempted_at?: string
          client_id?: string | null
          id?: string
          is_correct: boolean
          points_earned?: number
          question_id: string
          selected_option: string
          student_id: string
        }
        Update: {
          attempted_at?: string
          client_id?: string | null
          id?: string
          is_correct?: boolean
          points_earned?: number
          question_id?: string
          selected_option?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_template_questions: {
        Row: {
          correct_option: string
          created_at: string
          explanation: string | null
          id: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          points: number
          position: number
          question_text: string
          template_id: string
        }
        Insert: {
          correct_option: string
          created_at?: string
          explanation?: string | null
          id?: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          points?: number
          position?: number
          question_text: string
          template_id: string
        }
        Update: {
          correct_option?: string
          created_at?: string
          explanation?: string | null
          id?: string
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          points?: number
          position?: number
          question_text?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_template_questions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "quiz_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_templates: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          duration_minutes: number | null
          id: string
          subject_id: string
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["content_visibility"]
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          subject_id: string
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["content_visibility"]
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          subject_id?: string
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["content_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "quiz_templates_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      site_content: {
        Row: {
          content: Json
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: Json
          id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: Json
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      subjects: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          type: Database["public"]["Enums"]["subject_type"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          type: Database["public"]["Enums"]["subject_type"]
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["subject_type"]
        }
        Relationships: []
      }
      teacher_subjects: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          subject_id: string
          teacher_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          subject_id: string
          teacher_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          subject_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
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
          role: Database["public"]["Enums"]["app_role"]
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
      video_views: {
        Row: {
          completed_half: boolean
          created_at: string
          id: string
          last_watched_at: string
          student_id: string
          video_id: string
          watched_seconds: number
        }
        Insert: {
          completed_half?: boolean
          created_at?: string
          id?: string
          last_watched_at?: string
          student_id: string
          video_id: string
          watched_seconds?: number
        }
        Update: {
          completed_half?: boolean
          created_at?: string
          id?: string
          last_watched_at?: string
          student_id?: string
          video_id?: string
          watched_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_views_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "learning_videos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      questions_safe: {
        Row: {
          id: string
          subject_id: string
          question_text: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          explanation: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          points: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Relationships: []
      }
      quiz_template_questions_safe: {
        Row: {
          id: string
          template_id: string
          question_text: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          explanation: string | null
          points: number
          position: number
          created_at: string
        }
        Relationships: []
      }
    }
    Functions: {
      admin_list_questions: {
        Args: { p_subject_id?: string }
        Returns: {
          correct_option: string
          created_at: string
          created_by: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          explanation: string | null
          id: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          points: number
          question_text: string
          subject_id: string
          updated_at: string
        }[]
      }
      admin_list_template_questions: {
        Args: { p_template_id?: string }
        Returns: {
          correct_option: string
          created_at: string
          explanation: string | null
          id: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          points: number
          position: number
          question_text: string
          template_id: string
        }[]
      }
      can_access_content: {
        Args: {
          _owner_id: string
          _subject_id: string
          _user_id: string
          _visibility: Database["public"]["Enums"]["content_visibility"]
        }
        Returns: boolean
      }
      check_answer: {
        Args: { p_question_id: string }
        Returns: string
      }
      check_template_answer: {
        Args: { p_question_id: string }
        Returns: string
      }
      get_leaderboard: {
        Args: { _limit?: number }
        Returns: {
          avatar_url: string
          full_name: string
          grade: string
          id: string
          total_points: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      submit_quiz_attempt: {
        Args: { p_client_id: string; p_question_id: string; p_selected: string }
        Returns: {
          attempt_id: string
          correct_option: string
          is_correct: boolean
          points_earned: number
        }[]
      }
      teacher_has_subject: {
        Args: { _subject_id: string; _teacher_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "teacher" | "parent" | "student"
      content_visibility: "private" | "subject" | "public"
      difficulty_level: "easy" | "medium" | "hard"
      game_content_kind: "mcq" | "concept"
      game_type: "wheel" | "memory"
      subject_type: "tahseeli" | "qudurat"
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
      app_role: ["admin", "teacher", "parent", "student"],
      content_visibility: ["private", "subject", "public"],
      difficulty_level: ["easy", "medium", "hard"],
      game_content_kind: ["mcq", "concept"],
      game_type: ["wheel", "memory"],
      subject_type: ["tahseeli", "qudurat"],
    },
  },
} as const
