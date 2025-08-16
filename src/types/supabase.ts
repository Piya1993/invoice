// This file can be generated using `supabase gen types typescript --project-id <YOUR_PROJECT_ID> --schema public > src/types/supabase.ts`
// For now, we'll define the necessary types manually.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          logo_url: string | null
          address: string | null
          phone: string | null
          tax_id: string | null
          currency: string
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          logo_url?: string | null
          address?: string | null
          phone?: string | null
          tax_id?: string | null
          currency?: string
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          logo_url?: string | null
          address?: string | null
          phone?: string | null
          tax_id?: string | null
          currency?: string
          created_by?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          id: string
          company_id: string
          name: string
          email: string | null
          phone: string | null
          address: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          email?: string | null
          phone?: string | null
          address?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          email?: string | null
          phone?: string | null
          address?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          product_id: string | null
          title: string
          qty: number
          unit_price: number
          tax_rate: number
          discount: number
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          product_id?: string | null
          title: string
          qty: number
          unit_price: number
          tax_rate?: number
          discount?: number
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          product_id?: string | null
          title?: string
          qty?: number
          unit_price?: number
          tax_rate?: number
          discount?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          id: string
          company_id: string
          client_id: string
          number: string | null
          issue_date: string
          due_date: string
          status: Database["public"]["Enums"]["invoice_status"]
          currency: string
          notes: string | null
          terms: string | null
          subtotal: number
          tax_total: number
          discount_total: number
          total: number
          amount_paid: number
          amount_due: number
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          client_id: string
          number?: string | null
          issue_date: string
          due_date: string
          status?: Database["public"]["Enums"]["invoice_status"]
          currency: string
          notes?: string | null
          terms?: string | null
          subtotal: number
          tax_total: number
          discount_total: number
          total: number
          amount_paid?: number
          amount_due: number
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          client_id?: string
          number?: string | null
          issue_date?: string
          due_date?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          currency?: string
          notes?: string | null
          terms?: string | null
          subtotal?: number
          tax_total?: number
          discount_total?: number
          total?: number
          amount_paid?: number
          amount_due?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          id: string
          invoice_id: string
          date: string
          method: string
          amount: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          date: string
          method: string
          amount: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          date?: string
          method?: string
          amount?: number
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          id: string
          company_id: string
          name: string
          description: string | null
          unit: string | null
          default_price: number
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          description?: string | null
          unit?: string | null
          default_price: number
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          description?: string | null
          unit?: string | null
          default_price?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          company_id: string
          logo_url: string | null
          default_tax_rate: number
          default_currency: string
          numbering_prefix: string
          next_number: number
          locale: string
          timezone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          company_id: string
          logo_url?: string | null
          default_tax_rate?: number
          default_currency?: string
          numbering_prefix?: string
          next_number?: number
          locale?: string
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          logo_url?: string | null
          default_tax_rate?: number
          default_currency?: string
          numbering_prefix?: string
          next_number?: number
          locale?: string
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_company_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      invoice_status: "draft" | "sent" | "paid" | "overdue" | "void"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][PublicEnumNameOrOptions]
    : never