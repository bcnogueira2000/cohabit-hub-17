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
      audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          row_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          row_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          row_id?: string | null
          table_name?: string
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
      contract_activity: {
        Row: {
          actor_name: string | null
          actor_user_id: string | null
          contract_id: string
          created_at: string
          id: string
          kind: string
          payload: Json
        }
        Insert: {
          actor_name?: string | null
          actor_user_id?: string | null
          contract_id: string
          created_at?: string
          id?: string
          kind: string
          payload?: Json
        }
        Update: {
          actor_name?: string | null
          actor_user_id?: string | null
          contract_id?: string
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "contract_activity_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_balance"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "contract_activity_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
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
      cost_categories: {
        Row: {
          active: boolean
          code: string
          group_code: string
          group_name: string
          kind: string
          name: string
          sort: number
        }
        Insert: {
          active?: boolean
          code: string
          group_code: string
          group_name: string
          kind?: string
          name: string
          sort?: number
        }
        Update: {
          active?: boolean
          code?: string
          group_code?: string
          group_name?: string
          kind?: string
          name?: string
          sort?: number
        }
        Relationships: []
      }
      cost_invoice_alerts: {
        Row: {
          invoice_id: string
          sent_at: string
          type: string
        }
        Insert: {
          invoice_id: string
          sent_at?: string
          type: string
        }
        Update: {
          invoice_id?: string
          sent_at?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_invoice_alerts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "cost_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_invoice_events: {
        Row: {
          action: string
          created_at: string
          details: Json
          id: string
          invoice_id: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json
          id?: string
          invoice_id: string
          user_id?: string
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json
          id?: string
          invoice_id?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_invoice_events_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "cost_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_invoice_lines: {
        Row: {
          category_code: string | null
          description: string | null
          id: string
          invoice_id: string
          location_id: string | null
          net: number | null
          sort: number
          vat_amount: number | null
          vat_rate: number | null
        }
        Insert: {
          category_code?: string | null
          description?: string | null
          id?: string
          invoice_id: string
          location_id?: string | null
          net?: number | null
          sort?: number
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Update: {
          category_code?: string | null
          description?: string | null
          id?: string
          invoice_id?: string
          location_id?: string | null
          net?: number | null
          sort?: number
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_invoice_lines_category_code_fkey"
            columns: ["category_code"]
            isOneToOne: false
            referencedRelation: "cost_categories"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "cost_invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "cost_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_invoice_lines_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_invoices: {
        Row: {
          atcud: string | null
          classified_at: string | null
          classified_by: string | null
          classified_by_name: string | null
          created_at: string
          created_by: string
          created_by_name: string | null
          currency: string
          due_date: string | null
          duplicate_of: string | null
          extraction_confidence: Json | null
          extraction_source: string | null
          file_hash: string
          file_name: string
          file_path: string
          file_type: string
          id: string
          invoice_date: string | null
          invoice_number: string | null
          moloni_document_id: number | null
          moloni_document_number: string | null
          moloni_sent_at: string | null
          moloni_status: string
          notes: string | null
          paid_at: string | null
          paid_by: string | null
          status: string
          supplier_id: string | null
          supplier_name: string | null
          supplier_nif: string | null
          total_gross: number | null
          total_net: number | null
          total_vat: number | null
          updated_at: string
        }
        Insert: {
          atcud?: string | null
          classified_at?: string | null
          classified_by?: string | null
          classified_by_name?: string | null
          created_at?: string
          created_by?: string
          created_by_name?: string | null
          currency?: string
          due_date?: string | null
          duplicate_of?: string | null
          extraction_confidence?: Json | null
          extraction_source?: string | null
          file_hash: string
          file_name: string
          file_path: string
          file_type: string
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          moloni_document_id?: number | null
          moloni_document_number?: string | null
          moloni_sent_at?: string | null
          moloni_status?: string
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          status?: string
          supplier_id?: string | null
          supplier_name?: string | null
          supplier_nif?: string | null
          total_gross?: number | null
          total_net?: number | null
          total_vat?: number | null
          updated_at?: string
        }
        Update: {
          atcud?: string | null
          classified_at?: string | null
          classified_by?: string | null
          classified_by_name?: string | null
          created_at?: string
          created_by?: string
          created_by_name?: string | null
          currency?: string
          due_date?: string | null
          duplicate_of?: string | null
          extraction_confidence?: Json | null
          extraction_source?: string | null
          file_hash?: string
          file_name?: string
          file_path?: string
          file_type?: string
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          moloni_document_id?: number | null
          moloni_document_number?: string | null
          moloni_sent_at?: string | null
          moloni_status?: string
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          status?: string
          supplier_id?: string | null
          supplier_name?: string | null
          supplier_nif?: string | null
          total_gross?: number | null
          total_net?: number | null
          total_vat?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_invoices_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "cost_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      extra_charges: {
        Row: {
          amount: number | null
          contract_id: string
          created_at: string
          created_by: string | null
          created_by_name: string | null
          custom_name: string | null
          description: string | null
          due_date: string
          id: string
          moloni_document_id: number | null
          moloni_document_number: string | null
          notes: string | null
          quantity: number
          request_id: string | null
          resident_id: string | null
          service_id: string | null
          status: string
          unit_label: string | null
          unit_price: number
          vat_rate: number | null
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
          voided_by_name: string | null
        }
        Insert: {
          amount?: number | null
          contract_id: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          custom_name?: string | null
          description?: string | null
          due_date: string
          id?: string
          moloni_document_id?: number | null
          moloni_document_number?: string | null
          notes?: string | null
          quantity?: number
          request_id?: string | null
          resident_id?: string | null
          service_id?: string | null
          status?: string
          unit_label?: string | null
          unit_price?: number
          vat_rate?: number | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          voided_by_name?: string | null
        }
        Update: {
          amount?: number | null
          contract_id?: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          custom_name?: string | null
          description?: string | null
          due_date?: string
          id?: string
          moloni_document_id?: number | null
          moloni_document_number?: string | null
          notes?: string | null
          quantity?: number
          request_id?: string | null
          resident_id?: string | null
          service_id?: string | null
          status?: string
          unit_label?: string | null
          unit_price?: number
          vat_rate?: number | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          voided_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extra_charges_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_balance"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "extra_charges_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extra_charges_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extra_charges_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "service_catalog"
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
      lead_documents: {
        Row: {
          file_name: string
          file_type: string | null
          id: string
          kind: string | null
          lead_id: string
          storage_path: string
          uploaded_at: string
        }
        Insert: {
          file_name: string
          file_type?: string | null
          id?: string
          kind?: string | null
          lead_id: string
          storage_path: string
          uploaded_at?: string
        }
        Update: {
          file_name?: string
          file_type?: string | null
          id?: string
          kind?: string | null
          lead_id?: string
          storage_path?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_documents_lead_id_fkey"
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
          candidate_comments: string | null
          city: string | null
          contract_generated_at: string | null
          contract_id: string | null
          contract_signed_at: string | null
          course: string | null
          course_duration: string | null
          created_at: string
          date_of_birth: string | null
          docs_received_at: string | null
          docs_request_items: string[] | null
          docs_request_message: string | null
          docs_requested_at: string | null
          docs_review_email_sent_at: string | null
          docs_validated_at: string | null
          docs_validated_by: string | null
          document_number: string | null
          document_type: string | null
          document_validity: string | null
          draft_deposit_due: number | null
          draft_payment_day: number | null
          draft_rent_amount: number | null
          email: string
          emergency_contact_email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relation: string | null
          employer_or_school: string | null
          external_ref: string | null
          form_review_email_sent_at: string | null
          form_sent_at: string | null
          form_submitted_at: string | null
          full_name: string
          gdpr_consent: boolean
          gender: string | null
          id: string
          job_title: string | null
          language: string | null
          lost_reason: string | null
          nationality: string | null
          next_action: string | null
          next_action_date: string | null
          notes: string | null
          phone: string | null
          planned_check_in: string | null
          planned_check_out: string | null
          postal_code: string | null
          preferred_move_in: string | null
          preferred_room_type: string | null
          profile: string | null
          profile_other: string | null
          public_token: string | null
          public_token_expires_at: string | null
          reservation_agreement_generated_at: string | null
          reservation_deadline: string | null
          reservation_fee_amount: number | null
          reservation_not_applicable: boolean
          reservation_waiver_at: string | null
          reservation_waiver_by: string | null
          reservation_waiver_reason: string | null
          room_id: string | null
          short_name: string | null
          source: Database["public"]["Enums"]["lead_source"]
          source_detail: string | null
          status: Database["public"]["Enums"]["lead_status"]
          status_changed_at: string | null
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
          candidate_comments?: string | null
          city?: string | null
          contract_generated_at?: string | null
          contract_id?: string | null
          contract_signed_at?: string | null
          course?: string | null
          course_duration?: string | null
          created_at?: string
          date_of_birth?: string | null
          docs_received_at?: string | null
          docs_request_items?: string[] | null
          docs_request_message?: string | null
          docs_requested_at?: string | null
          docs_review_email_sent_at?: string | null
          docs_validated_at?: string | null
          docs_validated_by?: string | null
          document_number?: string | null
          document_type?: string | null
          document_validity?: string | null
          draft_deposit_due?: number | null
          draft_payment_day?: number | null
          draft_rent_amount?: number | null
          email: string
          emergency_contact_email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          employer_or_school?: string | null
          external_ref?: string | null
          form_review_email_sent_at?: string | null
          form_sent_at?: string | null
          form_submitted_at?: string | null
          full_name: string
          gdpr_consent?: boolean
          gender?: string | null
          id?: string
          job_title?: string | null
          language?: string | null
          lost_reason?: string | null
          nationality?: string | null
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          phone?: string | null
          planned_check_in?: string | null
          planned_check_out?: string | null
          postal_code?: string | null
          preferred_move_in?: string | null
          preferred_room_type?: string | null
          profile?: string | null
          profile_other?: string | null
          public_token?: string | null
          public_token_expires_at?: string | null
          reservation_agreement_generated_at?: string | null
          reservation_deadline?: string | null
          reservation_fee_amount?: number | null
          reservation_not_applicable?: boolean
          reservation_waiver_at?: string | null
          reservation_waiver_by?: string | null
          reservation_waiver_reason?: string | null
          room_id?: string | null
          short_name?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          source_detail?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          status_changed_at?: string | null
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
          candidate_comments?: string | null
          city?: string | null
          contract_generated_at?: string | null
          contract_id?: string | null
          contract_signed_at?: string | null
          course?: string | null
          course_duration?: string | null
          created_at?: string
          date_of_birth?: string | null
          docs_received_at?: string | null
          docs_request_items?: string[] | null
          docs_request_message?: string | null
          docs_requested_at?: string | null
          docs_review_email_sent_at?: string | null
          docs_validated_at?: string | null
          docs_validated_by?: string | null
          document_number?: string | null
          document_type?: string | null
          document_validity?: string | null
          draft_deposit_due?: number | null
          draft_payment_day?: number | null
          draft_rent_amount?: number | null
          email?: string
          emergency_contact_email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          employer_or_school?: string | null
          external_ref?: string | null
          form_review_email_sent_at?: string | null
          form_sent_at?: string | null
          form_submitted_at?: string | null
          full_name?: string
          gdpr_consent?: boolean
          gender?: string | null
          id?: string
          job_title?: string | null
          language?: string | null
          lost_reason?: string | null
          nationality?: string | null
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          phone?: string | null
          planned_check_in?: string | null
          planned_check_out?: string | null
          postal_code?: string | null
          preferred_move_in?: string | null
          preferred_room_type?: string | null
          profile?: string | null
          profile_other?: string | null
          public_token?: string | null
          public_token_expires_at?: string | null
          reservation_agreement_generated_at?: string | null
          reservation_deadline?: string | null
          reservation_fee_amount?: number | null
          reservation_not_applicable?: boolean
          reservation_waiver_at?: string | null
          reservation_waiver_by?: string | null
          reservation_waiver_reason?: string | null
          room_id?: string | null
          short_name?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          source_detail?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          status_changed_at?: string | null
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
            foreignKeyName: "leads_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
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
          code: string | null
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
          code?: string | null
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
          code?: string | null
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
      moloni_credentials: {
        Row: {
          access_token: string | null
          account_email: string | null
          company_id: number | null
          company_name: string | null
          created_at: string
          expires_at: string | null
          id: string
          last_connected_at: string | null
          refresh_token: string | null
          singleton: boolean
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          account_email?: string | null
          company_id?: number | null
          company_name?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          last_connected_at?: string | null
          refresh_token?: string | null
          singleton?: boolean
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          account_email?: string | null
          company_id?: number | null
          company_name?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          last_connected_at?: string | null
          refresh_token?: string | null
          singleton?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      moloni_sync_log: {
        Row: {
          action: string
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          message: string | null
          payload: Json
          success: boolean
        }
        Insert: {
          action: string
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          message?: string | null
          payload?: Json
          success?: boolean
        }
        Update: {
          action?: string
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          message?: string | null
          payload?: Json
          success?: boolean
        }
        Relationships: []
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
          contract_id: string | null
          created_at: string
          extra_charge_id: string | null
          id: string
          kind: Database["public"]["Enums"]["payment_kind"]
          lead_id: string | null
          method: Database["public"]["Enums"]["payment_method"] | null
          notes: string | null
          paid_at: string
          reference: string | null
          rent_charge_id: string | null
          source: string
          status: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
          voided_by_name: string | null
        }
        Insert: {
          amount: number
          contract_id?: string | null
          created_at?: string
          extra_charge_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["payment_kind"]
          lead_id?: string | null
          method?: Database["public"]["Enums"]["payment_method"] | null
          notes?: string | null
          paid_at?: string
          reference?: string | null
          rent_charge_id?: string | null
          source?: string
          status?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          voided_by_name?: string | null
        }
        Update: {
          amount?: number
          contract_id?: string | null
          created_at?: string
          extra_charge_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["payment_kind"]
          lead_id?: string | null
          method?: Database["public"]["Enums"]["payment_method"] | null
          notes?: string | null
          paid_at?: string
          reference?: string | null
          rent_charge_id?: string | null
          source?: string
          status?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          voided_by_name?: string | null
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
            foreignKeyName: "payments_extra_charge_id_fkey"
            columns: ["extra_charge_id"]
            isOneToOne: false
            referencedRelation: "extra_charge_balance"
            referencedColumns: ["extra_charge_id"]
          },
          {
            foreignKeyName: "payments_extra_charge_id_fkey"
            columns: ["extra_charge_id"]
            isOneToOne: false
            referencedRelation: "extra_charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
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
          moloni_customer_record_id: string | null
          moloni_document_id: number | null
          moloni_document_number: string | null
          moloni_issued_at: string | null
          moloni_paid_synced_at: string | null
          moloni_status: string | null
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
          moloni_customer_record_id?: string | null
          moloni_document_id?: number | null
          moloni_document_number?: string | null
          moloni_issued_at?: string | null
          moloni_paid_synced_at?: string | null
          moloni_status?: string | null
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
          moloni_customer_record_id?: string | null
          moloni_document_id?: number | null
          moloni_document_number?: string | null
          moloni_issued_at?: string | null
          moloni_paid_synced_at?: string | null
          moloni_status?: string | null
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
          {
            foreignKeyName: "rent_charges_moloni_customer_record_id_fkey"
            columns: ["moloni_customer_record_id"]
            isOneToOne: false
            referencedRelation: "resident_moloni_customers"
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
      resident_documents: {
        Row: {
          file_name: string
          file_type: string | null
          id: string
          kind: string
          notes: string | null
          resident_id: string
          storage_path: string
          uploaded_at: string
          uploaded_by: string | null
          uploaded_by_name: string | null
        }
        Insert: {
          file_name: string
          file_type?: string | null
          id?: string
          kind?: string
          notes?: string | null
          resident_id: string
          storage_path: string
          uploaded_at?: string
          uploaded_by?: string | null
          uploaded_by_name?: string | null
        }
        Update: {
          file_name?: string
          file_type?: string | null
          id?: string
          kind?: string
          notes?: string | null
          resident_id?: string
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string | null
          uploaded_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resident_documents_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      resident_internal_notes: {
        Row: {
          notes: string | null
          resident_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          notes?: string | null
          resident_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          notes?: string | null
          resident_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resident_internal_notes_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: true
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      resident_moloni_customers: {
        Row: {
          active_from: string
          address: string | null
          archived_at: string | null
          city: string | null
          created_at: string
          created_by: string | null
          created_by_name: string | null
          customer_number: string | null
          id: string
          moloni_customer_id: number
          name: string | null
          resident_id: string
          status: string
          suspended_in_moloni_at: string | null
          suspended_marked_by: string | null
          suspended_marked_by_name: string | null
          valid_from: string
          vat: string | null
          zip_code: string | null
        }
        Insert: {
          active_from?: string
          address?: string | null
          archived_at?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          customer_number?: string | null
          id?: string
          moloni_customer_id: number
          name?: string | null
          resident_id: string
          status?: string
          suspended_in_moloni_at?: string | null
          suspended_marked_by?: string | null
          suspended_marked_by_name?: string | null
          valid_from?: string
          vat?: string | null
          zip_code?: string | null
        }
        Update: {
          active_from?: string
          address?: string | null
          archived_at?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          customer_number?: string | null
          id?: string
          moloni_customer_id?: number
          name?: string | null
          resident_id?: string
          status?: string
          suspended_in_moloni_at?: string | null
          suspended_marked_by?: string | null
          suspended_marked_by_name?: string | null
          valid_from?: string
          vat?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resident_moloni_customers_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
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
          city: string | null
          code: string | null
          course: string | null
          course_duration: string | null
          created_at: string
          date_of_birth: string | null
          document_number: string | null
          document_type: string | null
          document_validity: string | null
          email: string
          emergency_contact_email: string | null
          emergency_contact_invoice_copy: boolean
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relation: string | null
          employer_or_school: string | null
          expected_arrival_date: string | null
          full_name: string
          gender: string | null
          id: string
          internal_notes: string | null
          job_title: string | null
          moloni_customer_id: number | null
          moloni_synced_at: string | null
          move_in: string | null
          move_out: string | null
          nationality: string | null
          phone: string | null
          postal_code: string | null
          profile: string | null
          room_id: string | null
          short_name: string | null
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
          city?: string | null
          code?: string | null
          course?: string | null
          course_duration?: string | null
          created_at?: string
          date_of_birth?: string | null
          document_number?: string | null
          document_type?: string | null
          document_validity?: string | null
          email: string
          emergency_contact_email?: string | null
          emergency_contact_invoice_copy?: boolean
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          employer_or_school?: string | null
          expected_arrival_date?: string | null
          full_name: string
          gender?: string | null
          id?: string
          internal_notes?: string | null
          job_title?: string | null
          moloni_customer_id?: number | null
          moloni_synced_at?: string | null
          move_in?: string | null
          move_out?: string | null
          nationality?: string | null
          phone?: string | null
          postal_code?: string | null
          profile?: string | null
          room_id?: string | null
          short_name?: string | null
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
          city?: string | null
          code?: string | null
          course?: string | null
          course_duration?: string | null
          created_at?: string
          date_of_birth?: string | null
          document_number?: string | null
          document_type?: string | null
          document_validity?: string | null
          email?: string
          emergency_contact_email?: string | null
          emergency_contact_invoice_copy?: boolean
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          employer_or_school?: string | null
          expected_arrival_date?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          internal_notes?: string | null
          job_title?: string | null
          moloni_customer_id?: number | null
          moloni_synced_at?: string | null
          move_in?: string | null
          move_out?: string | null
          nationality?: string | null
          phone?: string | null
          postal_code?: string | null
          profile?: string | null
          room_id?: string | null
          short_name?: string | null
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
      service_catalog: {
        Row: {
          active: boolean
          code: string
          created_at: string
          default_price: number
          description: string | null
          id: string
          name: string
          sort_order: number
          unit_label: string
          updated_at: string
          vat_rate: number | null
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          default_price?: number
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          unit_label?: string
          updated_at?: string
          vat_rate?: number | null
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          default_price?: number
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          unit_label?: string
          updated_at?: string
          vat_rate?: number | null
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
          expected_check_in: string | null
          full_name: string
          id: string
          lead_id: string | null
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
          expected_check_in?: string | null
          full_name: string
          id?: string
          lead_id?: string | null
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
          expected_check_in?: string | null
          full_name?: string
          id?: string
          lead_id?: string | null
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
          {
            foreignKeyName: "stays_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
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
          default_category_code: string | null
          default_location_id: string | null
          default_vat_rate: number | null
          email: string | null
          id: string
          name: string
          nif: string | null
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
          default_category_code?: string | null
          default_location_id?: string | null
          default_vat_rate?: number | null
          email?: string | null
          id?: string
          name: string
          nif?: string | null
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
          default_category_code?: string | null
          default_location_id?: string | null
          default_vat_rate?: number | null
          email?: string | null
          id?: string
          name?: string
          nif?: string | null
          notes?: string | null
          phone?: string | null
          tags?: string[]
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_default_category_code_fkey"
            columns: ["default_category_code"]
            isOneToOne: false
            referencedRelation: "cost_categories"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "suppliers_default_location_id_fkey"
            columns: ["default_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
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
      contract_ledger: {
        Row: {
          contract_id: string | null
          counts_in_balance: boolean | null
          created_at: string | null
          credit: number | null
          debit: number | null
          description: string | null
          entry_date: string | null
          extra_charge_id: string | null
          kind: string | null
          method: string | null
          moloni_document_id: number | null
          moloni_document_number: string | null
          outstanding: number | null
          paid: number | null
          payment_state: string | null
          reference: string | null
          rent_charge_id: string | null
          resident_id: string | null
          running_balance: number | null
          source: string | null
          source_id: string | null
          status: string | null
          void_reason: string | null
          voided_at: string | null
          voided_by_name: string | null
        }
        Relationships: []
      }
      extra_charge_balance: {
        Row: {
          amount: number | null
          extra_charge_id: string | null
          outstanding: number | null
          paid: number | null
          payment_state: string | null
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
      approve_profile: {
        Args: { p_resident_id: string; p_user_id: string }
        Returns: undefined
      }
      cancel_room_reservation: { Args: { p_lead_id: string }; Returns: string }
      compensation_months: {
        Args: { p_end: string; p_start: string }
        Returns: number
      }
      compute_rent_for_month: {
        Args: { p_contract_id: string; p_month: number; p_year: number }
        Returns: Record<string, unknown>
      }
      compute_short_name: { Args: { p_full_name: string }; Returns: string }
      create_extra_charge: {
        Args: {
          p_contract_id: string
          p_custom_name: string
          p_description: string
          p_due_date: string
          p_method: Database["public"]["Enums"]["payment_method"]
          p_notes: string
          p_paid_at: string
          p_pay_now: boolean
          p_quantity: number
          p_reference: string
          p_service_id: string
          p_unit_price: number
        }
        Returns: string
      }
      current_resident_id: { Args: never; Returns: string }
      evaluate_lead_won: { Args: { p_lead_id: string }; Returns: boolean }
      generate_cleaning_instances: {
        Args: { p_count?: number; p_schedule_id: string }
        Returns: number
      }
      generate_cost_alerts: { Args: never; Returns: number }
      generate_document_expiry_alerts: { Args: never; Returns: number }
      generate_finance_alerts: { Args: never; Returns: number }
      generate_lead_form_token: {
        Args: { p_lead_id: string }
        Returns: {
          expires_at: string
          token: string
        }[]
      }
      generate_rent_charges: {
        Args: { p_contract_id: string }
        Returns: number
      }
      get_lead_docs_request: {
        Args: { p_token: string }
        Returns: {
          first_name: string
          items: string[]
          language: string
          message: string
          profile: string
          received_at: string
          requested_at: string
        }[]
      }
      get_lead_form_data: {
        Args: { p_token: string }
        Returns: {
          address: string
          candidate_comments: string
          city: string
          course: string
          course_duration: string
          date_of_birth: string
          document_number: string
          document_type: string
          document_validity: string
          email: string
          emergency_contact_email: string
          emergency_contact_name: string
          emergency_contact_phone: string
          emergency_contact_relation: string
          employer_or_school: string
          form_submitted_at: string
          full_name: string
          gdpr_consent: boolean
          job_title: string
          language: string
          nationality: string
          phone: string
          postal_code: string
          profile: string
          tax_number: string
        }[]
      }
      give_up_lead: { Args: { p_lead_id: string }; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      lead_docs_status: { Args: { p_lead_id: string }; Returns: Json }
      lead_id_for_form_token: { Args: { p_token: string }; Returns: string }
      list_staff_users: {
        Args: never
        Returns: {
          email: string
          full_name: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }[]
      }
      promote_reservation_to_contract: {
        Args: { p_contract_data: Json; p_lead_id: string }
        Returns: Json
      }
      recalculate_rent_charges: {
        Args: { p_contract_id: string }
        Returns: Json
      }
      recompute_contract_deposits: {
        Args: { p_contract_id: string }
        Returns: undefined
      }
      register_deposit_payment: {
        Args: {
          p_amount: number
          p_contract_id: string
          p_kind: string
          p_method: string
          p_paid_at: string
          p_reference?: string
        }
        Returns: string
      }
      register_lead_document: {
        Args: {
          p_file_name: string
          p_file_type: string
          p_kind?: string
          p_storage_path: string
          p_token: string
        }
        Returns: string
      }
      reopen_cost_invoice: {
        Args: { p_expected_updated_at: string; p_id: string; p_reason: string }
        Returns: undefined
      }
      reserve_room_for_lead: {
        Args: {
          p_check_in: string
          p_check_out: string
          p_lead_id: string
          p_room_id: string
        }
        Returns: string
      }
      reserve_room_without_fee: {
        Args: { p_lead_id: string; p_reason: string }
        Returns: string
      }
      save_cost_invoice: {
        Args: {
          p_expected_updated_at: string
          p_header: Json
          p_id: string
          p_lines: Json
          p_status?: string
        }
        Returns: string
      }
      sign_lead_contract: {
        Args: { p_contract_data: Json; p_lead_id: string }
        Returns: Json
      }
      stay_daterange: { Args: { _in: string; _out: string }; Returns: unknown }
      submit_lead_documents: { Args: { p_token: string }; Returns: string }
      submit_lead_form: {
        Args: { p_data: Json; p_token: string }
        Returns: string
      }
      unvalidate_lead_docs: { Args: { p_lead_id: string }; Returns: undefined }
      valid_cost_extraction_confidence: {
        Args: { p_confidence: Json }
        Returns: boolean
      }
      valid_cost_file_path: { Args: { p_path: string }; Returns: boolean }
      validate_lead_docs: { Args: { p_lead_id: string }; Returns: string }
      validate_lead_documents: { Args: { p_lead_id: string }; Returns: string }
      void_extra_charge: {
        Args: { p_id: string; p_reason: string }
        Returns: undefined
      }
      void_payment: {
        Args: { p_payment_id: string; p_reason: string }
        Returns: undefined
      }
      waive_reservation_fee: {
        Args: { p_contract_id: string; p_lead_id: string; p_reason: string }
        Returns: undefined
      }
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
        | "reserved"
        | "won"
        | "lost"
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
        | "private_bathroom"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
        "reserved",
        "won",
        "lost",
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
        "private_bathroom",
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
