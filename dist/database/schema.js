"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userSubjects = exports.reportCardTokens = exports.reportCardScores = exports.reportCards = exports.classroomStudents = exports.students = exports.classrooms = exports.usersTable = exports.ROLE_ENUM = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.ROLE_ENUM = (0, pg_core_1.pgEnum)('role', ['admin', 'user']);
exports.usersTable = (0, pg_core_1.pgTable)('users_table', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }),
    avatar: (0, pg_core_1.text)('avatar'),
    email: (0, pg_core_1.text)('email').notNull().unique(),
    role: (0, exports.ROLE_ENUM)('role').notNull().default('user'),
    password: (0, pg_core_1.text)('password').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow(),
    status: (0, pg_core_1.text)('status').default('active'), // active, deactivated
});
exports.classrooms = (0, pg_core_1.pgTable)("classrooms", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    name: (0, pg_core_1.text)("name").notNull(),
    color: (0, pg_core_1.text)("color").notNull(),
    totalStudents: (0, pg_core_1.integer)("total_students").default(0),
    archived: (0, pg_core_1.boolean)("archived").default(false),
    userId: (0, pg_core_1.uuid)('user_id').notNull(), // FK to usersTable
});
exports.students = (0, pg_core_1.pgTable)('students', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    studentId: (0, pg_core_1.varchar)('student_id', { length: 8 }).unique(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    avatar: (0, pg_core_1.text)('avatar'),
    gender: (0, pg_core_1.text)('gender').notNull(),
    parentPhone: (0, pg_core_1.varchar)('parent_phone', { length: 32 }),
    dob: (0, pg_core_1.varchar)('dob', { length: 32 }),
    address: (0, pg_core_1.text)('address'),
    userId: (0, pg_core_1.uuid)('user_id').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow(),
});
exports.classroomStudents = (0, pg_core_1.pgTable)('classroom_students', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    classroomId: (0, pg_core_1.integer)('classroom_id').notNull(),
    studentId: (0, pg_core_1.uuid)('student_id').notNull(),
});
exports.reportCards = (0, pg_core_1.pgTable)('report_cards', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    classroomId: (0, pg_core_1.integer)('classroom_id').notNull(),
    title: (0, pg_core_1.varchar)('title', { length: 255 }).notNull(),
    createdBy: (0, pg_core_1.uuid)('created_by').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow(),
    subjects: (0, pg_core_1.text)('subjects').array(), // <-- stores selected subjects
});
exports.reportCardScores = (0, pg_core_1.pgTable)("report_card_scores", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    reportCardId: (0, pg_core_1.integer)("report_card_id").notNull(),
    studentId: (0, pg_core_1.uuid)("student_id").notNull(),
    absent: (0, pg_core_1.text)("absent"),
    scores: (0, pg_core_1.jsonb)("scores"),
    total: (0, pg_core_1.text)("total"),
    average: (0, pg_core_1.text)("average"),
    grade: (0, pg_core_1.text)("grade"),
    rank: (0, pg_core_1.text)("rank"),
}, (table) => ({
    uniqueReportCardStudent: (0, pg_core_1.unique)().on(table.reportCardId, table.studentId),
}));
exports.reportCardTokens = (0, pg_core_1.pgTable)("report_card_tokens", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    studentId: (0, pg_core_1.uuid)("student_id").notNull(),
    reportCardId: (0, pg_core_1.integer)("report_card_id").notNull(),
    token: (0, pg_core_1.varchar)("token", { length: 64 }).notNull().unique(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow(),
});
exports.userSubjects = (0, pg_core_1.pgTable)("user_subjects", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    subject: (0, pg_core_1.varchar)("subject", { length: 255 }).notNull(),
});
