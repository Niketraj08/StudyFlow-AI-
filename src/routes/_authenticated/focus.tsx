import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Play, Pause, RotateCcw, Coffee } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { focusStatsQuery } from "@/lib/queries";
import { logNotification, requestNotificationPermission } from "@/lib/notifications";

export const Route = createFileRoute("/_authenticated/focus")({
  head: () => ({ meta: [{ title: "Focus — StudyFlow AI" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(focusStatsQuery()),
  component: FocusPage,
});

const PRESETS = [
  { label: "Pomodoro", focus: 25, break: 5 },
  { label: "Deep work", focus: 50, break: 10 },
  { label: "Sprint", focus: 15, break: 3 },
];

function FocusPage() {
  const { data: sessions } = useSuspenseQuery(focusStatsQuery());
  const qc = useQueryClient();
  const [preset, setPreset] = useState(PRESETS[0]);
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [seconds, setSeconds] = useState(PRESETS[0].focus * 60);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const total = (mode === "focus" ? preset.focus : preset.break) * 60;
  const progress = 1 - seconds / total;

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current!);
          finishSession();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const finishSession = async () => {
    setRunning(false);
    if (mode === "focus") {
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        await supabase.from("focus_sessions").insert({
          user_id: u.user.id, duration_minutes: preset.focus, completed: true,
        });
        qc.invalidateQueries({ queryKey: ["focus_stats"] });
      }
      toast.success(`Nice — ${preset.focus} minutes focused! Take a break 🌿`);
      await logNotification({
        kind: "focus",
        title: "Focus session complete 🎯",
        body: `${preset.focus} min done. Time for a ${preset.break} min break.`,
      });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      setMode("break"); setSeconds(preset.break * 60);
    } else {
      toast("Break over — ready for another round?");
      await logNotification({
        kind: "break",
        title: "Break's over ☕",
        body: "Ready for another focus round?",
      });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      setMode("focus"); setSeconds(preset.focus * 60);
    }
  };

  const toggleRun = () => {
    setRunning((r) => {
      const next = !r;
      if (next) {
        requestNotificationPermission().then((p) => {
          if (p === "granted") toast.success("Notifications on — we'll ping you when the timer ends 🔔");
        });
      }
      return next;
    });
  };


  const reset = () => { setRunning(false); setSeconds((mode === "focus" ? preset.focus : preset.break) * 60); };
  const changePreset = (p: typeof PRESETS[number]) => { setPreset(p); setMode("focus"); setSeconds(p.focus * 60); setRunning(false); };

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const totalMinutes = sessions.reduce((a, s) => a + s.duration_minutes, 0);

  return (
    <div className="px-5 pb-6 pt-10">
      <div className="mb-6">
        <p className="text-sm font-medium text-muted-foreground">Deep work</p>
        <h1 className="font-display text-3xl font-bold">Focus</h1>
      </div>

      <div className="mb-6 flex gap-2">
        {PRESETS.map((p) => (
          <button key={p.label} onClick={() => changePreset(p)}
            className={`flex-1 rounded-2xl py-2 text-xs font-semibold transition ${
              preset.label === p.label ? "gradient-primary text-white shadow-[var(--shadow-glow)]" : "bg-card border border-border text-muted-foreground"
            }`}>{p.label}</button>
        ))}
      </div>

      <motion.div layout className="soft-card flex flex-col items-center gap-6 p-8">
        <div className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
          mode === "focus" ? "bg-primary-soft text-primary" : "bg-mint/20 text-[color:var(--mint)]"
        }`}>
          {mode === "focus" ? "🎯 Focus" : <><Coffee className="h-3 w-3" /> Break</>}
        </div>

        <div className="relative flex h-64 w-64 items-center justify-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="46" fill="none" stroke="var(--muted)" strokeWidth="4" />
            <motion.circle
              cx="50" cy="50" r="46" fill="none"
              stroke={mode === "focus" ? "url(#g1)" : "var(--mint)"}
              strokeWidth="4" strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 46}`}
              animate={{ strokeDashoffset: 2 * Math.PI * 46 * (1 - progress) }}
              transition={{ duration: 0.9, ease: "easeOut" }}
            />
            <defs>
              <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="oklch(0.55 0.19 320)" />
                <stop offset="100%" stopColor="oklch(0.42 0.18 280)" />
              </linearGradient>
            </defs>
          </svg>
          <div className="text-center">
            <div className="font-display text-6xl font-bold tabular-nums">{mm}:{ss}</div>
            <div className="mt-1 text-sm text-muted-foreground">{mode === "focus" ? preset.focus : preset.break} min</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={reset} className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card">
            <RotateCcw className="h-5 w-5" />
          </button>
          <button
            onClick={toggleRun}
            className="flex h-16 w-16 items-center justify-center rounded-full gradient-primary text-white shadow-[var(--shadow-glow)] active:scale-95"
          >
            {running ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 pl-0.5" />}
          </button>
          <button onClick={finishSession} className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-xs font-bold">
            Skip
          </button>
        </div>
      </motion.div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="soft-card p-4">
          <div className="text-xs font-semibold text-muted-foreground">THIS WEEK</div>
          <div className="mt-1 font-display text-2xl font-bold">{totalMinutes}m</div>
        </div>
        <div className="soft-card p-4">
          <div className="text-xs font-semibold text-muted-foreground">SESSIONS</div>
          <div className="mt-1 font-display text-2xl font-bold">{sessions.length}</div>
        </div>
      </div>
    </div>
  );
}
