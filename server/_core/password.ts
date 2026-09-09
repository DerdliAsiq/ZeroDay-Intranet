import { TRPCError } from "@trpc/server";

export function validatePassword(pw: string): string | null {
  if (pw.length < 10) return "Şifrə ən az 10 simvol olmalıdır";
  if (!/[a-z]/.test(pw)) return "Şifrə kiçik hərf ehtiva etməlidir";
  if (!/[A-Z]/.test(pw)) return "Şifrə böyük hərf ehtiva etməlidir";
  if (!/[0-9]/.test(pw)) return "Şifrə rəqəm ehtiva etməlidir";
  if (!/[@#$%&]/.test(pw)) return "Şifrə xüsusi simvol ehtiva etməlidir (@#$%&)";
  return null;
}

export function assertPassword(pw: string): void {
  const err = validatePassword(pw);
  if (err) throw new TRPCError({ code: "BAD_REQUEST", message: err });
}
