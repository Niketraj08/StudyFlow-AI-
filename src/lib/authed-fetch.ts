import { supabase } from "@/integrations/supabase/client";

/**
 * fetch() wrapper that attaches the current Supabase access token as a Bearer
 * Authorization header. Use for calls to protected /api/* routes.
 */
export async function authedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
