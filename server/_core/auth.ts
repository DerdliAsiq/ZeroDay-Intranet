import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import bcrypt from "bcryptjs";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import * as db from "../db";
import { ENV } from "./env";

export type SessionPayload = { userId: number };

function secretKey() {
  const s = ENV.cookieSecret;
  if (!s) throw new Error("JWT_SECRET is required (see .env.example)");
  return new TextEncoder().encode(s);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function signSession(userId: number, expiresInMs = ONE_YEAR_MS) {
  const exp = Math.floor((Date.now() + expiresInMs) / 1000);
  return new SignJWT({ userId, appId: "zeroday" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(exp)
    .sign(secretKey());
}

export async function verifySessionToken(token?: string | null): Promise<number | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    const userId = (payload as Record<string, unknown>).userId;
    return typeof userId === "number" ? userId : null;
  } catch {
    return null;
  }
}

export function getSessionTokenFromRequest(req: Request): string | undefined {
  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  const fromCookie = cookies[COOKIE_NAME];
  if (fromCookie) return fromCookie;
  const h = req.headers.authorization;
  if (typeof h === "string" && h.startsWith("Bearer ")) return h.slice(7);
  return undefined;
}

export async function authenticateRequest(req: Request) {
  const token = getSessionTokenFromRequest(req);
  const userId = await verifySessionToken(token);
  if (!userId) return null;
  const user = await db.getUserById(userId);
  return user ?? null;
}
