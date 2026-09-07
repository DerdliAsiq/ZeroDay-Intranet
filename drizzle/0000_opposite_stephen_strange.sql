CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('submitted', 'reviewed', 'returned');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(240) NOT NULL,
	"instructor" varchar(160) NOT NULL,
	"track" varchar(120) NOT NULL,
	"room" varchar(120),
	"startsAt" timestamp NOT NULL,
	"endsAt" timestamp NOT NULL,
	"createdBy" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"taskId" integer NOT NULL,
	"studentId" integer NOT NULL,
	"note" text,
	"fileName" varchar(255),
	"fileUrl" text,
	"fileData" text,
	"fileType" varchar(120),
	"fileSize" integer,
	"status" "submission_status" DEFAULT 'submitted' NOT NULL,
	"feedback" text,
	"submittedAt" timestamp DEFAULT now() NOT NULL,
	"reviewedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(240) NOT NULL,
	"description" text NOT NULL,
	"dueAt" timestamp,
	"points" integer DEFAULT 100 NOT NULL,
	"status" "task_status" DEFAULT 'active' NOT NULL,
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64),
	"name" text,
	"email" varchar(320),
	"passwordHash" text,
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
