import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import { Bell, BellOff, Check, ChevronLeft, Trash2, Target, Coffee, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { notificationsQuery } from "@/lib/queries";
import { requestNotificationPermission } from "@/lib/notifications";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — StudyFlow AI" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(notificationsQuery()),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { data: items } = useSuspenseQuery(notificationsQuery());
  const qc = useQueryClient();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unsupported",
  );

  const unreadIds = items.filter((n) => !n.read_at).map((n) => n.id);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  const markAllRead = async () => {
    if (unreadIds.length === 0) return;
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds);
    if (error) return toast.error("Couldn't mark as read");
    invalidate();
    toast.success("All caught up ✨");
  };

  const toggleRead = async (id: string, currentlyRead: boolean) => {
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: currentlyRead ? null : new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error("Couldn't update");
    invalidate();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) return toast.error("Couldn't delete");
    invalidate();
  };

  const clearAll = async () => {
    if (items.length === 0) return;
    if (!confirm("Clear all notifications?")) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("notifications").delete().eq("user_id", u.user.id);
    if (error) return toast.error("Couldn't clear");
    invalidate();
    toast.success("Cleared");
  };

  const enablePush = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === "granted") toast.success("Notifications enabled 🔔");
    else if (result === "denied") toast.error("Blocked. Enable in your browser settings.");
  };

  return (
    <div className="px-5 pb-6 pt-10">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/home" aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Alerts & reminders</p>
            <h1 className="font-display text-3xl font-bold">Notifications</h1>
          </div>
        </div>
        {items.length > 0 && (
          <button
            onClick={clearAll}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground"
          >
            Clear all
          </button>
        )}
      </header>

      {/* Permission banner */}
      {permission !== "granted" && permission !== "unsupported" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-center gap-3 rounded-3xl border border-primary/20 bg-primary-soft/50 p-4"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Bell className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">Enable browser alerts</div>
            <p className="text-xs text-muted-foreground">Get pinged when your focus timer ends.</p>
          </div>
          <button
            onClick={enablePush}
            className="rounded-full gradient-primary px-4 py-2 text-xs font-bold text-primary-foreground"
          >
            Enable
          </button>
        </motion.div>
      )}

      {/* Mark all read */}
      {unreadIds.length > 0 && (
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">
            {unreadIds.length} unread
          </span>
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 rounded-full bg-card border border-border px-3 py-1.5 text-xs font-semibold text-primary"
          >
            <Check className="h-3.5 w-3.5" /> Mark all read
          </button>
        </div>
      )}

      {/* List */}
      {items.length === 0 ? (
        <div className="soft-card mt-4 flex flex-col items-center gap-2 p-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <BellOff className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="mt-2 font-display text-lg font-bold">All quiet here</p>
          <p className="text-sm text-muted-foreground">
            Focus and break alerts will show up in this list.
          </p>
          <Link
            to="/focus"
            className="mt-3 rounded-full gradient-primary px-5 py-2 text-sm font-bold text-primary-foreground"
          >
            Start a session
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {items.map((n) => (
              <motion.li
                key={n.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={`soft-card flex items-start gap-3 p-4 ${
                  !n.read_at ? "border-primary/30 bg-primary-soft/30" : ""
                }`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${iconTint(n.kind)}`}>
                  {iconFor(n.kind)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-semibold">{n.title}</h3>
                    {!n.read_at && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  </div>
                  {n.body && (
                    <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">{n.body}</p>
                  )}
                  <div className="mt-1.5 flex items-center gap-3 text-[11px] font-medium text-muted-foreground">
                    <span>{relativeTime(n.created_at)}</span>
                    <button
                      onClick={() => toggleRead(n.id, !!n.read_at)}
                      className="text-primary"
                    >
                      {n.read_at ? "Mark unread" : "Mark read"}
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => remove(n.id)}
                  aria-label="Delete"
                  className="shrink-0 rounded-full p-2 text-muted-foreground hover:bg-muted"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}

function iconFor(kind: string) {
  const cls = "h-4 w-4 text-white";
  if (kind === "focus") return <Target className={cls} strokeWidth={2.5} />;
  if (kind === "break") return <Coffee className={cls} strokeWidth={2.5} />;
  if (kind === "reminder") return <Bell className={cls} strokeWidth={2.5} />;
  return <Sparkles className={cls} strokeWidth={2.5} />;
}

function iconTint(kind: string) {
  if (kind === "focus") return "bg-gradient-to-br from-[oklch(0.55_0.19_320)] to-[oklch(0.42_0.18_280)]";
  if (kind === "break") return "bg-gradient-to-br from-[oklch(0.82_0.13_160)] to-[oklch(0.7_0.15_180)]";
  if (kind === "reminder") return "bg-gradient-to-br from-[oklch(0.86_0.15_30)] to-[oklch(0.75_0.17_15)]";
  return "bg-gradient-to-br from-[oklch(0.9_0.14_85)] to-[oklch(0.8_0.17_55)]";
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
