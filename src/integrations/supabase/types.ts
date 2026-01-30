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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      attestations: {
        Row: {
          confirmed_at: string | null
          created_at: string
          event_id: string
          id: string
          oracle_key_id: string
          signature: string
          status: Database["public"]["Enums"]["attestation_status"]
          tx_hash: string | null
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          event_id: string
          id?: string
          oracle_key_id: string
          signature: string
          status?: Database["public"]["Enums"]["attestation_status"]
          tx_hash?: string | null
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          event_id?: string
          id?: string
          oracle_key_id?: string
          signature?: string
          status?: Database["public"]["Enums"]["attestation_status"]
          tx_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attestations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "documentation_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attestations_oracle_key_id_fkey"
            columns: ["oracle_key_id"]
            isOneToOne: false
            referencedRelation: "oracle_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invites: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          organization_id: string
          token: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          organization_id: string
          token: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          organization_id?: string
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invites_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      documentation_events: {
        Row: {
          created_at: string
          event_hash: string
          event_timestamp: string
          event_type: Database["public"]["Enums"]["documentation_event_type"]
          id: string
          metadata: Json | null
          organization_id: string | null
          patient_id: string | null
          provider_id: string
        }
        Insert: {
          created_at?: string
          event_hash: string
          event_timestamp: string
          event_type: Database["public"]["Enums"]["documentation_event_type"]
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          patient_id?: string | null
          provider_id: string
        }
        Update: {
          created_at?: string
          event_hash?: string
          event_timestamp?: string
          event_type?: Database["public"]["Enums"]["documentation_event_type"]
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          patient_id?: string | null
          provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentation_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentation_events_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentation_events_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      ehr_integrations: {
        Row: {
          client_id: string
          created_at: string
          entity_id: string
          fhir_base_url: string | null
          id: string
          integration_type: string
          is_active: boolean | null
          updated_at: string
          webhook_secret: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          entity_id: string
          fhir_base_url?: string | null
          id?: string
          integration_type?: string
          is_active?: boolean | null
          updated_at?: string
          webhook_secret?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          entity_id?: string
          fhir_base_url?: string | null
          id?: string
          integration_type?: string
          is_active?: boolean | null
          updated_at?: string
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ehr_integrations_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      entities: {
        Row: {
          created_at: string
          display_name: string | null
          entity_type: Database["public"]["Enums"]["entity_type"]
          id: string
          is_verified: boolean | null
          metadata: Json | null
          organization_id: string | null
          updated_at: string
          wallet_address: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          entity_type: Database["public"]["Enums"]["entity_type"]
          id?: string
          is_verified?: boolean | null
          metadata?: Json | null
          organization_id?: string | null
          updated_at?: string
          wallet_address: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          entity_type?: Database["public"]["Enums"]["entity_type"]
          id?: string
          is_verified?: boolean | null
          metadata?: Json | null
          organization_id?: string | null
          updated_at?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "entities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      oracle_keys: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          public_key: string
          revoked_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          public_key: string
          revoked_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          public_key?: string
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oracle_keys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_policies: {
        Row: {
          base_reward: number
          created_at: string
          daily_limit_per_provider: number | null
          event_type: Database["public"]["Enums"]["documentation_event_type"]
          id: string
          is_active: boolean | null
          organization_split: number
          patient_split: number
          provider_split: number
          updated_at: string
        }
        Insert: {
          base_reward?: number
          created_at?: string
          daily_limit_per_provider?: number | null
          event_type: Database["public"]["Enums"]["documentation_event_type"]
          id?: string
          is_active?: boolean | null
          organization_split?: number
          patient_split?: number
          provider_split?: number
          updated_at?: string
        }
        Update: {
          base_reward?: number
          created_at?: string
          daily_limit_per_provider?: number | null
          event_type?: Database["public"]["Enums"]["documentation_event_type"]
          id?: string
          is_active?: boolean | null
          organization_split?: number
          patient_split?: number
          provider_split?: number
          updated_at?: string
        }
        Relationships: []
      }
      rewards_ledger: {
        Row: {
          amount: number
          attestation_id: string
          confirmed_at: string | null
          created_at: string
          id: string
          recipient_id: string
          recipient_type: Database["public"]["Enums"]["entity_type"]
          status: Database["public"]["Enums"]["attestation_status"]
          tx_hash: string | null
        }
        Insert: {
          amount: number
          attestation_id: string
          confirmed_at?: string | null
          created_at?: string
          id?: string
          recipient_id: string
          recipient_type: Database["public"]["Enums"]["entity_type"]
          status?: Database["public"]["Enums"]["attestation_status"]
          tx_hash?: string | null
        }
        Update: {
          amount?: number
          attestation_id?: string
          confirmed_at?: string | null
          created_at?: string
          id?: string
          recipient_id?: string
          recipient_type?: Database["public"]["Enums"]["entity_type"]
          status?: Database["public"]["Enums"]["attestation_status"]
          tx_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rewards_ledger_attestation_id_fkey"
            columns: ["attestation_id"]
            isOneToOne: false
            referencedRelation: "attestations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rewards_ledger_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
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
          role: Database["public"]["Enums"]["app_role"]
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
      get_entity_by_wallet: {
        Args: { _wallet_address: string }
        Returns: {
          created_at: string
          display_name: string | null
          entity_type: Database["public"]["Enums"]["entity_type"]
          id: string
          is_verified: boolean | null
          metadata: Json | null
          organization_id: string | null
          updated_at: string
          wallet_address: string
        }
        SetofOptions: {
          from: "*"
          to: "entities"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      attestation_status: "pending" | "confirmed" | "rejected" | "expired"
      documentation_event_type:
        | "encounter_note"
        | "medication_reconciliation"
        | "discharge_summary"
        | "problem_list_update"
        | "orders_verified"
        | "preventive_care"
        | "coding_finalized"
        | "intake_completed"
        | "consent_signed"
        | "follow_up_completed"
      entity_type: "provider" | "patient" | "organization" | "admin"
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
      attestation_status: ["pending", "confirmed", "rejected", "expired"],
      documentation_event_type: [
        "encounter_note",
        "medication_reconciliation",
        "discharge_summary",
        "problem_list_update",
        "orders_verified",
        "preventive_care",
        "coding_finalized",
        "intake_completed",
        "consent_signed",
        "follow_up_completed",
      ],
      entity_type: ["provider", "patient", "organization", "admin"],
    },
  },
} as const
