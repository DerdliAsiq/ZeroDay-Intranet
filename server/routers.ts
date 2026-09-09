import { COOKIE_NAME, SESSION_MS } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { hashPassword, signSession, verifyPassword } from "./_core/auth";
import { assertPassword } from "./_core/password";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createLesson,
  createSubmission,
  createTask,
  createUser,
  dashboardStats,
  deleteUser,
  getUserByEmail,
  listLessons,
  listSubmissions,
  listTasks,
  listUsers,
  touchLastSignIn,
  updateSubmission,
  updateUserPassword,
} from "./db";

const MAX_FILE_BYTES = 1_000_000;

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
        if (!user?.passwordHash) throw new TRPCError({ code: "UNAUTHORIZED", message: "Email ve ya sifre yanlisdir" });
        const ok = await verifyPassword(input.password, user.passwordHash);
        if (!ok) throw new TRPCError({ code: "UNAUTHORIZED", message: "Email ve ya sifre yanlisdir" });
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
        if (!full?.passwordHash) throw new TRPCError({ code: "BAD_REQUEST", message: "Sifre teyin edilmemisdir" });
        const ok = await verifyPassword(input.current, full.passwordHash);
        if (!ok) throw new TRPCError({ code: "UNAUTHORIZED", message: "Hazirki sifre yanlisdir" });
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
      .input(z.object({ email: z.string().email(), name: z.string().min(1), password: z.string().min(10), role: z.enum(["user", "admin"]).default("user") }))
      .mutation(async ({ input }) => {
        assertPassword(input.password);
        const exists = await getUserByEmail(input.email);
        if (exists) throw new TRPCError({ code: "CONFLICT", message: "Bu email artiq movcuddur" });
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
      if (input.id === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Oz hesabinizi sile bilmezsiniz" });
      await deleteUser(input.id);
      return { success: true } as const;
    }),
  }),
  dashboard: protectedProcedure.query(async ({ ctx }) => ({
    stats: await dashboardStats(),
    tasks: await listTasks(),
    lessons: await listLessons(),
    submissions: await listSubmissions(ctx.user.role === "admin" ? undefined : ctx.user.id),
  })),
  tasks: router({
    list: protectedProcedure.query(() => listTasks()),
    create: adminProcedure
      .input(z.object({ title: z.string().min(3), description: z.string().min(3), dueAt: z.string().optional(), points: z.number().int().min(1).max(1000) }))
      .mutation(({ ctx, input }) =>
        createTask({ title: input.title, description: input.description, dueAt: input.dueAt ? new Date(input.dueAt) : null, points: input.points, status: "active", createdBy: ctx.user.id })
      ),
  }),
  submissions: router({
    list: protectedProcedure.query(({ ctx }) => listSubmissions(ctx.user.role === "admin" ? undefined : ctx.user.id)),
    create: protectedProcedure
      .input(z.object({ taskId: z.number(), note: z.string().optional(), fileName: z.string().optional(), fileData: z.string().optional(), fileType: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        let fileSize: number | undefined;
        if (input.fileData) {
          const base64 = input.fileData.includes(",") ? input.fileData.split(",")[1] : input.fileData;
          fileSize = Buffer.byteLength(base64 ?? "", "base64");
          if (fileSize > MAX_FILE_BYTES) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Fayl 1MB-dan boyuk ola bilmez" });
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
    review: adminProcedure
      .input(z.object({ id: z.number(), status: z.enum(["reviewed", "returned"]), feedback: z.string().optional() }))
      .mutation(({ input }) => updateSubmission(input.id, input.status, input.feedback)),
  }),
  lessons: router({
    list: protectedProcedure.query(() => listLessons()),
    create: adminProcedure
      .input(z.object({ title: z.string(), instructor: z.string(), track: z.string(), room: z.string().optional(), startsAt: z.string(), endsAt: z.string() }))
      .mutation(({ ctx, input }) =>
        createLesson({ title: input.title, instructor: input.instructor, track: input.track, room: input.room ?? null, startsAt: new Date(input.startsAt), endsAt: new Date(input.endsAt), createdBy: ctx.user.id })
      ),
  }),
});
export type AppRouter = typeof appRouter;
