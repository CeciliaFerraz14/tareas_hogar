// Generado desde el esquema de Supabase. No editar a mano: tras cada migración,
// regenerar con `supabase gen types typescript --project-id qgmuikikryrtducvqwgi`.

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
      chat_messages: {
        Row: {
          content: string | null
          created_at: string
          house_id: string
          id: string
          image_url: string | null
          task_id: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          house_id: string
          id?: string
          image_url?: string | null
          task_id: string
          user_id?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          house_id?: string
          id?: string
          image_url?: string | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_task_same_house"
            columns: ["task_id", "house_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id", "house_id"]
          },
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_splits: {
        Row: {
          amount_owed: number
          expense_id: string
          id: string
          is_settled: boolean
          settled_at: string | null
          user_id: string
        }
        Insert: {
          amount_owed: number
          expense_id: string
          id?: string
          is_settled?: boolean
          settled_at?: string | null
          user_id: string
        }
        Update: {
          amount_owed?: number
          expense_id?: string
          id?: string
          is_settled?: boolean
          settled_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_splits_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_splits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          house_id: string
          id: string
          paid_by: string | null
          title: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          house_id: string
          id?: string
          paid_by?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          house_id?: string
          id?: string
          paid_by?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          app_version: string | null
          created_at: string
          device: string | null
          id: string
          kind: string
          message: string
          status: string
          user_id: string | null
        }
        Insert: {
          app_version?: string | null
          created_at?: string
          device?: string | null
          id?: string
          kind: string
          message: string
          status?: string
          user_id?: string | null
        }
        Update: {
          app_version?: string | null
          created_at?: string
          device?: string | null
          id?: string
          kind?: string
          message?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      house_chat_reads: {
        Row: {
          delivered_at: string | null
          house_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          delivered_at?: string | null
          house_id: string
          read_at?: string | null
          user_id?: string
        }
        Update: {
          delivered_at?: string | null
          house_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "house_chat_reads_member"
            columns: ["house_id", "user_id"]
            isOneToOne: true
            referencedRelation: "house_members"
            referencedColumns: ["house_id", "user_id"]
          },
        ]
      }
      house_members: {
        Row: {
          house_id: string
          joined_at: string
          role: string
          sort_order: number | null
          user_id: string
        }
        Insert: {
          house_id: string
          joined_at?: string
          role?: string
          sort_order?: number | null
          user_id: string
        }
        Update: {
          house_id?: string
          joined_at?: string
          role?: string
          sort_order?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "house_members_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "house_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      house_messages: {
        Row: {
          content: string
          created_at: string
          house_id: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          house_id: string
          id?: string
          user_id?: string
        }
        Update: {
          content?: string
          created_at?: string
          house_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "house_messages_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "house_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      houses: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "houses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          house_id: string
          id: string
          invited_email: string | null
          status: string
          token: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          house_id: string
          id?: string
          invited_email?: string | null
          status?: string
          token?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          house_id?: string
          id?: string
          invited_email?: string | null
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_attendance: {
        Row: {
          date: string
          eating: boolean
          house_id: string
          slot: string
          updated_at: string
          user_id: string
        }
        Insert: {
          date: string
          eating: boolean
          house_id: string
          slot: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          date?: string
          eating?: boolean
          house_id?: string
          slot?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_attendance_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_attendance_member"
            columns: ["house_id", "user_id"]
            isOneToOne: false
            referencedRelation: "house_members"
            referencedColumns: ["house_id", "user_id"]
          },
        ]
      }
      meal_plan_entries: {
        Row: {
          cook_id: string | null
          created_at: string
          created_by: string | null
          date: string
          house_id: string
          id: string
          recipe_id: string | null
          slot: string
          title: string
          updated_at: string
        }
        Insert: {
          cook_id?: string | null
          created_at?: string
          created_by?: string | null
          date: string
          house_id: string
          id?: string
          recipe_id?: string | null
          slot: string
          title: string
          updated_at?: string
        }
        Update: {
          cook_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          house_id?: string
          id?: string
          recipe_id?: string | null
          slot?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_cook_is_member"
            columns: ["house_id", "cook_id"]
            isOneToOne: false
            referencedRelation: "house_members"
            referencedColumns: ["house_id", "user_id"]
          },
          {
            foreignKeyName: "meal_plan_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plan_entries_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plan_recipe_same_house"
            columns: ["recipe_id", "house_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id", "house_id"]
          },
        ]
      }
      notification_prefs: {
        Row: {
          chat: boolean
          expenses: boolean
          menu: boolean
          pets: boolean
          shopping: boolean
          tasks: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          chat?: boolean
          expenses?: boolean
          menu?: boolean
          pets?: boolean
          shopping?: boolean
          tasks?: boolean
          updated_at?: string
          user_id?: string
        }
        Update: {
          chat?: boolean
          expenses?: boolean
          menu?: boolean
          pets?: boolean
          shopping?: boolean
          tasks?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_items: {
        Row: {
          created_at: string
          created_by: string | null
          done: boolean
          done_at: string | null
          done_by: string | null
          house_id: string
          id: string
          kind: string
          pet_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          done?: boolean
          done_at?: string | null
          done_by?: string | null
          house_id: string
          id?: string
          kind: string
          pet_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          done?: boolean
          done_at?: string | null
          done_by?: string | null
          house_id?: string
          id?: string
          kind?: string
          pet_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_items_done_by_fkey"
            columns: ["done_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_items_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_items_pet_same_house"
            columns: ["pet_id", "house_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id", "house_id"]
          },
        ]
      }
      pet_logs: {
        Row: {
          done_at: string
          done_by: string | null
          for_date: string
          house_id: string
          id: string
          routine_id: string
          slot: number
        }
        Insert: {
          done_at?: string
          done_by?: string | null
          for_date: string
          house_id: string
          id?: string
          routine_id: string
          slot?: number
        }
        Update: {
          done_at?: string
          done_by?: string | null
          for_date?: string
          house_id?: string
          id?: string
          routine_id?: string
          slot?: number
        }
        Relationships: [
          {
            foreignKeyName: "pet_logs_done_by_fkey"
            columns: ["done_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_logs_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_logs_routine_same_house"
            columns: ["routine_id", "house_id"]
            isOneToOne: false
            referencedRelation: "pet_routines"
            referencedColumns: ["id", "house_id"]
          },
        ]
      }
      pet_routines: {
        Row: {
          created_at: string
          created_by: string | null
          emoji: string
          frequency: string
          house_id: string
          id: string
          interval_days: number | null
          month_day: number | null
          pet_id: string | null
          position: number
          remind: boolean
          remind_at: string
          start_date: string
          times: string[] | null
          title: string
          week_days: number[] | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          emoji?: string
          frequency: string
          house_id: string
          id?: string
          interval_days?: number | null
          month_day?: number | null
          pet_id?: string | null
          position?: number
          remind?: boolean
          remind_at?: string
          start_date?: string
          times?: string[] | null
          title: string
          week_days?: number[] | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          emoji?: string
          frequency?: string
          house_id?: string
          id?: string
          interval_days?: number | null
          month_day?: number | null
          pet_id?: string | null
          position?: number
          remind?: boolean
          remind_at?: string
          start_date?: string
          times?: string[] | null
          title?: string
          week_days?: number[] | null
        }
        Relationships: [
          {
            foreignKeyName: "pet_routines_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_routines_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_routines_pet_same_house"
            columns: ["pet_id", "house_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id", "house_id"]
          },
        ]
      }
      pet_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          due_date: string | null
          id: string
          pet_id: string
          status: string
          title: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          pet_id: string
          status?: string
          title: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          pet_id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_tasks_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pets: {
        Row: {
          created_at: string
          house_id: string
          id: string
          in_pack: boolean
          name: string
          owner_id: string | null
          photo_url: string | null
          type: string | null
        }
        Insert: {
          created_at?: string
          house_id: string
          id?: string
          in_pack?: boolean
          name: string
          owner_id?: string | null
          photo_url?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string
          house_id?: string
          id?: string
          in_pack?: boolean
          name?: string
          owner_id?: string | null
          photo_url?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pets_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pets_owner_member"
            columns: ["house_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "house_members"
            referencedColumns: ["house_id", "user_id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          house_id: string
          id: string
          name: string
          position: number
          quantity: string | null
          recipe_id: string
        }
        Insert: {
          house_id: string
          id?: string
          name: string
          position?: number
          quantity?: string | null
          recipe_id: string
        }
        Update: {
          house_id?: string
          id?: string
          name?: string
          position?: number
          quantity?: string | null
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_same_house"
            columns: ["recipe_id", "house_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id", "house_id"]
          },
        ]
      }
      recipes: {
        Row: {
          created_at: string
          created_by: string | null
          house_id: string
          id: string
          notes: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          house_id: string
          id?: string
          notes?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          house_id?: string
          id?: string
          notes?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          created_at: string
          house_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          house_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          house_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_items: {
        Row: {
          added_by: string | null
          created_at: string
          house_id: string
          id: string
          is_purchased: boolean
          purchased_by: string | null
          title: string
          updated_at: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          house_id: string
          id?: string
          is_purchased?: boolean
          purchased_by?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          house_id?: string
          id?: string
          is_purchased?: boolean
          purchased_by?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_items_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_items_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_items_purchased_by_fkey"
            columns: ["purchased_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      task_completions: {
        Row: {
          completed_at: string
          completed_by: string | null
          date: string
          house_id: string
          task_id: string
        }
        Insert: {
          completed_at?: string
          completed_by?: string | null
          date: string
          house_id: string
          task_id: string
        }
        Update: {
          completed_at?: string
          completed_by?: string | null
          date?: string
          house_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_completions_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_completions_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_completions_task_same_house"
            columns: ["task_id", "house_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id", "house_id"]
          },
        ]
      }
      task_templates: {
        Row: {
          created_at: string
          id: string
          room_id: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          room_id: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          room_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          house_id: string
          id: string
          room_id: string | null
          status: string
          title: string
          updated_at: string
          week_day: number | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          house_id: string
          id?: string
          room_id?: string | null
          status?: string
          title: string
          updated_at?: string
          week_day?: number | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          house_id?: string
          id?: string
          room_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          week_day?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_is_member"
            columns: ["house_id", "assigned_to"]
            isOneToOne: false
            referencedRelation: "house_members"
            referencedColumns: ["house_id", "user_id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_room_same_house"
            columns: ["room_id", "house_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id", "house_id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: { Args: { p_token: string }; Returns: string }
      add_meals_to_shopping: {
        Args: { p_from: string; p_house_id: string; p_to: string }
        Returns: {
          added: number
          already_listed: number
        }[]
      }
      copy_meal_week: {
        Args: { p_from: string; p_house_id: string; p_to: string }
        Returns: number
      }
      create_expense: {
        Args: {
          p_amount: number
          p_house_id: string
          p_paid_by: string
          p_split_among: string[]
          p_title: string
        }
        Returns: string
      }
      create_house: { Args: { p_name: string }; Returns: string }
      get_push_config: { Args: never; Returns: Json }
      get_vapid_public_key: { Args: never; Returns: string }
      is_app_admin: { Args: never; Returns: boolean }
      list_feedback: {
        Args: never
        Returns: {
          app_version: string | null
          author_email: string | null
          author_name: string | null
          created_at: string
          device: string | null
          id: string
          kind: string
          message: string
          status: string
        }[]
      }
      mark_chat_read: {
        Args: { p_house_id: string; p_up_to: string }
        Returns: undefined
      }
      mark_my_chats_delivered: { Args: never; Returns: undefined }
      my_house_summaries: {
        Args: { p_today: string }
        Returns: {
          dinner_today: string
          house_id: string
          lunch_today: string
          shopping_pending: number
          tasks_today_pending: number
          unread_messages: number
        }[]
      }
      reorder_my_houses: {
        Args: { p_house_ids: string[] }
        Returns: undefined
      }
      set_feedback_status: {
        Args: { p_id: string; p_status: string }
        Returns: undefined
      }
      save_push_subscription: {
        Args: {
          p_auth: string
          p_endpoint: string
          p_p256dh: string
          p_user_agent?: string
        }
        Returns: undefined
      }
      save_recipe: {
        Args: {
          p_house_id: string
          p_ingredients: Json
          p_notes?: string
          p_recipe_id?: string
          p_title: string
        }
        Returns: string
      }
      set_house_avatar: {
        Args: { p_avatar_url: string; p_house_id: string }
        Returns: undefined
      }
      set_meal_attendance: {
        Args: {
          p_date: string
          p_eating?: boolean
          p_house_id: string
          p_slot: string
        }
        Returns: undefined
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
    Enums: {},
  },
} as const
