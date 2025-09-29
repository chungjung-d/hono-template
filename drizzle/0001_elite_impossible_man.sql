ALTER TABLE "users" ALTER COLUMN "kakao_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password" varchar(255);