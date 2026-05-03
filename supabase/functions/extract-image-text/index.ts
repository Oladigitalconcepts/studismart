// OCR/text extraction from an image using Lovable AI vision.
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

    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "Unauthorized" }, 401);

    const { storage_paths } = await req.json().catch(() => ({}));
    if (!Array.isArray(storage_paths) || !storage_paths.length) {
      return json({ error: "storage_paths required" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const images: string[] = [];
    for (const p of storage_paths.slice(0, 8)) {
      const { data: file, error } = await admin.storage.from("materials").download(p);
      if (error || !file) continue;
      const buf = new Uint8Array(await file.arrayBuffer());
      const b64 = btoa(String.fromCharCode(...buf));
      const mime = (p.toLowerCase().endsWith(".png") ? "image/png"
        : p.toLowerCase().endsWith(".webp") ? "image/webp"
        : "image/jpeg");
      images.push(`data:${mime};base64,${b64}`);
    }
    if (!images.length) return json({ error: "No images could be read" }, 400);

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an OCR engine. Extract ALL readable text from the provided images. Preserve order, headings, and bullet structure. Return plain text only — no commentary." },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract all text from these images." },
              ...images.map((url) => ({ type: "image_url", image_url: { url } })),
            ],
          },
        ],
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI", aiResp.status, t);
      if (aiResp.status === 429) return json({ error: "Rate limit, try again." }, 429);
      if (aiResp.status === 402) return json({ error: "AI credits exhausted." }, 402);
      return json({ error: "OCR failed" }, 500);
    }

    const ai = await aiResp.json();
    const text = ai?.choices?.[0]?.message?.content ?? "";
    return json({ text });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});
