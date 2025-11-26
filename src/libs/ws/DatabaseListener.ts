import { createClient, RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { ConnectionManager } from "./ConnectionManager";

export class DatabaseListener {
	private supabase: SupabaseClient | null = null;
	private connectionManager: ConnectionManager;
	private channels: RealtimeChannel[] = [];
	private isRunning = false;

	constructor(connectionManager: ConnectionManager) {
		this.connectionManager = connectionManager;
		this.initializeSupabase();
	}

	private initializeSupabase() {
		const supabaseUrl = Bun.env.SUPABASE_URL;
		const supabaseServiceKey = Bun.env.SUPABASE_SERVICE_ROLE_KEY;

		if (!supabaseUrl || !supabaseServiceKey) {
			console.error("❌ Missing Supabase configuration for database listener");
			return;
		}

		this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
			realtime: {
				params: {
					eventsPerSecond: 100,
				},
			},
		});

	}

	async start() {
		if (!this.supabase) {
			console.error("❌ Cannot start database listener: Supabase client not initialized");
			return;
		}

		if (this.isRunning) {
			console.log("⚠️ Database listener is already running");
			return;
		}

		try {
			const messagesChannel = this.supabase
				.channel("support_messages_changes", { config: { private: true } })
				.on("postgres_changes", {
					event: "INSERT",
					schema: "public",
					table: "support_messages",
				}, (payload) => {
					console.log("🚀 Message insert", payload);
					this.handleMessageInsert(payload);
				})
				.subscribe((status) => {
					if (status === "CHANNEL_ERROR") {
						this.handleReconnection("messages");
					}
				});

			const conversationsChannel = this.supabase
				.channel("support_conversations_changes", { config: { private: true } })
				.on("postgres_changes", {
					event: "UPDATE",
					schema: "public",
					table: "support_conversations",
				}, (payload) => {
					console.log("🚀 Conversation update", payload);
					this.handleConversationUpdate(payload);
				})
				.subscribe((status) => {
					if (status === "CHANNEL_ERROR") {
						this.handleReconnection("conversations");
					}
				});

			this.channels = [messagesChannel, conversationsChannel];
			this.isRunning = true;
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

	private handleMessageInsert(payload: Record<string, any>) {
		try {
			const message = payload.new;

			const messageData = {
				type: message.role === 'system' ? "system_message" : "new_message",
				data: {
					...message,
					conversationId: message.conversation_id,
					agentName: message.agent_name,
					agentId: message.agent_id,
					created: message.created_at,
				},
			};

			this.connectionManager.broadcastToConversation(message.conversation_id, messageData);
		} catch (error) {
			console.error("❌ Error handling message insert:", error);
		}
	}




	private handleConversationUpdate(payload: Record<string, any>) {
		try {
			if (!payload.new || !payload.old) {
				return;
			}

			this.connectionManager.broadcastToConversation(payload.new.id, {
				type: "conversation_updates",
				data: {
					conversationId: payload.new.id,
					isVendorActive: payload.new.is_vendor_active,
					takenOverAt: payload.new.taken_over_at,
					status: payload.new.status,
					priority: payload.new.priority,
					metadata: payload.new.metadata,
					updated: payload.new.updated_at,
				},

			});


		} catch (error) {
			console.error("Error handling conversation update:", error);
		}
	}

	private handleReconnection(channelType: string) {
		console.log(`Reconnecting ${channelType} channel...`);

		setTimeout(() => {
			if (!this.isRunning) return;
			this.stop().then(() => {
				setTimeout(() => {
					this.start();
				}, 2000);
			});
		}, 5000);
	}


	async healthCheck() {
		if (!this.supabase || !this.isRunning) {
			return {
				status: "unhealthy",
				message: "Database listener not running or Supabase not connected",
			};
		}

		try {
			const { error } = await this.supabase.from("support_conversations").select("id").limit(1);

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

export type DatabaseListenerType = typeof DatabaseListener;