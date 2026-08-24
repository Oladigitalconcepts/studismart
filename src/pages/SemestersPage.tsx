import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarRange, ChevronRight, Loader2, Plus, Trash2 } from "lucide-react";
import { StatusBar } from "@/components/studymind/StatusBar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import {
  LEVELS, TERMS, createSemester, deleteSemester, listSemesters, type Semester,
} from "@/lib/semesters";
import { supabase } from "@/integrations/supabase/client";

const SemestersPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<Semester[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Semester | null>(null);

  const [title, setTitle] = useState("");
  const [level, setLevel] = useState<string>(LEVELS[0]);
  const [term, setTerm] = useState<string>(TERMS[0]);
  const [weeks, setWeeks] = useState(12);

  const refresh = async () => {
    try {
      const list = await listSemesters();
      setItems(list);
      if (list.length) {
        const { data } = await supabase
          .from("semester_courses")
          .select("semester_id")
          .in("semester_id", list.map((s) => s.id));
        const c: Record<string, number> = {};
        (data ?? []).forEach((r: any) => { c[r.semester_id] = (c[r.semester_id] ?? 0) + 1; });
        setCounts(c);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't load semesters");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const submit = async () => {
    if (!title.trim()) { toast.error("Give this semester a name"); return; }
    setSaving(true);
    try {
      const s = await createSemester({ title: title.trim(), level, term, weeks });
      haptic("success" as any);
      setOpen(false);
      setTitle("");
      navigate(`/semester/${s.id}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't create semester");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s: Semester) => {
    setConfirmDelete(null);
    try {
      await deleteSemester(s.id);
      setItems((prev) => prev.filter((x) => x.id !== s.id));
      toast.success("Semester deleted");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't delete");
    }
  };

  return (
    <div className="animate-fade-in pb-24">
      <StatusBar tone="hero" />
      <div className="px-5 pt-4 pb-6 gradient-hero text-white rounded-b-[28px] safe-top">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center backdrop-blur tap-scale">
            <ArrowLeft className="h-4 w-4 text-white" />
          </button>
          <button onClick={() => { haptic(); setOpen(true); }} className="h-9 px-3 rounded-full bg-white/15 backdrop-blur text-xs font-bold inline-flex items-center gap-1 tap-scale">
            <Plus className="h-3.5 w-3.5" /> New
          </button>
        </div>
        <h1 className="font-bold text-xl">Semester Roadmap</h1>
        <p className="text-white/85 text-xs mt-1 leading-relaxed">
          Add every course you'll offer this semester and get an AI week-by-week study plan for each one.
        </p>
      </div>

      <div className="px-5 pt-4">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-14 px-4">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-primary-soft text-primary flex items-center justify-center">
              <CalendarRange className="h-6 w-6" />
            </div>
            <p className="font-bold mt-4">Plan your semester</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Create a semester, list your courses, and we'll build a structured roadmap so you start ahead.
            </p>
            <Button className="mt-5" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Create semester
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((s) => (
              <div key={s.id} className="rounded-2xl bg-card border border-border p-3 flex items-center gap-3">
                <button onClick={() => navigate(`/semester/${s.id}`)} className="flex-1 min-w-0 text-left flex items-center gap-3 tap-scale">
                  <div className="h-10 w-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center flex-shrink-0">
                    <CalendarRange className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{s.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {[s.level, s.term].filter(Boolean).join(" · ") || "Semester"} · {counts[s.id] ?? 0} course{(counts[s.id] ?? 0) === 1 ? "" : "s"} · {s.weeks} weeks
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </button>
                <button onClick={() => setConfirmDelete(s)} className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center tap-scale flex-shrink-0">
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader><SheetTitle>New semester</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4 pb-4">
            <div>
              <p className="text-xs font-semibold mb-1.5">Name</p>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 200L First Semester" />
            </div>
            <div>
              <p className="text-xs font-semibold mb-1.5">Level</p>
              <div className="flex flex-wrap gap-2">
                {LEVELS.map((l) => (
                  <button key={l} onClick={() => setLevel(l)}
                    className={cn("px-3 py-1.5 rounded-full text-xs font-semibold border tap-scale",
                      level === l ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border text-muted-foreground")}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold mb-1.5">Term</p>
              <div className="flex flex-wrap gap-2">
                {TERMS.map((t) => (
                  <button key={t} onClick={() => setTerm(t)}
                    className={cn("px-3 py-1.5 rounded-full text-xs font-semibold border tap-scale",
                      term === t ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border text-muted-foreground")}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold mb-1.5">Length</p>
              <div className="flex flex-wrap gap-2">
                {[8, 10, 12, 14, 16].map((w) => (
                  <button key={w} onClick={() => setWeeks(w)}
                    className={cn("px-3 py-1.5 rounded-full text-xs font-semibold border tap-scale",
                      weeks === w ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border text-muted-foreground")}>
                    {w} weeks
                  </button>
                ))}
              </div>
            </div>
            <Button className="w-full" onClick={submit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create semester"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete semester?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes its courses and roadmaps. Your materials stay in your library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDelete && remove(confirmDelete)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SemestersPage;
