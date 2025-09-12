import type { SupportMessage } from "@/types";

interface WebSocketConnection {
	ws: any; // Elysia WebSocket type
	cid: string;
	mid: string;
}

interface ConversationConnections {
	[mid: string]: WebSocketConnection;
}


type BroadcastMessage = {
	type: string;
	data: SupportMessage;
	timestamp: string;
}

export class ConnectionManager {
	private connections: Map<string, ConversationConnections> = new Map();
	private memberConnections: Map<string, Set<string>> = new Map(); // memberId -> Set of conversationIds

	// Add a new WebSocket connection
	addConnection(cid: string, mid: string, ws: any) {
		// Initialize conversation connections if not exists
		if (!this.connections.has(cid)) {
			this.connections.set(cid, {});
		}

		// Add connection
		const cc = this.connections.get(cid)!;
		cc[mid] = {
			ws,
			cid,
			mid,
		};

		// Track member connections
		if (!this.memberConnections.has(mid)) {
			this.memberConnections.set(mid, new Set());
		}
		this.memberConnections.get(mid)!.add(cid);

		console.log(`✅ Added connection: member ${mid} to conversation ${cid}`);
		this.logConnectionStats();
	}

	// Remove a WebSocket connection
	removeConnection(cid: string, mid: string) {
		const cc = this.connections.get(cid);
		if (cc && cc[mid]) {
			delete cc[mid];

			// Remove from member connections tracking
			const memberConversations = this.memberConnections.get(mid);
			if (memberConversations) {
				memberConversations.delete(cid);
				if (memberConversations.size === 0) {
					this.memberConnections.delete(mid);
				}
			}

			// Clean up empty conversation groups
			if (Object.keys(cc).length === 0) {
				this.connections.delete(cid);
			}

			console.log(`✅ Removed connection: member ${mid} from conversation ${cid}`
			);
			this.logConnectionStats();
		}
	}

	// Broadcast message to all connections in a conversation
	broadcastToConversation(cid: string, message: any) {
		const conversationConnections = this.connections.get(cid);
		if (!conversationConnections) {
			console.log(`📭 No connections found for conversation: ${cid}`);
			return;
		}



		const messageStr = JSON.stringify(message);
		let sentCount = 0;
		let errorCount = 0;

		Object.values(conversationConnections).forEach(({ ws, mid }) => {
			try {
				// For Elysia WebSockets, we'll just try to send and catch errors
				ws.send(messageStr);
				sentCount++;
			} catch (error) {
				console.error(
					`❌ Failed to send message to member ${mid}:`,
					error
				);
				errorCount++;
				// Clean up failed connection
				this.removeConnection(cid, mid);
			}
		});

		console.log(
			`📤 Broadcasted to conversation ${cid}: ${sentCount} sent, ${errorCount} errors`
		);
	}



	// Broadcast message to all connections for a specific member
	broadcastToMember(mid: string, message: BroadcastMessage) {
		const memberConversations = this.memberConnections.get(mid);
		if (!memberConversations) {
			console.log(`📭 No connections found for member: ${mid}`);
			return;
		}

		const messageStr = JSON.stringify(message);
		let sentCount = 0;
		let errorCount = 0;

		memberConversations.forEach((conversationId) => {
			const cc = this.connections.get(conversationId);
			const connection = cc?.[mid];

			if (connection) {
				try {
					connection.ws.send(messageStr);
					sentCount++;
				} catch (error) {
					console.error(
						`❌ Failed to send message to member ${mid} in conversation ${conversationId}:`,
						error
					);
					errorCount++;
					this.removeConnection(conversationId, mid);
				}
			}
		});

		console.log(
			`📤 Broadcasted to member ${mid}: ${sentCount} sent, ${errorCount} errors`
		);
	}

	// Get all connections for a conversation
	getConversationConnections(cid: string): WebSocketConnection[] {
		const cc = this.connections.get(cid);
		return cc ? Object.values(cc) : [];
	}

	// Get all conversations a member is connected to
	getMemberConversations(mid: string): string[] {
		const mc = this.memberConnections.get(mid);
		return mc ? Array.from(mc) : [];
	}

	// Check if a member is connected to a conversation
	isConnected(conversationId: string, memberId: string): boolean {
		const cc = this.connections.get(conversationId);
		return !!cc?.[memberId]?.ws;
	}

	// Get connection statistics
	getStats() {
		const totalConnections = Array.from(this.connections.values()).reduce(
			(total, connections) => total + Object.keys(connections).length,
			0
		);

		return {
			totalConnections,
			totalConversations: this.connections.size,
			totalMembers: this.memberConnections.size,
			conversationDetails: Array.from(this.connections.entries()).map(
				([conversationId, connections]) => ({
					conversationId,
					connectionCount: Object.keys(connections).length,
					members: Object.keys(connections),
				})
			),
		};
	}

	// Cleanup dead connections
	cleanup() {
		let cleanedUp = 0;

		this.connections.forEach((conversationConnections, conversationId) => {
			Object.entries(conversationConnections).forEach(
				([memberId, connection]) => {
					try {
						// Try to send a ping to check if connection is alive
						connection.ws.ping?.();
					} catch (error) {
						// Connection is dead, remove it
						this.removeConnection(conversationId, memberId);
						cleanedUp++;
					}
				}
			);
		});

		if (cleanedUp > 0) {
			console.log(`🧹 Cleaned up ${cleanedUp} dead connections`);
		}

		return cleanedUp;
	}

	// Log connection statistics
	private logConnectionStats() {
		const stats = this.getStats();
		console.log(
			`📊 Connection Stats: ${stats.totalConnections} connections, ${stats.totalConversations} conversations, ${stats.totalMembers} members`
		);
	}

	// Periodic cleanup (call this on a timer)
	startPeriodicCleanup(intervalMs: number = 60000) {
		// Default: 1 minute
		setInterval(() => {
			this.cleanup();
		}, intervalMs);

		console.log(`🕐 Started periodic connection cleanup every ${intervalMs}ms`);
	}
}


export type ConnectionManagerType = typeof ConnectionManager;