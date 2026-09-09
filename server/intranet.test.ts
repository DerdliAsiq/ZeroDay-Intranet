import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(role: "admin" | "mentor" | "student"): TrpcContext {
  return {
    user: {
      id: 7,
      openId: null,
      name: "Test",
      email: "test@example.com",
      passwordHash: null,
      sessionVersion: 0,
      loginMethod: "email",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Zero Day intranet access", () => {
  it("returns dashboard data for an authenticated student", async () => {
    const result = await appRouter.createCaller(context("student")).dashboard();
    expect(result).toHaveProperty("stats");
    expect(result).toHaveProperty("tasks");
    expect(result).toHaveProperty("lessons");
  });

  it("blocks task creation for students", async () => {
    await expect(
      appRouter.createCaller(context("student")).tasks.create({ title: "Test task", description: "Test description" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks role change for mentors", async () => {
    await expect(
      appRouter.createCaller(context("mentor")).admin.setRole({ id: 2, role: "mentor" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks self role change for admins", async () => {
    await expect(
      appRouter.createCaller(context("admin")).admin.setRole({ id: 7, role: "student" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects weak passwords on user creation", async () => {
    await expect(
      appRouter.createCaller(context("admin")).admin.createUser({ email: "w@example.com", name: "W", password: "abcdefghij", role: "student" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("blocks task archive for students", async () => {
    await expect(
      appRouter.createCaller(context("student")).tasks.setStatus({ id: 1, status: "archived" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks lesson delete for students", async () => {
    await expect(
      appRouter.createCaller(context("student")).lessons.remove({ id: 1 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks review for students", async () => {
    await expect(
      appRouter.createCaller(context("student")).submissions.review({ id: 1, grade: 8 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks user management for mentors", async () => {
    await expect(
      appRouter.createCaller(context("mentor")).admin.deleteUser({ id: 2 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows review for mentors (fails only on missing DB)", async () => {
    await expect(
      appRouter.createCaller(context("mentor")).submissions.review({ id: 1, grade: 8 })
    ).rejects.toThrow("Database unavailable");
  });

  it("rejects out-of-range grades", async () => {
    await expect(
      appRouter.createCaller(context("admin")).submissions.review({ id: 1, grade: 11 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects oversized file uploads", async () => {
    const big = "a".repeat(134_000_000);
    await expect(
      appRouter.createCaller(context("student")).submissions.create({ taskId: 1, fileName: "big.bin", fileData: big })
    ).rejects.toMatchObject({ code: "PAYLOAD_TOO_LARGE" });
  });
});
