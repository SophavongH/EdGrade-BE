CREATE TYPE "public"."role" AS ENUM('admin', 'user');--> statement-breakpoint
CREATE TABLE "classrooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"total_students" integer DEFAULT 0,
	"archived" boolean DEFAULT false,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" varchar(8) DEFAULT '' NOT NULL,
	"name" varchar(255) NOT NULL,
	"avatar" text,
	"gender" text NOT NULL,
	"parent_phone" varchar(32),
	"dob" varchar(32),
	"address" text,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "students_student_id_unique" UNIQUE("student_id")
);
--> statement-breakpoint
CREATE TABLE "users_table" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255),
	"email" text NOT NULL,
	"role" "role" DEFAULT 'user' NOT NULL,
	"password" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_table_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE classroom_students (
  id serial PRIMARY KEY,
  classroom_id integer NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  UNIQUE(classroom_id, student_id)
);
--> statement-breakpoint
CREATE TABLE report_card_scores (
  id SERIAL PRIMARY KEY,
  report_card_id INTEGER NOT NULL,
  student_id UUID NOT NULL,
  absent TEXT,
  scores JSONB,
  total TEXT,
  average TEXT,
  grade TEXT,
  rank TEXT,
  UNIQUE (report_card_id, student_id)
);

CREATE TABLE report_card_tokens (
  id SERIAL PRIMARY KEY,
  student_id UUID NOT NULL,
  report_card_id INTEGER NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);