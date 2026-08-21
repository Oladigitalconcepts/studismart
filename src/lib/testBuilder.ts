// Shared helpers for the Create Test / Quiz for Others flow.
import { supabase } from "@/integrations/supabase/client";
import { extractTextFromFile } from "@/lib/extractText";
import { getCurrentUser } from "@/lib/authUser";

export type RevealMode = "immediate" | "end";

export interface TestConfig {
  numQuestions: number;
  timeLimitSeconds: number;
  revealMode: RevealMode;
}

export interface BuiltPack {
  studyPackId: string;
  questions: Array<{
    id: string;
    question: string;
    options: string[];
    correct_index: number;
    explanation: string | null;
    topic: string | null;
  }>;
}

export interface PreparedSource {
  materialId: string;
  title: string;
  capacity: number;
}

const IMAGE_EXTS = ["png", "jpg", "jpeg", "webp", "heic", "heif"];

export const isImageFile = (f: File) => {
  if (f.type.startsWith("image/")) return true;
  const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_EXTS.includes(ext);
};

/** Same heuristic used server-side: ~45 words of source per unique question. */
export const estimateCapacity = (text: string) => {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(5, Math.min(100, Math.floor(words / 45)));
};

/** Reads files/pasted text, saves a material row and returns its question capacity. */
export async function prepareSourceFromFiles(opts: {
  files: File[];
  pastedText: string;
  title: string;
  onStage?: (label: string) => void;
}): Promise<PreparedSource> {
  const { files, pastedText, title, onStage } = opts;
  const { data: { user } } = await getCurrentUser();
  if (!user) throw new Error("Please sign in again");

  onStage?.("Reading files");
  const textParts: string[] = [];
  if (pastedText.trim()) textParts.push(pastedText.trim());

  const imagePaths: string[] = [];
  for (const f of files) {
    if (isImageFile(f)) {
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("materials").upload(path, f);
      if (error) throw error;
      imagePaths.push(path);
    } else {
      try {
        const t = await extractTextFromFile(f);
        if (t && t.length > 20) textParts.push(t);
      } catch (e) {
        console.warn("extract failed", e);
      }
    }
  }

  if (imagePaths.length) {
    onStage?.("Reading images (OCR)");
    const { data, error } = await supabase.functions.invoke("extract-image-text", {
      body: { storage_paths: imagePaths },
    });
    if (error) throw error;
    if ((data as any)?.text) textParts.push((data as any).text as string);
  }

  const rawText = textParts.join("\n\n").trim();
  if (rawText.length < 30) {
    throw new Error("Couldn't read enough text. Try clearer photos or paste your notes.");
  }

  onStage?.("Saving material");
  const finalTitle = title || "Quick test";
  const { data: material, error: matErr } = await supabase
    .from("materials")
    .insert({
      user_id: user.id,
      title: finalTitle,
      source_type: files.length ? "file" : "text",
      raw_text: rawText,
      status: "pending",
    })
    .select()
    .single();
  if (matErr || !material) throw matErr ?? new Error("Could not save material");

  return { materialId: material.id, title: finalTitle, capacity: estimateCapacity(rawText) };
}

/** Prepares an existing library material for test generation. */
export async function prepareSourceFromMaterial(materialId: string): Promise<PreparedSource> {
  const { data, error } = await supabase
    .from("materials")
    .select("id, title, raw_text, transcript")
    .eq("id", materialId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Material not found");
  const text = ((data.raw_text ?? "") + "\n" + ((data as any).transcript ?? "")).trim();
  if (text.length < 30) throw new Error("This material has no readable text yet.");
  return { materialId: data.id, title: data.title, capacity: estimateCapacity(text) };
}

/** Generates the requested number of questions for a prepared material. */
export async function generatePack(materialId: string, numQuestions: number): Promise<BuiltPack> {
  const { data, error } = await supabase.functions.invoke("generate-study-pack", {
    body: { material_id: materialId, num_questions: numQuestions },
  });
  if (error) throw error;
  const studyPackId = (data as any)?.study_pack_id as string;
  if (!studyPackId) throw new Error("No study pack returned");

  const { data: qs } = await supabase
    .from("questions")
    .select("id, question, options, correct_index, explanation, topic")
    .eq("study_pack_id", studyPackId);

  return {
    studyPackId,
    questions: (qs ?? []).map((q) => ({
      ...q,
      options: q.options as unknown as string[],
    })),
  };
}

/** Legacy one-shot helper (prepare + generate). */
export async function buildPackFromFiles(opts: {
  files: File[];
  pastedText: string;
  title: string;
  numQuestions?: number;
  onStage?: (label: string) => void;
}): Promise<BuiltPack> {
  const prepared = await prepareSourceFromFiles(opts);
  opts.onStage?.("Generating questions");
  return generatePack(prepared.materialId, Math.min(opts.numQuestions ?? 15, prepared.capacity));
}

export const formatTime = (sec: number) => {
  const m = Math.floor(Math.max(0, sec) / 60);
  const s = Math.max(0, sec) % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export const makeShareToken = () => {
  // 10-char url-safe token
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
    .slice(0, 10);
};
