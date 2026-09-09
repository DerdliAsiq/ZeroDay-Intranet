import { rateLimit } from "express-rate-limit";

function loginEmail(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const b = body as Record<string, unknown>;
  const first = b["0"];
  if (first && typeof first === "object") {
    const json = (first as Record<string, unknown>).json;
    if (json && typeof json === "object") {
      const email = (json as Record<string, unknown>).email;
      if (typeof email === "string") return email.toLowerCase().trim();
    }
  }
  if (typeof b.email === "string") return b.email.toLowerCase().trim();
  return "";
}

export const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip ?? "unknown"}|${loginEmail(req.body)}`,
  skip: (req) => !req.path.includes("login"),
  message: { error: "Cox fazla deneme. 10 dakika sonra tekrar deneyin." },
});
