import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Calendar, Plus, X, Trash2, CheckCircle2, Circle, GraduationCap, ClipboardList, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { plannerQuery, subjectsQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/planner")({
  head: () => ({ meta: [{ title: "Planner — StudyFlow AI" }] }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(plannerQuery()),
      context.queryClient.ensureQueryData(subjectsQuery()),
    ]);
  },
  component: PlannerPage,
});

type View = "day" | "week" | "month";

function PlannerPage() {
  const { data: items } = useSuspenseQuery(plannerQuery());
  const { data: subjects } = useSuspenseQuery(subjectsQuery());
  const qc = useQueryClient();
  const [view, setView] = useState<View>("week");
  const [addOpen, setAddOpen] = useState(false);
  const invalidate = () => qc.invalidateQueries({ queryKey: ["planner_items"] });

  const now = new Date();
  const exams = useMemo(() => items.filter((i) => i.kind === "exam" && !i.completed && new Date(i.due_at) >= now).slice(0, 3), [items, now]);

  const filtered = useMemo(() => {
    const start = new Date(now);
    const end = new Date(now);
    if (view === "day") { start.setHours(0,0,0,0); end.setHours(23,59,59,999); }
    if (view === "week") { start.setHours(0,0,0,0); end.setDate(end.getDate() + 7); }
    if (view === "month") { start.setHours(0,0,0,0); end.setMonth(end.getMonth() + 1); }
    return items.filter((i) => {
      const d = new Date(i.due_at);
      return d >= start && d <= end;
    });
  }, [items, view]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof items>();
    for (const i of filtered) {
      const key = new Date(i.due_at).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(i);
    }
    return [...map.entries()].sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
  }, [filtered]);

  const toggle = async (id: string, done: boolean) => {
    await supabase.from("planner_items").update({ completed: !done }).eq("id", id);
    invalidate();
  };
  const remove = async (id: string) => {
    await supabase.from("planner_items").delete().eq("id", id);
    invalidate();
  };

  return (
    <div className="px-5 pb-6 pt-10">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Study planner</p>
          <h1 className="font-display text-3xl font-bold">Planner</h1>
        </div>
        <button onClick={() => setAddOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-full gradient-primary shadow-[var(--shadow-glow)] active:scale-95"
          aria-label="Add item">
          <Plus className="h-5 w-5 text-white" strokeWidth={2.5} />
        </button>
      </div>

      {exams.length > 0 && (
        <section className="mb-5">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <GraduationCap className="h-3.5 w-3.5" /> Exam countdown
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5">
            {exams.map((e) => {
              const days = Math.max(0, Math.ceil((new Date(e.due_at).getTime() - now.getTime()) / 86400_000));
              return (
                <div key={e.id} className="min-w-[160px] shrink-0 rounded-3xl gradient-primary p-4 text-white shadow-[var(--shadow-glow)]">
                  <div className="text-xs font-semibold uppercase tracking-wider opacity-80">{days === 0 ? "Today" : `${days}d`}</div>
                  <div className="mt-1 line-clamp-2 font-display text-base font-bold leading-tight">{e.title}</div>
                  <div className="mt-2 text-xs opacity-80">{new Date(e.due_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="mb-4 inline-flex rounded-2xl bg-muted p-1">
        {(["day", "week", "month"] as const).map((v) => (
          <button key={v} onClick={() => setView(v)}
            className={`rounded-xl px-4 py-1.5 text-xs font-semibold capitalize transition ${
              view === v ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
            }`}>{v}</button>
        ))}
      </div>

      {grouped.length === 0 ? (
        <div className="soft-card mt-4 flex flex-col items-center gap-3 p-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft">
            <Calendar className="h-7 w-7 text-primary" />
          </div>
          <div>
            <p className="font-semibold">Nothing scheduled</p>
            <p className="text-sm text-muted-foreground">Add tasks, assignments, and exams</p>
          </div>
          <button onClick={() => setAddOpen(true)} className="mt-2 rounded-2xl gradient-primary px-4 py-2 text-sm font-semibold text-white">
            Add item
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(([date, list]) => (
            <section key={date}>
              <div className="mb-2 flex items-baseline gap-2">
                <div className="font-display text-lg font-bold">{formatDay(date)}</div>
                <div className="text-xs text-muted-foreground">{new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
              </div>
              <div className="space-y-2">
                {list.map((i) => {
                  const subj = subjects.find((s) => s.id === i.subject_id);
                  return (
                    <motion.div key={i.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                      className="soft-card group flex items-center gap-3 p-3">
                      <button onClick={() => toggle(i.id, i.completed)} className="shrink-0 text-primary">
                        {i.completed ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6 text-muted-foreground" />}
                      </button>
                      <KindBadge kind={i.kind} />
                      <div className="min-w-0 flex-1">
                        <div className={`truncate text-sm font-semibold ${i.completed ? "text-muted-foreground line-through" : ""}`}>{i.title}</div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{new Date(i.due_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          {subj && <><span>·</span><span>{subj.emoji} {subj.name}</span></>}
                        </div>
                      </div>
                      <button onClick={() => remove(i.id)} className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <AnimatePresence>
        {addOpen && <AddItemSheet subjects={subjects} onClose={() => { setAddOpen(false); invalidate(); }} />}
      </AnimatePresence>

      <div className="mt-8 text-center">
        <Link to="/subjects" className="text-xs font-semibold text-muted-foreground underline underline-offset-4">Manage subjects</Link>
      </div>
    </div>
  );
}

function formatDay(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString(undefined, { weekday: "long" });
}

function KindBadge({ kind }: { kind: string }) {
  const map: Record<string, { icon: any; tint: string }> = {
    task: { icon: ListChecks, tint: "bg-sky/20 text-sky-foreground" },
    assignment: { icon: ClipboardList, tint: "bg-amber/20 text-foreground" },
    exam: { icon: GraduationCap, tint: "bg-coral/20 text-foreground" },
  };
  const { icon: Icon } = map[kind] ?? map.task;
  return <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${map[kind]?.tint ?? "bg-muted"}`}>
    <Icon className="h-4 w-4" strokeWidth={2.3} />
  </div>;
}

function AddItemSheet({ subjects, onClose }: { subjects: any[]; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [kind, setKind] = useState<"task" | "assignment" | "exam">("task");
  const [date, setDate] = useState(() => {
    const d = new Date(); d.setHours(23, 59, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [subjectId, setSubjectId] = useState<string | "">("");

  const save = async () => {
    if (!title.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("planner_items").insert({
      user_id: u.user.id,
      title: title.trim(), notes: notes.trim() || null,
      kind, due_at: new Date(date).toISOString(),
      subject_id: subjectId || null,
    });
    if (error) return toast.error(error.message);
    onClose();
  };

  return <>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
    <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[90dvh] max-w-xl overflow-y-auto rounded-t-3xl bg-card p-6 shadow-2xl">
      <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">New item</h2>
        <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted"><X className="h-5 w-5" /></button>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2">
        {(["task", "assignment", "exam"] as const).map((k) => (
          <button key={k} onClick={() => setKind(k)}
            className={`rounded-2xl py-2 text-xs font-semibold capitalize transition ${
              kind === k ? "gradient-primary text-white shadow-[var(--shadow-glow)]" : "bg-muted text-muted-foreground"
            }`}>{k}</button>
        ))}
      </div>

      <label className="block text-xs font-semibold text-muted-foreground">TITLE</label>
      <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
        placeholder={kind === "exam" ? "Biology midterm" : kind === "assignment" ? "Physics problem set 4" : "Read chapter 3"}
        className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" />

      <label className="mt-4 block text-xs font-semibold text-muted-foreground">DUE</label>
      <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)}
        className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" />

      <label className="mt-4 block text-xs font-semibold text-muted-foreground">NOTES (OPTIONAL)</label>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
        className="mt-1 w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" />

      <label className="mt-4 block text-xs font-semibold text-muted-foreground">SUBJECT</label>
      <div className="mt-2 flex flex-wrap gap-2">
        <button onClick={() => setSubjectId("")}
          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${subjectId === "" ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>None</button>
        {subjects.map((s) => (
          <button key={s.id} onClick={() => setSubjectId(s.id)}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${subjectId === s.id ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
            {s.emoji} {s.name}
          </button>
        ))}
      </div>

      <button onClick={save} className="mt-6 w-full rounded-2xl gradient-primary py-3.5 text-sm font-semibold text-white shadow-[var(--shadow-glow)] active:scale-[0.98]">
        Save
      </button>
    </motion.div>
  </>;
}
