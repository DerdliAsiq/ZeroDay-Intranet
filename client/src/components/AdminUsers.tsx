import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function AdminUsers() {
  const users = trpc.admin.users.useQuery();
  const utils = trpc.useUtils();
  const [form, setForm] = useState({ email: "", name: "", password: "", role: "user" as "user" | "admin" });
  const [resetId, setResetId] = useState<number | null>(null);
  const [resetPw, setResetPw] = useState("");

  const create = trpc.admin.createUser.useMutation({
    onSuccess: () => {
      toast.success("İstifadəçi yaradıldı");
      setForm({ email: "", name: "", password: "", role: "user" });
      users.refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  const reset = trpc.admin.resetPassword.useMutation({
    onSuccess: () => {
      toast.success("Şifrə yeniləndi");
      setResetId(null);
      setResetPw("");
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = trpc.admin.deleteUser.useMutation({
    onSuccess: () => {
      toast.success("İstifadəçi silindi");
      users.refetch();
      utils.auth.me.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="font-bold">Yeni istifadəçi</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input className="field" placeholder="Ad" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="field" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="field" placeholder="Şifrə (min 6)" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <select className="field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "user" | "admin" })}>
            <option value="user">Tələbə</option>
            <option value="admin">Administrator</option>
          </select>
          <button
            className="primary md:col-span-2"
            onClick={() => create.mutate(form)}
            disabled={create.isPending}
          >
            {create.isPending ? "Yaradılır..." : "İstifadəçi yarat"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="font-bold">İstifadəçilər ({users.data?.length ?? 0})</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 text-xs text-slate-400">
              <tr>
                <th className="pb-3">Ad</th>
                <th className="pb-3">Email</th>
                <th className="pb-3">Rol</th>
                <th className="pb-3">Əməl</th>
              </tr>
            </thead>
            <tbody>
              {((users.data ?? []) as { id: number; name: string | null; email: string | null; role: string }[]).map((u) => (
                <tr key={u.id} className="border-b border-slate-50">
                  <td className="py-3 font-semibold">{u.name}</td>
                  <td className="py-3 text-slate-500">{u.email}</td>
                  <td className="py-3">{u.role}</td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold hover:bg-slate-200"
                        onClick={() => setResetId(resetId === u.id ? null : u.id)}
                      >
                        Şifrə
                      </button>
                      <button
                        className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                        onClick={() => {
                          if (confirm(`${u.email} silinsin?`)) remove.mutate({ id: u.id });
                        }}
                      >
                        Sil
                      </button>
                    </div>
                    {resetId === u.id && (
                      <div className="mt-2 flex gap-2">
                        <input
                          className="field !py-1.5 text-xs"
                          placeholder="Yeni şifrə"
                          value={resetPw}
                          onChange={(e) => setResetPw(e.target.value)}
                        />
                        <button
                          className="primary !py-1.5 text-xs"
                          onClick={() => reset.mutate({ id: u.id, password: resetPw })}
                        >
                          OK
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!users.data?.length && <p className="py-8 text-center text-sm text-slate-400">İstifadəçi yoxdur.</p>}
        </div>
      </div>
    </div>
  );
}
