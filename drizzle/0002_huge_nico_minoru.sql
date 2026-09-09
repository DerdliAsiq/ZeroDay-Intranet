CREATE TYPE "public"."lesson_status" AS ENUM('active', 'archived');--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "status" "lesson_status" DEFAULT 'active' NOT NULL;