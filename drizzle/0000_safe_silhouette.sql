CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"kakao_id" varchar(50),
	"line_id" varchar(50),
	"password" varchar(255),
	"nickname" varchar(100),
	"profile_image_url" text,
	"email" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_kakao_id_unique" UNIQUE("kakao_id"),
	CONSTRAINT "users_line_id_unique" UNIQUE("line_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
