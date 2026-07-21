import { supabase } from "@/integrations/supabase/client";

export type NotifKind = "focus" | "break" | "reminder" | "system";

/**
 * Fire an in-app notification: shows a browser Notification (if permitted),
 * vibrates, AND persists a row so the user can review it later on /notifications.
 */
export async function logNotification(opts: {
  title: string;
  body?: string;
  kind?: NotifKind;
  showBrowser?: boolean;
}) {
  const { title, body, kind = "reminder", showBrowser = true } = opts;

  // Browser notification (only while tab is open)
  if (showBrowser && typeof window !== "undefined" && "Notification" in window) {
    try {
      if (Notification.permission === "granted") {
        new Notification(title, {
          body,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          tag: `studyflow-${kind}`,
        });
      }
    } catch { /* ignore */ }
  }
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate?.([180, 80, 180]); } catch { /* ignore */ }
  }

  // Persist for the in-app list
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from("notifications").insert({
      user_id: u.user.id,
      kind,
      title,
      body: body ?? null,
    });
  } catch { /* ignore */ }
}

export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "default") {
    return await Notification.requestPermission();
  }
  return Notification.permission;
}
