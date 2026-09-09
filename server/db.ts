import { desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { InsertLesson, InsertSubmission, InsertTask, InsertUser, lessons, submissions, tasks, users } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch {
      _db = null;
    }
  }
  return _db;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return r[0];
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
  return r[0];
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return r[0];
}

export async function listUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function createUser(v: InsertUser) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.insert(users).values(v).returning();
  return rows[0];
}

export async function updateUserPassword(id: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db
    .update(users)
    .set({ passwordHash, sessionVersion: sql`${users.sessionVersion} + 1` })
    .where(eq(users.id, id));
}

export async function touchLastSignIn(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, id));
}

export async function deleteUser(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.delete(users).where(eq(users.id, id));
}

export async function upsertUser(user: Partial<InsertUser> & { openId?: string | null; email?: string | null }) {
  const db = await getDb();
  if (!db) return;
  if (user.email) {
    const existing = await getUserByEmail(user.email);
    if (existing) {
      await db.update(users).set({ ...user, lastSignedIn: new Date() }).where(eq(users.id, existing.id));
      return;
    }
    await db.insert(users).values({ ...user, lastSignedIn: new Date() } as InsertUser);
    return;
  }
  if (user.openId) {
    const existing = await getUserByOpenId(user.openId);
    if (existing) {
      await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, existing.id));
      return;
    }
    await db.insert(users).values(user as InsertUser);
  }
}

export async function listTasks(includeArchived = false) {
  const db = await getDb();
  if (!db) return [];
  if (includeArchived) return db.select().from(tasks).orderBy(desc(tasks.createdAt));
  return db.select().from(tasks).where(eq(tasks.status, "active")).orderBy(desc(tasks.createdAt));
}

export async function setTaskStatus(id: number, status: "active" | "archived") {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.update(tasks).set({ status }).where(eq(tasks.id, id));
}

export async function deleteTask(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.delete(tasks).where(eq(tasks.id, id));
}

export async function createTask(v: InsertTask) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.insert(tasks).values(v).returning();
  return rows[0];
}

export async function listSubmissions(studentId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (studentId) return db.select().from(submissions).where(eq(submissions.studentId, studentId)).orderBy(desc(submissions.submittedAt));
  return db.select().from(submissions).orderBy(desc(submissions.submittedAt));
}

export async function createSubmission(v: InsertSubmission) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.insert(submissions).values(v);
}

export async function listLessons(includeArchived = false) {
  const db = await getDb();
  if (!db) return [];
  if (includeArchived) return db.select().from(lessons).orderBy(lessons.startsAt);
  return db.select().from(lessons).where(eq(lessons.status, "active")).orderBy(lessons.startsAt);
}

export async function setLessonStatus(id: number, status: "active" | "archived") {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.update(lessons).set({ status }).where(eq(lessons.id, id));
}

export async function deleteLesson(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.delete(lessons).where(eq(lessons.id, id));
}

export async function createLesson(v: InsertLesson) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.insert(lessons).values(v);
}

export async function updateSubmission(id: number, status: "reviewed" | "returned", feedback?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.update(submissions).set({ status, feedback: feedback ?? null, reviewedAt: new Date() }).where(eq(submissions.id, id));
}

export async function dashboardStats() {
  const db = await getDb();
  if (!db) return { tasks: 0, submissions: 0, lessons: 0, students: 0 };
  const [t, s, l, u] = await Promise.all([
    db.select({ n: sql<number>`count(*)` }).from(tasks).where(eq(tasks.status, "active")),
    db.select({ n: sql<number>`count(*)` }).from(submissions),
    db.select({ n: sql<number>`count(*)` }).from(lessons).where(eq(lessons.status, "active")),
    db.select({ n: sql<number>`count(*)` }).from(users).where(eq(users.role, "user")),
  ]);
  return { tasks: Number(t[0]?.n ?? 0), submissions: Number(s[0]?.n ?? 0), lessons: Number(l[0]?.n ?? 0), students: Number(u[0]?.n ?? 0) };
}

export async function ensureAdmin(email: string, passwordHash: string, name = "Administrator") {
  const db = await getDb();
  if (!db) return;
  const existing = await getUserByEmail(email);
  if (existing) return;
  await db.insert(users).values({ email: email.toLowerCase().trim(), passwordHash, name, role: "admin", loginMethod: "email" });
}
