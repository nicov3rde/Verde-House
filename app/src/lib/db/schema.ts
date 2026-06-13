import { pgTable, text, timestamp, boolean, integer, real, uuid, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Enums ───────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum('user_role', ['user', 'business', 'agent', 'admin']);
export const claimStatusEnum = pgEnum('claim_status', ['pending', 'verified', 'paid', 'rejected']);
export const feedPreferenceEnum = pgEnum('feed_preference', ['humans', 'agents', 'both']);
export const postTypeEnum = pgEnum('post_type', ['organic', 'sponsored', 'bounty_fulfillment']);

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
	id: uuid('id').primaryKey().defaultRandom(),
	handle: text('handle').notNull().unique(),
	displayName: text('display_name').notNull(),
	email: text('email').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	bio: text('bio').default(''),
	avatarUrl: text('avatar_url').default(''),
	role: userRoleEnum('role').default('user').notNull(),
	isAgent: boolean('is_agent').default(false).notNull(),
	// World ID
	worldIdVerified: boolean('world_id_verified').default(false).notNull(),
	worldIdNullifier: text('world_id_nullifier').unique(),
	// ENS
	ensName: text('ens_name'),
	// Profile settings
	feedPreference: feedPreferenceEnum('feed_preference').default('both').notNull(),
	earningsPrivate: boolean('earnings_private').default(true).notNull(),
	// Expertise scores (stored here, also mirrored to ENS text records)
	expertisePizza: integer('expertise_pizza').default(0),
	expertiseCoffee: integer('expertise_coffee').default(0),
	expertiseNightlife: integer('expertise_nightlife').default(0),
	expertiseGym: integer('expertise_gym').default(0),
	// Business info (if role = business)
	businessName: text('business_name'),
	businessAddress: text('business_address'),
	businessLat: real('business_lat'),
	businessLng: real('business_lng'),
	businessTier: text('business_tier').default('free'), // free | premium | business
	// Timestamps
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Sessions ────────────────────────────────────────────────────────────────

export const sessions = pgTable('sessions', {
	id: text('id').primaryKey(),
	userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: timestamp('expires_at').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Posts ───────────────────────────────────────────────────────────────────

export const posts = pgTable('posts', {
	id: uuid('id').primaryKey().defaultRandom(),
	authorId: uuid('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	caption: text('caption').default(''),
	imageUrl: text('image_url'),
	videoUrl: text('video_url'),
	// Location
	placeName: text('place_name'),
	placeAddress: text('place_address'),
	lat: real('lat'),
	lng: real('lng'),
	// Verified visit: set by server when post timestamp + coords match user's location
	verifiedVisit: boolean('verified_visit').default(false).notNull(),
	// Type
	postType: postTypeEnum('post_type').default('organic').notNull(),
	isAgent: boolean('is_agent').default(false).notNull(),
	// Sponsored
	sponsoredByBusinessId: uuid('sponsored_by_business_id').references(() => users.id),
	// Bounty fulfillment
	bountyClaimId: uuid('bounty_claim_id'),
	// Engagement counts (denormalized for speed)
	likeCount: integer('like_count').default(0).notNull(),
	commentCount: integer('comment_count').default(0).notNull(),
	saveCount: integer('save_count').default(0).notNull(),
	// Timestamps
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Follows ─────────────────────────────────────────────────────────────────

export const follows = pgTable('follows', {
	id: uuid('id').primaryKey().defaultRandom(),
	followerId: uuid('follower_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	followingId: uuid('following_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Likes ───────────────────────────────────────────────────────────────────

export const likes = pgTable('likes', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
	createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Saves ───────────────────────────────────────────────────────────────────

export const saves = pgTable('saves', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
	createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Comments ────────────────────────────────────────────────────────────────

export const comments = pgTable('comments', {
	id: uuid('id').primaryKey().defaultRandom(),
	postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
	authorId: uuid('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	body: text('body').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Notifications ───────────────────────────────────────────────────────────

export const notifications = pgTable('notifications', {
	id: uuid('id').primaryKey().defaultRandom(),
	recipientId: uuid('recipient_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	actorId: uuid('actor_id').references(() => users.id, { onDelete: 'cascade' }),
	type: text('type').notNull(), // 'like' | 'comment' | 'follow' | 'bounty_verified' | 'bounty_paid'
	postId: uuid('post_id').references(() => posts.id, { onDelete: 'cascade' }),
	message: text('message'),
	read: boolean('read').default(false).notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Messages ────────────────────────────────────────────────────────────────

export const conversations = pgTable('conversations', {
	id: uuid('id').primaryKey().defaultRandom(),
	participantAId: uuid('participant_a_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	participantBId: uuid('participant_b_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	lastMessageAt: timestamp('last_message_at').defaultNow().notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const messages = pgTable('messages', {
	id: uuid('id').primaryKey().defaultRandom(),
	conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
	senderId: uuid('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	body: text('body'),
	imageUrl: text('image_url'),
	read: boolean('read').default(false).notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Bounties ────────────────────────────────────────────────────────────────

export const bounties = pgTable('bounties', {
	id: uuid('id').primaryKey().defaultRandom(),
	creatorId: uuid('creator_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	title: text('title').notNull(),
	description: text('description').notNull(),
	// Location / geofence
	placeName: text('place_name'),
	placeAddress: text('place_address'),
	lat: real('lat'),
	lng: real('lng'),
	radiusMiles: real('radius_miles').default(2).notNull(),
	// Reward
	rewardUsdc: real('reward_usdc').notNull(),
	rewardPrivate: boolean('reward_private').default(true).notNull(),
	// Capacity
	maxClaims: integer('max_claims').default(100).notNull(),
	claimCount: integer('claim_count').default(0).notNull(),
	// Status
	active: boolean('active').default(true).notNull(),
	// Payment / escrow
	escrowTxHash: text('escrow_tx_hash'),
	stripePaymentIntentId: text('stripe_payment_intent_id'),
	// Timestamps
	expiresAt: timestamp('expires_at'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Bounty Claims ───────────────────────────────────────────────────────────

export const bountyClaims = pgTable('bounty_claims', {
	id: uuid('id').primaryKey().defaultRandom(),
	bountyId: uuid('bounty_id').notNull().references(() => bounties.id, { onDelete: 'cascade' }),
	userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	status: claimStatusEnum('status').default('pending').notNull(),
	// Fulfillment
	fulfillmentPostId: uuid('fulfillment_post_id').references(() => posts.id),
	// Agent verification result
	agentVerified: boolean('agent_verified'),
	agentNotes: text('agent_notes'),
	// Payment
	payoutTxHash: text('payout_tx_hash'),
	paidAt: timestamp('paid_at'),
	// Timestamps
	acceptedAt: timestamp('accepted_at').defaultNow().notNull(),
	verifiedAt: timestamp('verified_at'),
});

// ─── Sponsored Campaigns ─────────────────────────────────────────────────────

export const sponsoredCampaigns = pgTable('sponsored_campaigns', {
	id: uuid('id').primaryKey().defaultRandom(),
	businessId: uuid('business_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	title: text('title').notNull(),
	// The sponsored post content
	imageUrl: text('image_url'),
	caption: text('caption'),
	ctaText: text('cta_text'),
	ctaUrl: text('cta_url'),
	// Targeting
	targetLat: real('target_lat'),
	targetLng: real('target_lng'),
	targetRadiusMiles: real('target_radius_miles').default(5),
	// Budget
	budgetUsdc: real('budget_usdc'),
	impressionCount: integer('impression_count').default(0).notNull(),
	active: boolean('active').default(true).notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	expiresAt: timestamp('expires_at'),
});

// ─── Transactions ────────────────────────────────────────────────────────────

export const transactions = pgTable('transactions', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	type: text('type').notNull(), // 'bounty_payout' | 'business_deposit' | 'sponsored_payment'
	amountUsdc: real('amount_usdc').notNull(),
	private: boolean('private').default(true).notNull(),
	txHash: text('tx_hash'),
	stripePaymentIntentId: text('stripe_payment_intent_id'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Relations ───────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
	posts: many(posts),
	followers: many(follows, { relationName: 'following' }),
	following: many(follows, { relationName: 'follower' }),
	likes: many(likes),
	saves: many(saves),
	comments: many(comments),
	notifications: many(notifications),
	bounties: many(bounties),
	bountyClaims: many(bountyClaims),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
	author: one(users, { fields: [posts.authorId], references: [users.id] }),
	likes: many(likes),
	saves: many(saves),
	comments: many(comments),
}));

export const followsRelations = relations(follows, ({ one }) => ({
	follower: one(users, { fields: [follows.followerId], references: [users.id], relationName: 'follower' }),
	following: one(users, { fields: [follows.followingId], references: [users.id], relationName: 'following' }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
	post: one(posts, { fields: [comments.postId], references: [posts.id] }),
	author: one(users, { fields: [comments.authorId], references: [users.id] }),
}));

export const bountiesRelations = relations(bounties, ({ one, many }) => ({
	creator: one(users, { fields: [bounties.creatorId], references: [users.id] }),
	claims: many(bountyClaims),
}));

export const bountyClaimsRelations = relations(bountyClaims, ({ one }) => ({
	bounty: one(bounties, { fields: [bountyClaims.bountyId], references: [bounties.id] }),
	user: one(users, { fields: [bountyClaims.userId], references: [users.id] }),
	fulfillmentPost: one(posts, { fields: [bountyClaims.fulfillmentPostId], references: [posts.id] }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
	participantA: one(users, { fields: [conversations.participantAId], references: [users.id] }),
	participantB: one(users, { fields: [conversations.participantBId], references: [users.id] }),
	messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
	conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
	sender: one(users, { fields: [messages.senderId], references: [users.id] }),
}));
