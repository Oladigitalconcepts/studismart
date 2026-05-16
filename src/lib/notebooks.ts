import { supabase } from "@/integrations/supabase/client";

export interface Notebook {
  id: string;
  user_id: string;
  title: string;
  color: string;
  course_code: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export const NOTEBOOK_COLORS = [
  { id: "primary", className: "bg-primary text-primary-foreground" },
  { id: "violet", className: "bg-violet-500 text-white" },
  { id: "emerald", className: "bg-emerald-500 text-white" },
  { id: "amber", className: "bg-amber-500 text-white" },
  { id: "rose", className: "bg-rose-500 text-white" },
  { id: "sky", className: "bg-sky-500 text-white" },
] as const;

export const colorClass = (id: string) =>
  NOTEBOOK_COLORS.find((c) => c.id === id)?.className ?? NOTEBOOK_COLORS[0].className;

export async function listNotebooks(): Promise<Notebook[]> {
  const { data, error } = await supabase
    .from("notebooks")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createNotebook(input: {
  title: string;
  color?: string;
  course_code?: string;
  description?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("notebooks")
    .insert({
      user_id: user.id,
      title: input.title,
      color: input.color ?? "primary",
      course_code: input.course_code ?? null,
      description: input.description ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Notebook;
}

export async function renameNotebook(id: string, title: string) {
  const { error } = await supabase.from("notebooks").update({ title }).eq("id", id);
  if (error) throw error;
}

export async function deleteNotebook(id: string) {
  // Detach materials, then delete the notebook
  await supabase.from("materials").update({ notebook_id: null }).eq("notebook_id", id);
  const { error } = await supabase.from("notebooks").delete().eq("id", id);
  if (error) throw error;
}

export async function listNotebookMaterials(notebookId: string) {
  const { data, error } = await supabase
    .from("materials")
    .select("id, title, status, source_type, created_at, duration_seconds, study_packs(id)")
    .eq("notebook_id", notebookId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function attachMaterialToNotebook(materialId: string, notebookId: string | null) {
  const { error } = await supabase
    .from("materials")
    .update({ notebook_id: notebookId })
    .eq("id", materialId);
  if (error) throw error;
}
