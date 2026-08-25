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
      app_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          created_at: string
          end_at: string
          id: string
          location_id: string | null
          notes: string | null
          resident_id: string | null
          space_id_deprecated: string | null
          start_at: string
          title: string
        }
        Insert: {
          created_at?: string
          end_at: string
          id?: string
          location_id?: string | null
          notes?: string | null
          resident_id?: string | null
          space_id_deprecated?: string | null
          start_at: string
          title: string
        }
        Update: {
          created_at?: string
          end_at?: string
          id?: string
          location_id?: string | null
          notes?: string | null
          resident_id?: string | null
          space_id_deprecated?: string | null
          start_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_space_id_fkey"
            columns: ["space_id_deprecated"]
            isOneToOne: false
            referencedRelation: "spaces_deprecated"
            referencedColumns: ["id"]
          },
        ]
      }
      cleaning_schedules: {
        Row: {
          active: boolean
          area: string
          assigned_to: string | null
          assigned_to_user_id: string | null
          created_at: string
          day_of_week: number
          hour: number
          id: string
          last_generated_until: string | null
          minute: number
          name: string
          notes: string | null
          recurrence: Database["public"]["Enums"]["cleaning_recurrence"]
          room_id: string | null
          service: Database["public"]["Enums"]["cleaning_service"]
          type: Database["public"]["Enums"]["cleaning_type"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          area: string
          assigned_to?: string | null
          assigned_to_user_id?: string | null
          created_at?: string
          day_of_week: number
          hour?: number
          id?: string
          last_generated_until?: string | null
          minute?: number
          name: string
          notes?: string | null
          recurrence?: Database["public"]["Enums"]["cleaning_recurrence"]
          room_id?: string | null
          service?: Database["public"]["Enums"]["cleaning_service"]
          type: Database["public"]["Enums"]["cleaning_type"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          area?: string
          assigned_to?: string | null
          assigned_to_user_id?: string | null
          created_at?: string
          day_of_week?: number
          hour?: number
          id?: string
          last_generated_until?: string | null
          minute?: number
          name?: string
          notes?: string | null
          recurrence?: Database["public"]["Enums"]["cleaning_recurrence"]
          room_id?: string | null
          service?: Database["public"]["Enums"]["cleaning_service"]
          type?: Database["public"]["Enums"]["cleaning_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cleaning_schedules_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      cleaning_tasks: {
        Row: {
          area: string
          assigned_to: string | null
          assigned_to_user_id: string | null
          checklist: Json | null
          created_at: string
          id: string
          location_id: string | null
          notes: string | null
          room_id: string | null
          scheduled_for: string
          service: Database["public"]["Enums"]["cleaning_service"]
          source: Database["public"]["Enums"]["cleaning_source"]
          source_ref: string | null
          status: Database["public"]["Enums"]["cleaning_status"]
          supplier_id: string | null
          type: Database["public"]["Enums"]["cleaning_type"]
          updated_at: string
        }
        Insert: {
          area: string
          assigned_to?: string | null
          assigned_to_user_id?: string | null
          checklist?: Json | null
          created_at?: string
          id?: string
          location_id?: string | null
          notes?: string | null
          room_id?: string | null
          scheduled_for: string
          service?: Database["public"]["Enums"]["cleaning_service"]
          source?: Database["public"]["Enums"]["cleaning_source"]
          source_ref?: string | null
          status?: Database["public"]["Enums"]["cleaning_status"]
          supplier_id?: string | null
          type: Database["public"]["Enums"]["cleaning_type"]
          updated_at?: string
        }
        Update: {
          area?: string
          assigned_to?: string | null
          assigned_to_user_id?: string | null
          checklist?: Json | null
          created_at?: string
          id?: string
          location_id?: string | null
          notes?: string | null
          room_id?: string | null
          scheduled_for?: string
          service?: Database["public"]["Enums"]["cleaning_service"]
          source?: Database["public"]["Enums"]["cleaning_source"]
          source_ref?: string | null
          status?: Database["public"]["Enums"]["cleaning_status"]
          supplier_id?: string | null
          type?: Database["public"]["Enums"]["cleaning_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cleaning_tasks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleaning_tasks_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleaning_tasks_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_rent_periods: {
        Row: {
          contract_id: string
          created_at: string
          id: string
          monthly_amount: number
          reason: string | null
          valid_from: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          id?: string
          monthly_amount: number
          reason?: string | null
          valid_from: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          id?: string
          monthly_amount?: number
          reason?: string | null
          valid_from?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_rent_periods_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_balance"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "contract_rent_periods_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          actual_end_date: string | null
          auto_renew: boolean
          code: string | null
          created_at: string
          deposit_due: number
          deposit_received: number
          deposit_returned: number
          end_date: string
          id: string
          lead_id: string | null
          notes: string | null
          payment_day: number
          regular_rent_amount: number | null
          reservation_deadline: string | null
          reservation_fee_amount: number | null
          resident_id: string
          signed_at: string | null
          start_date: string
          status: Database["public"]["Enums"]["contract_status"]
          updated_at: string
        }
        Insert: {
          actual_end_date?: string | null
          auto_renew?: boolean
          code?: string | null
          created_at?: string
          deposit_due?: number
          deposit_received?: number
          deposit_returned?: number
          end_date: string
          id?: string
          lead_id?: string | null
          notes?: string | null
          payment_day?: number
          regular_rent_amount?: number | null
          reservation_deadline?: string | null
          reservation_fee_amount?: number | null
          resident_id: string
          signed_at?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["contract_status"]
          updated_at?: string
        }
        Update: {
          actual_end_date?: string | null
          auto_renew?: boolean
          code?: string | null
          created_at?: string
          deposit_due?: number
          deposit_received?: number
          deposit_returned?: number
          end_date?: string
          id?: string
          lead_id?: string | null
          notes?: string | null
          payment_day?: number
          regular_rent_amount?: number | null
          reservation_deadline?: string | null
          reservation_fee_amount?: number | null
          resident_id?: string
          signed_at?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["contract_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activity: {
        Row: {
          actor_name: string | null
          actor_user_id: string | null
          created_at: string
          id: string
          kind: string
          lead_id: string
          payload: Json
        }
        Insert: {
          actor_name?: string | null
          actor_user_id?: string | null
          created_at?: string
          id?: string
          kind: string
          lead_id: string
          payload?: Json
        }
        Update: {
          actor_name?: string | null
          actor_user_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          lead_id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "lead_activity_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          address: string | null
          age: string | null
          assigned_to: string | null
          assigned_to_user_id: string | null
          budget_range: string | null
          contract_id: string | null
          created_at: string
          document_number: string | null
          document_validity: string | null
          email: string
          external_ref: string | null
          full_name: string
          gdpr_consent: boolean
          gender: string | null
          id: string
          language: string | null
          lost_reason: string | null
          nationality: string | null
          next_action: string | null
          next_action_date: string | null
          notes: string | null
          phone: string | null
          preferred_move_in: string | null
          preferred_room_type: string | null
          profile: string | null
          profile_other: string | null
          reservation_deadline: string | null
          reservation_fee_amount: number | null
          source: Database["public"]["Enums"]["lead_source"]
          source_detail: string | null
          status: Database["public"]["Enums"]["lead_status"]
          stay_duration: string | null
          stay_id: string | null
          tax_number: string | null
          updated_at: string
          what_brings_them: string | null
        }
        Insert: {
          address?: string | null
          age?: string | null
          assigned_to?: string | null
          assigned_to_user_id?: string | null
          budget_range?: string | null
          contract_id?: string | null
          created_at?: string
          document_number?: string | null
          document_validity?: string | null
          email: string
          external_ref?: string | null
          full_name: string
          gdpr_consent?: boolean
          gender?: string | null
          id?: string
          language?: string | null
          lost_reason?: string | null
          nationality?: string | null
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          phone?: string | null
          preferred_move_in?: string | null
          preferred_room_type?: string | null
          profile?: string | null
          profile_other?: string | null
          reservation_deadline?: string | null
          reservation_fee_amount?: number | null
          source?: Database["public"]["Enums"]["lead_source"]
          source_detail?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          stay_duration?: string | null
          stay_id?: string | null
          tax_number?: string | null
          updated_at?: string
          what_brings_them?: string | null
        }
        Update: {
          address?: string | null
          age?: string | null
          assigned_to?: string | null
          assigned_to_user_id?: string | null
          budget_range?: string | null
          contract_id?: string | null
          created_at?: string
          document_number?: string | null
          document_validity?: string | null
          email?: string
          external_ref?: string | null
          full_name?: string
          gdpr_consent?: boolean
          gender?: string | null
          id?: string
          language?: string | null
          lost_reason?: string | null
          nationality?: string | null
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          phone?: string | null
          preferred_move_in?: string | null
          preferred_room_type?: string | null
          profile?: string | null
          profile_other?: string | null
          reservation_deadline?: string | null
          reservation_fee_amount?: number | null
          source?: Database["public"]["Enums"]["lead_source"]
          source_detail?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          stay_duration?: string | null
          stay_id?: string | null
          tax_number?: string | null
          updated_at?: string
          what_brings_them?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_balance"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "leads_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "stays"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          apartment: string | null
          capacity: number | null
          created_at: string
          floor: number | null
          id: string
          is_bookable: boolean
          kind: Database["public"]["Enums"]["location_kind"]
          legacy_space_id: string | null
          name: string
          notes: string | null
          parent_location_id: string | null
          status: Database["public"]["Enums"]["location_status"]
          updated_at: string
        }
        Insert: {
          apartment?: string | null
          capacity?: number | null
          created_at?: string
          floor?: number | null
          id?: string
          is_bookable?: boolean
          kind?: Database["public"]["Enums"]["location_kind"]
          legacy_space_id?: string | null
          name: string
          notes?: string | null
          parent_location_id?: string | null
          status?: Database["public"]["Enums"]["location_status"]
          updated_at?: string
        }
        Update: {
          apartment?: string | null
          capacity?: number | null
          created_at?: string
          floor?: number | null
          id?: string
          is_bookable?: boolean
          kind?: Database["public"]["Enums"]["location_kind"]
          legacy_space_id?: string | null
          name?: string
          notes?: string | null
          parent_location_id?: string | null
          status?: Database["public"]["Enums"]["location_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_parent_location_id_fkey"
            columns: ["parent_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      ops_tasks: {
        Row: {
          assigned_to: string | null
          assigned_to_user_id: string | null
          category: Database["public"]["Enums"]["task_category"]
          code: string
          cost_currency: string
          created_at: string
          description: string | null
          due_date: string | null
          estimated_cost: number | null
          final_cost: number | null
          id: string
          location_id: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          request_id: string | null
          resident_id: string | null
          room_id: string | null
          source_ref: string | null
          status: Database["public"]["Enums"]["task_status"]
          supplier_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          assigned_to_user_id?: string | null
          category?: Database["public"]["Enums"]["task_category"]
          code: string
          cost_currency?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_cost?: number | null
          final_cost?: number | null
          id?: string
          location_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          request_id?: string | null
          resident_id?: string | null
          room_id?: string | null
          source_ref?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          supplier_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          assigned_to_user_id?: string | null
          category?: Database["public"]["Enums"]["task_category"]
          code?: string
          cost_currency?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_cost?: number | null
          final_cost?: number | null
          id?: string
          location_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          request_id?: string | null
          resident_id?: string | null
          room_id?: string | null
          source_ref?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          supplier_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ops_tasks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "ops_tasks_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          contract_id: string
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["payment_kind"]
          method: Database["public"]["Enums"]["payment_method"] | null
          notes: string | null
          paid_at: string
          reference: string | null
          rent_charge_id: string | null
        }
        Insert: {
          amount: number
          contract_id: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["payment_kind"]
          method?: Database["public"]["Enums"]["payment_method"] | null
          notes?: string | null
          paid_at?: string
          reference?: string | null
          rent_charge_id?: string | null
        }
        Update: {
          amount?: number
          contract_id?: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["payment_kind"]
          method?: Database["public"]["Enums"]["payment_method"] | null
          notes?: string | null
          paid_at?: string
          reference?: string | null
          rent_charge_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_balance"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_rent_charge_id_fkey"
            columns: ["rent_charge_id"]
            isOneToOne: false
            referencedRelation: "rent_charge_balance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_rent_charge_id_fkey"
            columns: ["rent_charge_id"]
            isOneToOne: false
            referencedRelation: "rent_charges"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"]
          alternate_address: string | null
          created_at: string
          date_of_birth: string | null
          document_url: string | null
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employer_or_school: string | null
          expected_move_in: string | null
          full_name: string
          gender: string | null
          iban: string | null
          nationality: string | null
          phone: string | null
          photo_url: string | null
          requested_room_number: string | null
          resident_id: string | null
          special_needs: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"]
          alternate_address?: string | null
          created_at?: string
          date_of_birth?: string | null
          document_url?: string | null
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employer_or_school?: string | null
          expected_move_in?: string | null
          full_name?: string
          gender?: string | null
          iban?: string | null
          nationality?: string | null
          phone?: string | null
          photo_url?: string | null
          requested_room_number?: string | null
          resident_id?: string | null
          special_needs?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"]
          alternate_address?: string | null
          created_at?: string
          date_of_birth?: string | null
          document_url?: string | null
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employer_or_school?: string | null
          expected_move_in?: string | null
          full_name?: string
          gender?: string | null
          iban?: string | null
          nationality?: string | null
          phone?: string | null
          photo_url?: string | null
          requested_room_number?: string | null
          resident_id?: string | null
          special_needs?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rent_charges: {
        Row: {
          amount: number
          contract_id: string
          created_at: string
          due_date: string
          id: string
          month: number
          notes: string | null
          prorated: boolean
          year: number
        }
        Insert: {
          amount: number
          contract_id: string
          created_at?: string
          due_date: string
          id?: string
          month: number
          notes?: string | null
          prorated?: boolean
          year: number
        }
        Update: {
          amount?: number
          contract_id?: string
          created_at?: string
          due_date?: string
          id?: string
          month?: number
          notes?: string | null
          prorated?: boolean
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "rent_charges_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_balance"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "rent_charges_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      request_activity: {
        Row: {
          actor_name: string | null
          actor_user_id: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["request_activity_kind"]
          payload: Json
          request_id: string
        }
        Insert: {
          actor_name?: string | null
          actor_user_id?: string | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["request_activity_kind"]
          payload?: Json
          request_id: string
        }
        Update: {
          actor_name?: string | null
          actor_user_id?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["request_activity_kind"]
          payload?: Json
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_activity_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_comments: {
        Row: {
          author_name: string
          author_role: string
          author_user_id: string
          body: string
          created_at: string
          id: string
          request_id: string
        }
        Insert: {
          author_name: string
          author_role: string
          author_user_id: string
          body: string
          created_at?: string
          id?: string
          request_id: string
        }
        Update: {
          author_name?: string
          author_role?: string
          author_user_id?: string
          body?: string
          created_at?: string
          id?: string
          request_id?: string
        }
        Relationships: []
      }
      requests: {
        Row: {
          assigned_to: string | null
          assigned_to_user_id: string | null
          category: Database["public"]["Enums"]["request_category"]
          code: string
          created_at: string
          description: string | null
          id: string
          location: string | null
          location_id: string | null
          permission_to_enter: Database["public"]["Enums"]["permission_to_enter"]
          photos: string[]
          priority: Database["public"]["Enums"]["request_priority"]
          resident_id: string | null
          room_id: string | null
          status: Database["public"]["Enums"]["request_status"]
          supplier_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          assigned_to_user_id?: string | null
          category: Database["public"]["Enums"]["request_category"]
          code: string
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          location_id?: string | null
          permission_to_enter?: Database["public"]["Enums"]["permission_to_enter"]
          photos?: string[]
          priority?: Database["public"]["Enums"]["request_priority"]
          resident_id?: string | null
          room_id?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          supplier_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          assigned_to_user_id?: string | null
          category?: Database["public"]["Enums"]["request_category"]
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          location_id?: string | null
          permission_to_enter?: Database["public"]["Enums"]["permission_to_enter"]
          photos?: string[]
          priority?: Database["public"]["Enums"]["request_priority"]
          resident_id?: string | null
          room_id?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          supplier_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "requests_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      residents: {
        Row: {
          address: string | null
          age: string | null
          avatar_color: string | null
          checkin_checklist: Json
          created_at: string
          date_of_birth: string | null
          document_number: string | null
          document_type: string | null
          document_validity: string | null
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employer_or_school: string | null
          full_name: string
          gender: string | null
          id: string
          move_in: string | null
          move_out: string | null
          nationality: string | null
          phone: string | null
          profile: string | null
          room_id: string | null
          special_needs: string | null
          status: Database["public"]["Enums"]["resident_status"]
          tax_number: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          age?: string | null
          avatar_color?: string | null
          checkin_checklist?: Json
          created_at?: string
          date_of_birth?: string | null
          document_number?: string | null
          document_type?: string | null
          document_validity?: string | null
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employer_or_school?: string | null
          full_name: string
          gender?: string | null
          id?: string
          move_in?: string | null
          move_out?: string | null
          nationality?: string | null
          phone?: string | null
          profile?: string | null
          room_id?: string | null
          special_needs?: string | null
          status?: Database["public"]["Enums"]["resident_status"]
          tax_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          age?: string | null
          avatar_color?: string | null
          checkin_checklist?: Json
          created_at?: string
          date_of_birth?: string | null
          document_number?: string | null
          document_type?: string | null
          document_validity?: string | null
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employer_or_school?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          move_in?: string | null
          move_out?: string | null
          nationality?: string | null
          phone?: string | null
          profile?: string | null
          room_id?: string | null
          special_needs?: string | null
          status?: Database["public"]["Enums"]["resident_status"]
          tax_number?: string | null
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
      room_typologies: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      rooms: {
        Row: {
          created_at: string
          current_resident_id: string | null
          floor: number
          id: string
          location_id: string | null
          number: string
          status: Database["public"]["Enums"]["room_status"]
          typology: string
          typology_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_resident_id?: string | null
          floor: number
          id?: string
          location_id?: string | null
          number: string
          status?: Database["public"]["Enums"]["room_status"]
          typology: string
          typology_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_resident_id?: string | null
          floor?: number
          id?: string
          location_id?: string | null
          number?: string
          status?: Database["public"]["Enums"]["room_status"]
          typology?: string
          typology_id?: string | null
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
          {
            foreignKeyName: "rooms_typology_id_fkey"
            columns: ["typology_id"]
            isOneToOne: false
            referencedRelation: "room_typologies"
            referencedColumns: ["id"]
          },
        ]
      }
      spaces_deprecated: {
        Row: {
          active: boolean
          capacity: number
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          capacity?: number
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          active?: boolean
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
          contract_id: string | null
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
          contract_id?: string | null
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
          contract_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "stays_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_balance"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "stays_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          active: boolean
          category: Database["public"]["Enums"]["supplier_category"]
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          tags: string[]
          updated_at: string
          website: string | null
        }
        Insert: {
          active?: boolean
          category?: Database["public"]["Enums"]["supplier_category"]
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          tags?: string[]
          updated_at?: string
          website?: string | null
        }
        Update: {
          active?: boolean
          category?: Database["public"]["Enums"]["supplier_category"]
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          tags?: string[]
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      typology_prices: {
        Row: {
          created_at: string
          id: string
          list_price: number
          promo_price: number | null
          typology_id: string
          valid_from: string
        }
        Insert: {
          created_at?: string
          id?: string
          list_price: number
          promo_price?: number | null
          typology_id: string
          valid_from: string
        }
        Update: {
          created_at?: string
          id?: string
          list_price?: number
          promo_price?: number | null
          typology_id?: string
          valid_from?: string
        }
        Relationships: [
          {
            foreignKeyName: "typology_prices_typology_id_fkey"
            columns: ["typology_id"]
            isOneToOne: false
            referencedRelation: "room_typologies"
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
    }
    Views: {
      contract_balance: {
        Row: {
          billed: number | null
          contract_id: string | null
          deposit_held: number | null
          overdue: number | null
          received: number | null
        }
        Relationships: []
      }
      rent_charge_balance: {
        Row: {
          amount: number | null
          contract_id: string | null
          created_at: string | null
          due_date: string | null
          id: string | null
          month: number | null
          notes: string | null
          outstanding: number | null
          paid: number | null
          payment_state: string | null
          prorated: boolean | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rent_charges_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_balance"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "rent_charges_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      compensation_months: {
        Args: { p_end: string; p_start: string }
        Returns: number
      }
      compute_rent_for_month: {
        Args: { p_contract_id: string; p_month: number; p_year: number }
        Returns: Record<string, unknown>
      }
      current_resident_id: { Args: never; Returns: string }
      generate_cleaning_instances: {
        Args: { p_count?: number; p_schedule_id: string }
        Returns: number
      }
      generate_finance_alerts: { Args: never; Returns: number }
      generate_rent_charges: {
        Args: { p_contract_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      list_staff_users: {
        Args: never
        Returns: {
          email: string
          full_name: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }[]
      }
      recalculate_rent_charges: {
        Args: { p_contract_id: string }
        Returns: Json
      }
      stay_daterange: { Args: { _in: string; _out: string }; Returns: unknown }
    }
    Enums: {
      account_status: "pending_approval" | "active" | "rejected" | "disabled"
      app_role: "resident" | "staff" | "manager" | "admin"
      cleaning_recurrence: "weekly" | "biweekly" | "monthly"
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
      contract_status: "reserved" | "active" | "terminated" | "cancelled"
      lead_source:
        | "website_form"
        | "idealista"
        | "instagram"
        | "linkedin"
        | "referral"
        | "walk_in"
        | "email"
        | "phone"
        | "other"
      lead_status:
        | "new"
        | "contacted"
        | "visit_scheduled"
        | "visited"
        | "proposal_sent"
        | "negotiating"
        | "won"
        | "lost"
        | "archived"
      location_kind:
        | "room"
        | "shared_bathroom"
        | "apartment_kitchen"
        | "common_kitchen"
        | "corridor"
        | "balcony"
        | "laundry"
        | "meeting_room"
        | "cowork"
        | "terrace"
        | "winter_garden"
        | "cinema"
        | "technical"
        | "other"
        | "apartment"
        | "floor"
      location_status: "active" | "out_of_service" | "under_maintenance"
      payment_kind:
        | "rent"
        | "deposit"
        | "deposit_return"
        | "booking_fee"
        | "extra"
        | "other"
      payment_method:
        | "transfer"
        | "mbway"
        | "direct_debit"
        | "card"
        | "cash"
        | "other"
      permission_to_enter: "yes" | "no" | "with_notice"
      request_activity_kind:
        | "supplier_assigned"
        | "supplier_removed"
        | "status_changed"
        | "owner_changed"
        | "location_changed"
        | "created"
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
      supplier_category:
        | "plumbing"
        | "electrical"
        | "cleaning_company"
        | "internet"
        | "laundry"
        | "maintenance"
        | "hvac"
        | "pest_control"
        | "gardening"
        | "security"
        | "other"
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
      cleaning_recurrence: ["weekly", "biweekly", "monthly"],
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
      contract_status: ["reserved", "active", "terminated", "cancelled"],
      lead_source: [
        "website_form",
        "idealista",
        "instagram",
        "linkedin",
        "referral",
        "walk_in",
        "email",
        "phone",
        "other",
      ],
      lead_status: [
        "new",
        "contacted",
        "visit_scheduled",
        "visited",
        "proposal_sent",
        "negotiating",
        "won",
        "lost",
        "archived",
      ],
      location_kind: [
        "room",
        "shared_bathroom",
        "apartment_kitchen",
        "common_kitchen",
        "corridor",
        "balcony",
        "laundry",
        "meeting_room",
        "cowork",
        "terrace",
        "winter_garden",
        "cinema",
        "technical",
        "other",
        "apartment",
        "floor",
      ],
      location_status: ["active", "out_of_service", "under_maintenance"],
      payment_kind: [
        "rent",
        "deposit",
        "deposit_return",
        "booking_fee",
        "extra",
        "other",
      ],
      payment_method: [
        "transfer",
        "mbway",
        "direct_debit",
        "card",
        "cash",
        "other",
      ],
      permission_to_enter: ["yes", "no", "with_notice"],
      request_activity_kind: [
        "supplier_assigned",
        "supplier_removed",
        "status_changed",
        "owner_changed",
        "location_changed",
        "created",
      ],
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
      supplier_category: [
        "plumbing",
        "electrical",
        "cleaning_company",
        "internet",
        "laundry",
        "maintenance",
        "hvac",
        "pest_control",
        "gardening",
        "security",
        "other",
      ],
      task_category: ["maintenance", "logistics", "admin", "supplier", "other"],
      task_priority: ["low", "medium", "high"],
      task_status: ["todo", "in_progress", "done", "blocked"],
    },
  },
} as const
