// Transcribe an audio material using ElevenLabs scribe_v2.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ELEVEN_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!ELEVEN_KEY) return json({ error: "ELEVENLABS_API_KEY not configured" }, 500);

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const materialId = body?.material_id as string | undefined;
    if (!materialId) return json({ error: "material_id required" }, 400);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: material } = await admin
      .from("materials")
      .select("id, user_id, storage_path, title")
      .eq("id", materialId)
      .maybeSingle();
    if (!material || material.user_id !== user.id) return json({ error: "Material not found" }, 404);
    if (!material.storage_path) return json({ error: "No audio file" }, 400);

    // Download from storage
    const { data: blob, error: dlErr } = await admin.storage
      .from("materials")
      .download(material.storage_path);
    if (dlErr || !blob) return json({ error: "Couldn't load audio" }, 500);

    // Send to ElevenLabs
    const form = new FormData();
    form.append("file", blob, "audio.webm");
    form.append("model_id", "scribe_v2");
    form.append("tag_audio_events", "false");
    form.append("diarize", "true");

    const r = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": ELEVEN_KEY },
      body: form,
    });
    if (!r.ok) {
      const t = await r.text();
      console.error("ElevenLabs error", r.status, t);
      await admin.from("materials").update({ status: "failed", error: `Transcription failed: ${r.status}` }).eq("id", materialId);
      return json({ error: "Transcription failed" }, 500);
    }
    const result = await r.json();
    const transcript: string = result?.text ?? "";
    const words: any[] = Array.isArray(result?.words) ? result.words : [];

    // Build coarse segments (~ every ~40 words or speaker change)
    const segments: { start: number; end: number; text: string; speaker?: string }[] = [];
    let cur: { start: number; end: number; text: string; speaker?: string } | null = null;
    for (const w of words) {
      const t = (w?.text ?? "").toString();
      if (!t) continue;
      if (!cur || (w.speaker && cur.speaker && w.speaker !== cur.speaker) || cur.text.split(" ").length > 40) {
        if (cur) segments.push(cur);
        cur = { start: Number(w.start ?? 0), end: Number(w.end ?? 0), text: t, speaker: w.speaker };
      } else {
        cur.end = Number(w.end ?? cur.end);
        cur.text += (t.startsWith(" ") || t.match(/^[.,!?;:]/) ? "" : " ") + t;
      }
    }
    if (cur) segments.push(cur);

    const duration = words.length ? Math.ceil(Number(words[words.length - 1]?.end ?? 0)) : null;

    await admin
      .from("materials")
      .update({
        transcript,
        transcript_segments: segments,
        raw_text: transcript,
        duration_seconds: duration,
        status: "ready",
        error: null,
      })
      .eq("id", materialId);

    // Generate a study pack from the transcript for parity with other sources
    if (transcript.length > 80) {
      void fetch(`${SUPABASE_URL}/functions/v1/generate-study-pack`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ material_id: materialId }),
      }).catch(() => { /* noop */ });
    }

    return json({ ok: true, length: transcript.length, duration });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
