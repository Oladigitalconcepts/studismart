import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Plus, Loader2, MoreVertical, Trash2 } from "lucide-react";
import { StatusBar } from "../StatusBar";
import { Materials } from "../Materials";
import {
  listNotebooks, createNotebook, deleteNotebook, colorClass, NOTEBOOK_COLORS, type Notebook,
} from "@/lib/notebooks";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Tab = "notebooks" | "all";

interface NotebookCardData extends Notebook {
  materials_count: number;
}

export const LibraryHome = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("notebooks");
  const [notebooks, setNotebooks] = useState<NotebookCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Notebook | null>(null);

  const refresh = async () => {
    try {
      const list = await listNotebooks();
      // Fetch counts in one query
      const ids = list.map((n) => n.id);
      let counts: Record<string, number> = {};
      if (ids.length) {
        const { data } = await supabase
          .from("materials")
          .select("notebook_id")
          .in("notebook_id", ids);
        (data ?? []).forEach((m: any) => {
          counts[m.notebook_id] = (counts[m.notebook_id] ?? 0) + 1;
        });
      }
      setNotebooks(list.map((n) => ({ ...n, materials_count: counts[n.id] ?? 0 })));
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't load notebooks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const handleDelete = async (nb: Notebook) => {
    setConfirmDelete(null);
    try {
      await deleteNotebook(nb.id);
      setNotebooks((prev) => prev.filter((n) => n.id !== nb.id));
      haptic("success" as any);
      toast.success("Notebook deleted");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't delete");
    }
  };

  return (
    <div className="animate-fade-in pb-24">
      <StatusBar />
      <header className="flex items-center justify-between px-5 py-3">
        <div>
          <h1 className="font-bold text-xl">Library</h1>
          <p className="text-xs text-muted-foreground">Notebooks · Sources · AI study guides</p>
        </div>
        {tab === "notebooks" && (
          <button
            onClick={() => setCreateOpen(true)}
            className="h-10 w-10 rounded-full gradient-primary text-white flex items-center justify-center tap-scale shadow-elevated"
            aria-label="New notebook"
          >
            <Plus className="h-5 w-5" />
          </button>
        )}
      </header>

      <div className="px-5 mt-1 flex gap-2">
        {([
          { id: "notebooks", label: "Notebooks" },
          { id: "all", label: "All materials" },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => { haptic("light" as any); setTab(t.id); }}
            className={cn(
              "px-4 h-9 rounded-full text-sm font-semibold border transition-colors",
              tab === t.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground/80 border-border",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "all" ? (
        <div className="mt-2">
          <Materials
            onUpload={() => navigate("/upload")}
            onOpenPack={(id) => navigate(`/studypack/${id}`)}
          />
        </div>
      ) : (
        <div className="px-5 mt-4">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : notebooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mb-3">
                <BookOpen className="h-7 w-7" />
              </div>
              <p className="font-semibold">Create your first notebook</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                One notebook per course. Drop in PDFs, notes, screenshots, and lecture recordings.
              </p>
              <Button onClick={() => setCreateOpen(true)} className="mt-4 rounded-xl gradient-primary text-white">
                <Plus className="h-4 w-4 mr-2" /> New notebook
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {notebooks.map((nb) => (
                <div key={nb.id} className="relative rounded-2xl bg-card border border-border p-3 tap-scale">
                  <button
                    onClick={() => navigate(`/notebook/${nb.id}`)}
                    className="text-left w-full"
                  >
                    <div className={cn("h-20 rounded-xl flex items-center justify-center mb-2", colorClass(nb.color))}>
                      <BookOpen className="h-7 w-7" />
                    </div>
                    <p className="font-semibold text-sm line-clamp-2">{nb.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {nb.materials_count} source{nb.materials_count === 1 ? "" : "s"} ·{" "}
                      {formatDistanceToNow(new Date(nb.updated_at), { addSuffix: true })}
                    </p>
                  </button>
                  <div className="absolute top-2 right-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="h-7 w-7 flex items-center justify-center rounded-lg bg-background/70 backdrop-blur">
                        <MoreVertical className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="text-destructive" onClick={() => setConfirmDelete(nb)}>
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <CreateNotebookSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(nb) => {
          setNotebooks((prev) => [{ ...nb, materials_count: 0 }, ...prev]);
          setCreateOpen(false);
          navigate(`/notebook/${nb.id}`);
        }}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete notebook?</AlertDialogTitle>
            <AlertDialogDescription>
              "{confirmDelete?.title}" will be removed. Materials inside will not be deleted — they'll just be unfiled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDelete && handleDelete(confirmDelete)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const CreateNotebookSheet = ({
  open, onOpenChange, onCreated,
}: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: (nb: Notebook) => void }) => {
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [color, setColor] = useState<string>(NOTEBOOK_COLORS[0].id);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!title.trim()) { toast.error("Give your notebook a name"); return; }
    setSaving(true);
    try {
      const nb = await createNotebook({ title: title.trim(), color, course_code: code.trim() || undefined });
      setTitle(""); setCode(""); setColor(NOTEBOOK_COLORS[0].id);
      onCreated(nb);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't create notebook");
    } finally { setSaving(false); }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>New notebook</SheetTitle>
        </SheetHeader>
        <div className="space-y-3 mt-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 80))}
            placeholder="e.g. BIO 201 — Genetics"
            className="h-12 rounded-xl"
          />
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.slice(0, 30))}
            placeholder="Course code (optional)"
            className="h-12 rounded-xl"
          />
          <div>
            <p className="text-xs text-muted-foreground mb-2">Color</p>
            <div className="flex gap-2">
              {NOTEBOOK_COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setColor(c.id)}
                  className={cn(
                    "h-9 w-9 rounded-full border-2 transition-all",
                    c.className,
                    color === c.id ? "border-foreground scale-110" : "border-transparent",
                  )}
                  aria-label={c.id}
                />
              ))}
            </div>
          </div>
          <Button onClick={submit} disabled={saving} className="w-full h-12 rounded-xl gradient-primary text-white">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create notebook"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
