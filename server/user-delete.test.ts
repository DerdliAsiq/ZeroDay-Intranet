import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async (importOriginal) => {
  const mod = await importOriginal<typeof import("./db")>();
  return { ...mod, deleteUserCascade: vi.fn() };
});

import { deleteUserCascade } from "./db";

function context(id = 7): TrpcContext {
  return {
    user: {
      id,
      openId: null,
      name: "Admin",
      email: "admin@example.com",
      passwordHash: null,
      sessionVersion: 0,
      loginMethod: "email",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("admin.deleteUser cascade", () => {
  beforeEach(() => vi.clearAllMocks());

  it("öz hesabı bloklanır", async () => {
    await expect(appRouter.createCaller(context(7)).admin.deleteUser({ id: 7 })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(deleteUserCascade).not.toHaveBeenCalled();
  });

  it("başqası cascade ilə silinir", async () => {
    await expect(appRouter.createCaller(context(7)).admin.deleteUser({ id: 2 })).resolves.toEqual({ success: true });
    expect(deleteUserCascade).toHaveBeenCalledWith(2);
  });
});
