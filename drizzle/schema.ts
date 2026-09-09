import { integer, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin"]);
export const taskStatusEnum = pgEnum("task_status", ["active", "archived"]);
export const submissionStatusEnum = pgEnum("submission_status", ["submitted", "reviewed", "returned"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: text("passwordHash"),
  sessionVersion: integer("sessionVersion").default(0).notNull(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 240 }).notNull(),
  description: text("description").notNull(),
  dueAt: timestamp("dueAt"),
  points: integer("points").default(100).notNull(),
  status: taskStatusEnum("status").default("active").notNull(),
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  taskId: integer("taskId").notNull(),
  studentId: integer("studentId").notNull(),
  note: text("note"),
  fileName: varchar("fileName", { length: 255 }),
  fileUrl: text("fileUrl"),
  fileData: text("fileData"),
  fileType: varchar("fileType", { length: 120 }),
  fileSize: integer("fileSize"),
  status: submissionStatusEnum("status").default("submitted").notNull(),
  feedback: text("feedback"),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
});

export const lessons = pgTable("lessons", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 240 }).notNull(),
  instructor: varchar("instructor", { length: 160 }).notNull(),
  track: varchar("track", { length: 120 }).notNull(),
  room: varchar("room", { length: 120 }),
  startsAt: timestamp("startsAt").notNull(),
  endsAt: timestamp("endsAt").notNull(),
  createdBy: integer("createdBy").notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type Lesson = typeof lessons.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;
export type InsertLesson = typeof lessons.$inferInsert;
export type InsertSubmission = typeof submissions.$inferInsert;
