import { TRPCError } from "@trpc/server";

export function validatePassword(pw: string): string | null {
  if (pw.length < 10) return "Sifre en az 10 karakter olmalidir";
  if (!/[a-z]/.test(pw)) return "Sifre kucuk harf icermelidir";
  if (!/[A-Z]/.test(pw)) return "Sifre buyuk harf icermelidir";
  if (!/[0-9]/.test(pw)) return "Sifre rakam icermelidir";
  if (!/[@#$%&]/.test(pw)) return "Sifre ozel karakter icermelidir (@#$%&)";
  return null;
}

export function assertPassword(pw: string): void {
  const err = validatePassword(pw);
  if (err) throw new TRPCError({ code: "BAD_REQUEST", message: err });
}
