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
      activity_log: {
        Row: {
          created_at: string
          description: string | null
          event_name: string
          event_type: Database["public"]["Enums"]["notification_type"]
          id: string
          metadata: Json | null
          source: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_name: string
          event_type: Database["public"]["Enums"]["notification_type"]
          id?: string
          metadata?: Json | null
          source?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          event_name?: string
          event_type?: Database["public"]["Enums"]["notification_type"]
          id?: string
          metadata?: Json | null
          source?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      automation_rules: {
        Row: {
          action_config: Json | null
          action_type: string
          created_at: string
          description: string | null
          execution_count: number | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          name: string
          trigger_condition: Json | null
          trigger_event: string
          updated_at: string
        }
        Insert: {
          action_config?: Json | null
          action_type: string
          created_at?: string
          description?: string | null
          execution_count?: number | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name: string
          trigger_condition?: Json | null
          trigger_event: string
          updated_at?: string
        }
        Update: {
          action_config?: Json | null
          action_type?: string
          created_at?: string
          description?: string | null
          execution_count?: number | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name?: string
          trigger_condition?: Json | null
          trigger_event?: string
          updated_at?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          booking_number: string
          check_in: string
          check_out: string
          created_at: string
          created_by: string | null
          guest_id: string | null
          id: string
          nights: number | null
          notes: string | null
          room_id: string | null
          status: Database["public"]["Enums"]["booking_status"]
          total_amount: number
          updated_at: string
        }
        Insert: {
          booking_number: string
          check_in: string
          check_out: string
          created_at?: string
          created_by?: string | null
          guest_id?: string | null
          id?: string
          nights?: number | null
          notes?: string | null
          room_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          total_amount?: number
          updated_at?: string
        }
        Update: {
          booking_number?: string
          check_in?: string
          check_out?: string
          created_at?: string
          created_by?: string | null
          guest_id?: string | null
          id?: string
          nights?: number | null
          notes?: string | null
          room_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          created_at: string
          email: string | null
          id: string
          last_stay_at: string | null
          name: string
          notes: string | null
          phone: string | null
          tags: Database["public"]["Enums"]["guest_tag"][] | null
          total_spent: number | null
          total_stays: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          last_stay_at?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          tags?: Database["public"]["Enums"]["guest_tag"][] | null
          total_spent?: number | null
          total_stays?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          last_stay_at?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          tags?: Database["public"]["Enums"]["guest_tag"][] | null
          total_spent?: number | null
          total_stays?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      housekeeping_tasks: {
        Row: {
          assignee_id: string | null
          automation_triggered: boolean | null
          booking_id: string | null
          completed_at: string | null
          created_at: string
          due_at: string | null
          id: string
          notes: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          room_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["task_status"]
          task_number: string
          type: Database["public"]["Enums"]["task_type"]
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          automation_triggered?: boolean | null
          booking_id?: string | null
          completed_at?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          room_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          task_number: string
          type?: Database["public"]["Enums"]["task_type"]
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          automation_triggered?: boolean | null
          booking_id?: string | null
          completed_at?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          room_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          task_number?: string
          type?: Database["public"]["Enums"]["task_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "housekeeping_tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housekeeping_tasks_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housekeeping_tasks_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string
          due_date: string | null
          guest_id: string | null
          id: string
          invoice_number: string
          paid_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string
          due_date?: string | null
          guest_id?: string | null
          id?: string
          invoice_number: string
          paid_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          due_date?: string | null
          guest_id?: string | null
          id?: string
          invoice_number?: string
          paid_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          metadata: Json | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          metadata?: Json | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          metadata?: Json | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rooms: {
        Row: {
          amenities: string[] | null
          capacity: number
          created_at: string
          floor: number
          id: string
          number: string
          rate: number
          status: Database["public"]["Enums"]["room_status"]
          type: Database["public"]["Enums"]["room_type"]
          updated_at: string
        }
        Insert: {
          amenities?: string[] | null
          capacity?: number
          created_at?: string
          floor?: number
          id?: string
          number: string
          rate?: number
          status?: Database["public"]["Enums"]["room_status"]
          type?: Database["public"]["Enums"]["room_type"]
          updated_at?: string
        }
        Update: {
          amenities?: string[] | null
          capacity?: number
          created_at?: string
          floor?: number
          id?: string
          number?: string
          rate?: number
          status?: Database["public"]["Enums"]["room_status"]
          type?: Database["public"]["Enums"]["room_type"]
          updated_at?: string
        }
        Relationships: []
      }
      staff_members: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          role: Database["public"]["Enums"]["staff_role"]
          shift: string | null
          status: Database["public"]["Enums"]["staff_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          role?: Database["public"]["Enums"]["staff_role"]
          shift?: string | null
          status?: Database["public"]["Enums"]["staff_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["staff_role"]
          shift?: string | null
          status?: Database["public"]["Enums"]["staff_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["hotel_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["hotel_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["hotel_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_booking_number: { Args: never; Returns: string }
      generate_invoice_number: { Args: never; Returns: string }
      generate_task_number: { Args: never; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["hotel_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["hotel_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      booking_status:
        | "pending"
        | "confirmed"
        | "checked_in"
        | "checked_out"
        | "cancelled"
      guest_tag: "vip" | "regular" | "blocked"
      hotel_role:
        | "owner"
        | "manager"
        | "reception"
        | "housekeeping"
        | "accountant"
      notification_type: "booking" | "task" | "alert" | "automation" | "room"
      room_status:
        | "available"
        | "occupied"
        | "dirty"
        | "cleaning"
        | "maintenance"
      room_type: "standard" | "deluxe" | "suite" | "penthouse"
      staff_role: "housekeeping" | "reception" | "maintenance" | "manager"
      staff_status: "on_duty" | "off_duty" | "break"
      task_priority: "low" | "medium" | "high"
      task_status: "pending" | "in_progress" | "completed" | "overdue"
      task_type:
        | "checkout_clean"
        | "stay_clean"
        | "deep_clean"
        | "inspection"
        | "maintenance"
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
      booking_status: [
        "pending",
        "confirmed",
        "checked_in",
        "checked_out",
        "cancelled",
      ],
      guest_tag: ["vip", "regular", "blocked"],
      hotel_role: [
        "owner",
        "manager",
        "reception",
        "housekeeping",
        "accountant",
      ],
      notification_type: ["booking", "task", "alert", "automation", "room"],
      room_status: [
        "available",
        "occupied",
        "dirty",
        "cleaning",
        "maintenance",
      ],
      room_type: ["standard", "deluxe", "suite", "penthouse"],
      staff_role: ["housekeeping", "reception", "maintenance", "manager"],
      staff_status: ["on_duty", "off_duty", "break"],
      task_priority: ["low", "medium", "high"],
      task_status: ["pending", "in_progress", "completed", "overdue"],
      task_type: [
        "checkout_clean",
        "stay_clean",
        "deep_clean",
        "inspection",
        "maintenance",
      ],
    },
  },
} as const
