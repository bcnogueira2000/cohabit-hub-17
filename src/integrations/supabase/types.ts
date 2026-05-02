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
      bookings: {
        Row: {
          created_at: string
          end_at: string
          id: string
          notes: string | null
          resident_id: string | null
          space_id: string
          start_at: string
          title: string
        }
        Insert: {
          created_at?: string
          end_at: string
          id?: string
          notes?: string | null
          resident_id?: string | null
          space_id: string
          start_at: string
          title: string
        }
        Update: {
          created_at?: string
          end_at?: string
          id?: string
          notes?: string | null
          resident_id?: string | null
          space_id?: string
          start_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      cleaning_tasks: {
        Row: {
          area: string
          assigned_to: string | null
          checklist: Json | null
          created_at: string
          id: string
          notes: string | null
          room_id: string | null
          scheduled_for: string
          service: Database["public"]["Enums"]["cleaning_service"]
          source: Database["public"]["Enums"]["cleaning_source"]
          source_ref: string | null
          status: Database["public"]["Enums"]["cleaning_status"]
          type: Database["public"]["Enums"]["cleaning_type"]
          updated_at: string
        }
        Insert: {
          area: string
          assigned_to?: string | null
          checklist?: Json | null
          created_at?: string
          id?: string
          notes?: string | null
          room_id?: string | null
          scheduled_for: string
          service?: Database["public"]["Enums"]["cleaning_service"]
          source?: Database["public"]["Enums"]["cleaning_source"]
          source_ref?: string | null
          status?: Database["public"]["Enums"]["cleaning_status"]
          type: Database["public"]["Enums"]["cleaning_type"]
          updated_at?: string
        }
        Update: {
          area?: string
          assigned_to?: string | null
          checklist?: Json | null
          created_at?: string
          id?: string
          notes?: string | null
          room_id?: string | null
          scheduled_for?: string
          service?: Database["public"]["Enums"]["cleaning_service"]
          source?: Database["public"]["Enums"]["cleaning_source"]
          source_ref?: string | null
          status?: Database["public"]["Enums"]["cleaning_status"]
          type?: Database["public"]["Enums"]["cleaning_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cleaning_tasks_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_tasks: {
        Row: {
          assigned_to: string | null
          category: Database["public"]["Enums"]["task_category"]
          code: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          request_id: string | null
          resident_id: string | null
          room_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["task_category"]
          code: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          request_id?: string | null
          resident_id?: string | null
          room_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["task_category"]
          code?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          request_id?: string | null
          resident_id?: string | null
          room_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ops_tasks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_tasks_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_tasks_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"]
          created_at: string
          email: string
          expected_move_in: string | null
          full_name: string
          phone: string | null
          requested_room_number: string | null
          resident_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"]
          created_at?: string
          email: string
          expected_move_in?: string | null
          full_name?: string
          phone?: string | null
          requested_room_number?: string | null
          resident_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"]
          created_at?: string
          email?: string
          expected_move_in?: string | null
          full_name?: string
          phone?: string | null
          requested_room_number?: string | null
          resident_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      requests: {
        Row: {
          assigned_to: string | null
          category: Database["public"]["Enums"]["request_category"]
          code: string
          created_at: string
          description: string | null
          id: string
          location: string | null
          permission_to_enter: Database["public"]["Enums"]["permission_to_enter"]
          priority: Database["public"]["Enums"]["request_priority"]
          resident_id: string | null
          room_id: string | null
          status: Database["public"]["Enums"]["request_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category: Database["public"]["Enums"]["request_category"]
          code: string
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          permission_to_enter?: Database["public"]["Enums"]["permission_to_enter"]
          priority?: Database["public"]["Enums"]["request_priority"]
          resident_id?: string | null
          room_id?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["request_category"]
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          permission_to_enter?: Database["public"]["Enums"]["permission_to_enter"]
          priority?: Database["public"]["Enums"]["request_priority"]
          resident_id?: string | null
          room_id?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      residents: {
        Row: {
          avatar_color: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          move_in: string | null
          move_out: string | null
          phone: string | null
          room_id: string | null
          status: Database["public"]["Enums"]["resident_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_color?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          move_in?: string | null
          move_out?: string | null
          phone?: string | null
          room_id?: string | null
          status?: Database["public"]["Enums"]["resident_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_color?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          move_in?: string | null
          move_out?: string | null
          phone?: string | null
          room_id?: string | null
          status?: Database["public"]["Enums"]["resident_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "residents_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          created_at: string
          current_resident_id: string | null
          floor: number
          id: string
          number: string
          status: Database["public"]["Enums"]["room_status"]
          typology: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_resident_id?: string | null
          floor: number
          id?: string
          number: string
          status?: Database["public"]["Enums"]["room_status"]
          typology: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_resident_id?: string | null
          floor?: number
          id?: string
          number?: string
          status?: Database["public"]["Enums"]["room_status"]
          typology?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_current_resident_fk"
            columns: ["current_resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      spaces: {
        Row: {
          capacity: number
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          capacity?: number
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      stays: {
        Row: {
          check_in: string
          check_out: string
          created_at: string
          email: string
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          resident_id: string | null
          room_id: string | null
          source: Database["public"]["Enums"]["stay_source"]
          status: Database["public"]["Enums"]["stay_status"]
          updated_at: string
        }
        Insert: {
          check_in: string
          check_out: string
          created_at?: string
          email: string
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          resident_id?: string | null
          room_id?: string | null
          source?: Database["public"]["Enums"]["stay_source"]
          status?: Database["public"]["Enums"]["stay_status"]
          updated_at?: string
        }
        Update: {
          check_in?: string
          check_out?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          resident_id?: string | null
          room_id?: string | null
          source?: Database["public"]["Enums"]["stay_source"]
          status?: Database["public"]["Enums"]["stay_status"]
          updated_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_resident_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      account_status: "pending_approval" | "active" | "rejected" | "disabled"
      app_role: "resident" | "staff" | "manager" | "admin"
      cleaning_service: "normal" | "simple"
      cleaning_source: "scheduled" | "checkout" | "request" | "manual"
      cleaning_status: "scheduled" | "in_progress" | "completed" | "skipped"
      cleaning_type:
        | "room_regular"
        | "room_deep"
        | "bathroom"
        | "kitchen"
        | "common"
        | "checkout_inspection"
      permission_to_enter: "yes" | "no" | "with_notice"
      request_category:
        | "maintenance"
        | "cleaning"
        | "consumables"
        | "wifi_tech"
        | "noise"
        | "billing"
        | "lost_found"
        | "feedback"
        | "other"
      request_priority: "low" | "medium" | "high" | "urgent"
      request_status:
        | "open"
        | "in_progress"
        | "waiting_resident"
        | "waiting_supplier"
        | "resolved"
        | "closed"
      resident_status: "upcoming" | "active" | "checking_out" | "past"
      room_status:
        | "available"
        | "occupied"
        | "reserved"
        | "maintenance"
        | "cleaning_required"
        | "out_of_service"
      stay_source: "manual" | "public_form" | "external"
      stay_status:
        | "pending"
        | "confirmed"
        | "checked_in"
        | "checked_out"
        | "cancelled"
      task_category:
        | "maintenance"
        | "logistics"
        | "admin"
        | "supplier"
        | "other"
      task_priority: "low" | "medium" | "high"
      task_status: "todo" | "in_progress" | "done" | "blocked"
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
      account_status: ["pending_approval", "active", "rejected", "disabled"],
      app_role: ["resident", "staff", "manager", "admin"],
      cleaning_service: ["normal", "simple"],
      cleaning_source: ["scheduled", "checkout", "request", "manual"],
      cleaning_status: ["scheduled", "in_progress", "completed", "skipped"],
      cleaning_type: [
        "room_regular",
        "room_deep",
        "bathroom",
        "kitchen",
        "common",
        "checkout_inspection",
      ],
      permission_to_enter: ["yes", "no", "with_notice"],
      request_category: [
        "maintenance",
        "cleaning",
        "consumables",
        "wifi_tech",
        "noise",
        "billing",
        "lost_found",
        "feedback",
        "other",
      ],
      request_priority: ["low", "medium", "high", "urgent"],
      request_status: [
        "open",
        "in_progress",
        "waiting_resident",
        "waiting_supplier",
        "resolved",
        "closed",
      ],
      resident_status: ["upcoming", "active", "checking_out", "past"],
      room_status: [
        "available",
        "occupied",
        "reserved",
        "maintenance",
        "cleaning_required",
        "out_of_service",
      ],
      stay_source: ["manual", "public_form", "external"],
      stay_status: [
        "pending",
        "confirmed",
        "checked_in",
        "checked_out",
        "cancelled",
      ],
      task_category: ["maintenance", "logistics", "admin", "supplier", "other"],
      task_priority: ["low", "medium", "high"],
      task_status: ["todo", "in_progress", "done", "blocked"],
    },
  },
} as const
