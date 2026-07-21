import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Bell, Flame, Target, Sparkles, TrendingUp, ArrowRight, BookOpen, Timer, Layers, FileText, Calendar, StickyNote } from "lucide-react";
import { profileQuery, subjectsQuery, focusStatsQuery, unreadNotificationsCountQuery } from "@/lib/queries";
import logo from "@/assets/studyflow-logo.png.asset.json";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({ meta: [{ title: "Home — StudyFlow AI" }] }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(profileQuery()),
      context.queryClient.ensureQueryData(subjectsQuery()),
      context.queryClient.ensureQueryData(focusStatsQuery()),
      context.queryClient.ensureQueryData(unreadNotificationsCountQuery()),
    ]);
  },
  component: HomePage,
});


const QUOTES = [
  "Small steps every day beat giant leaps once a week.",
  "You don't have to be great to start, but you have to start to be great.",
  "Focus is the new superpower.",
  "One page today. One chapter this week. One book this month.",
  "Discipline is choosing between what you want now and what you want most.",
  "The expert in anything was once a beginner.",
  "Success is the sum of small efforts repeated day in and day out.",
  "Don't watch the clock; do what it does — keep going.",
  "The secret of getting ahead is getting started.",
  "Study while others are sleeping; work while others are loafing.",
  "A little progress each day adds up to big results.",
  "You are your only limit.",
  "Push yourself, because no one else is going to do it for you.",
  "Great things never come from comfort zones.",
  "Dream it. Wish it. Do it.",
  "Don't stop when you're tired. Stop when you're done.",
  "Wake up with determination. Go to bed with satisfaction.",
  "The future depends on what you do today.",
  "Learning never exhausts the mind — it fuels it.",
  "Every accomplishment starts with the decision to try.",
  "Your only limit is your mind.",
  "Do something today that your future self will thank you for.",
  "Consistency is more important than perfection.",
  "One percent better every day.",
  "The best way to predict the future is to create it.",
  "Believe you can and you're halfway there.",
  "Hard work beats talent when talent doesn't work hard.",
  "Fall seven times, stand up eight.",
  "Knowledge is power. Practice is mastery.",
];

function HomePage() {
  const { data: profile } = useSuspenseQuery(profileQuery());
  const { data: subjects } = useSuspenseQuery(subjectsQuery());
  const { data: sessions } = useSuspenseQuery(focusStatsQuery());
  const { data: unread } = useSuspenseQuery(unreadNotificationsCountQuery());


  const today = new Date().toDateString();
  const todayMinutes = sessions
    .filter((s) => new Date(s.created_at).toDateString() === today)
    .reduce((sum, s) => sum + s.duration_minutes, 0);
  const goal = profile?.daily_goal_minutes ?? 60;
  const progress = Math.min(100, Math.round((todayMinutes / goal) * 100));
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const quote = QUOTES[dayOfYear % QUOTES.length];
  const name = profile?.display_name?.split(" ")[0] ?? "there";

  return (
    <div className="px-5 pb-6 pt-10">
      <motion.header
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-start justify-between gap-3"
      >
        <div>
          <p className="text-sm font-medium text-muted-foreground">{greeting()},</p>
          <h1 className="font-display text-3xl font-bold">{name} 👋</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/notifications"
            aria-label="Notifications"
            className="relative flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card"
          >
            <Bell className="h-5 w-5" strokeWidth={2.2} />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
          <img src={logo.url} alt="StudyFlow AI" className="h-12 w-12 shrink-0 object-contain" />
        </div>
      </motion.header>


      {/* Progress hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="relative overflow-hidden rounded-3xl gradient-primary p-6 text-primary-foreground shadow-[var(--shadow-glow)]"
      >
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider opacity-80">
          <Target className="h-3.5 w-3.5" /> Today's goal
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-display text-5xl font-bold tabular-nums">{todayMinutes}</span>
          <span className="text-lg opacity-80">/ {goal} min</span>
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/20">
          <motion.div
            initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full bg-white"
          />
        </div>
        <p className="mt-3 text-sm opacity-90">
          {progress >= 100 ? "🎉 Goal crushed today!" : `${goal - todayMinutes} min to hit your goal`}
        </p>
      </motion.div>

      {/* Stats row */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatCard icon={Flame} label="Streak" value={`${profile?.streak ?? 0} days`} tint="coral" />
        <StatCard icon={Sparkles} label="XP" value={`${profile?.xp ?? 0}`} tint="amber" />
      </div>

      {/* Quick actions */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <ActionCard to="/flashcards" icon={Layers} label="Flashcards" desc="Spaced review" />
        <ActionCard to="/pdfs" icon={FileText} label="PDFs" desc="Summarize & ask" />
        <ActionCard to="/planner" icon={Calendar} label="Planner" desc="Exams & tasks" />
        <ActionCard to="/notes" icon={StickyNote} label="Notes" desc="Capture ideas" />
        <ActionCard to="/subjects" icon={BookOpen} label="Subjects" desc="Your library" />
        <ActionCard to="/focus" icon={Timer} label="Focus" desc="Pomodoro" />
      </div>

      {/* Subjects preview */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Your subjects</h2>
          <Link to="/subjects" className="flex items-center gap-1 text-sm font-semibold text-primary">
            See all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {subjects.length === 0 ? (
          <Link to="/subjects" className="block soft-card p-5 text-center">
            <BookOpen className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">No subjects yet</p>
            <p className="text-xs text-muted-foreground">Tap to add your first subject</p>
          </Link>
        ) : (
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5">
            {subjects.slice(0, 5).map((s) => (
              <div key={s.id} className="min-w-[160px] soft-card p-4">
                <div className="mb-2 text-2xl">{s.emoji}</div>
                <div className="font-semibold">{s.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{s.study_minutes} min studied</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quote */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        className="mt-6 rounded-3xl border border-dashed border-primary/30 bg-primary-soft/50 p-5"
      >
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
          <TrendingUp className="h-3.5 w-3.5" /> Daily nudge
        </div>
        <p className="mt-2 font-display text-base leading-snug">"{quote}"</p>
      </motion.div>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

const tints: Record<string, string> = {
  coral: "from-[oklch(0.86_0.15_30)] to-[oklch(0.75_0.17_15)]",
  amber: "from-[oklch(0.9_0.14_85)] to-[oklch(0.8_0.17_55)]",
};

function StatCard({ icon: Icon, label, value, tint }: { icon: any; label: string; value: string; tint: string }) {
  return (
    <div className="soft-card p-4">
      <div className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${tints[tint]}`}>
        <Icon className="h-4 w-4 text-white" strokeWidth={2.5} />
      </div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="font-display text-xl font-bold">{value}</div>
    </div>
  );
}

function ActionCard({ to, icon: Icon, label, desc }: { to: any; icon: any; label: string; desc: string }) {
  return (
    <Link to={to} className="soft-card group flex flex-col gap-2 p-4 transition active:scale-[0.98]">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <Icon className="h-4 w-4" strokeWidth={2.5} />
      </div>
      <div>
        <div className="font-semibold">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
    </Link>
  );
}
