CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"kakao_id" varchar(50) NOT NULL,
	"nickname" varchar(100) NOT NULL,
	"profile_image_url" text,
	"email" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_kakao_id_unique" UNIQUE("kakao_id")
);
