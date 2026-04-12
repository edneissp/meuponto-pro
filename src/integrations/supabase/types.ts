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
      admin_notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read_at: string | null
          reference_id: string | null
          status: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read_at?: string | null
          reference_id?: string | null
          status?: string
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read_at?: string | null
          reference_id?: string | null
          status?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      alerts: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          product_id: string | null
          tenant_id: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          product_id?: string | null
          tenant_id: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          product_id?: string | null
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          module: string
          new_data: Json | null
          old_data: Json | null
          reference_id: string | null
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          module: string
          new_data?: Json | null
          old_data?: Json | null
          reference_id?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          module?: string
          new_data?: Json | null
          old_data?: Json | null
          reference_id?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_webhook_events: {
        Row: {
          created_at: string
          event_id: string
          event_type: string | null
          gateway: string
          id: string
          invoice_id: string | null
          payload: Json
          processed_at: string | null
          subscription_id: string | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          event_type?: string | null
          gateway: string
          id?: string
          invoice_id?: string | null
          payload?: Json
          processed_at?: string | null
          subscription_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          event_type?: string | null
          gateway?: string
          id?: string
          invoice_id?: string | null
          payload?: Json
          processed_at?: string | null
          subscription_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_webhook_events_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_webhook_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_webhook_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_webhook_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_redemptions: {
        Row: {
          campaign_id: string | null
          coupon_id: string
          created_at: string
          discount_applied: number
          final_price: number
          id: string
          original_price: number
          redeemed_at: string
          subscription_id: string | null
          tenant_id: string
        }
        Insert: {
          campaign_id?: string | null
          coupon_id: string
          created_at?: string
          discount_applied?: number
          final_price?: number
          id?: string
          original_price?: number
          redeemed_at?: string
          subscription_id?: string | null
          tenant_id: string
        }
        Update: {
          campaign_id?: string | null
          coupon_id?: string
          created_at?: string
          discount_applied?: number
          final_price?: number
          id?: string
          original_price?: number
          redeemed_at?: string
          subscription_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "discount_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "discount_coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          id: string
          name: string
          phone: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_campaigns: {
        Row: {
          created_at: string
          currency: string
          current_users: number
          description: string | null
          discount_price: number
          duration_days: number
          ends_at: string | null
          id: string
          max_users: number
          name: string
          normal_price: number
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          current_users?: number
          description?: string | null
          discount_price?: number
          duration_days?: number
          ends_at?: string | null
          id?: string
          max_users?: number
          name: string
          normal_price?: number
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          current_users?: number
          description?: string | null
          discount_price?: number
          duration_days?: number
          ends_at?: string | null
          id?: string
          max_users?: number
          name?: string
          normal_price?: number
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      discount_coupons: {
        Row: {
          campaign_id: string | null
          code: string
          created_at: string
          currency: string
          expires_at: string | null
          id: string
          status: string
          type: string
          updated_at: string
          usage_limit: number
          used_count: number
          value: number
        }
        Insert: {
          campaign_id?: string | null
          code: string
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          status?: string
          type?: string
          updated_at?: string
          usage_limit?: number
          used_count?: number
          value?: number
        }
        Update: {
          campaign_id?: string | null
          code?: string
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          status?: string
          type?: string
          updated_at?: string
          usage_limit?: number
          used_count?: number
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "discount_coupons_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "discount_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          description: string
          due_date: string | null
          id: string
          paid: boolean
          paid_at: string | null
          supplier_id: string | null
          tenant_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          description: string
          due_date?: string | null
          id?: string
          paid?: boolean
          paid_at?: string | null
          supplier_id?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          paid?: boolean
          paid_at?: string | null
          supplier_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fiado_payments: {
        Row: {
          amount: number
          created_at: string
          fiado_id: string
          id: string
          notes: string | null
          paid_at: string
          tenant_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          fiado_id: string
          id?: string
          notes?: string | null
          paid_at?: string
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          fiado_id?: string
          id?: string
          notes?: string | null
          paid_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fiado_payments_fiado_id_fkey"
            columns: ["fiado_id"]
            isOneToOne: false
            referencedRelation: "fiados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiado_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiado_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fiados: {
        Row: {
          amount: number
          created_at: string
          customer_id: string
          id: string
          notes: string | null
          paid: boolean
          paid_amount: number
          paid_at: string | null
          sale_id: string | null
          tenant_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id: string
          id?: string
          notes?: string | null
          paid?: boolean
          paid_amount?: number
          paid_at?: string | null
          sale_id?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string
          id?: string
          notes?: string | null
          paid?: boolean
          paid_amount?: number
          paid_at?: string | null
          sale_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fiados_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiados_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiados_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiados_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          currency: string
          download_url: string | null
          due_date: string
          gateway_event_id: string | null
          gateway_payment_id: string | null
          id: string
          invoice_number: string
          invoice_url: string | null
          last_retry_at: string | null
          metadata: Json
          next_retry_at: string | null
          paid_at: string | null
          payment_gateway: string
          retry_count: number
          status: string
          subscription_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          download_url?: string | null
          due_date: string
          gateway_event_id?: string | null
          gateway_payment_id?: string | null
          id?: string
          invoice_number: string
          invoice_url?: string | null
          last_retry_at?: string | null
          metadata?: Json
          next_retry_at?: string | null
          paid_at?: string | null
          payment_gateway: string
          retry_count?: number
          status?: string
          subscription_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          download_url?: string | null
          due_date?: string
          gateway_event_id?: string | null
          gateway_payment_id?: string | null
          id?: string
          invoice_number?: string
          invoice_url?: string | null
          last_retry_at?: string | null
          metadata?: Json
          next_retry_at?: string | null
          paid_at?: string | null
          payment_gateway?: string
          retry_count?: number
          status?: string
          subscription_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          business_name: string
          created_at: string
          email: string
          id: string
          name: string
          whatsapp: string
        }
        Insert: {
          business_name: string
          created_at?: string
          email: string
          id?: string
          name: string
          whatsapp: string
        }
        Update: {
          business_name?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          whatsapp?: string
        }
        Relationships: []
      }
      optional_groups: {
        Row: {
          created_at: string
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "optional_groups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "optional_groups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      optionals: {
        Row: {
          created_at: string
          group_id: string
          id: string
          name: string
          price: number
          tenant_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          name: string
          price?: number
          tenant_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          name?: string
          price?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "optionals_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "optional_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "optionals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "optionals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          tenant_id: string
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          tenant_id: string
          total: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          tenant_id?: string
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          discount: number
          id: string
          notes: string | null
          order_number: number
          public_token: string
          source: string
          status: string
          subtotal: number
          table_id: string | null
          table_number: string | null
          tenant_id: string
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number
          id?: string
          notes?: string | null
          order_number?: number
          public_token?: string
          source?: string
          status?: string
          subtotal?: number
          table_id?: string | null
          table_number?: string | null
          tenant_id: string
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number
          id?: string
          notes?: string | null
          order_number?: number
          public_token?: string
          source?: string
          status?: string
          subtotal?: number
          table_id?: string | null
          table_number?: string | null
          tenant_id?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          mercado_pago_payment_id: string | null
          mercado_pago_preference_id: string | null
          paid_at: string | null
          payment_method: string | null
          period_end: string
          period_start: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          mercado_pago_payment_id?: string | null
          mercado_pago_preference_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          period_end?: string
          period_start?: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          mercado_pago_payment_id?: string | null
          mercado_pago_preference_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          period_end?: string
          period_start?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_option_groups: {
        Row: {
          group_id: string
          id: string
          product_id: string
          tenant_id: string
        }
        Insert: {
          group_id: string
          id?: string
          product_id: string
          tenant_id: string
        }
        Update: {
          group_id?: string
          id?: string
          product_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_option_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "optional_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_option_groups_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_option_groups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_option_groups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          category_id: string | null
          created_at: string
          description: string | null
          expiry_date: string | null
          id: string
          image_url: string | null
          is_active: boolean
          min_stock: number
          name: string
          purchase_price: number
          sale_price: number
          stock_quantity: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          expiry_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          min_stock?: number
          name: string
          purchase_price?: number
          sale_price?: number
          stock_quantity?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          expiry_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          min_stock?: number
          name?: string
          purchase_price?: number
          sale_price?: number
          stock_quantity?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_item_optionals: {
        Row: {
          id: string
          name: string
          optional_id: string
          price: number
          sale_item_id: string
          tenant_id: string
        }
        Insert: {
          id?: string
          name: string
          optional_id: string
          price?: number
          sale_item_id: string
          tenant_id: string
        }
        Update: {
          id?: string
          name?: string
          optional_id?: string
          price?: number
          sale_item_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_item_optionals_optional_id_fkey"
            columns: ["optional_id"]
            isOneToOne: false
            referencedRelation: "optionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_item_optionals_sale_item_id_fkey"
            columns: ["sale_item_id"]
            isOneToOne: false
            referencedRelation: "sale_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_item_optionals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_item_optionals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          sale_id: string
          tenant_id: string
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          sale_id: string
          tenant_id: string
          total: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          sale_id?: string
          tenant_id?: string
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          created_at: string
          discount: number
          id: string
          payment_method: string
          status: string
          subtotal: number
          tax_amount: number
          tenant_id: string
          total: number
          user_id: string
        }
        Insert: {
          created_at?: string
          discount?: number
          id?: string
          payment_method: string
          status?: string
          subtotal?: number
          tax_amount?: number
          tenant_id: string
          total?: number
          user_id: string
        }
        Update: {
          created_at?: string
          discount?: number
          id?: string
          payment_method?: string
          status?: string
          subtotal?: number
          tax_amount?: number
          tenant_id?: string
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          product_id: string
          quantity: number
          tenant_id: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          product_id: string
          quantity: number
          tenant_id: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_cycle: string
          created_at: string
          currency: string
          customer_country: string | null
          customer_country_source: string | null
          customer_email: string | null
          gateway: string
          gateway_subscription_id: string | null
          id: string
          metadata: Json
          next_billing_date: string | null
          plan_name: string
          plan_price: number
          preferred_payment_method: string | null
          status: string
          tenant_id: string
          trial_end: string | null
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          created_at?: string
          currency?: string
          customer_country?: string | null
          customer_country_source?: string | null
          customer_email?: string | null
          gateway?: string
          gateway_subscription_id?: string | null
          id?: string
          metadata?: Json
          next_billing_date?: string | null
          plan_name: string
          plan_price?: number
          preferred_payment_method?: string | null
          status?: string
          tenant_id: string
          trial_end?: string | null
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          created_at?: string
          currency?: string
          customer_country?: string | null
          customer_country_source?: string | null
          customer_email?: string | null
          gateway?: string
          gateway_subscription_id?: string | null
          id?: string
          metadata?: Json
          next_billing_date?: string | null
          plan_name?: string
          plan_price?: number
          preferred_payment_method?: string | null
          status?: string
          tenant_id?: string
          trial_end?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_deliveries: {
        Row: {
          created_at: string
          delivery_date: string
          delivery_status: string
          expense_id: string | null
          id: string
          notes: string | null
          payment_date: string | null
          payment_status: string
          purchase_type: string
          supplier_id: string
          tenant_id: string
          total_amount: number
        }
        Insert: {
          created_at?: string
          delivery_date?: string
          delivery_status?: string
          expense_id?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_status?: string
          purchase_type?: string
          supplier_id: string
          tenant_id: string
          total_amount?: number
        }
        Update: {
          created_at?: string
          delivery_date?: string
          delivery_status?: string
          expense_id?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_status?: string
          purchase_type?: string
          supplier_id?: string
          tenant_id?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplier_deliveries_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_deliveries_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_deliveries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_deliveries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_delivery_items: {
        Row: {
          created_at: string
          delivery_id: string
          expiry_date: string | null
          id: string
          product_id: string
          quantity: number
          tenant_id: string
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          delivery_id: string
          expiry_date?: string | null
          id?: string
          product_id: string
          quantity?: number
          tenant_id: string
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          delivery_id?: string
          expiry_date?: string | null
          id?: string
          product_id?: string
          quantity?: number
          tenant_id?: string
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplier_delivery_items_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "supplier_deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_delivery_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_delivery_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_delivery_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_price_history: {
        Row: {
          id: string
          product_id: string
          recorded_at: string
          supplier_id: string
          tenant_id: string
          unit_price: number
        }
        Insert: {
          id?: string
          product_id: string
          recorded_at?: string
          supplier_id: string
          tenant_id: string
          unit_price: number
        }
        Update: {
          id?: string
          product_id?: string
          recorded_at?: string
          supplier_id?: string
          tenant_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplier_price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_price_history_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_price_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_price_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      system_errors: {
        Row: {
          created_at: string
          error_message: string
          id: string
          module: string
          severity: string
          stack_trace: string | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          error_message: string
          id?: string
          module: string
          severity?: string
          stack_trace?: string | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string
          id?: string
          module?: string
          severity?: string
          stack_trace?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_errors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_errors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tables: {
        Row: {
          capacity: number
          created_at: string
          id: string
          status: string
          table_name: string | null
          table_number: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          id?: string
          status?: string
          table_name?: string | null
          table_number: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          id?: string
          status?: string
          table_name?: string | null
          table_number?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tables_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tables_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          ativo: boolean
          billing_contact_email: string | null
          billing_country_code: string | null
          billing_country_source: string | null
          billing_currency: string | null
          billing_customer_name: string | null
          billing_detection_checked_at: string | null
          billing_gateway: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          delivery_fee: number
          delivery_fee_per_km: number
          free_delivery_radius_km: number
          id: string
          logo_url: string | null
          name: string
          origin: string
          pix_key: string | null
          plano: string
          primary_color: string | null
          public_slug: string
          store_lat: number | null
          store_lng: number | null
          subscription_status: string
          trial_end: string | null
          trial_start: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          ativo?: boolean
          billing_contact_email?: string | null
          billing_country_code?: string | null
          billing_country_source?: string | null
          billing_currency?: string | null
          billing_customer_name?: string | null
          billing_detection_checked_at?: string | null
          billing_gateway?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          delivery_fee?: number
          delivery_fee_per_km?: number
          free_delivery_radius_km?: number
          id?: string
          logo_url?: string | null
          name: string
          origin?: string
          pix_key?: string | null
          plano?: string
          primary_color?: string | null
          public_slug: string
          store_lat?: number | null
          store_lng?: number | null
          subscription_status?: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          ativo?: boolean
          billing_contact_email?: string | null
          billing_country_code?: string | null
          billing_country_source?: string | null
          billing_currency?: string | null
          billing_customer_name?: string | null
          billing_detection_checked_at?: string | null
          billing_gateway?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          delivery_fee?: number
          delivery_fee_per_km?: number
          free_delivery_radius_km?: number
          id?: string
          logo_url?: string | null
          name?: string
          origin?: string
          pix_key?: string | null
          plano?: string
          primary_color?: string | null
          public_slug?: string
          store_lat?: number | null
          store_lng?: number | null
          subscription_status?: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_tenants: {
        Row: {
          ativo: boolean | null
          delivery_fee: number | null
          delivery_fee_per_km: number | null
          free_delivery_radius_km: number | null
          id: string | null
          logo_url: string | null
          name: string | null
          pix_key: string | null
          primary_color: string | null
          public_slug: string | null
          store_lat: number | null
          store_lng: number | null
          whatsapp: string | null
        }
        Insert: {
          ativo?: boolean | null
          delivery_fee?: number | null
          delivery_fee_per_km?: number | null
          free_delivery_radius_km?: number | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          pix_key?: string | null
          primary_color?: string | null
          public_slug?: string | null
          store_lat?: number | null
          store_lng?: number | null
          whatsapp?: string | null
        }
        Update: {
          ativo?: boolean | null
          delivery_fee?: number | null
          delivery_fee_per_km?: number | null
          free_delivery_radius_km?: number | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          pix_key?: string | null
          primary_color?: string | null
          public_slug?: string | null
          store_lat?: number | null
          store_lng?: number | null
          whatsapp?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      generate_invoice_number: { Args: never; Returns: string }
      get_user_tenant_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "manager" | "cashier" | "admin"
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
      app_role: ["owner", "manager", "cashier", "admin"],
    },
  },
} as const
