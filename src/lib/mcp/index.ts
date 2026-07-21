import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listSubjectsTool from "./tools/list-subjects";
import listNotesTool from "./tools/list-notes";
import createNoteTool from "./tools/create-note";
import listPlannerTool from "./tools/list-planner";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "studyflow-ai-mcp",
  title: "StudyFlow AI",
  version: "0.1.0",
  instructions:
    "Tools for the StudyFlow AI study companion. Read the signed-in user's subjects, notes, and planner items, and create new notes on their behalf.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listSubjectsTool, listNotesTool, createNoteTool, listPlannerTool],
});
