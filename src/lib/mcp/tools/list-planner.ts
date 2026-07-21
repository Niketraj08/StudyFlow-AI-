import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function supaForUser(ctx: ToolContext) {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_planner_items",
  title: "List planner items",
  description: "List upcoming StudyFlow planner items (tasks, assignments, exams) for the signed-in user.",
  inputSchema: {
    days_ahead: z.number().int().positive().max(365).optional().describe("Only include items due within this many days (default 30)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ days_ahead }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + (days_ahead ?? 30));
    const { data, error } = await supaForUser(ctx)
      .from("planner_items")
      .select("id, title, kind, due_at, completed")
      .lte("due_at", horizon.toISOString())
      .order("due_at", { ascending: true });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { items: data ?? [] },
    };
  },
});
