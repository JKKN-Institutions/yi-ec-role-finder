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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action_type: string
          admin_email: string
          admin_user_id: string
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action_type: string
          admin_email: string
          admin_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action_type?: string
          admin_email?: string
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      assessment_responses: {
        Row: {
          assessment_id: string
          created_at: string
          id: string
          question_number: number
          question_text: string
          response_data: Json
        }
        Insert: {
          assessment_id: string
          created_at?: string
          id?: string
          question_number: number
          question_text: string
          response_data: Json
        }
        Update: {
          assessment_id?: string
          created_at?: string
          id?: string
          question_number?: number
          question_text?: string
          response_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "assessment_responses_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_results: {
        Row: {
          assessment_id: string
          created_at: string
          id: string
          key_insights: Json | null
          leadership_style: string | null
          quadrant: string
          reasoning: string | null
          recommendations: Json
          recommended_role: string
          role_explanation: string
          scoring_breakdown: Json | null
          skill_score: number
          vertical_matches: string[]
          will_score: number
        }
        Insert: {
          assessment_id: string
          created_at?: string
          id?: string
          key_insights?: Json | null
          leadership_style?: string | null
          quadrant: string
          reasoning?: string | null
          recommendations?: Json
          recommended_role: string
          role_explanation: string
          scoring_breakdown?: Json | null
          skill_score: number
          vertical_matches?: string[]
          will_score: number
        }
        Update: {
          assessment_id?: string
          created_at?: string
          id?: string
          key_insights?: Json | null
          leadership_style?: string | null
          quadrant?: string
          reasoning?: string | null
          recommendations?: Json
          recommended_role?: string
          role_explanation?: string
          scoring_breakdown?: Json | null
          skill_score?: number
          vertical_matches?: string[]
          will_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_results_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: true
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          admin_notes: string | null
          completed_at: string | null
          created_at: string
          current_question: number
          id: string
          is_shortlisted: boolean
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_email: string
          user_name: string
        }
        Insert: {
          admin_notes?: string | null
          completed_at?: string | null
          created_at?: string
          current_question?: number
          id?: string
          is_shortlisted?: boolean
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_email: string
          user_name: string
        }
        Update: {
          admin_notes?: string | null
          completed_at?: string | null
          created_at?: string
          current_question?: number
          id?: string
          is_shortlisted?: boolean
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_email?: string
          user_name?: string
        }
        Relationships: []
      }
      candidate_feedback: {
        Row: {
          actual_role_assigned: string
          actual_vertical_assigned: string | null
          ai_accuracy: string
          ai_recommended_role: string
          ai_recommended_vertical: string | null
          assessment_id: string
          created_at: string | null
          hire_confidence: string
          hire_date: string
          id: string
          is_still_active: boolean | null
          override_reasoning: string | null
          performance_notes: string | null
          recorded_by: string | null
          role_change: string | null
          six_month_performance_rating: number | null
          six_month_review_date: string | null
          updated_at: string | null
        }
        Insert: {
          actual_role_assigned: string
          actual_vertical_assigned?: string | null
          ai_accuracy: string
          ai_recommended_role: string
          ai_recommended_vertical?: string | null
          assessment_id: string
          created_at?: string | null
          hire_confidence: string
          hire_date: string
          id?: string
          is_still_active?: boolean | null
          override_reasoning?: string | null
          performance_notes?: string | null
          recorded_by?: string | null
          role_change?: string | null
          six_month_performance_rating?: number | null
          six_month_review_date?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_role_assigned?: string
          actual_vertical_assigned?: string | null
          ai_accuracy?: string
          ai_recommended_role?: string
          ai_recommended_vertical?: string | null
          assessment_id?: string
          created_at?: string | null
          hire_confidence?: string
          hire_date?: string
          id?: string
          is_still_active?: boolean | null
          override_reasoning?: string | null
          performance_notes?: string | null
          recorded_by?: string | null
          role_change?: string | null
          six_month_performance_rating?: number | null
          six_month_review_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_feedback_actual_vertical_assigned_fkey"
            columns: ["actual_vertical_assigned"]
            isOneToOne: false
            referencedRelation: "verticals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_feedback_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_role_audit: {
        Row: {
          action: string
          affected_user: string | null
          created_at: string | null
          id: string
          performed_by: string | null
          role_name: string | null
        }
        Insert: {
          action: string
          affected_user?: string | null
          created_at?: string | null
          id?: string
          performed_by?: string | null
          role_name?: string | null
        }
        Update: {
          action?: string
          affected_user?: string | null
          created_at?: string | null
          id?: string
          performed_by?: string | null
          role_name?: string | null
        }
        Relationships: []
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
      validation_metrics: {
        Row: {
          actual_role_assigned: string | null
          admin_feedback: string | null
          ai_recommended_role: string
          assessment_id: string
          created_at: string | null
          hire_date: string | null
          id: string
          match_status: string | null
          override_reasoning: string | null
          performance_rating: number | null
          retention_6_month: boolean | null
          still_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          actual_role_assigned?: string | null
          admin_feedback?: string | null
          ai_recommended_role: string
          assessment_id: string
          created_at?: string | null
          hire_date?: string | null
          id?: string
          match_status?: string | null
          override_reasoning?: string | null
          performance_rating?: number | null
          retention_6_month?: boolean | null
          still_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          actual_role_assigned?: string | null
          admin_feedback?: string | null
          ai_recommended_role?: string
          assessment_id?: string
          created_at?: string | null
          hire_date?: string | null
          id?: string
          match_status?: string | null
          override_reasoning?: string | null
          performance_rating?: number | null
          retention_6_month?: boolean | null
          still_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "validation_metrics_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      verticals: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_chapters: {
        Args: { _user_id: string }
        Returns: {
          chapter_id: string
          chapter_name: string
          chapter_type: string
          role: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_user: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      log_admin_action: {
        Args: {
          _action_type: string
          _admin_email: string
          _admin_user_id: string
          _details?: Json
          _target_id?: string
          _target_type?: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "chair" | "co_chair" | "em" | "user" | "super_admin"
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
      app_role: ["admin", "chair", "co_chair", "em", "user", "super_admin"],
    },
  },
} as const
