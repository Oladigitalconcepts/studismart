// Daily missions definitions + tracking helpers.
import { supabase } from "@/integrations/supabase/client";
import { earn } from "@/lib/coins";

export interface MissionDef {
  key: string;
  title: string;
  description: string;
  reward: number;
  target: number;
  icon: string; // lucide name
  color: string;
}

export const DAILY_MISSIONS: MissionDef[] = [
  { key: "daily_login",     title: "Daily Login",     description: "Login to the app",            reward: 5,  target: 1, icon: "calendar",      color: "primary" },
  { key: "streak_3",        title: "3 Day Streak",    description: "Login for 3 consecutive days", reward: 15, target: 3, icon: "flame",         color: "green" },
  { key: "complete_test",   title: "Complete a Test", description: "Complete any test or quiz",    reward: 10, target: 1, icon: "file-text",     color: "blue" },
  { key: "ask_ai_tutor",    title: "Ask AI Tutor",    description: "Ask any question to AI Tutor", reward: 5,  target: 1, icon: "bot",           color: "amber" },
  { key: "summarize_notes", title: "Summarize Notes", description: "Summarize any notes with AI",  reward: 10, target: 1, icon: "sticky-note",   color: "pink" },
  { key: "share_quiz",      title: "Share a Quiz",    description: "Share a quiz with your friends", reward: 10, target: 1, icon: "share-2",     color: "teal" },
];

export const BONUS_MISSIONS: MissionDef[] = [
  { key: "invite_friends",  title: "Invite 3 Friends",   description: "Invite and get rewards",      reward: 150, target: 3, icon: "user-plus",   color: "amber" },
  { key: "topper",          title: "Topper Challenge",   description: "Score 80%+ in a test",        reward: 100, target: 1, icon: "trophy",      color: "green" },
  { key: "weekly_champion", title: "Weekly Champion",    description: "Participate in 5 quizzes",    reward: 200, target: 5, icon: "shield-check", color: "blue" },
];

const today = () => new Date().toISOString().slice(0, 10);

export interface MissionRow {
  mission_key: string;
  count: number;
  claimed_at: string | null;
}

export async function fetchTodayMissions(): Promise<Record<string, MissionRow>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};
  const { data } = await supabase
    .from("mission_progress")
    .select("mission_key, count, claimed_at")
    .eq("user_id", user.id)
    .eq("day", today());
  const map: Record<string, MissionRow> = {};
  (data ?? []).forEach((r: any) => { map[r.mission_key] = r; });
  return map;
}

export async function bumpMission(key: string, by = 1) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const day = today();
  // upsert
  const { data: existing } = await supabase
    .from("mission_progress")
    .select("id, count")
    .eq("user_id", user.id).eq("mission_key", key).eq("day", day)
    .maybeSingle();
  if (existing) {
    await supabase.from("mission_progress")
      .update({ count: existing.count + by })
      .eq("id", existing.id);
  } else {
    await supabase.from("mission_progress")
      .insert({ user_id: user.id, mission_key: key, day, count: by });
  }
}

export async function claimMission(def: MissionDef, idempotencyKey?: string) {
  const key = idempotencyKey ?? `${def.key}_${today()}`;
  const { error } = await supabase.rpc("claim_mission", {
    _mission_key: def.key,
    _reward: def.reward,
    _target: def.target,
    _idempotency_key: key,
  });
  if (error) throw error;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("wallet-updated"));
  }
}

// Atomic daily check-in (server-side guard prevents double-credit across devices/taps)
export async function triggerDailyLogin() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.rpc("daily_check_in", { _reward: 5 });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("wallet-updated"));
  }
}
