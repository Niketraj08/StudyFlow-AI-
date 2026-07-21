import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "motion/react";
import { LogOut, Target, Flame, Sparkles, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { profileQuery, focusStatsQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — StudyFlow AI" }] }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(profileQuery()),
      context.queryClient.ensureQueryData(focusStatsQuery()),
    ]);
  },
  component: ProfilePage,
});

function ProfilePage() {
  const { data: profile } = useSuspenseQuery(profileQuery());
  const { data: sessions } = useSuspenseQuery(focusStatsQuery());
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState(profile?.display_name ?? "");
  const [goal, setGoal] = useState(profile?.daily_goal_minutes ?? 60);

  const save = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("profiles").update({ display_name: name, daily_goal_minutes: goal }).eq("id", u.user.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Saved!");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const totalMinutes = sessions.reduce((a, s) => a + s.duration_minutes, 0);
  const initials = (profile?.display_name ?? "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="px-5 pb-6 pt-10">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex flex-col items-center text-center">
        <div className="mb-3 flex h-24 w-24 items-center justify-center rounded-full gradient-primary text-3xl font-bold text-white shadow-[var(--shadow-glow)]">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
          ) : initials}
        </div>
        <h1 className="font-display text-2xl font-bold">{profile?.display_name ?? "Learner"}</h1>
        <p className="text-sm text-muted-foreground">Keep the streak alive ✨</p>
      </motion.div>

      <div className="grid grid-cols-3 gap-3">
        <Stat icon={Flame} label="Streak" value={`${profile?.streak ?? 0}d`} />
        <Stat icon={Sparkles} label="XP" value={`${profile?.xp ?? 0}`} />
        <Stat icon={Target} label="This wk" value={`${totalMinutes}m`} />
      </div>

      <section className="mt-8 soft-card p-5">
        <h2 className="mb-4 font-display text-lg font-bold">Settings</h2>

        <label className="block text-xs font-semibold text-muted-foreground">DISPLAY NAME</label>
        <input value={name} onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" />

        <label className="mt-4 block text-xs font-semibold text-muted-foreground">DAILY GOAL (MIN)</label>
        <input type="number" min={10} max={600} value={goal} onChange={(e) => setGoal(Number(e.target.value))}
          className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" />

        <button onClick={save}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl gradient-primary py-3 text-sm font-semibold text-white active:scale-[0.98]">
          <Save className="h-4 w-4" /> Save changes
        </button>
      </section>

      <button onClick={signOut}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3.5 text-sm font-semibold text-muted-foreground transition hover:text-destructive">
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="soft-card flex flex-col items-center gap-1 p-4">
      <Icon className="h-4 w-4 text-primary" />
      <div className="font-display text-xl font-bold">{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
