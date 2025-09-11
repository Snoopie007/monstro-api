interface WebSocketConnection {
  ws: any; // Elysia WebSocket type
  conversationId: string;
  memberId: string;
  connectedAt: Date;
}

interface ConversationConnections {
  [memberId: string]: WebSocketConnection;
}

export class ConnectionManager {
  private connections: Map<string, ConversationConnections> = new Map();
  private memberConnections: Map<string, Set<string>> = new Map(); // memberId -> Set of conversationIds

  // Add a new WebSocket connection
  addConnection(conversationId: string, memberId: string, ws: any) {
    // Initialize conversation connections if not exists
    if (!this.connections.has(conversationId)) {
      this.connections.set(conversationId, {});
    }

    // Add connection
    const conversationConnections = this.connections.get(conversationId)!;
    conversationConnections[memberId] = {
      ws,
      conversationId,
      memberId,
      connectedAt: new Date(),
    };

    // Track member connections
    if (!this.memberConnections.has(memberId)) {
      this.memberConnections.set(memberId, new Set());
    }
    this.memberConnections.get(memberId)!.add(conversationId);

    console.log(
      `✅ Added connection: member ${memberId} to conversation ${conversationId}`
    );
    this.logConnectionStats();
  }

  // Remove a WebSocket connection
  removeConnection(conversationId: string, memberId: string) {
    const conversationConnections = this.connections.get(conversationId);
    if (conversationConnections && conversationConnections[memberId]) {
      delete conversationConnections[memberId];

      // Remove from member connections tracking
      const memberConversations = this.memberConnections.get(memberId);
      if (memberConversations) {
        memberConversations.delete(conversationId);
        if (memberConversations.size === 0) {
          this.memberConnections.delete(memberId);
        }
      }

      // Clean up empty conversation groups
      if (Object.keys(conversationConnections).length === 0) {
        this.connections.delete(conversationId);
      }

      console.log(
        `✅ Removed connection: member ${memberId} from conversation ${conversationId}`
      );
      this.logConnectionStats();
    }
  }

  // Broadcast message to all connections in a conversation
  broadcastToConversation(conversationId: string, message: any) {
    const conversationConnections = this.connections.get(conversationId);
    if (!conversationConnections) {
      console.log(
        `📭 No connections found for conversation: ${conversationId}`
      );
      return;
    }

    const messageStr = JSON.stringify(message);
    let sentCount = 0;
    let errorCount = 0;

    Object.values(conversationConnections).forEach(({ ws, memberId }) => {
      try {
        // For Elysia WebSockets, we'll just try to send and catch errors
        ws.send(messageStr);
        sentCount++;
      } catch (error) {
        console.error(
          `❌ Failed to send message to member ${memberId}:`,
          error
        );
        errorCount++;
        // Clean up failed connection
        this.removeConnection(conversationId, memberId);
      }
    });

    console.log(
      `📤 Broadcasted to conversation ${conversationId}: ${sentCount} sent, ${errorCount} errors`
    );
  }

  // Broadcast message to all connections in a conversation EXCEPT the specified member
  broadcastToConversationExcludingMember(
    conversationId: string,
    message: any,
    excludeMemberId: string
  ) {
    const conversationConnections = this.connections.get(conversationId);
    if (!conversationConnections) {
      console.log(
        `📭 No connections found for conversation: ${conversationId}`
      );
      return;
    }

    const messageStr = JSON.stringify(message);
    let sentCount = 0;
    let errorCount = 0;
    let excludedCount = 0;

    Object.values(conversationConnections).forEach(({ ws, memberId }) => {
      // Skip the sender to prevent echo
      if (memberId === excludeMemberId) {
        excludedCount++;
        return;
      }

      try {
        // For Elysia WebSockets, we'll just try to send and catch errors
        ws.send(messageStr);
        sentCount++;
      } catch (error) {
        console.error(
          `❌ Failed to send message to member ${memberId}:`,
          error
        );
        errorCount++;
        // Clean up failed connection
        this.removeConnection(conversationId, memberId);
      }
    });

    console.log(
      `📤 Broadcasted to conversation ${conversationId}: ${sentCount} sent, ${errorCount} errors, ${excludedCount} excluded (sender)`
    );
  }

  // Broadcast message to all connections for a specific member
  broadcastToMember(memberId: string, message: any) {
    const memberConversations = this.memberConnections.get(memberId);
    if (!memberConversations) {
      console.log(`📭 No connections found for member: ${memberId}`);
      return;
    }

    const messageStr = JSON.stringify(message);
    let sentCount = 0;
    let errorCount = 0;

    memberConversations.forEach((conversationId) => {
      const conversationConnections = this.connections.get(conversationId);
      const connection = conversationConnections?.[memberId];

      if (connection) {
        try {
          connection.ws.send(messageStr);
          sentCount++;
        } catch (error) {
          console.error(
            `❌ Failed to send message to member ${memberId} in conversation ${conversationId}:`,
            error
          );
          errorCount++;
          this.removeConnection(conversationId, memberId);
        }
      }
    });

    console.log(
      `📤 Broadcasted to member ${memberId}: ${sentCount} sent, ${errorCount} errors`
    );
  }

  // Get all connections for a conversation
  getConversationConnections(conversationId: string): WebSocketConnection[] {
    const conversationConnections = this.connections.get(conversationId);
    return conversationConnections
      ? Object.values(conversationConnections)
      : [];
  }

  // Get all conversations a member is connected to
  getMemberConversations(memberId: string): string[] {
    const memberConversations = this.memberConnections.get(memberId);
    return memberConversations ? Array.from(memberConversations) : [];
  }

  // Check if a member is connected to a conversation
  isConnected(conversationId: string, memberId: string): boolean {
    const conversationConnections = this.connections.get(conversationId);
    return !!conversationConnections?.[memberId]?.ws;
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
