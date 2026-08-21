// Generate a study pack (summary + topics + MCQs) for a material using Lovable AI.
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

const STUDY_TOOL = {
  type: "function",
  function: {
    name: "build_study_pack",
    description: "Produce a structured study pack from lecture material.",
    parameters: {
      type: "object",
      properties: {
        summary: { type: "string", description: "Concise 4-6 sentence overview." },
        key_points: {
          type: "array",
          items: { type: "string" },
          description: "5-8 bullet key points.",
        },
        topics: {
          type: "array",
          items: { type: "string" },
          description: "6-12 distinct topics covered.",
        },
        questions: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            properties: {
              topic: { type: "string" },
              question: { type: "string" },
              options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
              correct_index: { type: "integer", minimum: 0, maximum: 3 },
              explanation: { type: "string" },
              difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
            },
            required: ["topic", "question", "options", "correct_index", "explanation", "difficulty"],
            additionalProperties: false,
          },
        },
      },
      required: ["summary", "key_points", "topics", "questions"],
      additionalProperties: false,
    },
  },
} as const;

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
    const materialId = body?.material_id as string | undefined;
    if (!materialId) return json({ error: "material_id required" }, 400);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: material, error: matErr } = await admin
      .from("materials")
      .select("*")
      .eq("id", materialId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (matErr || !material) return json({ error: "Material not found" }, 404);

    let text = (material.raw_text ?? "").trim();
    if (!text && material.storage_path) {
      const { data: file, error: dlErr } = await admin.storage
        .from("materials")
        .download(material.storage_path);
      if (dlErr || !file) return json({ error: "Could not read uploaded file" }, 500);
      try {
        text = await file.text();
      } catch {
        text = "";
      }
    }

    if (!text || text.length < 30) {
      await admin.from("materials").update({ status: "failed", error: "Insufficient text" }).eq("id", materialId);
      return json({ error: "Material has no readable text. Paste text or upload a TXT file for now." }, 400);
    }

    const trimmed = text.slice(0, 60000);

    // Estimate how many non-repetitive questions this material can support.
    const words = trimmed.split(/\s+/).filter(Boolean).length;
    const capacity = Math.max(5, Math.min(100, Math.floor(words / 45)));

    const requested = Number(body?.num_questions);
    const target = Number.isFinite(requested) && requested > 0
      ? Math.min(Math.round(requested), capacity, 100)
      : Math.min(15, capacity);

    if (body?.capacity_only) {
      return json({ capacity, words });
    }

    await admin.from("materials").update({ status: "processing", error: null }).eq("id", materialId);

    const callAI = async (count: number, avoid: string[], wantMeta: boolean) => {
      const avoidBlock = avoid.length
        ? `\n\nDo NOT repeat, rephrase or overlap with these existing questions:\n- ${avoid.slice(-60).join("\n- ")}`
        : "";
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "You are an expert university tutor. Read lecture material and produce a study pack: a concise summary, key points, distinct topics, and high-quality multiple-choice questions with exactly one correct answer and a brief explanation. Every question must be unique and grounded strictly in the material.",
            },
            {
              role: "user",
              content: `Title: ${material.title}\n\n---\n${trimmed}\n---\n\nProduce exactly ${count} unique MCQs covering the topics evenly.${avoidBlock}`,
            },
          ],
          tools: [STUDY_TOOL],
          tool_choice: { type: "function", function: { name: "build_study_pack" } },
        }),
      });
      if (!resp.ok) {
        const errText = await resp.text();
        console.error("AI error", resp.status, errText);
        return { status: resp.status, data: null as any };
      }
      const ai = await resp.json();
      const toolCall = ai?.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall?.function?.arguments) return { status: 502, data: null as any };
      try {
        return { status: 200, data: JSON.parse(toolCall.function.arguments) };
      } catch {
        return { status: 502, data: null as any };
      }
    };

    const BATCH = 25;
    let summary = "";
    let keyPoints: string[] = [];
    let topics: string[] = [];
    const questions: any[] = [];
    const seen = new Set<string>();
    let remaining = target;
    let firstStatus = 200;

    while (remaining > 0) {
      const count = Math.min(BATCH, remaining);
      const { status, data: parsed } = await callAI(
        count,
        questions.map((q) => String(q.question ?? "")),
        questions.length === 0,
      );
      if (!parsed) {
        if (questions.length === 0) {
          firstStatus = status;
          break;
        }
        break;
      }
      if (!summary) summary = parsed.summary ?? "";
      if (!keyPoints.length && Array.isArray(parsed.key_points)) keyPoints = parsed.key_points;
      if (!topics.length && Array.isArray(parsed.topics)) topics = parsed.topics;
      const batchQs: any[] = Array.isArray(parsed.questions) ? parsed.questions : [];
      let added = 0;
      for (const q of batchQs) {
        const key = String(q?.question ?? "").trim().toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        questions.push(q);
        added++;
        if (questions.length >= target) break;
      }
      remaining = target - questions.length;
      if (added === 0) break;
    }

    if (!questions.length) {
      await admin.from("materials").update({ status: "failed", error: `AI ${firstStatus}` }).eq("id", materialId);
      if (firstStatus === 429) return json({ error: "Rate limit, please try again." }, 429);
      if (firstStatus === 402) return json({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }, 402);
      return json({ error: "AI generation failed" }, 500);
    }

    const topicsPayload = topics.map((name) => ({ name, key_points: [] as string[] }));

    const { data: pack, error: packErr } = await admin
      .from("study_packs")
      .insert({
        material_id: materialId,
        user_id: user.id,
        summary: summary + (keyPoints.length ? "\n\n• " + keyPoints.join("\n• ") : ""),
        topics: topicsPayload,
      })
      .select()
      .single();
    if (packErr || !pack) {
      console.error(packErr);
      await admin.from("materials").update({ status: "failed", error: "DB pack insert" }).eq("id", materialId);
      return json({ error: "Failed to save study pack" }, 500);
    }

    if (questions.length) {
      const rows = questions
        .filter((q) => Array.isArray(q.options) && q.options.length === 4 && Number.isInteger(q.correct_index))
        .map((q) => ({
          study_pack_id: pack.id,
          user_id: user.id,
          topic: q.topic ?? null,
          question: q.question,
          options: q.options,
          correct_index: q.correct_index,
          explanation: q.explanation ?? null,
          difficulty: q.difficulty ?? "medium",
        }));
      if (rows.length) {
        const { error: qErr } = await admin.from("questions").insert(rows);
        if (qErr) console.error("questions insert", qErr);
      }
    }

    await admin.from("materials").update({ status: "ready", error: null }).eq("id", materialId);

    return json({ study_pack_id: pack.id, capacity, question_count: questions.length });
  } catch (e) {
    console.error("Unhandled error", e);
    return json({ error: "Internal server error" }, 500);
  }
});
