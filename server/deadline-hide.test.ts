import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async (importOriginal) => {
  const mod = await importOriginal<typeof import("./db")>();
  return {
    ...mod,
    listTasks: vi.fn(),
    listSubmissions: vi.fn(),
    listLessons: vi.fn(),
    dashboardStats: vi.fn(),
  };
});

import { dashboardStats, listSubmissions, listTasks } from "./db";

function context(role: "student" | "mentor"): TrpcContext {
  return {
    user: {
      id: 5,
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

const past = new Date(Date.now() - 86400000);
const future = new Date(Date.now() + 86400000);

describe("deadline keçmiş tasklar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listTasks).mockResolvedValue([
      { id: 1, dueAt: past },
      { id: 2, dueAt: past },
      { id: 3, dueAt: future },
      { id: 4, dueAt: null },
    ] as never);
    vi.mocked(listSubmissions).mockResolvedValue([{ taskId: 2, grade: 9 } as never]);
    vi.mocked(dashboardStats).mockResolvedValue({ tasks: 99, submissions: 99, lessons: 0, students: 0 });
  });

  it("tələbədə təhvilsiz expired gizlənir, təhvilli arxivə düşür", async () => {
    const dash = await appRouter.createCaller(context("student")).dashboard();
    expect((dash.tasks as { id: number }[]).map((t) => t.id).sort()).toEqual([3, 4]);
    expect(dash.submissions).toHaveLength(1);
    expect(dash.stats.tasks).toBe(2);
    const list = await appRouter.createCaller(context("student")).tasks.list();
    expect((list as { id: number }[]).map((t) => t.id).sort()).toEqual([3, 4]);
  });

  it("staff-da hamısı görünür", async () => {
    const dash = await appRouter.createCaller(context("mentor")).dashboard();
    expect((dash.tasks as { id: number }[]).map((t) => t.id).sort()).toEqual([1, 2, 3, 4]);
  });
});
