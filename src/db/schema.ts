import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// 1. The Chat Threads Table
export const chats = pgTable('chats', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(), // Links directly to Clerk's user ID
  title: text('title').notNull().default('New Search'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2. The Individual Messages Table
export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  chatId: uuid('chat_id').references(() => chats.id, { onDelete: 'cascade' }).notNull(),
  role: text('role', { enum: ['user', 'assistant', 'system', 'tool'] }).notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
