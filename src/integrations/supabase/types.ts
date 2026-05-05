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
      answer_interactions: {
        Row: {
          answer_id: string
          created_at: string | null
          id: string
          interaction_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          answer_id: string
          created_at?: string | null
          id?: string
          interaction_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          answer_id?: string
          created_at?: string | null
          id?: string
          interaction_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answer_interactions_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["id"]
          },
        ]
      }
      answers: {
        Row: {
          content: string
          created_at: string
          dislikes: number
          id: string
          is_seed: boolean
          likes: number
          parent_id: string | null
          post_id: string
          seed_author_name: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          dislikes?: number
          id?: string
          is_seed?: boolean
          likes?: number
          parent_id?: string | null
          post_id: string
          seed_author_name?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          dislikes?: number
          id?: string
          is_seed?: boolean
          likes?: number
          parent_id?: string | null
          post_id?: string
          seed_author_name?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "answers_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      bookmarks: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: string
          subject: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          status?: string
          subject: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string
          subject?: string
          user_id?: string | null
        }
        Relationships: []
      }
      liked_posts: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: []
      }
      moderation_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          answer_id: string | null
          created_at: string
          id: string
          link: string | null
          message: string
          post_id: string | null
          read: boolean
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          answer_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          message: string
          post_id?: string | null
          read?: boolean
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          answer_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          post_id?: string | null
          read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      poll_options: {
        Row: {
          created_at: string
          id: string
          label: string
          poll_id: string
          position: number
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          poll_id: string
          position?: number
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          poll_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string
          id: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          closes_at: string | null
          created_at: string
          id: string
          post_id: string
          question: string
        }
        Insert: {
          closes_at?: string | null
          created_at?: string
          id?: string
          post_id: string
          question: string
        }
        Update: {
          closes_at?: string | null
          created_at?: string
          id?: string
          post_id?: string
          question?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          category: string
          created_at: string
          description: string
          dislikes: number
          edited_at: string | null
          id: string
          image_url: string | null
          is_hidden: boolean
          is_pinned: boolean
          is_seed: boolean
          likes: number
          seed_author_name: string | null
          title: string
          updated_at: string
          user_id: string | null
          video_url: string | null
          views: number
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          dislikes?: number
          edited_at?: string | null
          id?: string
          image_url?: string | null
          is_hidden?: boolean
          is_pinned?: boolean
          is_seed?: boolean
          likes?: number
          seed_author_name?: string | null
          title: string
          updated_at?: string
          user_id?: string | null
          video_url?: string | null
          views?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          dislikes?: number
          edited_at?: string | null
          id?: string
          image_url?: string | null
          is_hidden?: boolean
          is_pinned?: boolean
          is_seed?: boolean
          likes?: number
          seed_author_name?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
          video_url?: string | null
          views?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          facebook_url: string | null
          id: string
          instagram_url: string | null
          location: string | null
          updated_at: string
          user_id: string
          x_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          location?: string | null
          updated_at?: string
          user_id: string
          x_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          location?: string | null
          updated_at?: string
          user_id?: string
          x_url?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reason: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reason: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reason?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          awarded_at: string
          badge_key: string
          id: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          badge_key: string
          id?: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          badge_key?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_bans: {
        Row: {
          banned_by: string
          banned_until: string | null
          created_at: string
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          banned_by: string
          banned_until?: string | null
          created_at?: string
          id?: string
          reason: string
          user_id: string
        }
        Update: {
          banned_by?: string
          banned_until?: string | null
          created_at?: string
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      user_guide_seen: {
        Row: {
          id: string
          seen_at: string
          user_id: string
        }
        Insert: {
          id?: string
          seen_at?: string
          user_id: string
        }
        Update: {
          id?: string
          seen_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_interactions: {
        Row: {
          created_at: string
          id: string
          interaction_type: string
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interaction_type: string
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interaction_type?: string
          post_id?: string
          updated_at?: string
          user_id?: string
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
      user_warnings: {
        Row: {
          acknowledged: boolean
          created_at: string
          id: string
          issued_by: string
          message: string
          user_id: string
        }
        Insert: {
          acknowledged?: boolean
          created_at?: string
          id?: string
          issued_by: string
          message: string
          user_id: string
        }
        Update: {
          acknowledged?: boolean
          created_at?: string
          id?: string
          issued_by?: string
          message?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      user_karma: {
        Row: {
          karma: number | null
          likes_received: number | null
          posts_count: number | null
          user_id: string | null
          views_received: number | null
        }
        Relationships: []
      }
      weekly_leaderboard: {
        Row: {
          avatar_url: string | null
          display_name: string | null
          likes_this_week: number | null
          posts_this_week: number | null
          user_id: string | null
          week_score: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_user_interaction: {
        Args: { post_id: string; user_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_answer_dislikes: {
        Args: { answer_id: string; user_id: string }
        Returns: undefined
      }
      increment_answer_likes: {
        Args: { answer_id: string; user_id: string }
        Returns: undefined
      }
      increment_post_dislikes:
        | { Args: { post_id: string }; Returns: undefined }
        | { Args: { post_id: string; user_id: string }; Returns: undefined }
      increment_post_likes:
        | { Args: { post_id: string }; Returns: undefined }
        | { Args: { post_id: string; user_id: string }; Returns: undefined }
      increment_post_views: { Args: { p_post_id: string }; Returns: undefined }
      is_banned: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
