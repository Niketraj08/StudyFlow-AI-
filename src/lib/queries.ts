import { supabase } from "@/integrations/supabase/client";
import { queryOptions } from "@tanstack/react-query";

export const notificationsQuery = () =>
  queryOptions({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

export const unreadNotificationsCountQuery = () =>
  queryOptions({
    queryKey: ["notifications", "unread_count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null);
      if (error) throw error;
      return count ?? 0;
    },
  });


export const profileQuery = () =>
  queryOptions({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data, error } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const subjectsQuery = () =>
  queryOptions({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const notesQuery = () =>
  queryOptions({
    queryKey: ["notes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("notes").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const chatMessagesQuery = () =>
  queryOptions({
    queryKey: ["chat_messages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("chat_messages").select("*").order("created_at", { ascending: true }).limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

export const focusStatsQuery = () =>
  queryOptions({
    queryKey: ["focus_stats"],
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 86400_000).toISOString();
      const { data, error } = await supabase.from("focus_sessions").select("*").gte("created_at", since);
      if (error) throw error;
      return data ?? [];
    },
  });

export const flashcardsQuery = () =>
  queryOptions({
    queryKey: ["flashcards"],
    queryFn: async () => {
      const { data, error } = await supabase.from("flashcards").select("*").order("due_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

export const pdfsQuery = () =>
  queryOptions({
    queryKey: ["pdfs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pdfs").select("id, name, size_bytes, page_count, summary, subject_id, created_at, storage_path").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const pdfQuery = (id: string) =>
  queryOptions({
    queryKey: ["pdf", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("pdfs").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const plannerQuery = () =>
  queryOptions({
    queryKey: ["planner_items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("planner_items").select("*").order("due_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
