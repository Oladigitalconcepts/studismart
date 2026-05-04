// Weekly summary worker — invoked by pg_cron every Saturday.
// Builds a 7-day activity report for each opted-in user and inserts a notification row.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AttemptRow {
  user_id: string;
  correct: number;
  total: number;
  duration_seconds: number;
  finished_at: string;
}

interface MaterialRow {
  user_id: string;
  created_at: string;
}

interface ProfileRow {
  id: string;
  display_name: string | null;
  notify_weekly_summary: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing service credentials" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceIso = since.toISOString();

  // Pull opted-in users.
  const { data: profiles, error: profileErr } = await admin
    .from("profiles")
    .select("id, display_name, notify_weekly_summary")
    .eq("notify_weekly_summary", true)
    .returns<ProfileRow[]>();

  if (profileErr) {
    return new Response(JSON.stringify({ error: profileErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!profiles || profiles.length === 0) {
    return new Response(JSON.stringify({ ok: true, sent: 0, reason: "no opted-in users" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ids = profiles.map((p) => p.id);

  const [{ data: attempts }, { data: materials }] = await Promise.all([
    admin
      .from("practice_attempts")
      .select("user_id, correct, total, duration_seconds, finished_at")
      .gte("finished_at", sinceIso)
      .in("user_id", ids)
      .returns<AttemptRow[]>(),
    admin
      .from("materials")
      .select("user_id, created_at")
      .gte("created_at", sinceIso)
      .in("user_id", ids)
      .returns<MaterialRow[]>(),
  ]);

  const dayKey = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  };

  const notifs: Array<{
    user_id: string;
    type: string;
    title: string;
    body: string;
    data: Record<string, unknown>;
  }> = [];

  for (const profile of profiles) {
    const userAttempts = (attempts ?? []).filter((a) => a.user_id === profile.id);
    const userMaterials = (materials ?? []).filter((m) => m.user_id === profile.id);

    const sessions = userAttempts.length;
    const totalQ = userAttempts.reduce((s, a) => s + (a.total || 0), 0);
    const correct = userAttempts.reduce((s, a) => s + (a.correct || 0), 0);
    const seconds = userAttempts.reduce((s, a) => s + (a.duration_seconds || 0), 0);
    const minutes = Math.round(seconds / 60);
    const accuracy = totalQ > 0 ? Math.round((correct / totalQ) * 100) : 0;
    const daysActive = new Set(userAttempts.map((a) => dayKey(a.finished_at))).size;
    const newMaterials = userMaterials.length;

    const name = profile.display_name?.split(/\s+/)[0] ?? "there";

    let body: string;
    if (sessions === 0 && newMaterials === 0) {
      body = `Hey ${name}, you didn't study this week. A quick 5-minute session today can get you back on track.`;
    } else {
      body =
        `${sessions} session${sessions === 1 ? "" : "s"} · ${correct}/${totalQ} correct (${accuracy}%) · ` +
        `${minutes} min studied · active ${daysActive} day${daysActive === 1 ? "" : "s"}` +
        (newMaterials > 0 ? ` · ${newMaterials} new material${newMaterials === 1 ? "" : "s"}` : "");
    }

    notifs.push({
      user_id: profile.id,
      type: "system",
      title: "📊 Your weekly summary",
      body,
      data: {
        kind: "weekly_summary",
        sessions,
        total_questions: totalQ,
        correct,
        accuracy,
        minutes,
        days_active: daysActive,
        new_materials: newMaterials,
        period_start: sinceIso,
      },
    });
  }

  if (notifs.length === 0) {
    return new Response(JSON.stringify({ ok: true, sent: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Insert in chunks to be safe.
  const CHUNK = 200;
  let inserted = 0;
  for (let i = 0; i < notifs.length; i += CHUNK) {
    const slice = notifs.slice(i, i + CHUNK);
    const { error: insertErr } = await admin.from("notifications").insert(slice);
    if (insertErr) {
      return new Response(
        JSON.stringify({ error: insertErr.message, inserted }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    inserted += slice.length;
  }

  return new Response(JSON.stringify({ ok: true, sent: inserted }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
