import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  LayoutDashboard, ClipboardCheck, CalendarDays, Users, LogOut,
  ShieldCheck, Plus, Upload, Clock3, Menu, X, KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import Login from "./Login";
import AdminUsers from "@/components/AdminUsers";
import AssigneePicker from "@/components/AssigneePicker";
import ConfirmButton from "@/components/ConfirmButton";

const FILE_TYPE_PRESETS = ["pdf", "doc", "docx", "zip", "txt", "md", "png", "jpg", "py", "js", "ts"];

const nav = [
  { id: "overview", label: "İcmal", icon: LayoutDashboard },
  { id: "tasks", label: "Tapşırıqlar", icon: ClipboardCheck },
  { id: "schedule", label: "Dərs cədvəli", icon: CalendarDays },
];

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,.05)] ${className}`}>{children}</div>;
}

function Badge({ children, tone = "green" }: { children: React.ReactNode; tone?: "green" | "amber" | "blue" }) {
  const cls = tone === "green" ? "bg-emerald-50 text-emerald-700" : tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700";
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${cls}`}>{children}</span>;
}

type SubmissionRow = {
  id: number; studentId: number; taskId: number; fileName: string | null; note: string | null;
  status: string; fileData: string | null; fileUrl: string | null; grade: number | null;
  studentName: string | null; studentEmail: string | null;
};

function Account() {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const change = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Şifrə dəyişdirildi");
      setCur("");
      setNext("");
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Card className="p-6">
      <h3 className="font-bold">Şifrəni dəyiş</h3>
      <div className="mt-4 grid max-w-md gap-3">
        <input className="field" type="password" placeholder="Hazırkı şifrə" value={cur} onChange={(e) => setCur(e.target.value)} />
        <input className="field" type="password" placeholder="Yeni şifrə (min 10: Aa1@...)" value={next} onChange={(e) => setNext(e.target.value)} />
        <button className="primary" onClick={() => change.mutate({ current: cur, next })}>Yadda saxla</button>
      </div>
    </Card>
  );
}

export default function Home() {
  const { user, loading, logout } = useAuth();
  const [tab, setTab] = useState("overview");
  const [open, setOpen] = useState(false);
  const dash = trpc.dashboard.useQuery(undefined, { enabled: !!user });
  const review = trpc.submissions.review.useMutation({
    onSuccess: () => { toast.success("Yeniləndi"); dash.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => {
      toast.success("Tapşırıq yaradıldı");
      setTask({ title: "", description: "", dueAt: "", allowedTypes: ["pdf", "docx", "zip", "txt", "md", "png", "jpg"], assigneeIds: [] });
      dash.refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  const createLesson = trpc.lessons.create.useMutation({
    onSuccess: () => {
      toast.success("Dərs əlavə edildi");
      setLesson({ title: "", instructor: "", track: "", room: "", startsAt: "", endsAt: "" });
      dash.refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  const submit = trpc.submissions.create.useMutation({
    onSuccess: () => { toast.success("Təhvil göndərildi"); dash.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const isStaffUser = user?.role === "admin" || user?.role === "mentor";
  const allTasks = trpc.tasks.listAll.useQuery(undefined, { enabled: isStaffUser });
  const allLessons = trpc.lessons.listAll.useQuery(undefined, { enabled: isStaffUser });
  const refreshAll = () => { dash.refetch(); allTasks.refetch(); allLessons.refetch(); };
  const setTaskStatus = trpc.tasks.setStatus.useMutation({
    onSuccess: () => { toast.success("Yeniləndi"); refreshAll(); },
    onError: (e) => toast.error(e.message),
  });
  const removeTask = trpc.tasks.remove.useMutation({
    onSuccess: () => { toast.success("Silindi"); refreshAll(); },
    onError: (e) => toast.error(e.message),
  });
  const setLessonStatus = trpc.lessons.setStatus.useMutation({
    onSuccess: () => { toast.success("Yeniləndi"); refreshAll(); },
    onError: (e) => toast.error(e.message),
  });
  const removeLesson = trpc.lessons.remove.useMutation({
    onSuccess: () => { toast.success("Silindi"); refreshAll(); },
    onError: (e) => toast.error(e.message),
  });
  const [task, setTask] = useState({ title: "", description: "", dueAt: "", allowedTypes: ["pdf", "docx", "zip", "txt", "md", "png", "jpg"], assigneeIds: [] as number[] });
  const [grades, setGrades] = useState<Record<number, string>>({});
  const [feedbacks, setFeedbacks] = useState<Record<number, string>>({});
  const [subFilter, setSubFilter] = useState<"all" | "submitted" | "reviewed">("all");
  const [subSearch, setSubSearch] = useState("");
  const students = trpc.students.list.useQuery(undefined, { enabled: isStaffUser });
  const toggleAssignee = (id: number) => {
    setTask((t) => (t.assigneeIds.includes(id) ? { ...t, assigneeIds: t.assigneeIds.filter((x) => x !== id) } : { ...t, assigneeIds: [...t.assigneeIds, id] }));
  };
  const toggleType = (ext: string) => {
    setTask((t) => (t.allowedTypes.includes(ext) ? { ...t, allowedTypes: t.allowedTypes.filter((x) => x !== ext) } : { ...t, allowedTypes: [...t.allowedTypes, ext] }));
  };
  const [lesson, setLesson] = useState({ title: "", instructor: "", track: "", room: "", startsAt: "", endsAt: "" });

  if (loading) return <div className="grid min-h-screen place-items-center bg-[#f6f8fb] text-slate-500">Sistem yüklənir...</div>;
  if (!user) return <Login />;

  const data = dash.data;
  const isAdmin = user.role === "admin";
  const isStaff = user.role === "admin" || user.role === "mentor";
  const roleLabel = user.role === "admin" ? "Administrator" : user.role === "mentor" ? "Mentor" : "Tələbə";
  const taskTitles: Record<number, string> = {};
  for (const t of ((data?.tasks ?? []) as { id: number; title: string }[])) taskTitles[t.id] = t.title;
  for (const t of ((allTasks.data ?? []) as { id: number; title: string }[])) taskTitles[t.id] = t.title;

  const doSubmit = (taskId: number, allowed?: string[] | null) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = allowed?.length ? allowed.map((e) => `.${e}`).join(",") : ".pdf,.zip,.txt,.md,.py,.js,.ts,.png,.jpg";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 100_000_000) {
        toast.error("Fayl 100MB-dan böyük ola bilməz");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => submit.mutate({ taskId, note: "Fayl ilə təqdim edildi", fileName: file.name, fileType: file.type, fileData: String(reader.result) });
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const titles: Record<string, string> = {
    overview: "Xoş gəldin",
    tasks: "Tapşırıqlar",
    schedule: "Dərs cədvəli",
    manage: "İdarəetmə mərkəzi",
    users: "İstifadəçilər",
    account: "Hesab",
  };

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-900">
      <aside className={`fixed inset-y-0 left-0 z-30 w-72 border-r border-slate-200 bg-slate-950 px-5 py-6 text-white transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-emerald-400 text-slate-950"><ShieldCheck size={21} /></div>
            <div><b className="block tracking-wide">ZERO DAY</b><span className="text-[10px] text-slate-400">INTRANET / 01</span></div>
          </div>
          <button className="lg:hidden" onClick={() => setOpen(false)}><X /></button>
        </div>
        <div className="mt-12 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-400">Current member</p>
          <p className="mt-2 font-semibold">{user.name || "Zero Day üzvü"}</p>
          <p className="mt-1 truncate text-xs text-slate-400">{user.email}</p>
        </div>
        <nav className="mt-8 space-y-2">
          {nav.map((n) => (
            <button key={n.id} onClick={() => { setTab(n.id); setOpen(false); }} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition ${tab === n.id ? "bg-emerald-400 font-semibold text-slate-950" : "text-slate-400 hover:bg-slate-900 hover:text-white"}`}>
              <n.icon size={18} />{n.label}
            </button>
          ))}
          {isStaff && (
            <button onClick={() => { setTab("manage"); setOpen(false); }} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition ${tab === "manage" ? "bg-emerald-400 font-semibold text-slate-950" : "text-slate-400 hover:bg-slate-900 hover:text-white"}`}>
              <Users size={18} />İdarəetmə
            </button>
          )}
          {isAdmin && (
            <button onClick={() => { setTab("users"); setOpen(false); }} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition ${tab === "users" ? "bg-emerald-400 font-semibold text-slate-950" : "text-slate-400 hover:bg-slate-900 hover:text-white"}`}>
              <Users size={18} />İstifadəçilər
            </button>
          )}
          <button onClick={() => { setTab("account"); setOpen(false); }} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition ${tab === "account" ? "bg-emerald-400 font-semibold text-slate-950" : "text-slate-400 hover:bg-slate-900 hover:text-white"}`}>
            <KeyRound size={18} />Hesab
          </button>
        </nav>
        <div className="absolute bottom-6 left-5 right-5">
          <button onClick={() => logout()} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-400 hover:bg-slate-900 hover:text-white">
            <LogOut size={17} />Çıxış
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200 bg-white/85 px-5 backdrop-blur md:px-10">
          <button className="lg:hidden" onClick={() => setOpen(true)}><Menu /></button>
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-600">Zero Day / Workspace</p>
            <h1 className="mt-1 text-xl font-bold">{titles[tab] ?? tab}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:block">{roleLabel}</span>
            <div className="grid size-10 place-items-center rounded-full bg-emerald-100 font-bold text-emerald-700">{(user.name || "Z")[0]}</div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl space-y-8 p-5 md:p-10">
          {dash.isPending ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <Card key={i} className="p-5">
                  <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                  <div className="mt-5 h-8 w-16 animate-pulse rounded bg-slate-100" />
                </Card>
              ))}
            </div>
          ) : dash.isError ? (
            <Card className="p-10 text-center">
              <p className="font-bold">Məlumat yüklənmədi</p>
              <p className="mt-2 text-sm text-slate-500">Bağlantını yoxlayıb yenidən cəhd edin.</p>
              <button className="primary mx-auto mt-4" onClick={() => dash.refetch()}>Təkrar yoxla</button>
            </Card>
          ) : (
            <>
          {tab === "overview" && (
            <>
              <section className="rounded-3xl bg-slate-950 p-7 text-white md:p-10">
                <p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-400">Focus / practice / ship</p>
                <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-5xl">Bilirdən nəticəyə.<br /><span className="text-emerald-400">Hər həftə bir addım.</span></h2>
                <p className="mt-5 max-w-lg text-sm leading-7 text-slate-400">Tapşırıqları tamamla, həllərini təqdim et və sessiyanı qaçırma.</p>
              </section>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {(
                  [
                    ["Aktiv tapşırıq", data?.stats.tasks ?? 0, ClipboardCheck],
                    ["Təhvil", data?.stats.submissions ?? 0, Upload],
                    ["Dərs sessiyası", data?.stats.lessons ?? 0, CalendarDays],
                    ["Klub üzvü", data?.stats.students ?? 0, Users],
                  ] as [string, number, typeof ClipboardCheck][]
                ).map(([label, value, Icon]) => {
                  const I = Icon;
                  return (
                    <Card key={label} className="p-5">
                      <div className="flex items-center justify-between"><span className="text-sm text-slate-500">{label}</span><I size={18} className="text-emerald-600" /></div>
                      <p className="mt-5 text-3xl font-bold">{value}</p>
                    </Card>
                  );
                })}
              </div>
              <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold">Son tapşırıqlar</h3>
                    <button onClick={() => setTab("tasks")} className="text-xs font-semibold text-emerald-600">Hamısına bax</button>
                  </div>
                  <div className="mt-5 space-y-3">
                    {(data?.tasks || []).slice(0, 4).map((t: { id: number; title: string; dueAt: Date | string | null; assigneeIds: number[] | null }) => (
                      <div key={t.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                        <div><p className="font-semibold">{t.title}</p><p className="mt-1 text-xs text-slate-500">{t.assigneeIds?.length ? "Xüsusi" : "Hamıya"} — {t.dueAt ? new Date(t.dueAt).toLocaleDateString("az-AZ") : "açıq"}</p></div>
                        <Badge>Aktiv</Badge>
                      </div>
                    ))}
                    {!data?.tasks?.length && <p className="py-8 text-center text-sm text-slate-400">Hələ tapşırıq yoxdur.</p>}
                  </div>
                </Card>
                <Card className="p-6">
                  <h3 className="font-bold">Növbəti sessiyalar</h3>
                  <div className="mt-5 space-y-3">
                    {(data?.lessons || []).slice(0, 3).map((l: { id: number; title: string; startsAt: Date | string; room: string | null }) => (
                      <div key={l.id} className="flex gap-3 rounded-xl bg-slate-50 p-4">
                        <div className="grid size-10 place-items-center rounded-lg bg-white text-emerald-600"><Clock3 size={18} /></div>
                        <div><p className="font-semibold">{l.title}</p><p className="mt-1 text-xs text-slate-500">{new Date(l.startsAt).toLocaleString("az-AZ")} — {l.room || "Onlayn"}</p></div>
                      </div>
                    ))}
                    {!data?.lessons?.length && <p className="py-8 text-center text-sm text-slate-400">Cədvəl boşdur.</p>}
                  </div>
                </Card>
              </div>
            </>
          )}

          {tab === "tasks" && (
            <section className="grid gap-5">
              {(data?.tasks || []).map((t: { id: number; title: string; description: string; dueAt: Date | string | null; allowedTypes: string[] | null; assigneeIds: number[] | null }) => {
                const mySub = ((data?.submissions ?? []) as { taskId: number; status: string; grade: number | null; feedback: string | null }[]).find((s) => s.taskId === t.id);
                const pastDue = t.dueAt ? new Date(t.dueAt).getTime() < Date.now() : false;
                return (
                <Card key={t.id} className="p-6">
                  <div className="flex flex-col justify-between gap-4 md:flex-row">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge>Aktiv</Badge>
                        {t.assigneeIds?.length ? <Badge tone="blue">Xüsusi</Badge> : null}
                        {pastDue && <Badge tone="amber">Müddət bitib</Badge>}
                        {mySub && <Badge tone={mySub.grade !== null && mySub.grade !== undefined ? "green" : "blue"}>{mySub.grade !== null && mySub.grade !== undefined ? `Qiymət: ${mySub.grade}/10` : mySub.status}</Badge>}
                      </div>
                      <h3 className="mt-3 text-xl font-bold">{t.title}</h3>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{t.description}</p>
                      <p className="mt-2 text-xs text-slate-400">İcazəli formatlar: {(t.allowedTypes ?? []).join(", ").toUpperCase() || "Hamısı"}</p>
                      {mySub?.feedback && <p className="mt-2 max-w-2xl rounded-xl bg-emerald-50 p-3 text-sm leading-6 text-emerald-800">Rəy: {mySub.feedback}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-xs text-slate-400">Son tarix: {t.dueAt ? new Date(t.dueAt).toLocaleDateString("az-AZ") : "Açıq"}</span>
                      {!isStaff && !pastDue && !mySub && <button onClick={() => doSubmit(t.id, t.allowedTypes)} className="flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-600"><Upload size={15} />Təhvil ver</button>}
                      {isStaff && <button onClick={() => setTaskStatus.mutate({ id: t.id, status: "archived" })} className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-200">Arxivlə</button>}
                      {isStaff && <ConfirmButton onConfirm={() => removeTask.mutate({ id: t.id })} className="rounded-xl bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-100" armedClassName="rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white" pending={removeTask.isPending}>Sil</ConfirmButton>}
                    </div>
                  </div>
                </Card>
                );
              })}
              {!isStaff && ((data?.submissions ?? []) as { taskId: number }[]).some((s) => !(data?.tasks ?? []).some((t: { id: number }) => t.id === s.taskId)) && (
                <Card className="p-6">
                  <h3 className="font-bold">Arxiv və bitmiş qiymətlərim</h3>
                  <div className="mt-4 space-y-3">
                    {((data?.submissions ?? []) as { taskId: number; grade: number | null; feedback: string | null; status: string; taskTitle?: string | null }[]).filter((s) => !(data?.tasks ?? []).some((t: { id: number }) => t.id === s.taskId)).map((s) => (
                      <div key={`${s.taskId}`} className="flex flex-col gap-2 rounded-xl bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-semibold">{s.taskTitle ?? taskTitles[s.taskId] ?? `Task #${s.taskId}`}</p>
                          {s.feedback && <p className="mt-1 max-w-2xl rounded-xl bg-emerald-50 p-2 text-sm leading-6 text-emerald-800">Rəy: {s.feedback}</p>}
                        </div>
                        {s.grade !== null && s.grade !== undefined ? <Badge>Qiymət: {s.grade}/10</Badge> : <Badge tone="amber">{s.status}</Badge>}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
              {isStaff && (
                <Card className="border-dashed p-6">
                  <h3 className="font-bold">Yeni tapşırıq yarat</h3>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <input className="field" placeholder="Tapşırıq adı" value={task.title} onChange={(e) => setTask({ ...task, title: e.target.value })} />
                    <input className="field" type="datetime-local" value={task.dueAt} onChange={(e) => setTask({ ...task, dueAt: e.target.value })} />
                    <textarea className="field min-h-28 md:col-span-2" placeholder="Açıqlama" value={task.description} onChange={(e) => setTask({ ...task, description: e.target.value })} />
                    <div className="md:col-span-2">
                      <p className="mb-2 text-xs font-semibold text-slate-500">Kimə? (boş = hamıya)</p>
                      <AssigneePicker
                        students={((students.data ?? []) as { id: number; name: string | null; email: string | null }[])}
                        selected={task.assigneeIds}
                        onToggle={toggleAssignee}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <p className="mb-2 text-xs font-semibold text-slate-500">İcazəli fayl tipləri</p>
                      <div className="flex flex-wrap gap-2">
                        {FILE_TYPE_PRESETS.map((ext) => (
                          <button
                            key={ext}
                            type="button"
                            onClick={() => toggleType(ext)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase ${task.allowedTypes.includes(ext) ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"}`}
                          >
                            {ext}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button className="primary" onClick={() => createTask.mutate(task)}><Plus size={16} />Yarat</button>
                  </div>
                </Card>
              )}
              {isStaff && (
                <Card className="p-6">
                  <h3 className="font-bold">Arxivdəki tapşırıqlar ({((allTasks.data ?? []) as { status: string }[]).filter((t) => t.status === "archived").length})</h3>
                  <div className="mt-4 space-y-3">
                    {((allTasks.data ?? []) as { id: number; title: string; status: string }[]).filter((t) => t.status === "archived").map((t) => (
                      <div key={t.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                        <p className="font-semibold">{t.title}</p>
                        <div className="flex gap-2">
                          <button onClick={() => setTaskStatus.mutate({ id: t.id, status: "active" })} className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">Bərpa et</button>
                          <ConfirmButton onConfirm={() => removeTask.mutate({ id: t.id })} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600" pending={removeTask.isPending}>Sil</ConfirmButton>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </section>
          )}

          {tab === "schedule" && (
            <section>
              <div className="grid gap-4 md:grid-cols-2">
                {(data?.lessons || []).map((l: { id: number; title: string; track: string; instructor: string; room: string | null; startsAt: Date | string; endsAt: Date | string }) => (
                  <Card key={l.id} className="p-6">
                    <div className="flex items-start justify-between"><Badge tone="blue">{l.track}</Badge><CalendarDays className="text-emerald-600" size={20} /></div>
                    <h3 className="mt-5 text-lg font-bold">{l.title}</h3>
                    <p className="mt-2 text-sm text-slate-500">{l.instructor} — {l.room || "Onlayn"}</p>
                    <div className="mt-5 border-t border-slate-100 pt-4 text-sm font-semibold">
                      {new Date(l.startsAt).toLocaleString("az-AZ")} → {new Date(l.endsAt).toLocaleTimeString("az-AZ", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    {isStaff && (
                      <div className="mt-4 flex gap-2">
                        <button onClick={() => setLessonStatus.mutate({ id: l.id, status: "archived" })} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200">Arxivlə</button>
                        <ConfirmButton onConfirm={() => removeLesson.mutate({ id: l.id })} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100" pending={removeLesson.isPending}>Sil</ConfirmButton>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
              {isStaff && (
                <Card className="mt-6 p-6">
                  <h3 className="font-bold">Cədvələ dərs əlavə et</h3>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <input className="field" placeholder="Dərsin adı" value={lesson.title} onChange={(e) => setLesson({ ...lesson, title: e.target.value })} />
                    <input className="field" placeholder="Təlimçi" value={lesson.instructor} onChange={(e) => setLesson({ ...lesson, instructor: e.target.value })} />
                    <input className="field" placeholder="İstiqamət" value={lesson.track} onChange={(e) => setLesson({ ...lesson, track: e.target.value })} />
                    <input className="field" placeholder="Məkan / link" value={lesson.room} onChange={(e) => setLesson({ ...lesson, room: e.target.value })} />
                    <input className="field" type="datetime-local" value={lesson.startsAt} onChange={(e) => setLesson({ ...lesson, startsAt: e.target.value })} />
                    <input className="field" type="datetime-local" value={lesson.endsAt} onChange={(e) => setLesson({ ...lesson, endsAt: e.target.value })} />
                    <button className="primary md:col-span-2" onClick={() => createLesson.mutate(lesson)}><Plus size={16} />Əlavə et</button>
                  </div>
                </Card>
              )}
              {isStaff && (
                <Card className="mt-6 p-6">
                  <h3 className="font-bold">Arxivdəki dərslər ({((allLessons.data ?? []) as { status: string }[]).filter((l) => l.status === "archived").length})</h3>
                  <div className="mt-4 space-y-3">
                    {((allLessons.data ?? []) as { id: number; title: string; status: string }[]).filter((l) => l.status === "archived").map((l) => (
                      <div key={l.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                        <p className="font-semibold">{l.title}</p>
                        <div className="flex gap-2">
                          <button onClick={() => setLessonStatus.mutate({ id: l.id, status: "active" })} className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">Bərpa et</button>
                          <ConfirmButton onConfirm={() => removeLesson.mutate({ id: l.id })} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600" pending={removeLesson.isPending}>Sil</ConfirmButton>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </section>
          )}

          {tab === "manage" && isStaff && (
            <Card className="p-6">
              <h3 className="font-bold">Təhvillər və qiymətləndirmə</h3>
              {(() => {
                const all = ((data?.submissions ?? []) as SubmissionRow[]);
                const q = subSearch.trim().toLowerCase();
                const visible = all.filter(
                  (s) =>
                    (subFilter === "all" || s.status === subFilter) &&
                    (q === "" ||
                      (s.studentName ?? "").toLowerCase().includes(q) ||
                      (s.studentEmail ?? "").toLowerCase().includes(q) ||
                      (taskTitles[s.taskId] ?? "").toLowerCase().includes(q) ||
                      (s.fileName ?? "").toLowerCase().includes(q))
                );
                const pending = all.filter((s) => s.status === "submitted").length;
                const done = all.filter((s) => s.status === "reviewed").length;
                const tabs = [
                  { id: "all" as const, label: `Hamısı (${all.length})` },
                  { id: "submitted" as const, label: `Gözləyən (${pending})` },
                  { id: "reviewed" as const, label: `Baxılan (${done})` },
                ];
                return (
                  <>
                    <div className="mt-5 flex flex-wrap items-center gap-2">
                      {tabs.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setSubFilter(t.id)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${subFilter === t.id ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                        >
                          {t.label}
                        </button>
                      ))}
                      <input
                        className="field ml-auto w-full !py-2 !text-xs sm:w-56"
                        placeholder="Ad, task, fayl axtar..."
                        value={subSearch}
                        onChange={(e) => setSubSearch(e.target.value)}
                      />
                    </div>
                    <div className="mt-5 overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b border-slate-100 text-xs text-slate-400">
                          <tr><th className="pb-3">Tələbə</th><th className="pb-3">Tapşırıq</th><th className="pb-3">Fayl</th><th className="pb-3">Status</th><th className="pb-3">Qiymət</th><th className="pb-3">Əməl</th></tr>
                        </thead>
                        <tbody>
                          {visible.map((s) => (
                      <tr key={s.id} className="border-b border-slate-50">
                        <td className="py-4">
                          <p className="font-semibold">{s.studentName || <span className="text-slate-400">Ad yoxdur</span>}</p>
                          <p className="text-xs text-slate-400">{s.studentEmail || `#${s.studentId}`}</p>
                        </td>
                        <td>{taskTitles[s.taskId] ?? <span className="text-slate-400">Task #{s.taskId} (silinib)</span>}</td>
                        <td>
                          {s.fileData ? (
                            <a href={s.fileData} download={s.fileName || "fayl"} className="font-semibold text-emerald-700 hover:underline">{s.fileName || "Faylı endir"}</a>
                          ) : s.fileUrl ? (
                            <a href={s.fileUrl} target="_blank" rel="noreferrer" className="font-semibold text-emerald-700 hover:underline">{s.fileName || "Faylı aç"}</a>
                          ) : (
                            <span>{s.fileName ? `${s.fileName} ` : ""}{s.fileName ? <span className="text-xs text-slate-400">(silinib)</span> : (s.note || "—")}</span>
                          )}
                        </td>
                        <td><Badge tone={s.status === "reviewed" ? "green" : "amber"}>{s.status}</Badge></td>
                        <td>
                          {s.grade !== null && s.grade !== undefined ? (
                            <Badge tone="green">{s.grade}/10</Badge>
                          ) : (
                            <input
                              type="number"
                              min={0}
                              max={10}
                              placeholder="0-10"
                              className="field w-20 !py-1.5 text-center !text-xs"
                              value={grades[s.id] ?? ""}
                              onChange={(e) => setGrades({ ...grades, [s.id]: e.target.value })}
                            />
                          )}
                        </td>
                        <td>
                          <textarea
                            className="field mb-2 !py-1.5 !text-xs"
                            rows={2}
                            placeholder="Rəy (tələbə görəcək)"
                            value={feedbacks[s.id] ?? ""}
                            onChange={(e) => setFeedbacks({ ...feedbacks, [s.id]: e.target.value })}
                          />
                          <div className="flex gap-2">
                            <button
                              className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"
                              onClick={() => {
                                const g = grades[s.id];
                                review.mutate({ id: s.id, feedback: feedbacks[s.id] || undefined, grade: g === undefined || g === "" ? undefined : Number(g) });
                              }}
                            >
                              Qəbul
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                        </tbody>
                      </table>
                      {all.length === 0 && <p className="py-8 text-center text-sm text-slate-400">Hələ təhvil yoxdur.</p>}
                      {all.length > 0 && visible.length === 0 && <p className="py-8 text-center text-sm text-slate-400">Axtarışa uyğun təhvil yoxdur.</p>}
                    </div>
                  </>
                );
              })()}
            </Card>
          )}

          {tab === "users" && isAdmin && <AdminUsers />}
          {tab === "account" && <Account />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
