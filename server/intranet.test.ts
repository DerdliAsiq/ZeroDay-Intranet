import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(role: "admin" | "user"): TrpcContext {
  return {
    user: {
      id: 7,
      openId: null,
      name: "Test",
      email: "test@example.com",
      passwordHash: null,
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
    const result = await appRouter.createCaller(context("user")).dashboard();
    expect(result).toHaveProperty("stats");
    expect(result).toHaveProperty("tasks");
    expect(result).toHaveProperty("lessons");
  });

  it("blocks task creation for students", async () => {
    await expect(
      appRouter.createCaller(context("user")).tasks.create({ title: "Test task", description: "Test description", points: 50 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects oversized file uploads", async () => {
    const big = "a".repeat(1_400_000);
    await expect(
      appRouter.createCaller(context("user")).submissions.create({ taskId: 1, fileName: "big.bin", fileData: big })
    ).rejects.toMatchObject({ code: "PAYLOAD_TOO_LARGE" });
  });
});
