CREATE TABLE "characters" (
	"id" serial PRIMARY KEY NOT NULL,
	"creator_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"character_image_url" text NOT NULL,
	"personality" text NOT NULL,
	"background" text NOT NULL,
	"extra_details" text,
	"summary" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
