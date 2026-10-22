export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: string;
          home_state: string;
          income_style: string;
          primary_focus: string;
          mileage_mode: string;
          reserve_percent: number;
          active_plan: string;
          onboarding_complete: boolean;
          avatar_url: string | null;
          billing_setup_complete: boolean;
          payment_method_status: string;
          stripe_customer_id: string | null;
          stripe_default_payment_method_id: string | null;
          subscription_product_id: string | null;
          subscription_status: string;
          subscription_store: string | null;
          trial_started_at: string;
          trial_ends_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string;
          role?: string;
          home_state?: string;
          income_style?: string;
          primary_focus?: string;
          mileage_mode?: string;
          reserve_percent?: number;
          active_plan?: string;
          onboarding_complete?: boolean;
          avatar_url?: string | null;
          billing_setup_complete?: boolean;
          payment_method_status?: string;
          stripe_customer_id?: string | null;
          stripe_default_payment_method_id?: string | null;
          subscription_product_id?: string | null;
          subscription_status?: string;
          subscription_store?: string | null;
          trial_started_at?: string;
          trial_ends_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string;
          role?: string;
          home_state?: string;
          income_style?: string;
          primary_focus?: string;
          mileage_mode?: string;
          reserve_percent?: number;
          active_plan?: string;
          onboarding_complete?: boolean;
          avatar_url?: string | null;
          billing_setup_complete?: boolean;
          payment_method_status?: string;
          stripe_customer_id?: string | null;
          stripe_default_payment_method_id?: string | null;
          subscription_product_id?: string | null;
          subscription_status?: string;
          subscription_store?: string | null;
          trial_started_at?: string;
          trial_ends_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      connected_accounts: {
        Row: {
          id: string;
          user_id: string;
          provider: string;
          institution_name: string;
          external_account_id: string;
          status: string;
          read_only: boolean;
          last_synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider: string;
          institution_name: string;
          external_account_id: string;
          status?: string;
          read_only?: boolean;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          provider?: string;
          institution_name?: string;
          external_account_id?: string;
          status?: string;
          read_only?: boolean;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      receipts: {
        Row: {
          id: string;
          user_id: string;
          vendor: string;
          amount: number;
          currency_code: string;
          category: string;
          ocr_confidence: number | null;
          status: string;
          storage_path: string | null;
          note: string;
          captured_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          vendor: string;
          amount: number;
          currency_code?: string;
          category: string;
          ocr_confidence?: number | null;
          status?: string;
          storage_path?: string | null;
          note?: string;
          captured_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          vendor?: string;
          amount?: number;
          currency_code?: string;
          category?: string;
          ocr_confidence?: number | null;
          status?: string;
          storage_path?: string | null;
          note?: string;
          captured_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          connected_account_id: string | null;
          receipt_id: string | null;
          external_id: string | null;
          merchant: string;
          amount: number;
          currency_code: string;
          kind: string;
          category: string;
          deductible: boolean;
          source: string;
          sync_status: string;
          note: string;
          occurred_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          connected_account_id?: string | null;
          receipt_id?: string | null;
          external_id?: string | null;
          merchant: string;
          amount: number;
          currency_code?: string;
          kind: string;
          category: string;
          deductible?: boolean;
          source: string;
          sync_status?: string;
          note?: string;
          occurred_at: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          connected_account_id?: string | null;
          receipt_id?: string | null;
          external_id?: string | null;
          merchant?: string;
          amount?: number;
          currency_code?: string;
          kind?: string;
          category?: string;
          deductible?: boolean;
          source?: string;
          sync_status?: string;
          note?: string;
          occurred_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      mileage_trips: {
        Row: {
          id: string;
          user_id: string;
          start_label: string;
          end_label: string;
          miles: number;
          purpose: string;
          classification: string;
          occurred_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          start_label: string;
          end_label: string;
          miles: number;
          purpose?: string;
          classification?: string;
          occurred_at: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          start_label?: string;
          end_label?: string;
          miles?: number;
          purpose?: string;
          classification?: string;
          occurred_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      quarter_snapshots: {
        Row: {
          id: string;
          user_id: string;
          tax_year: number;
          label: string;
          due_date: string;
          amount_due: number;
          reserve_target: number;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          tax_year: number;
          label: string;
          due_date: string;
          amount_due?: number;
          reserve_target?: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          tax_year?: number;
          label?: string;
          due_date?: string;
          amount_due?: number;
          reserve_target?: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      audit_events: {
        Row: {
          id: number;
          user_id: string | null;
          actor: string;
          event_type: string;
          entity_type: string;
          entity_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: never;
          user_id?: string | null;
          actor?: string;
          event_type: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          user_id?: string | null;
          actor?: string;
          event_type?: string;
          entity_type?: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
