import { pgTable, serial, varchar, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { users } from './user';

export const characters = pgTable('characters', {
  id: serial('id').primaryKey(),
  creatorId: integer('creator_id').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  characterImageUrl: text('character_image_url').notNull(),

  // TODO(Danu): 캐릭터의 성격을 결정하는 부분은 별도의 테이블로 추후 분리
  personality: text('personality').notNull(),
  background: text('background').notNull(),

  // TODO(Danu): 나중에 더 고도화할 부분 (summary는 별도의 테이블로 분리)
  extraDetails: text('extra_details'),
  summary: text('summary'),

  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Character = typeof characters.$inferSelect;
export type NewCharacter = typeof characters.$inferInsert;
