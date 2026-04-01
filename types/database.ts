// Basic Database type for Supabase client
// This can be expanded as needed based on your full database schema

export interface Database {
  public: {
    Tables: {
      support_conversations: {
        Row: {
          id: string;
          title: string;
          support_assistant_id: string;
          location_id: string;
          member_id: string;
          category: string | null;
          taken_over_at: string | null;
          is_vendor_active: boolean;
          description: string | null;
          status: "draft" | "active" | "paused";
          priority: number;
          metadata: Record<string, any>;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          title?: string;
          support_assistant_id: string;
          location_id: string;
          member_id: string;
          category?: string | null;
          taken_over_at?: string | null;
          is_vendor_active?: boolean;
          description?: string | null;
          status?: "draft" | "active" | "paused";
          priority?: number;
          metadata?: Record<string, any>;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          support_assistant_id?: string;
          location_id?: string;
          member_id?: string;
          category?: string | null;
          taken_over_at?: string | null;
          is_vendor_active?: boolean;
          description?: string | null;
          status?: "draft" | "active" | "paused";
          priority?: number;
          metadata?: Record<string, any>;
          created_at?: string;
          updated_at?: string | null;
        };
      };
      support_messages: {
        Row: {
          id: string;
          conversation_id: string;
          agent_name: string | null;
          agent_id: string | null;
          content: string;
          role:
            | "human"
            | "ai"
            | "staff"
            | "system"
            | "tool"
            | "tool_message";
          channel: "WebChat" | "Email" | "System";
          metadata: Record<string, any>;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          agent_name?: string | null;
          agent_id?: string | null;
          content: string;
          role:
            | "human"
            | "ai"
            | "staff"
            | "system"
            | "tool"
            | "tool_message"
          channel?: "WebChat" | "Email" | "System";
          metadata?: Record<string, any>;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          agent_name?: string | null;
          agent_id?: string | null;
          content?: string;
          role?:
            | "human"
            | "ai"
            | "staff"
            | "system"
            | "tool"
            | "tool_message"
          channel?: "WebChat" | "Email" | "System";
          metadata?: Record<string, any>;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      assistant_status: "draft" | "active" | "paused";
      channel: "WebChat" | "Email" | "System";
      message_role:
        | "human"
        | "ai"
        | "staff"
        | "system"
        | "tool"
        | "tool_message";
      trigger_type: "keyword" | "intent" | "condition";
      bot_model: "gpt" | "anthropic" | "gemini";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
