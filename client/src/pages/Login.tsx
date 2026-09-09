import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Login() {
  const { login, loggingIn, loginError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f8fb] p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-slate-950 text-emerald-400">
            <ShieldCheck size={22} />
          </div>
          <div>
            <b className="block text-slate-950">ZERO DAY</b>
            <span className="text-xs text-slate-500">STUDENT INTRANET</span>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_8px_30px_rgba(15,23,42,.05)]">
          <p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-emerald-600">Secure access</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Daxil ol</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">Hesabını administrator yaradır. Email və şifrəni yaz.</p>
          <form
            className="mt-6 grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              login(email.trim(), password);
            }}
          >
            <input className="field" type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="field" type="password" required placeholder="Şifre" value={password} onChange={(e) => setPassword(e.target.value)} />
            {loginError && <p className="text-sm font-semibold text-red-600">{loginError.message}</p>}
            <button className="primary" type="submit" disabled={loggingIn}>
              {loggingIn ? "Daxil olunur..." : "Daxil ol"}
            </button>
          </form>
          <p className="mt-6 text-center text-xs text-slate-400">Yalnız Zero Day üzvləri üçün</p>
        </div>
      </div>
    </main>
  );
}
