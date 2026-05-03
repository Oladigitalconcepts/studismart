// Fast current-user helper. Prefers the in-memory/localStorage session
// (synchronous, no network) over `auth.getUser()` which performs a
// /user round-trip and adds 500ms–2s on every screen mount.
//
// Drop-in shape mirrors `supabase.auth.getUser()` so callers can do:
//   const { data: { user } } = await getCurrentUser();
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export const getCurrentUser = async (): Promise<{ data: { user: User | null } }> => {
  const { data } = await supabase.auth.getSession();
  if (data.session?.user) return { data: { user: data.session.user } };
  // Fallback to network call only if no cached session exists.
  const { data: u } = await supabase.auth.getUser();
  return { data: { user: u.user } };
};
