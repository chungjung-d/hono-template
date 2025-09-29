import { pgTable, serial, varchar, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  kakaoId: varchar('kakao_id', { length: 50 }).unique(),
  lineId: varchar('line_id', { length: 50 }).unique(),
  password: varchar('password', { length: 255 }),
  nickname: varchar('nickname', { length: 100 }),
  profileImageUrl: text('profile_image_url'),
  email: varchar('email', { length: 255 }).unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
