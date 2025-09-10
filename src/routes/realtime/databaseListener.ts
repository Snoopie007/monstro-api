import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ConnectionManager } from "./connectionManager";
import type { Database } from "@/types";

interface DatabaseChange {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  schema: string;
  table: string;
  new?: any;
  old?: any;
}

export class DatabaseListener {
  private supabase: SupabaseClient | null = null;
  private connectionManager: ConnectionManager;
  private channels: any[] = [];
  private isRunning = false;

  constructor(connectionManager: ConnectionManager) {
    this.connectionManager = connectionManager;
    this.initializeSupabase();
  }

  private initializeSupabase() {
    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("❌ Missing Supabase configuration for database listener");
      return;
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      realtime: {
        params: {
          eventsPerSecond: 100, // Higher rate for real-time updates
        },
      },
    });

    console.log("✅ Supabase client initialized for database listener");
  }

  async start() {
    if (!this.supabase) {
      console.error(
        "❌ Cannot start database listener: Supabase client not initialized"
      );
      return;
    }

    if (this.isRunning) {
      console.log("⚠️ Database listener is already running");
      return;
    }

    try {
      // Listen to support_messages changes
      const messagesChannel = this.supabase
        .channel("support_messages_changes")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "support_messages",
          },
          (payload) => this.handleMessageInsert(payload)
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "support_messages",
          },
          (payload) => this.handleMessageUpdate(payload)
        )
        .subscribe((status) => {
          console.log("📡 Messages channel status:", status);
          if (status === "SUBSCRIBED") {
            console.log(
              "✅ Successfully subscribed to support_messages changes"
            );
          } else if (status === "CHANNEL_ERROR") {
            console.error("❌ Error subscribing to support_messages changes");
            this.handleReconnection("messages");
          }
        });

      // Listen to support_conversations changes (for mode switching)
      const conversationsChannel = this.supabase
        .channel("support_conversations_changes")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "support_conversations",
          },
          (payload) => this.handleConversationUpdate(payload)
        )
        .subscribe((status) => {
          console.log("📡 Conversations channel status:", status);
          if (status === "SUBSCRIBED") {
            console.log(
              "✅ Successfully subscribed to support_conversations changes"
            );
          } else if (status === "CHANNEL_ERROR") {
            console.error(
              "❌ Error subscribing to support_conversations changes"
            );
            this.handleReconnection("conversations");
          }
        });

      this.channels = [messagesChannel, conversationsChannel];
      this.isRunning = true;

      console.log("🚀 Database listener started successfully");
    } catch (error) {
      console.error("❌ Failed to start database listener:", error);
    }
  }

  async stop() {
    if (!this.isRunning) {
      console.log("⚠️ Database listener is not running");
      return;
    }

    try {
      // Unsubscribe from all channels
      for (const channel of this.channels) {
        if (this.supabase) {
          this.supabase.removeChannel(channel);
        }
      }

      this.channels = [];
      this.isRunning = false;

      console.log("🛑 Database listener stopped");
    } catch (error) {
      console.error("❌ Error stopping database listener:", error);
    }
  }

  private handleMessageInsert(payload: any) {
    try {
      const message = payload.new;

      const messageData = {
        type: "new_message",
        data: {
          id: message.id,
          conversationId: message.conversation_id,
          content: message.content,
          role: message.role,
          channel: message.channel,
          agentName: message.agent_name,
          agentId: message.agent_id,
          metadata: message.metadata,
          created: message.created_at,
        },
        timestamp: new Date().toISOString(),
      };

      // Check if this message was sent via WebSocket by a member (to prevent echo)
      const senderId = message.metadata?.senderId;
      const isWebSocketMessage = message.metadata?.source === "websocket";

      if (isWebSocketMessage && senderId) {
        // Don't send the message back to the sender - prevents echo
        this.connectionManager.broadcastToConversationExcludingMember(
          message.conversation_id,
          messageData,
          senderId
        );
      } else {
        // For messages from other sources (AI, admin, etc.), broadcast to everyone
        this.connectionManager.broadcastToConversation(
          message.conversation_id,
          messageData
        );
      }
    } catch (error) {
      console.error("❌ Error handling message insert:", error);
    }
  }

  private handleMessageUpdate(payload: any) {
    try {
      const message = payload.new;

      // Broadcast message update to conversation participants
      this.connectionManager.broadcastToConversation(message.conversation_id, {
        type: "message_updated",
        data: {
          id: message.id,
          conversationId: message.conversation_id,
          content: message.content,
          role: message.role,
          channel: message.channel,
          agentName: message.agent_name,
          agentId: message.agent_id,
          metadata: message.metadata,
          created: message.created_at,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ Error handling message update:", error);
    }
  }

  private handleConversationUpdate(payload: any) {
    try {
      const newConversation = payload.new;
      const oldConversation = payload.old;

      // Only broadcast mode changes when is_vendor_active actually changes
      // Handle cases where old data might be undefined
      const oldVendorActive = oldConversation?.is_vendor_active ?? false;
      const newVendorActive = newConversation?.is_vendor_active ?? false;
      const modeChanged = oldVendorActive !== newVendorActive;

      // Only proceed if we have valid old data (skip initial/undefined updates)
      const hasValidOldData =
        oldConversation && oldConversation.is_vendor_active !== undefined;

      if (modeChanged && hasValidOldData) {
        const mode = newConversation.is_vendor_active ? "agent" : "assistant";
        const agentInfo = newConversation.metadata?.agent;

        // Broadcast mode change to conversation participants
        this.connectionManager.broadcastToConversation(newConversation.id, {
          type: "mode_change",
          data: {
            conversationId: newConversation.id,
            mode,
            isVendorActive: newConversation.is_vendor_active,
            takenOverAt: newConversation.taken_over_at,
            agentInfo,
            status: newConversation.status,
            previousMode: oldConversation.is_vendor_active
              ? "agent"
              : "assistant",
          },
          timestamp: new Date().toISOString(),
        });

        // Send system message about the mode change
        const systemMessage = newConversation.is_vendor_active
          ? `🤝 ${
              agentInfo?.name || "A team member"
            } has joined the conversation and will assist you from here.`
          : `🤖 You're now chatting with our AI assistant. I'm here to help!`;

        this.connectionManager.broadcastToConversation(newConversation.id, {
          type: "system_message",
          data: {
            content: systemMessage,
            mode,
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Broadcast general conversation update for any conversation change
      this.connectionManager.broadcastToConversation(newConversation.id, {
        type: "conversation_updated",
        data: {
          id: newConversation.id,
          title: newConversation.title,
          status: newConversation.status,
          isVendorActive: newConversation.is_vendor_active,
          takenOverAt: newConversation.taken_over_at,
          metadata: newConversation.metadata,
          updated: newConversation.updated_at,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error handling conversation update:", error);
    }
  }

  private handleReconnection(channelType: string) {
    console.log(`🔄 Attempting to reconnect ${channelType} channel...`);

    // Simple retry logic - you can make this more sophisticated
    setTimeout(() => {
      if (this.isRunning) {
        this.stop().then(() => {
          setTimeout(() => {
            this.start();
          }, 2000);
        });
      }
    }, 5000);
  }

  // Get listener status
  getStatus() {
    return {
      isRunning: this.isRunning,
      channelCount: this.channels.length,
      supabaseConnected: !!this.supabase,
    };
  }

  // Health check method
  async healthCheck() {
    if (!this.supabase || !this.isRunning) {
      return {
        status: "unhealthy",
        message: "Database listener not running or Supabase not connected",
      };
    }

    try {
      // Simple query to test connection
      const { error } = await this.supabase
        .from("support_conversations")
        .select("id")
        .limit(1);

      if (error) {
        return {
          status: "unhealthy",
          message: "Database query failed",
          error: error.message,
        };
      }

      return {
        status: "healthy",
        message: "Database listener running normally",
        channelCount: this.channels.length,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        message: "Health check failed",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
