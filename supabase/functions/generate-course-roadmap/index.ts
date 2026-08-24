// Generate a week-by-week learning roadmap for a semester course.
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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) return json({ error: "AI key not configured" }, 500);

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const courseId = body?.course_id as string | undefined;
    if (!courseId || typeof courseId !== "string") return json({ error: "course_id required" }, 400);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: course } = await admin
      .from("semester_courses")
      .select("id, user_id, title, code, credit_units, notebook_id, material_ids, semester_id")
      .eq("id", courseId)
      .maybeSingle();
    if (!course || course.user_id !== user.id) return json({ error: "Course not found" }, 404);

    const { data: semester } = await admin
      .from("semesters")
      .select("title, level, term, weeks")
      .eq("id", course.semester_id)
      .maybeSingle();
    const weeks = Math.min(Math.max(semester?.weeks ?? 12, 4), 20);

    // Gather any linked material text (notebook sources + explicitly linked materials)
    let sources: { title: string; text: string }[] = [];
    const ids = (course.material_ids ?? []) as string[];
    if (course.notebook_id) {
      const { data } = await admin
        .from("materials")
        .select("title, raw_text, transcript")
        .eq("notebook_id", course.notebook_id)
        .eq("user_id", user.id);
      sources.push(...(data ?? []).map((m: any) => ({ title: m.title, text: m.transcript || m.raw_text || "" })));
    }
    if (ids.length) {
      const { data } = await admin
        .from("materials")
        .select("title, raw_text, transcript")
        .in("id", ids)
        .eq("user_id", user.id);
      sources.push(...(data ?? []).map((m: any) => ({ title: m.title, text: m.transcript || m.raw_text || "" })));
    }
    sources = sources.filter((s) => s.text);

    const perSource = sources.length ? Math.max(600, Math.floor(18000 / sources.length)) : 0;
    const context = sources.length
      ? sources.map((s, i) => `[[S${i + 1}]] ${s.title}\n${s.text.slice(0, perSource)}`).join("\n\n---\n\n")
      : "No materials uploaded yet — build the roadmap from the standard university syllabus for this course.";

    const sys = `You are an academic advisor building a semester study roadmap for a university student.
Plan exactly ${weeks} weeks. Be concrete and progressive: foundations first, then harder topics, with revision before exams.
Respond as STRICT JSON ONLY (no markdown fences) matching:
{
  "overview": string (120-200 words, what the course covers and how to approach it),
  "prerequisites": [string],                         // 3-6 items
  "weeks": [{
     "week": number,                                  // 1..${weeks}
     "title": string,
     "focus": string (1 sentence),
     "topics": [string],                              // 2-5
     "activities": [string],                          // 2-4 concrete study actions
     "est_minutes": number                            // realistic weekly study minutes
  }],
  "exam_tips": [string]                               // 4-6 items
}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: sys },
          {
            role: "user",
            content: `Course: ${course.title}${course.code ? ` (${course.code})` : ""}
Credit units: ${course.credit_units}
Semester: ${semester?.title ?? "Upcoming semester"}${semester?.level ? ` · ${semester.level}` : ""}${semester?.term ? ` · ${semester.term}` : ""}

MATERIALS:
${context}`,
          },
        ],
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      if (aiResp.status === 429) return json({ error: "Rate limit, please try again." }, 429);
      if (aiResp.status === 402) return json({ error: "AI credits exhausted." }, 402);
      console.error("AI error", aiResp.status, t);
      return json({ error: "Couldn't generate the roadmap. Please try again." }, 502);
    }

    const payload = await aiResp.json();
    const raw = payload?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try {
      parsed = JSON.parse(raw.replace(/^```json\s*|```$/g, "").trim());
    } catch {
      return json({ error: "Couldn't read the AI response. Please try again." }, 502);
    }

    const row = {
      user_id: user.id,
      course_id: course.id,
      overview: typeof parsed.overview === "string" ? parsed.overview : "",
      prerequisites: Array.isArray(parsed.prerequisites) ? parsed.prerequisites : [],
      weeks: Array.isArray(parsed.weeks) ? parsed.weeks : [],
      exam_tips: Array.isArray(parsed.exam_tips) ? parsed.exam_tips : [],
      generated_at: new Date().toISOString(),
    };

    const { data: saved, error } = await admin
      .from("course_roadmaps")
      .upsert(row, { onConflict: "course_id" })
      .select()
      .single();
    if (error) {
      console.error("save error", error.message);
      return json({ error: "Couldn't save the roadmap." }, 500);
    }

    return json({ roadmap: saved });
  } catch (e) {
    console.error("generate-course-roadmap failed", e instanceof Error ? e.message : e);
    return json({ error: "Unexpected error. Please try again." }, 500);
  }
});
