import { createClient, RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { db } from "@/db/db";
import { groupMembers, chatMembers, users, groupPosts, groups, staffsLocations } from "@/db/schemas";
import { eq, and } from "drizzle-orm";
import {
	notifyUsersNewGroupPost,
	notifyUsersNewGroupChatMessage,
	notifyUsersNewPostComment
} from "@/libs/novu";

export class GroupsListener {
	private supabase: SupabaseClient | null = null;
	private channels: RealtimeChannel[] = [];
	private isRunning = false;

	constructor() {
		this.initializeSupabase();
	}

	private initializeSupabase() {
		const supabaseUrl = Bun.env.SUPABASE_URL;
		const supabaseServiceKey = Bun.env.SUPABASE_SERVICE_ROLE_KEY;

		if (!supabaseUrl || !supabaseServiceKey) {
			console.error("❌ Missing Supabase configuration for groups listener");
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
			console.error("❌ Cannot start groups listener: Supabase client not initialized");
			return;
		}

		if (this.isRunning) {
			console.log("⚠️ Groups listener is already running");
			return;
		}

		try {
			// Listen for new group posts
			const groupPostsChannel = this.supabase
				.channel("group_posts_changes")
				.on("postgres_changes", {
					event: "INSERT",
					schema: "public",
					table: "group_posts",
				}, (payload) => {
					console.log("🚀 Group post insert", payload);
					this.handleGroupPostInsert(payload);
				})
				.subscribe((status) => {
					if (status === "CHANNEL_ERROR") {
						this.handleReconnection("group_posts");
					}
				});

			// Listen for new chat messages
			const messagesChannel = this.supabase
				.channel("messages_changes")
				.on("postgres_changes", {
					event: "INSERT",
					schema: "public",
					table: "messages",
				}, (payload) => {
					console.log("🚀 Chat message insert", payload);
					this.handleChatMessageInsert(payload);
				})
				.subscribe((status) => {
					if (status === "CHANNEL_ERROR") {
						this.handleReconnection("messages");
					}
				});

			// Listen for new post comments
			const postCommentsChannel = this.supabase
				.channel("post_comments_changes")
				.on("postgres_changes", {
					event: "INSERT",
					schema: "public",
					table: "post_comments",
				}, (payload) => {
					console.log("🚀 Post comment insert", payload);
					this.handlePostCommentInsert(payload);
				})
				.subscribe((status) => {
					if (status === "CHANNEL_ERROR") {
						this.handleReconnection("post_comments");
					}
				});

			this.channels = [groupPostsChannel, messagesChannel, postCommentsChannel];
			this.isRunning = true;
			console.log("✅ Groups listener started successfully");
		} catch (error) {
			console.error("❌ Failed to start groups listener:", error);
		}
	}

	async stop() {
		if (!this.isRunning) {
			console.log("⚠️ Groups listener is not running");
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

			console.log("🛑 Groups listener stopped");
		} catch (error) {
			console.error("❌ Error stopping groups listener:", error);
		}
	}

	private async handleGroupPostInsert(payload: Record<string, any>) {
		try {
			const post = payload.new;
			console.log('Handling group post insert: ', post);
			// Query group members to get userIds
			const members = await db.query.groupMembers.findMany({
				where: eq(groupMembers.groupId, post.group_id),
				with: {
					user: {
						columns: {
							email: true
						}
					}
				}
			});

			// Get group and location info
			const group = await db.query.groups.findFirst({
				where: eq(groups.id, post.group_id),
				with: {
					location: {
						with: {
							vendor: {
								with: {
									user: {
										columns: {
											id: true,
											email: true
										}
									}
								}
							}
						}
					},
				},
			});

			const staffUsers = await db.query.staffsLocations.findMany({
				where: eq(staffsLocations.locationId, group?.locationId || ""),
				with: {
					staff: {
						with: {
							user: {
								columns: {
									id: true,
									email: true
								}
							}
						}
					}
				}
			});

			const vendorUser = group?.location?.vendor?.user;
			const allStaffs = [...staffUsers.map(staff => staff.staff?.user), vendorUser];

			// Get post author info
			const poster = await db.query.users.findFirst({
				where: eq(users.id, post.user_id),
			});

			const notifiedUsers = members
				.filter(member => member.userId !== post.user_id) // Don't notify the poster
				.map(member => ({
					id: member.userId,
					email: member.user?.email,
				}));

			const staffAndVendorUsers = allStaffs.map(user => ({
				id: user?.id || "",
				email: user?.email || "",
			}));

			if (notifiedUsers.length > 0 && group) {
				await notifyUsersNewGroupPost({
					users: [...notifiedUsers, ...staffAndVendorUsers],
					memberName: poster?.name || "A member",
					locationName: group.location?.name || "",
					locationId: group.locationId || "",
				});
			}
		} catch (error) {
			console.error("❌ Error handling group post insert:", error);
		}
	}

	private async handleChatMessageInsert(payload: Record<string, any>) {
		try {
			const message = payload.new;

			// Query chat members
			const members = await db.query.chatMembers.findMany({
				where: eq(chatMembers.chatId, message.chat_id),
				with: {
					user: {
						columns: {
							email: true
						}
					}
				}
			});

			// Get sender info
			const sender = await db.query.users.findFirst({
				where: eq(users.id, message.sender_id),
			});

			const notifiedUsers = members
				.filter(member => member.userId !== message.sender_id) // Don't notify the sender
				.map(member => ({
					id: member.userId,
					email: member.user?.email,
				}));
			if (notifiedUsers.length > 0 && sender) {
				// For private chats, we'll use generic location info
				// You may want to enhance this to get location context from the chat participants
				await notifyUsersNewGroupChatMessage({
					users: notifiedUsers,
					memberName: sender.name || "A member",
					locationName: "",
					locationId: "",
				});
			}
		} catch (error) {
			console.error("❌ Error handling chat message insert:", error);
		}
	}

	private async handlePostCommentInsert(payload: Record<string, any>) {
		console.log('Handling post comment insert: ', payload);
		try {
			const comment = payload.new;

			// Get the post and its author
			const post = await db.query.groupPosts.findFirst({
				where: eq(groupPosts.id, comment.post_id),
				with: {
					user: {
						columns: {
							email: true
						}
					}
				}
			});

			if (!post) return;

			// Get group and location info
			const group = await db.query.groups.findFirst({
				where: eq(groups.id, post.groupId),
				with: {
					location: true,
				},
			});

			// Get all unique users who have commented on this post
			const existingComments = await db.query.comments.findMany({
				where: (postComments, { eq, and }) => and(
					eq(postComments.ownerId, comment.post_id),
					eq(postComments.ownerType, "post")
				),
				with: {
					user: {
						columns: {
							email: true
						}
					}
				}
			});

			const commenters = new Set<{
				id: string;
				email: string;
			}>();
			existingComments.forEach(c => {
				if (c.userId) commenters.add({
					id: c.userId,
					email: c.user?.email || "",
				});
			});
			commenters.add({
				id: post.userId,
				email: post.user?.email || "",
			});
			if (comment.user_id) commenters.delete(comment.user_id); // Don't notify the commenter

			const notifiedUsers = Array.from(commenters);

			// Get commenter info
			const commenter = await db.query.users.findFirst({
				where: eq(users.id, comment.user_id),
			});

			if (notifiedUsers.length > 0 && group) {
				await notifyUsersNewPostComment({
					users: notifiedUsers,
					memberName: commenter?.name || "A member",
					locationName: group.location?.name || "",
					locationId: group.locationId || "",
				});
			}
		} catch (error) {
			console.error("❌ Error handling post comment insert:", error);
		}
	}

	private handleReconnection(channelType: string) {
		console.log(`🔄 Reconnecting ${channelType} channel...`);

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
				message: "Groups listener not running or Supabase not connected",
			};
		}

		try {
			const { error } = await this.supabase.from("groups").select("id").limit(1);

			if (error) {
				return {
					status: "unhealthy",
					message: "Database query failed",
					error: error.message,
				};
			}

			return {
				status: "healthy",
				message: "Groups listener running normally",
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

export type GroupsListenerType = typeof GroupsListener;

