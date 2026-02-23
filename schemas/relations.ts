import { relations } from "drizzle-orm";

// Import all table definitions
import { accounts } from "./accounts";
import { achievements, memberAchievements, memberPointsHistory } from "./achievements";
import { attendances } from "./attendances";
import { contractTemplates } from "./contracts";
import { integrations } from "./integrations";
import { memberInvoices } from "./invoice";
import {
	locations, locationState,
} from "./locations";
import { memberLocations } from "./MemberLocation";
import { memberPackages, memberPlanPricing, memberPlans, memberSubscriptions } from "./MemberPlans";
import {
	familyMembers,
	memberContracts,
	memberCustomFields,
	memberFields,
	memberReferrals,
	members,
} from "./members";
import { migrateMembers } from "./MigrateMembers";
import { memberPaymentMethods, paymentMethods } from "./PaymentMethods";
import { planPrograms, programs, programSessions, sessionWaitlist } from "./programs";
import { promos } from "./promos";
import { reservationExceptions, reservations } from "./reservations";
import { memberRewards, rewards } from "./rewards";
import { sessions } from "./sessions";
import { staffs, staffsLocations } from "./staffs";
import { memberHasTags, memberTags } from "./tags";
import { taxRates } from "./tax";
import { transactions } from "./transactions";
import { userNotifications, users } from "./users";
import { supportPlans, vendors } from "./vendors";
import { wallets, walletUsages } from "./wallets";

// Chat tables
import { chatMembers, chats, messages } from "./chat/chats";
import { comments } from "./chat/comments";
import { friends } from "./chat/friends";
import { groupMembers, groupPosts, groups } from "./chat/groups";
import { media } from "./chat/medias";
import { momentLikes, moments, userFeeds } from "./chat/moments";
import { reactions } from "./chat/reactions";

// Support tables
import { supportAssistants } from "./SupportAssistants";
import { supportConversations, supportMessages } from "./SupportConversations";
import { supportTriggers } from "./SupportTriggers";
import { vendorLevels } from "./VendorProgress";
import { vendorReferrals } from "./VendorReferrals";

// ============================================================================
// USER RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many, one }) => ({
	accounts: many(accounts),
	member: one(members, {
		fields: [users.id],
		references: [members.userId],
	}),
	vendor: one(vendors, {
		fields: [users.id],
		references: [vendors.userId],
	}),
	staff: one(staffs, {
		fields: [users.id],
		references: [staffs.userId],
	}),
	feeds: many(userFeeds, { relationName: 'userFeeds' }),
	authorFeeds: many(userFeeds, { relationName: 'authorFeeds' }),
	notifications: many(userNotifications),
}));

export const userNotificationsRelations = relations(userNotifications, ({ one }) => ({
	user: one(users, {
		fields: [userNotifications.userId],
		references: [users.id],
	}),
}));

// ============================================================================
// ACCOUNT RELATIONS
// ============================================================================

export const accountsRelations = relations(accounts, ({ one }) => ({
	user: one(users, {
		fields: [accounts.userId],
		references: [users.id],
	}),
}));

// ============================================================================
// SESSION RELATIONS
// ============================================================================

export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id],
	}),
}));

// ============================================================================
// MEMBER RELATIONS
// ============================================================================

export const membersRelations = relations(members, ({ many, one }) => ({
	memberLocations: many(memberLocations),
	achievements: many(memberAchievements),
	rewards: many(memberRewards),
	contracts: many(memberContracts),
	user: one(users, { fields: [members.userId], references: [users.id] }),
	familyMembers: many(familyMembers, { relationName: 'memberFamilyMembers' }),
	relatedByFamily: many(familyMembers, { relationName: 'relatedMemberFamily' }),
	packages: many(memberPackages),
	subscriptions: many(memberSubscriptions),
	pointsHistory: many(memberPointsHistory),
	referrals: many(memberReferrals),
	referredBy: one(memberReferrals, {
		relationName: 'referredByMember',
		fields: [members.id],
		references: [memberReferrals.referredMemberId]
	}),
	memberTags: many(memberHasTags),
	customFields: many(memberCustomFields),
}));

export const familyMemberRelations = relations(familyMembers, ({ one }) => ({
	member: one(members, {
		relationName: 'memberFamilyMembers',
		fields: [familyMembers.memberId],
		references: [members.id],
	}),
	relatedMember: one(members, {
		relationName: 'relatedMemberFamily',
		fields: [familyMembers.relatedMemberId],
		references: [members.id],
	}),
}));

export const memberPointsHistoryRelations = relations(memberPointsHistory, ({ one }) => ({
	member: one(members, {
		fields: [memberPointsHistory.memberId],
		references: [members.id],
	}),
	location: one(locations, {
		fields: [memberPointsHistory.locationId],
		references: [locations.id],
	}),
	achievement: one(achievements, {
		fields: [memberPointsHistory.achievementId],
		references: [achievements.id],
	}),
	memberLocation: one(memberLocations, {
		fields: [memberPointsHistory.memberId, memberPointsHistory.locationId],
		references: [memberLocations.memberId, memberLocations.locationId],
		relationName: 'pointsHistory',
	}),
}));

export const memberContractsRelations = relations(memberContracts, ({ one }) => ({
	member: one(members, {
		fields: [memberContracts.memberId],
		references: [members.id],
	}),
	contractTemplate: one(contractTemplates, {
		fields: [memberContracts.templateId],
		references: [contractTemplates.id],
	}),
	location: one(locations, {
		fields: [memberContracts.locationId],
		references: [locations.id],
	}),
	memberSubscription: one(memberSubscriptions, {
		fields: [memberContracts.id],
		references: [memberSubscriptions.memberContractId],
	}),
	memberPackage: one(memberPackages, {
		fields: [memberContracts.id],
		references: [memberPackages.memberContractId],
	}),
}));

export const memberInvoicesRelations = relations(memberInvoices, ({ one }) => ({
	member: one(members, {
		fields: [memberInvoices.memberId],
		references: [members.id],
	}),
	location: one(locations, {
		fields: [memberInvoices.locationId],
		references: [locations.id],
	}),
}));

export const memberRewardRelations = relations(memberRewards, ({ one }) => ({
	reward: one(rewards, {
		fields: [memberRewards.rewardId],
		references: [rewards.id],
	}),
	member: one(members, {
		fields: [memberRewards.memberId],
		references: [members.id],
	}),
}));

export const memberReferralsRelations = relations(memberReferrals, ({ one }) => ({
	member: one(members, {
		fields: [memberReferrals.memberId],
		references: [members.id],
	}),
	referredMember: one(members, {
		fields: [memberReferrals.referredMemberId],
		references: [members.id],
	}),
	location: one(locations, {
		fields: [memberReferrals.locationId],
		references: [locations.id],
	}),
}));

export const memberTagsRelations = relations(memberTags, ({ many, one }) => ({
	location: one(locations, {
		fields: [memberTags.locationId],
		references: [locations.id],
	}),
	members: many(memberHasTags),
}));

export const memberHasTagsRelations = relations(memberHasTags, ({ one }) => ({
	member: one(members, {
		fields: [memberHasTags.memberId],
		references: [members.id],
	}),
	tag: one(memberTags, {
		fields: [memberHasTags.tagId],
		references: [memberTags.id],
	}),
}));

export const memberFieldsRelations = relations(memberFields, ({ many, one }) => ({
	location: one(locations, {
		fields: [memberFields.locationId],
		references: [locations.id],
	}),
	customFields: many(memberCustomFields),
}));

export const memberCustomFieldsRelations = relations(memberCustomFields, ({ one }) => ({
	member: one(members, {
		fields: [memberCustomFields.memberId],
		references: [members.id],
	}),
	field: one(memberFields, {
		fields: [memberCustomFields.customFieldId],
		references: [memberFields.id],
	}),
}));

// ============================================================================
// LOCATION RELATIONS
// ============================================================================

export const locationsRelations = relations(locations, ({ many, one }) => ({
	memberLocations: many(memberLocations),
	integrations: many(integrations),
	programs: many(programs),
	memberPlans: many(memberPlans),
	memberSubscriptions: many(memberSubscriptions),
	memberInvoices: many(memberInvoices),
	pointsHistory: many(memberPointsHistory),
	referrals: many(memberReferrals),
	locationState: one(locationState, {
		fields: [locations.id],
		references: [locationState.locationId],
	}),
	vendor: one(vendors, {
		fields: [locations.vendorId],
		references: [vendors.id],
	}),
	wallet: one(wallets, {
		fields: [locations.id],
		references: [wallets.locationId],
	}),
	taxRates: many(taxRates),
}));

export const locationStateRelations = relations(locationState, ({ one }) => ({
	location: one(locations, {
		fields: [locationState.locationId],
		references: [locations.id],
	}),
}));

export const memberLocationsRelations = relations(
	memberLocations,
	({ one, many }) => ({
		member: one(members, {
			fields: [memberLocations.memberId],
			references: [members.id],
		}),
		location: one(locations, {
			fields: [memberLocations.locationId],
			references: [locations.id],
		}),
		transactions: many(transactions),
		attendances: many(attendances),
		pointsHistory: many(memberPointsHistory, {
			relationName: 'pointsHistory',
		}),
		memberPaymentMethods: many(memberPaymentMethods, {
			relationName: 'memberPaymentMethods',

		}),
	})
);

export const walletRelations = relations(wallets, ({ one, many }) => ({
	location: one(locations, {
		fields: [wallets.locationId],
		references: [locations.id],
	}),
	usages: many(walletUsages, { relationName: "usages" }),
}));

// ============================================================================
// VENDOR RELATIONS
// ============================================================================

export const vendorsRelations = relations(vendors, ({ one, many }) => ({
	user: one(users, {
		fields: [vendors.userId],
		references: [users.id],
	}),
	locations: many(locations),
	vendorLevel: one(vendorLevels, {
		fields: [vendors.id],
		references: [vendorLevels.vendorId],
	}),
	referrals: many(vendorReferrals, { relationName: "referrals" }),
	referee: one(vendorReferrals, {
		fields: [vendors.id],
		references: [vendorReferrals.referralId],
		relationName: "referee",
	}),
	supportPlans: one(supportPlans, {
		fields: [vendors.id],
		references: [supportPlans.vendorId],
	}),
}));

// ============================================================================
// STAFF RELATIONS
// ============================================================================

export const staffsRelations = relations(staffs, ({ many, one }) => ({
	staffLocations: many(staffsLocations),
	user: one(users, {
		fields: [staffs.userId],
		references: [users.id],
	}),
}));

export const staffLocationsRelations = relations(
	staffsLocations,
	({ one }) => ({
		staff: one(staffs, {
			fields: [staffsLocations.staffId],
			references: [staffs.id],
		}),
		location: one(locations, {
			fields: [staffsLocations.locationId],
			references: [locations.id],
		}),
	})
);

// ============================================================================
// ACHIEVEMENT RELATIONS
// ============================================================================

export const achievementsRelations = relations(achievements, ({ many, one }) => ({
	members: many(memberAchievements),
	pointsHistory: many(memberPointsHistory),
	memberAchievements: many(memberAchievements),
}));

export const memberAchievementsRelations = relations(memberAchievements, ({ one }) => ({
	member: one(members, {
		fields: [memberAchievements.memberId],
		references: [members.id],
	}),
	location: one(locations, {
		fields: [memberAchievements.locationId],
		references: [locations.id],
	}),
	achievement: one(achievements, {
		fields: [memberAchievements.achievementId],
		references: [achievements.id],
	}),
}));

// ============================================================================
// REWARD RELATIONS
// ============================================================================

export const rewardRelations = relations(rewards, ({ many }) => ({
	claims: many(memberRewards),
}));

// ============================================================================
// CONTRACT RELATIONS
// ============================================================================

export const contractTemplateRelations = relations(
	contractTemplates,
	({ many, one }) => ({
		memberContracts: many(memberContracts),
		plans: many(memberPlans),
		location: one(locations, {
			fields: [contractTemplates.locationId],
			references: [locations.id],
		}),
	})
);

// ============================================================================
// MEMBER PLAN RELATIONS
// ============================================================================

export const memberPlansRelations = relations(memberPlans, ({ one, many }) => ({
	location: one(locations, {
		fields: [memberPlans.locationId],
		references: [locations.id],
	}),
	group: one(groups, {
		fields: [memberPlans.groupId],
		references: [groups.id],
	}),
	contract: one(contractTemplates, {
		fields: [memberPlans.contractId],
		references: [contractTemplates.id],
	}),
	planPrograms: many(planPrograms),
	packages: many(memberPackages),
	subscriptions: many(memberSubscriptions),
	pricings: many(memberPlanPricing),
}));

export const memberPlanPricingRelations = relations(memberPlanPricing, ({ one, many }) => ({
	plan: one(memberPlans, {
		fields: [memberPlanPricing.memberPlanId],
		references: [memberPlans.id],
	}),
	subscriptions: many(memberSubscriptions),
	packages: many(memberPackages),
}));

export const memberSubscriptionRelations = relations(memberSubscriptions, ({ one, many }) => ({
	member: one(members, {
		fields: [memberSubscriptions.memberId],
		references: [members.id],
		relationName: "payer",
	}),
	parent: one(memberSubscriptions, {
		fields: [memberSubscriptions.parentId],
		references: [memberSubscriptions.id],
		relationName: "childs",
	}),

	pricing: one(memberPlanPricing, {
		fields: [memberSubscriptions.memberPlanPricingId],
		references: [memberPlanPricing.id],
	}),
	location: one(locations, {
		fields: [memberSubscriptions.locationId],
		references: [locations.id],
	}),
	contract: one(memberContracts, {
		fields: [memberSubscriptions.memberContractId],
		references: [memberContracts.id],
	}),
	childs: many(memberSubscriptions, {
		relationName: "childs",
	}),
	invoices: many(memberInvoices),
	reservations: many(reservations),
}));

export const memberPackagesRelations = relations(memberPackages, ({ one, many }) => ({

	pricing: one(memberPlanPricing, {
		fields: [memberPackages.memberPlanPricingId],
		references: [memberPlanPricing.id],
	}),
	location: one(locations, {
		fields: [memberPackages.locationId],
		references: [locations.id],
	}),
	member: one(members, {
		fields: [memberPackages.memberId],
		references: [members.id],
	}),
	parent: one(memberPackages, {
		fields: [memberPackages.parentId],
		references: [memberPackages.id],
	}),
	contract: one(memberContracts, {
		fields: [memberPackages.memberContractId],
		references: [memberContracts.id],
	}),
	reservations: many(reservations),
	childs: many(memberPackages, {
		relationName: "children",
	}),
}));

// ============================================================================
// PROGRAM RELATIONS
// ============================================================================

export const programsRelations = relations(programs, ({ one, many }) => ({
	location: one(locations, {
		fields: [programs.locationId],
		references: [locations.id],
	}),
	sessions: many(programSessions),
	instructor: one(staffs, {
		fields: [programs.instructorId],
		references: [staffs.id],
	}),
	memberSubscriptions: many(memberSubscriptions),
	memberPackages: many(memberPackages),
	planPrograms: many(planPrograms),
}));

export const programSessionsRelations = relations(programSessions, ({ one, many }) => ({
	program: one(programs, {
		fields: [programSessions.programId],
		references: [programs.id],
	}),
	staff: one(staffs, {
		fields: [programSessions.staffId],
		references: [staffs.id],
	}),
	reservations: many(reservations),
	waitlist: many(sessionWaitlist),
}));

export const planProgramsRelations = relations(planPrograms, ({ one }) => ({
	plan: one(memberPlans, {
		fields: [planPrograms.planId],
		references: [memberPlans.id],
	}),
	program: one(programs, {
		fields: [planPrograms.programId],
		references: [programs.id],
	}),
}));

export const sessionWaitlistRelations = relations(sessionWaitlist, ({ one }) => ({
	session: one(programSessions, {
		fields: [sessionWaitlist.sessionId],
		references: [programSessions.id],
	}),
	member: one(members, {
		fields: [sessionWaitlist.memberId],
		references: [members.id],
	}),
}));

// ============================================================================
// RESERVATION RELATIONS
// ============================================================================

export const reservationsRelations = relations(reservations, ({ one, many }) => ({
	attendance: one(attendances, {
		fields: [reservations.id],
		references: [attendances.reservationId],
	}),
	session: one(programSessions, {
		fields: [reservations.sessionId],
		references: [programSessions.id],
	}),
	member: one(members, {
		fields: [reservations.memberId],
		references: [members.id],
	}),
	memberSubscription: one(memberSubscriptions, {
		fields: [reservations.memberSubscriptionId],
		references: [memberSubscriptions.id],
	}),
	memberPackage: one(memberPackages, {
		fields: [reservations.memberPackageId],
		references: [memberPackages.id],
	}),
	location: one(locations, {
		fields: [reservations.locationId],
		references: [locations.id],
	}),
	program: one(programs, {
		fields: [reservations.programId],
		references: [programs.id],
	}),
	staff: one(staffs, {
		fields: [reservations.staffId],
		references: [staffs.id],
	}),
	originalReservation: one(reservations, {
		fields: [reservations.originalReservationId],
		references: [reservations.id],
		relationName: "makeUpReservations",
	}),
	exceptions: many(reservationExceptions, {
		relationName: "reservationExceptions",
	}),
}));

export const reservationExceptionsRelations = relations(reservationExceptions,
	({ one }) => ({
		reservation: one(reservations, {
			fields: [reservationExceptions.reservationId],
			references: [reservations.id],
			relationName: "reservationExceptions",
		}),
		location: one(locations, {
			fields: [reservationExceptions.locationId],
			references: [locations.id],
		}),
		session: one(programSessions, {
			fields: [reservationExceptions.sessionId],
			references: [programSessions.id],
		}),
		createdByStaff: one(staffs, {
			fields: [reservationExceptions.createdBy],
			references: [staffs.id],
		}),
	})
);

// ============================================================================
// ATTENDANCE RELATIONS
// ============================================================================

export const attendancesRelations = relations(attendances, ({ one }) => ({
	reservation: one(reservations, {
		fields: [attendances.reservationId],
		references: [reservations.id],
	}),
	program: one(programs, {
		fields: [attendances.programId],
		references: [programs.id],
	}),
	location: one(locations, {
		fields: [attendances.locationId],
		references: [locations.id],
	}),
	member: one(members, {
		fields: [attendances.memberId],
		references: [members.id],
	}),
	memberLocation: one(memberLocations, {
		fields: [attendances.memberId, attendances.locationId],
		references: [memberLocations.memberId, memberLocations.locationId],
	}),
}));

// ============================================================================
// TRANSACTION RELATIONS
// ============================================================================

export const transactionsRelations = relations(transactions, ({ one }) => ({
	member: one(members, {
		fields: [transactions.memberId],
		references: [members.id],
	}),
	location: one(locations, {
		fields: [transactions.locationId],
		references: [locations.id],
	}),
	invoice: one(memberInvoices, {
		fields: [transactions.invoiceId],
		references: [memberInvoices.id],
	}),
}));

// ============================================================================
// PAYMENT METHOD RELATIONS
// ============================================================================

export const paymentMethodsRelations = relations(paymentMethods, ({ many }) => ({
	memberPaymentMethods: many(memberPaymentMethods),
}));

export const memberPaymentMethodsRelations = relations(memberPaymentMethods, ({ one }) => ({
	member: one(members, {
		fields: [memberPaymentMethods.memberId],
		references: [members.id],
	}),
	location: one(locations, {
		fields: [memberPaymentMethods.locationId],
		references: [locations.id],
	}),
	paymentMethod: one(paymentMethods, {
		fields: [memberPaymentMethods.paymentMethodId],
		references: [paymentMethods.id],
	}),
	memberLocation: one(memberLocations, {
		fields: [memberPaymentMethods.memberId, memberPaymentMethods.locationId],
		references: [memberLocations.memberId, memberLocations.locationId],
		relationName: 'memberPaymentMethods',
	}),
}));

// ============================================================================
// INTEGRATION RELATIONS
// ============================================================================

export const integrationRelations = relations(integrations, ({ one }) => ({
	location: one(locations, {
		fields: [integrations.locationId],
		references: [locations.id],
	}),
}));

// ============================================================================
// TAX RELATIONS
// ============================================================================

export const taxRatesRelations = relations(taxRates, ({ one }) => ({
	location: one(locations, {
		fields: [taxRates.locationId],
		references: [locations.id],
	}),
}));

// ============================================================================
// PROMO RELATIONS
// ============================================================================

export const promosRelations = relations(promos, ({ one }) => ({
	location: one(locations, {
		fields: [promos.locationId],
		references: [locations.id],
	}),
}));

// ============================================================================
// MIGRATE MEMBER RELATIONS
// ============================================================================

export const migrateRelations = relations(migrateMembers, ({ one }) => ({
	location: one(locations, {
		fields: [migrateMembers.locationId],
		references: [locations.id],
	}),
	member: one(members, {
		fields: [migrateMembers.memberId],
		references: [members.id],
	}),
	pricing: one(memberPlanPricing, {
		fields: [migrateMembers.priceId],
		references: [memberPlanPricing.id],
	})
}));

// ============================================================================
// CHAT RELATIONS
// ============================================================================

export const chatsRelations = relations(chats, ({ one, many }) => ({
	started: one(members, {
		fields: [chats.startedBy],
		references: [members.id],
		relationName: "chatStartedBy",
	}),
	location: one(locations, {
		fields: [chats.locationId],
		references: [locations.id],
	}),
	group: one(groups, {
		fields: [chats.groupId],
		references: [groups.id],
	}),
	chatMembers: many(chatMembers),
	messages: many(messages),
}));

export const chatMembersRelations = relations(chatMembers, ({ one }) => ({
	chat: one(chats, {
		fields: [chatMembers.chatId],
		references: [chats.id],
		relationName: "chatChatMembers",
	}),
	user: one(users, {
		fields: [chatMembers.userId],
		references: [users.id],
		relationName: "chatMemberMember",
	}),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
	chat: one(chats, {
		fields: [messages.chatId],
		references: [chats.id],
	}),
	sender: one(users, {
		fields: [messages.senderId],
		references: [users.id],
	}),
	medias: many(media),
	reply: one(messages, {
		fields: [messages.replyId],
		references: [messages.id],
	}),
	reactions: many(reactions, { relationName: 'messageReactions' }),
}));

// ============================================================================
// GROUP RELATIONS
// ============================================================================

export const groupsRelations = relations(groups, ({ one, many }) => ({
	location: one(locations, {
		fields: [groups.locationId],
		references: [locations.id],
	}),
	feeds: many(userFeeds),
	groupMembers: many(groupMembers),
	posts: many(groupPosts),
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
	group: one(groups, {
		fields: [groupMembers.groupId],
		references: [groups.id],
	}),
	user: one(users, {
		fields: [groupMembers.userId],
		references: [users.id],
	}),
}));

export const groupPostsRelations = relations(groupPosts, ({ one, many }) => ({
	group: one(groups, {
		fields: [groupPosts.groupId],
		references: [groups.id],
	}),
	author: one(users, {
		fields: [groupPosts.authorId],
		references: [users.id],
	}),
	feeds: many(userFeeds),
	comments: many(comments),
	medias: many(media),
}));

// ============================================================================
// MOMENT RELATIONS
// ============================================================================

export const momentsRelations = relations(moments, ({ one, many }) => ({
	author: one(users, {
		fields: [moments.userId],
		references: [users.id],
	}),
	feeds: many(userFeeds),
	comments: many(comments),
	likes: many(momentLikes),
	medias: many(media),
}));

export const momentLikesRelations = relations(momentLikes, ({ one }) => ({
	moment: one(moments, {
		fields: [momentLikes.momentId],
		references: [moments.id],
	}),
	user: one(users, {
		fields: [momentLikes.userId],
		references: [users.id],
	}),
}));

export const userFeedsRelations = relations(userFeeds, ({ one, many }) => ({
	author: one(users, {
		fields: [userFeeds.authorId],
		references: [users.id],
		relationName: 'authorFeeds',
	}),
	moment: one(moments, {
		fields: [userFeeds.momentId],
		references: [moments.id],
	}),
	post: one(groupPosts, {
		fields: [userFeeds.postId],
		references: [groupPosts.id],
	}),
	group: one(groups, {
		fields: [userFeeds.groupId],
		references: [groups.id],
	}),
	user: one(users, {
		fields: [userFeeds.userId],
		references: [users.id],
		relationName: 'userFeeds',
	}),
}));

// ============================================================================
// MEDIA RELATIONS
// ============================================================================

export const mediaRelations = relations(media, ({ one }) => ({
	message: one(messages, {
		fields: [media.ownerId],
		references: [messages.id],
	}),
	post: one(groupPosts, {
		fields: [media.ownerId],
		references: [groupPosts.id],
	}),
	moment: one(moments, {
		fields: [media.ownerId],
		references: [moments.id],
	}),
}));

// ============================================================================
// COMMENT RELATIONS
// ============================================================================

export const commentsRelations = relations(comments, ({ one, many }) => ({
	post: one(groupPosts, {
		fields: [comments.ownerId],
		references: [groupPosts.id],
	}),
	moment: one(moments, {
		fields: [comments.ownerId],
		references: [moments.id],
	}),
	parent: one(comments, {
		fields: [comments.parentId],
		references: [comments.id],
		relationName: "replies",
	}),
	user: one(users, {
		fields: [comments.userId],
		references: [users.id],
	}),

	replies: many(comments, {
		relationName: "replies",
	}),
}));

// ============================================================================
// REACTION RELATIONS
// ============================================================================

export const reactionsRelations = relations(reactions, ({ one }) => ({
	user: one(users, {
		fields: [reactions.userId],
		references: [users.id],
	}),
	message: one(messages, {
		fields: [reactions.ownerId],
		references: [messages.id],
	}),
	post: one(groupPosts, {
		fields: [reactions.ownerId],
		references: [groupPosts.id],
	}),
	moment: one(moments, {
		fields: [reactions.ownerId],
		references: [moments.id],
	}),
	comment: one(comments, {
		fields: [reactions.ownerId],
		references: [comments.id],
	}),
}));

// ============================================================================
// FRIEND RELATIONS
// ============================================================================

export const friendsRelations = relations(friends, ({ one }) => ({
	requester: one(users, {
		fields: [friends.requesterId],
		references: [users.id],
		relationName: "friendRequester",
	}),
	addressee: one(users, {
		fields: [friends.addresseeId],
		references: [users.id],
		relationName: "friendAddressee",
	}),
}));

// ============================================================================
// SUPPORT RELATIONS
// ============================================================================

export const supportAssistantsRelations = relations(
	supportAssistants,
	({ one, many }) => ({
		location: one(locations, {
			fields: [supportAssistants.locationId],
			references: [locations.id],
		}),
		conversations: many(supportConversations),
		triggers: many(supportTriggers),
	})
);

export const supportConversationsRelations = relations(supportConversations, ({ one, many }) => ({
	assistant: one(supportAssistants, {
		fields: [supportConversations.supportAssistantId],
		references: [supportAssistants.id],
	}),
	member: one(members, {
		fields: [supportConversations.memberId],
		references: [members.id],
	}),
	messages: many(supportMessages),
}));

export const supportMessagesRelations = relations(supportMessages, ({ one }) => ({
	conversation: one(supportConversations, {
		fields: [supportMessages.conversationId],
		references: [supportConversations.id],
	}),
}));

export const supportTriggersRelations = relations(supportTriggers, ({ one }) => ({
	assistant: one(supportAssistants, {
		fields: [supportTriggers.supportAssistantId],
		references: [supportAssistants.id],
	}),
}));
