import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async (importOriginal) => {
  const mod = await importOriginal<typeof import("./db")>();
  return {
    ...mod,
    countPendingSubmissionsByTask: vi.fn(),
    deleteTaskWithSubmissions: vi.fn(),
    getSubmissionById: vi.fn(),
    getTaskById: vi.fn(),
    listSubmissions: vi.fn(),
  };
});

import { countPendingSubmissionsByTask, deleteTaskWithSubmissions, getSubmissionById, getTaskById, listSubmissions } from "./db";

function context(role: "mentor" | "student" = "mentor", id = 7): TrpcContext {
  return {
    user: {
      id,
      openId: null,
      name: "T",
      email: "t@example.com",
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

describe("tasks.remove pending qaydası", () => {
  beforeEach(() => vi.clearAllMocks());

  it("pending təhvil varsa bloklayır", async () => {
    vi.mocked(countPendingSubmissionsByTask).mockResolvedValue(2);
    await expect(appRouter.createCaller(context()).tasks.remove({ id: 1 })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(deleteTaskWithSubmissions).not.toHaveBeenCalled();
  });

  it("hamısı reviewed-dirsə təhvillərlə birlikdə silir", async () => {
    vi.mocked(countPendingSubmissionsByTask).mockResolvedValue(0);
    await expect(appRouter.createCaller(context()).tasks.remove({ id: 1 })).resolves.toEqual({ success: true });
    expect(deleteTaskWithSubmissions).toHaveBeenCalledWith(1);
  });

  it("təhvil yoxdursa silir", async () => {
    vi.mocked(countPendingSubmissionsByTask).mockResolvedValue(0);
    await expect(appRouter.createCaller(context()).tasks.remove({ id: 9 })).resolves.toEqual({ success: true });
    expect(deleteTaskWithSubmissions).toHaveBeenCalledWith(9);
  });
});

describe("submissions.create qoruması", () => {
  beforeEach(() => vi.clearAllMocks());

  it("mentor təhvil verə bilməz", async () => {
    await expect(
      appRouter.createCaller(context("mentor")).submissions.create({ taskId: 1 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("arxiv taska təhvil bağlıdır", async () => {
    vi.mocked(getTaskById).mockResolvedValue({ id: 1, status: "archived", dueAt: null, assigneeIds: null } as never);
    await expect(
      appRouter.createCaller(context("student", 5)).submissions.create({ taskId: 1 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("təyin edilməyən tələbə təhvil verə bilməz", async () => {
    vi.mocked(getTaskById).mockResolvedValue({ id: 1, status: "active", dueAt: null, assigneeIds: [9] } as never);
    await expect(
      appRouter.createCaller(context("student", 5)).submissions.create({ taskId: 1 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("submissions.download", () => {
  beforeEach(() => vi.clearAllMocks());

  it("yad tələbə endirə bilməz", async () => {
    vi.mocked(getSubmissionById).mockResolvedValue({ id: 1, studentId: 9, fileData: "x" } as never);
    await expect(
      appRouter.createCaller(context("student", 5)).submissions.download({ id: 1 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("sahib və mentor endirə bilər", async () => {
    vi.mocked(getSubmissionById).mockResolvedValue({ id: 1, studentId: 5, fileData: "x", fileName: "a.pdf", fileType: "application/pdf" } as never);
    await expect(
      appRouter.createCaller(context("student", 5)).submissions.download({ id: 1 })
    ).resolves.toMatchObject({ fileName: "a.pdf" });
    await expect(
      appRouter.createCaller(context("mentor")).submissions.download({ id: 1 })
    ).resolves.toMatchObject({ fileName: "a.pdf" });
  });

  it("siyahı fileData daşımır", async () => {
    vi.mocked(listSubmissions).mockResolvedValue([{ id: 1, taskId: 1 } as never]);
    const rows = await appRouter.createCaller(context("mentor")).submissions.list();
    expect(rows[0]).not.toHaveProperty("fileData");
  });
});
