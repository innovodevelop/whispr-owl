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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      blocked_users: {
        Row: {
          blocked_user_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          blocked_user_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          blocked_user_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          contact_user_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          contact_user_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          contact_user_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      conversation_settings: {
        Row: {
          conversation_id: string
          created_at: string
          disappearing_duration: number | null
          disappearing_enabled: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          disappearing_duration?: number | null
          disappearing_enabled?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          disappearing_duration?: number | null
          disappearing_enabled?: boolean
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_settings_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          participant_one: string
          participant_two: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          participant_one: string
          participant_two: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          participant_one?: string
          participant_two?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      crypto_challenges: {
        Row: {
          challenge_id: string
          challenge_string: string
          challenge_type: string
          created_at: string
          expires_at: string
          id: string
          used: boolean
          user_id: string | null
        }
        Insert: {
          challenge_id: string
          challenge_string: string
          challenge_type?: string
          created_at?: string
          expires_at: string
          id?: string
          used?: boolean
          user_id?: string | null
        }
        Update: {
          challenge_id?: string
          challenge_string?: string
          challenge_type?: string
          created_at?: string
          expires_at?: string
          id?: string
          used?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      crypto_devices: {
        Row: {
          device_fingerprint: Json | null
          device_id: string
          device_name: string | null
          id: string
          last_used_at: string | null
          linked_at: string
          public_key: string
          user_id: string
        }
        Insert: {
          device_fingerprint?: Json | null
          device_id: string
          device_name?: string | null
          id?: string
          last_used_at?: string | null
          linked_at?: string
          public_key: string
          user_id: string
        }
        Update: {
          device_fingerprint?: Json | null
          device_id?: string
          device_name?: string | null
          id?: string
          last_used_at?: string | null
          linked_at?: string
          public_key?: string
          user_id?: string
        }
        Relationships: []
      }
      crypto_users: {
        Row: {
          created_at: string
          device_fingerprint: Json | null
          device_id: string | null
          id: string
          public_key: string
          recovery_phrase_hash: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          created_at?: string
          device_fingerprint?: Json | null
          device_id?: string | null
          id?: string
          public_key: string
          recovery_phrase_hash?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          created_at?: string
          device_fingerprint?: Json | null
          device_id?: string | null
          id?: string
          public_key?: string
          recovery_phrase_hash?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      device_link_requests: {
        Row: {
          challenge_string: string
          completed: boolean
          created_at: string
          device_code: string | null
          expires_at: string
          id: string
          request_id: string
          requesting_device_id: string
        }
        Insert: {
          challenge_string: string
          completed?: boolean
          created_at?: string
          device_code?: string | null
          expires_at: string
          id?: string
          request_id: string
          requesting_device_id: string
        }
        Update: {
          challenge_string?: string
          completed?: boolean
          created_at?: string
          device_code?: string | null
          expires_at?: string
          id?: string
          request_id?: string
          requesting_device_id?: string
        }
        Relationships: []
      }
      financial_entries: {
        Row: {
          amount: number
          created_at: string
          due_date: string | null
          id: string
          name: string
          note: string | null
          sheet_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date?: string | null
          id?: string
          name: string
          note?: string | null
          sheet_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string | null
          id?: string
          name?: string
          note?: string | null
          sheet_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_entries_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "financial_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_sheets: {
        Row: {
          conversation_id: string
          created_at: string
          created_by: string
          id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          created_by: string
          id?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          created_by?: string
          id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          burn_on_read_duration: number | null
          burn_on_read_starts_at: string | null
          content: string
          conversation_id: string
          created_at: string
          encrypted_content: string | null
          expires_at: string | null
          id: string
          message_type: string
          read_at: string | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          burn_on_read_duration?: number | null
          burn_on_read_starts_at?: string | null
          content: string
          conversation_id: string
          created_at?: string
          encrypted_content?: string | null
          expires_at?: string | null
          id?: string
          message_type?: string
          read_at?: string | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          burn_on_read_duration?: number | null
          burn_on_read_starts_at?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          encrypted_content?: string | null
          expires_at?: string | null
          id?: string
          message_type?: string
          read_at?: string | null
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      private_profile_data: {
        Row: {
          created_at: string
          phone_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          phone_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          phone_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          encrypted_bio: string | null
          encrypted_display_name: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          encrypted_bio?: string | null
          encrypted_display_name?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          encrypted_bio?: string | null
          encrypted_display_name?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action_type: string
          attempt_count: number | null
          blocked_until: string | null
          created_at: string
          id: string
          ip_address: unknown | null
          user_id: string | null
          window_start: string
        }
        Insert: {
          action_type: string
          attempt_count?: number | null
          blocked_until?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
          user_id?: string | null
          window_start?: string
        }
        Update: {
          action_type?: string
          attempt_count?: number | null
          blocked_until?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
          user_id?: string | null
          window_start?: string
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          created_at: string
          event_details: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_details?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_details?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      signal_identity_keys: {
        Row: {
          created_at: string
          id: string
          identity_key_public: string
          registration_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          identity_key_public: string
          registration_id: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          identity_key_public?: string
          registration_id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      signal_one_time_prekeys: {
        Row: {
          created_at: string
          id: string
          key_id: number
          public_key: string
          used: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_id: number
          public_key: string
          used?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_id?: number
          public_key?: string
          used?: boolean
          user_id?: string
        }
        Relationships: []
      }
      signal_sessions: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          local_user_id: string
          remote_user_id: string
          session_state: string
          updated_at: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          local_user_id: string
          remote_user_id: string
          session_state: string
          updated_at?: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          local_user_id?: string
          remote_user_id?: string
          session_state?: string
          updated_at?: string
        }
        Relationships: []
      }
      signal_signed_prekeys: {
        Row: {
          created_at: string
          id: string
          key_id: number
          public_key: string
          signature: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_id: number
          public_key: string
          signature: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_id?: number
          public_key?: string
          signature?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          call_notifications: boolean
          created_at: string
          disappearing_message_duration: number | null
          disappearing_messages: boolean
          group_notifications: boolean
          link_previews: boolean
          message_notifications: boolean
          notification_permission: string | null
          read_receipts: boolean
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          call_notifications?: boolean
          created_at?: string
          disappearing_message_duration?: number | null
          disappearing_messages?: boolean
          group_notifications?: boolean
          link_previews?: boolean
          message_notifications?: boolean
          notification_permission?: string | null
          read_receipts?: boolean
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          call_notifications?: boolean
          created_at?: string
          disappearing_message_duration?: number | null
          disappearing_messages?: boolean
          group_notifications?: boolean
          link_previews?: boolean
          message_notifications?: boolean
          notification_permission?: string | null
          read_receipts?: boolean
          theme?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      signal_identity_keys_secure: {
        Row: {
          created_at: string | null
          id: string | null
          identity_key_public: string | null
          registration_id: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          identity_key_public?: string | null
          registration_id?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          identity_key_public?: string | null
          registration_id?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_rate_limit: {
        Args: {
          p_action_type: string
          p_ip_address?: unknown
          p_max_attempts?: number
          p_user_id?: string
          p_window_minutes?: number
        }
        Returns: Json
      }
      cleanup_expired_crypto_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_messages: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_rate_limits: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      comprehensive_security_validation: {
        Args: Record<PropertyKey, never>
        Returns: {
          component: string
          details: string
          status: string
        }[]
      }
      final_security_validation: {
        Args: Record<PropertyKey, never>
        Returns: {
          component: string
          details: string
          status: string
        }[]
      }
      generate_avatar_url: {
        Args: { public_key_hash: string }
        Returns: string
      }
      get_conversation_settings: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: {
          disappearing_duration: number
          disappearing_enabled: boolean
        }[]
      }
      get_security_headers: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_user_identity_keys_secure: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          id: string
          identity_key_public: string
          registration_id: number
          updated_at: string
          user_id: string
        }[]
      }
      get_user_identity_public_key: {
        Args: { target_user_id: string }
        Returns: {
          identity_key_public: string
          registration_id: number
        }[]
      }
      get_user_one_time_prekey: {
        Args: { target_user_id: string }
        Returns: {
          id: string
          key_id: number
          public_key: string
          user_id: string
        }[]
      }
      get_user_one_time_prekey_secure: {
        Args: { target_user_id: string }
        Returns: {
          id: string
          key_id: number
          public_key: string
        }[]
      }
      get_user_public_identity_key_secure: {
        Args: { target_user_id: string }
        Returns: {
          identity_key_public: string
          registration_id: number
        }[]
      }
      get_user_signed_prekey: {
        Args: { target_user_id: string }
        Returns: {
          created_at: string
          id: string
          key_id: number
          public_key: string
          signature: string
          user_id: string
        }[]
      }
      get_user_signed_prekey_secure: {
        Args: { target_user_id: string }
        Returns: {
          key_id: number
          public_key: string
          signature: string
        }[]
      }
      mark_prekey_used: {
        Args: { prekey_id: string; target_user_id: string }
        Returns: boolean
      }
      mark_prekey_used_secure: {
        Args: { prekey_id: string; target_user_id: string }
        Returns: boolean
      }
      search_users_by_query_secure: {
        Args: { search_term: string }
        Returns: {
          display_name: string
          user_id: string
          username: string
        }[]
      }
      test_signal_identity_keys_secure_access: {
        Args: Record<PropertyKey, never>
        Returns: {
          explanation: string
          result: string
          test_name: string
        }[]
      }
      upsert_conversation_settings: {
        Args: {
          p_conversation_id: string
          p_disappearing_duration: number
          p_disappearing_enabled: boolean
          p_user_id: string
        }
        Returns: undefined
      }
      upsert_rate_limit: {
        Args: {
          p_action_type: string
          p_attempt_count?: number
          p_blocked_until?: string
          p_ip_address?: unknown
          p_user_id?: string
          p_window_start?: string
        }
        Returns: string
      }
      validate_phone_privacy: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      validate_private_key_security: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      validate_security_configuration: {
        Args: Record<PropertyKey, never>
        Returns: {
          check_name: string
          details: string
          status: string
        }[]
      }
      validate_signal_identity_keys_secure_security: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      validate_signal_identity_keys_secure_view: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      validate_view_security: {
        Args: Record<PropertyKey, never>
        Returns: string
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
