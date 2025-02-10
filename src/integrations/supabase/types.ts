export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      analysis_reports: {
        Row: {
          analysis_text: string
          created_at: string | null
          id: string
          import_id: string | null
          pdf_path: string
          updated_at: string | null
        }
        Insert: {
          analysis_text: string
          created_at?: string | null
          id?: string
          import_id?: string | null
          pdf_path: string
          updated_at?: string | null
        }
        Update: {
          analysis_text?: string
          created_at?: string | null
          id?: string
          import_id?: string | null
          pdf_path?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analysis_reports_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "imports"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      imports: {
        Row: {
          completed_count: number | null
          created_at: string | null
          id: string
          name: string
          total_count: number
        }
        Insert: {
          completed_count?: number | null
          created_at?: string | null
          id?: string
          name: string
          total_count: number
        }
        Update: {
          completed_count?: number | null
          created_at?: string | null
          id?: string
          name?: string
          total_count?: number
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category: string | null
          code: string
          created_at: string | null
          datetime: string
          id: string
          import_id: string | null
          notes: string | null
          recipient: string
          user_id: string | null
        }
        Insert: {
          amount: number
          category?: string | null
          code: string
          created_at?: string | null
          datetime: string
          id?: string
          import_id?: string | null
          notes?: string | null
          recipient: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          code?: string
          created_at?: string | null
          datetime?: string
          id?: string
          import_id?: string | null
          notes?: string | null
          recipient?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "imports"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      transaction_category:
        | "FOOD_AND_DINING"
        | "TRANSPORTATION"
        | "SHOPPING"
        | "BILLS_AND_UTILITIES"
        | "ENTERTAINMENT"
        | "HEALTHCARE"
        | "OTHERS"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
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
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
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
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
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
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
