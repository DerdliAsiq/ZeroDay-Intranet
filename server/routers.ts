import { COOKIE_NAME, SESSION_MS } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { hashPassword, signSession, verifyPassword } from "./_core/auth";
import { assertPassword } from "./_core/password";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, mentorProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  countPendingSubmissionsByTask,
  createLesson,
  createSubmission,
  createTask,
  createUser,
  dashboardStats,
  deleteLesson,
  deleteTaskWithSubmissions,
  deleteUserCascade,
  getSubmissionById,
  getTaskById,
  getUserByEmail,
  listLessons,
  listSubmissions,
  listTasks,
  listStudents,
  listUsers,
  setLessonStatus,
  setUserRole,
  setTaskStatus,
  touchLastSignIn,
  updateSubmission,
  updateUserPassword,
} from "./db";

const MAX_FILE_BYTES = 100_000_000;
const DEFAULT_ALLOWED_TYPES = ["pdf", "docx", "zip", "txt", "md", "png", "jpg"];
const FORBIDDEN_EXTENSIONS = ["exe", "msi", "bat", "cmd", "sh", "com", "scr", "ps1", "vbs", "reg", "dll", "sys"];

function fileExtension(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i + 1).toLowerCase();
}

function isStaff(role: string) {
  return role === "admin" || role === "mentor";
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((o) => {
      if (!o.ctx.user) return null;
      const { passwordHash: _omit, ...safe } = o.ctx.user as Record<string, unknown>;
      return safe;
    }),
    login: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const user = await getUserByEmail(input.email);
        if (!user?.passwordHash) throw new TRPCError({ code: "UNAUTHORIZED", message: "Email və ya şifrə yanlışdır" });
        const ok = await verifyPassword(input.password, user.passwordHash);
        if (!ok) throw new TRPCError({ code: "UNAUTHORIZED", message: "Email və ya şifrə yanlışdır" });
        const token = await signSession(user.id, user.sessionVersion ?? 0);
        ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: SESSION_MS });
        await touchLastSignIn(user.id);
        const { passwordHash: _omit, ...safe } = user as Record<string, unknown>;
        return safe;
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
    changePassword: protectedProcedure
      .input(z.object({ current: z.string().min(1), next: z.string().min(10) }))
      .mutation(async ({ ctx, input }) => {
        assertPassword(input.next);
        const full = await getUserByEmail(ctx.user.email ?? "");
        if (!full?.passwordHash) throw new TRPCError({ code: "BAD_REQUEST", message: "Şifrə təyin edilməyib" });
        const ok = await verifyPassword(input.current, full.passwordHash);
        if (!ok) throw new TRPCError({ code: "UNAUTHORIZED", message: "Hazırkı şifrə yanlışdır" });
        await updateUserPassword(ctx.user.id, await hashPassword(input.next));
        return { success: true } as const;
      }),
  }),
  admin: router({
    users: adminProcedure.query(async () => {
      const rows = await listUsers();
      return rows.map((u) => {
        const { passwordHash: _omit, ...safe } = u as Record<string, unknown>;
        return safe;
      });
    }),
    createUser: adminProcedure
      .input(z.object({ email: z.string().email(), name: z.string().min(1), password: z.string().min(10), role: z.enum(["admin", "mentor", "student"]).default("student") }))
      .mutation(async ({ input }) => {
        assertPassword(input.password);
        const exists = await getUserByEmail(input.email);
        if (exists) throw new TRPCError({ code: "CONFLICT", message: "Bu email artıq mövcuddur" });
        const row = await createUser({
          email: input.email.toLowerCase().trim(),
          name: input.name,
          passwordHash: await hashPassword(input.password),
          role: input.role,
          loginMethod: "email",
        });
        const { passwordHash: _omit, ...safe } = row as Record<string, unknown>;
        return safe;
      }),
    resetPassword: adminProcedure
      .input(z.object({ id: z.number(), password: z.string().min(10) }))
      .mutation(async ({ input }) => {
        assertPassword(input.password);
        await updateUserPassword(input.id, await hashPassword(input.password));
        return { success: true } as const;
      }),
    deleteUser: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      if (input.id === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Öz hesabınızı silə bilməzsiniz" });
      await deleteUserCascade(input.id);
      return { success: true } as const;
    }),
    setRole: adminProcedure
      .input(z.object({ id: z.number(), role: z.enum(["admin", "mentor", "student"]) }))
      .mutation(async ({ ctx, input }) => {
        if (input.id === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Öz rolunuzu dəyişə bilməzsiniz" });
        await setUserRole(input.id, input.role);
        return { success: true } as const;
      }),
  }),
  dashboard: protectedProcedure.query(async ({ ctx }) => {
    const staff = isStaff(ctx.user.role);
    if (staff) {
      const [tasks, submissions, lessons] = await Promise.all([
        listTasks({ userId: ctx.user.id, staff }),
        listSubmissions(undefined),
        listLessons(),
      ]);
      return { stats: await dashboardStats({ userId: ctx.user.id, staff }), tasks, lessons, submissions };
    }
    const [tasks, submissions, lessons] = await Promise.all([
      listTasks({ userId: ctx.user.id, onlyUnexpired: true }),
      listSubmissions(ctx.user.id),
      listLessons(),
    ]);
    const stats = await dashboardStats({ userId: ctx.user.id, prefetched: { tasks, submissions } });
    return { stats, tasks, lessons, submissions };
  }),
  students: router({
    list: mentorProcedure.query(() => listStudents()),
  }),
  tasks: router({
    list: protectedProcedure.query(({ ctx }) =>
      isStaff(ctx.user.role)
        ? listTasks({ userId: ctx.user.id, staff: true })
        : listTasks({ userId: ctx.user.id, onlyUnexpired: true })
    ),
    listAll: mentorProcedure.query(() => listTasks({ includeArchived: true })),
    create: mentorProcedure
      .input(z.object({ title: z.string().min(3), description: z.string().min(3), dueAt: z.string().optional(), allowedTypes: z.array(z.string()).optional(), assigneeIds: z.array(z.number().int()).optional() }))
      .mutation(({ ctx, input }) => {
        let dueAt: Date | null = null;
        if (input.dueAt) {
          dueAt = new Date(input.dueAt);
          if (Number.isNaN(dueAt.getTime())) throw new TRPCError({ code: "BAD_REQUEST", message: "Son tarix yanlışdır" });
          if (dueAt.getTime() < Date.now()) throw new TRPCError({ code: "BAD_REQUEST", message: "Son tarix keçmişdə ola bilməz" });
        }
        return createTask({ title: input.title, description: input.description, dueAt, status: "active", allowedTypes: input.allowedTypes ?? DEFAULT_ALLOWED_TYPES, assigneeIds: input.assigneeIds?.length ? input.assigneeIds : null, createdBy: ctx.user.id });
      }),
    setStatus: mentorProcedure
      .input(z.object({ id: z.number(), status: z.enum(["active", "archived"]) }))
      .mutation(async ({ input }) => {
        await setTaskStatus(input.id, input.status);
        return { success: true } as const;
      }),
    remove: mentorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const pending = await countPendingSubmissionsByTask(input.id);
        if (pending > 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Qiymətləndirilməmiş təhvil var — əvvəlcə hamısını qiymətləndir" });
        }
        await deleteTaskWithSubmissions(input.id);
        return { success: true } as const;
      }),
  }),
  submissions: router({
    list: protectedProcedure.query(({ ctx }) => listSubmissions(isStaff(ctx.user.role) ? undefined : ctx.user.id)),
    create: protectedProcedure
      .input(z.object({ taskId: z.number(), note: z.string().optional(), fileName: z.string().optional(), fileData: z.string().optional(), fileType: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "student") throw new TRPCError({ code: "FORBIDDEN", message: "Yalnız tələbələr təhvil verə bilər" });
        let fileSize: number | undefined;
        if (input.fileData) {
          const base64 = input.fileData.includes(",") ? input.fileData.split(",")[1] : input.fileData;
          fileSize = Buffer.byteLength(base64 ?? "", "base64");
          if (fileSize > MAX_FILE_BYTES) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Fayl 100MB-dan böyük ola bilməz" });
        }
        const task = await getTaskById(input.taskId);
        if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Tapşırıq tapılmadı" });
        if (task.status !== "active") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Tapşırıq arxivdədir — təhvil bağlıdır" });
        }
        if (task.dueAt && new Date(task.dueAt).getTime() < Date.now()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Son tarix keçib — təhvil bağlıdır" });
        }
        if (task.assigneeIds?.length && !task.assigneeIds.includes(ctx.user.id)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Bu tapşırıq sizə təyin edilməyib" });
        }
        const existing = await listSubmissions(ctx.user.id);
        if (existing.some((s) => s.taskId === input.taskId)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Artıq təhvil vermisiniz" });
        }
        if (input.fileData) {
          const ext = fileExtension(input.fileName ?? "");
          if (!ext) throw new TRPCError({ code: "BAD_REQUEST", message: "Fayl uzantısı olmalıdır" });
          if (FORBIDDEN_EXTENSIONS.includes(ext)) throw new TRPCError({ code: "BAD_REQUEST", message: "Bu fayl tipi qadağandır" });
          const allowed = (task.allowedTypes ?? DEFAULT_ALLOWED_TYPES).map((t) => t.toLowerCase());
          if (allowed.length > 0 && !allowed.includes(ext)) {
            throw new TRPCError({ code: "BAD_REQUEST", message: `İcazəli formatlar: ${allowed.join(", ").toUpperCase()}` });
          }
        }
        return createSubmission({
          taskId: input.taskId,
          studentId: ctx.user.id,
          note: input.note ?? null,
          fileName: input.fileName ?? null,
          fileUrl: null,
          fileData: input.fileData ?? null,
          fileType: input.fileType ?? null,
          fileSize: fileSize ?? null,
          status: "submitted",
        });
      }),
    review: mentorProcedure
      .input(z.object({ id: z.number(), feedback: z.string().optional(), grade: z.number().int().min(0).max(10) }))
      .mutation(async ({ input }) => {
        const sub = await getSubmissionById(input.id);
        if (!sub) throw new TRPCError({ code: "NOT_FOUND", message: "Təhvil tapılmadı" });
        return updateSubmission(input.id, input.feedback, input.grade);
      }),
    download: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const sub = await getSubmissionById(input.id);
        if (!sub) throw new TRPCError({ code: "NOT_FOUND", message: "Təhvil tapılmadı" });
        if (!isStaff(ctx.user.role) && sub.studentId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Bu faylı endirə bilməzsiniz" });
        }
        if (!sub.fileData) throw new TRPCError({ code: "NOT_FOUND", message: "Fayl artıq silinib" });
        return { fileName: sub.fileName, fileType: sub.fileType, fileData: sub.fileData };
      }),
  }),
  lessons: router({
    list: protectedProcedure.query(() => listLessons()),
    listAll: mentorProcedure.query(() => listLessons(true)),
    create: mentorProcedure
      .input(z.object({ title: z.string().min(1), instructor: z.string().min(1), track: z.string().min(1), room: z.string().optional(), startsAt: z.string(), endsAt: z.string() }))
      .mutation(({ ctx, input }) => {
        const startsAt = new Date(input.startsAt);
        const endsAt = new Date(input.endsAt);
        if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Dərs tarixi yanlışdır" });
        }
        if (endsAt.getTime() <= startsAt.getTime()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Bitiş başlanğıcdan sonra olmalıdır" });
        }
        return createLesson({ title: input.title, instructor: input.instructor, track: input.track, room: input.room ?? null, startsAt, endsAt, status: "active", createdBy: ctx.user.id });
      }),
    setStatus: mentorProcedure
      .input(z.object({ id: z.number(), status: z.enum(["active", "archived"]) }))
      .mutation(async ({ input }) => {
        await setLessonStatus(input.id, input.status);
        return { success: true } as const;
      }),
    remove: mentorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteLesson(input.id);
        return { success: true } as const;
      }),
  }),
});
export type AppRouter = typeof appRouter;
