import { text, pgTable, timestamp, pgEnum, boolean, serial, integer, varchar, uuid, jsonb, unique } from 'drizzle-orm/pg-core';

export const ROLE_ENUM = pgEnum('role', ['admin', 'user']);

export const usersTable = pgTable('users_table', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }),
  email: text('email').notNull().unique(),
  role: ROLE_ENUM('role').notNull().default('user'),
  password: text('password').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  status: text('status').default('active'), // active, deactivated
});
export const classrooms = pgTable("classrooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  totalStudents: integer("total_students").default(0),
  archived: boolean("archived").default(false),
  userId: uuid('user_id').notNull(), // FK to usersTable
});

export const students = pgTable('students', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: varchar('student_id', { length: 8 }).unique(),
  name: varchar('name', { length: 255 }).notNull(),
  avatar: text('avatar'),
  gender: text('gender').notNull(),
  parentPhone: varchar('parent_phone', { length: 32 }),
  dob: varchar('dob', { length: 32 }),
  address: text('address'),
  userId: uuid('user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const classroomStudents = pgTable('classroom_students', {
  id: serial('id').primaryKey(),
  classroomId: integer('classroom_id').notNull(),
  studentId: uuid('student_id').notNull(),
});

export const reportCards = pgTable('report_cards', {
  id: serial('id').primaryKey(),
  classroomId: integer('classroom_id').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  subjects: text('subjects').array(), // <-- Add this line
});

export const reportCardScores = pgTable("report_card_scores", {
  id: serial("id").primaryKey(),
  reportCardId: integer("report_card_id").notNull(),
  studentId: uuid("student_id").notNull(),
  absent: text("absent"),
  scores: jsonb("scores"),
  total: text("total"),
  average: text("average"),
  grade: text("grade"),
  rank: text("rank"),
}, (table) => ({
  uniqueReportCardStudent: unique().on(table.reportCardId, table.studentId),
}));

export const reportCardTokens = pgTable("report_card_tokens", {
  id: serial("id").primaryKey(),
  studentId: uuid("student_id").notNull(),
  reportCardId: integer("report_card_id").notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const userSubjects = pgTable("user_subjects", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
});
