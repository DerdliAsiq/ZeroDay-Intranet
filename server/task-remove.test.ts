import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async (importOriginal) => {
  const mod = await importOriginal<typeof import("./db")>();
  return {
    ...mod,
    countPendingSubmissionsByTask: vi.fn(),
    deleteSubmissionsByTask: vi.fn(),
    deleteTask: vi.fn(),
  };
});

import { countPendingSubmissionsByTask, deleteSubmissionsByTask, deleteTask } from "./db";

function context(): TrpcContext {
  return {
    user: {
      id: 7,
      openId: null,
      name: "Mentor",
      email: "mentor@example.com",
      passwordHash: null,
      sessionVersion: 0,
      loginMethod: "email",
      role: "mentor",
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
    expect(deleteTask).not.toHaveBeenCalled();
  });

  it("hamısı reviewed-dirsə təhvillərlə birlikdə silir", async () => {
    vi.mocked(countPendingSubmissionsByTask).mockResolvedValue(0);
    await expect(appRouter.createCaller(context()).tasks.remove({ id: 1 })).resolves.toEqual({ success: true });
    expect(deleteSubmissionsByTask).toHaveBeenCalledWith(1);
    expect(deleteTask).toHaveBeenCalledWith(1);
  });

  it("təhvil yoxdursa silir", async () => {
    vi.mocked(countPendingSubmissionsByTask).mockResolvedValue(0);
    await expect(appRouter.createCaller(context()).tasks.remove({ id: 9 })).resolves.toEqual({ success: true });
    expect(deleteTask).toHaveBeenCalledWith(9);
  });
});
