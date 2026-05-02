import { supabase } from "@/integrations/supabase/client";

export type NotifType =
  | "study_reminder"
  | "streak"
  | "achievement"
  | "study_pack_ready"
  | "system";

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotifType;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

const REMINDER_KEY_PREFIX = "studymind-last-reminder-";
const ACHIEVEMENTS_KEY_PREFIX = "studymind-ach-seen-";

interface QuietHours {
  start: string | null;
  end: string | null;
}

const inQuietHours = (now: Date, q: QuietHours): boolean => {
  if (!q.start || !q.end) return false;
  const [sH, sM] = q.start.split(":").map(Number);
  const [eH, eM] = q.end.split(":").map(Number);
  const cur = now.getHours() * 60 + now.getMinutes();
  const start = sH * 60 + sM;
  const end = eH * 60 + eM;
  if (start === end) return false;
  if (start < end) return cur >= start && cur < end;
  return cur >= start || cur < end; // wraps midnight
};

export const createNotification = async (
  type: NotifType,
  title: string,
  body?: string,
  data?: Record<string, unknown>,
): Promise<AppNotification | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Respect prefs
  const { data: prefs } = await supabase
    .from("profiles")
    .select(
      "notify_study_reminders, notify_practice_streaks, notify_new_features, quiet_hours_start, quiet_hours_end, push_enabled",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (prefs) {
    if (type === "study_reminder" && !prefs.notify_study_reminders) return null;
    if (type === "streak" && !prefs.notify_practice_streaks) return null;
    if (type === "system" && !prefs.notify_new_features) return null;
  }

  const { data: row, error } = await supabase
    .from("notifications")
    .insert([
      {
        user_id: user.id,
        type,
        title,
        body: body ?? undefined,
        data: JSON.parse(JSON.stringify(data ?? {})),
      },
    ])
    .select()
    .single();

  if (error || !row) return null;

  // Fire local browser notification too (if granted and not in quiet hours).
  const inQuiet = prefs
    ? inQuietHours(new Date(), {
        start: prefs.quiet_hours_start,
        end: prefs.quiet_hours_end,
      })
    : false;

  if (
    typeof Notification !== "undefined" &&
    Notification.permission === "granted" &&
    !inQuiet
  ) {
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg) {
        await reg.showNotification(title, {
          body: body ?? "",
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag: type,
          data,
        });
      } else {
        new Notification(title, { body: body ?? "", icon: "/icon-192.png" });
      }
    } catch {
      /* noop */
    }
  }

  return row as AppNotification;
};

/* ---------- Streak computation ---------- */

export interface StreakInfo {
  current: number;
  longest: number;
  studiedToday: boolean;
}

export const computeStreak = async (): Promise<StreakInfo> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { current: 0, longest: 0, studiedToday: false };

  const since = new Date();
  since.setDate(since.getDate() - 90);
  const { data } = await supabase
    .from("practice_attempts")
    .select("finished_at")
    .gte("finished_at", since.toISOString())
    .order("finished_at", { ascending: false });

  const days = new Set<string>();
  (data ?? []).forEach((r) => {
    const d = new Date(r.finished_at);
    days.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  });

  const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const studiedToday = days.has(dayKey(today));
  const startFrom = studiedToday ? today : yesterday;

  let current = 0;
  const cursor = new Date(startFrom);
  while (days.has(dayKey(cursor))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Longest streak (rough — over the 90-day window)
  let longest = 0;
  let run = 0;
  const sorted = Array.from(days)
    .map((k) => {
      const [y, m, d] = k.split("-").map(Number);
      return new Date(y, m, d).getTime();
    })
    .sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) run = 1;
    else {
      const diff = (sorted[i] - sorted[i - 1]) / 86400000;
      run = diff === 1 ? run + 1 : 1;
    }
    if (run > longest) longest = run;
  }

  return { current, longest: Math.max(longest, current), studiedToday };
};

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];

export const checkStreakMilestone = async (current: number) => {
  if (current < 3) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const milestone = STREAK_MILESTONES.filter((m) => m <= current).pop();
  if (!milestone) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("last_streak_milestone")
    .eq("id", user.id)
    .maybeSingle();

  if ((profile?.last_streak_milestone ?? 0) >= milestone) return;

  await supabase
    .from("profiles")
    .update({ last_streak_milestone: milestone })
    .eq("id", user.id);

  await createNotification(
    "streak",
    `🔥 ${milestone}-day streak!`,
    `You've studied ${milestone} days in a row. Keep going!`,
    { milestone },
  );
};

/* ---------- Achievement detection ---------- */

interface AchievementCounts {
  correct: number;
  packs: number;
  materials: number;
}

const ACHIEVEMENT_DEFS = [
  { id: "first", title: "First Steps", body: "You completed your first practice answer.", check: (c: AchievementCounts) => c.correct > 0 },
  { id: "explorer", title: "Material Explorer", body: "You uploaded your first material.", check: (c: AchievementCounts) => c.materials > 0 },
  { id: "quiz", title: "Quiz Master", body: "You answered 100 questions correctly!", check: (c: AchievementCounts) => c.correct >= 100 },
  { id: "scholar", title: "Scholar", body: "You created 10 study packs.", check: (c: AchievementCounts) => c.packs >= 10 },
];

export const checkAchievements = async (counts: AchievementCounts) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const seenKey = ACHIEVEMENTS_KEY_PREFIX + user.id;
  const seen: string[] = JSON.parse(localStorage.getItem(seenKey) || "[]");

  for (const def of ACHIEVEMENT_DEFS) {
    if (seen.includes(def.id)) continue;
    if (def.check(counts)) {
      await createNotification("achievement", `🏆 ${def.title}`, def.body, { id: def.id });
      seen.push(def.id);
    }
  }
  localStorage.setItem(seenKey, JSON.stringify(seen));
};

/* ---------- Daily reminder scheduler ---------- */

export const scheduleDailyReminder = (reminderTime: string | null, enabled: boolean) => {
  // Clear any prior
  const handle = (window as unknown as { __studymindReminderTimer?: number }).__studymindReminderTimer;
  if (handle) clearTimeout(handle);
  if (!enabled || !reminderTime) return;

  const tick = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return scheduleNext();
    const lastKey = REMINDER_KEY_PREFIX + user.id;
    const today = new Date().toDateString();
    if (localStorage.getItem(lastKey) === today) return scheduleNext();

    const streak = await computeStreak();
    if (!streak.studiedToday) {
      const msg = streak.current > 0
        ? `Don't break your ${streak.current}-day streak — squeeze in a quick session!`
        : "Time for a quick study session.";
      await createNotification("study_reminder", "Study time 📚", msg);
    }
    localStorage.setItem(lastKey, today);
    scheduleNext();
  };

  const scheduleNext = () => {
    const [h, m] = reminderTime.split(":").map(Number);
    const now = new Date();
    const next = new Date();
    next.setHours(h, m, 0, 0);
    if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
    const ms = next.getTime() - now.getTime();
    (window as unknown as { __studymindReminderTimer?: number }).__studymindReminderTimer =
      window.setTimeout(tick, ms);
  };

  // If today's reminder time has already passed and user hasn't studied, fire immediately (once).
  const [h, m] = reminderTime.split(":").map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(h, m, 0, 0);
  if (target.getTime() <= now.getTime()) {
    void tick();
  } else {
    scheduleNext();
  }
};

/* ---------- Web Push subscription ---------- */

const urlBase64ToUint8Array = (base64: string) => {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
};

export const enableBrowserPush = async (vapidPublicKey: string | null): Promise<boolean> => {
  if (typeof Notification === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return false;
  }
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return false;

  const reg = await navigator.serviceWorker.ready;

  if (vapidPublicKey) {
    try {
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      const { data: { user } } = await supabase.auth.getUser();
      if (user && json.endpoint && json.keys?.p256dh && json.keys?.auth) {
        await supabase
          .from("push_subscriptions")
          .upsert(
            {
              user_id: user.id,
              endpoint: json.endpoint,
              p256dh: json.keys.p256dh,
              auth: json.keys.auth,
              user_agent: navigator.userAgent,
            },
            { onConflict: "endpoint" },
          );
      }
    } catch {
      // Push subscribe failed (e.g. iOS Safari) — fall back to local notifications only.
    }
  }
  return true;
};

export const disableBrowserPush = async () => {
  try {
    const reg = await navigator.serviceWorker?.ready;
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      await sub.unsubscribe();
    }
  } catch {
    /* noop */
  }
};
