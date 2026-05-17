import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, BookOpen, FileText, Mic, Plus, Loader2, FileType2, Image as ImageIcon,
  Sparkles, MessageSquare,
} from "lucide-react";
import { StatusBar } from "../StatusBar";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { colorClass, type Notebook } from "@/lib/notebooks";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AddSourceSheet } from "./AddSourceSheet";
import { NotebookChat } from "./NotebookChat";
import { StudyGuideTab } from "./StudyGuideTab";
import { AudioPlayerSheet } from "./AudioPlayerSheet";

const fileIconFor = (sourceType?: string) => {
  if (sourceType === "image") return ImageIcon;
  if (sourceType === "text") return FileType2;
  if (sourceType === "audio") return Mic;
  return FileText;
};

export const NotebookDetail = () => {
  const { notebookId } = useParams<{ notebookId: string }>();
  const navigate = useNavigate();
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [tab, setTab] = useState("sources");
  const [audioMaterialId, setAudioMaterialId] = useState<string | null>(null);
  const channelRef = useRef<any>(null);

  const refresh = async () => {
    if (!notebookId) return;
    const [{ data: nb }, { data: mats }] = await Promise.all([
      supabase.from("notebooks").select("*").eq("id", notebookId).single(),
      supabase
        .from("materials")
        .select("id, title, status, source_type, created_at, duration_seconds, study_packs(id)")
        .eq("notebook_id", notebookId)
        .order("created_at", { ascending: false }),
    ]);
    setNotebook(nb ?? null);
    setMaterials(mats ?? []);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    if (!notebookId) return;
    // Realtime subscription so transcription/processing flips update the UI
    const ch = supabase
      .channel(`notebook:${notebookId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "materials",
        filter: `notebook_id=eq.${notebookId}`,
      }, () => { refresh(); })
      .subscribe();
    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [notebookId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!notebook) {
    return (
      <div className="p-6 text-center">
        <p>Notebook not found.</p>
        <Button onClick={() => navigate("/materials")} variant="link">Back to library</Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-24">
      <StatusBar />
      <header className="flex items-center gap-3 px-5 py-3">
        <button onClick={() => navigate("/materials")} className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center tap-scale">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", colorClass(notebook.color))}>
          <BookOpen className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-base truncate">{notebook.title}</h1>
          <p className="text-xs text-muted-foreground">
            {materials.length} source{materials.length === 1 ? "" : "s"}
            {notebook.course_code ? ` · ${notebook.course_code}` : ""}
          </p>
        </div>
      </header>

      <Tabs value={tab} onValueChange={setTab} className="px-5 mt-1">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="chat">
            <MessageSquare className="h-3.5 w-3.5 mr-1" /> Chat
          </TabsTrigger>
          <TabsTrigger value="guide">
            <Sparkles className="h-3.5 w-3.5 mr-1" /> Guide
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sources" className="mt-4">
          <Button
            onClick={() => setAddOpen(true)}
            className="w-full h-12 rounded-xl gradient-primary text-white mb-4"
          >
            <Plus className="h-4 w-4 mr-2" /> Add source
          </Button>
          {materials.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              Add PDFs, notes, screenshots, or record a lecture to get started.
            </div>
          ) : (
            <div className="space-y-2">
              {materials.map((m) => {
                const Icon = fileIconFor(m.source_type);
                const packId = m.study_packs?.[0]?.id;
                const isProcessing = m.status !== "ready" && m.status !== "failed";
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      if (m.source_type === "audio") {
                        if (m.status === "ready") setAudioMaterialId(m.id);
                        else toast.info("Audio is still transcribing");
                        return;
                      }
                      if (packId) navigate(`/studypack/${packId}`);
                      else toast.info("This source is still processing");
                    }}
                    className="w-full p-3 rounded-2xl bg-card border border-border flex items-center gap-3 text-left tap-scale"
                  >
                    <div className="h-10 w-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{m.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                        {m.duration_seconds ? ` · ${Math.round(m.duration_seconds / 60)} min` : ""}
                      </p>
                    </div>
                    <Badge variant={m.status === "ready" ? "default" : "secondary"} className="text-[10px]">
                      {isProcessing && m.source_type === "audio" ? "Transcribing…" : m.status}
                    </Badge>
                  </button>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="chat" className="mt-4">
          <NotebookChat notebookId={notebook.id} materials={materials} />
        </TabsContent>

        <TabsContent value="guide" className="mt-4">
          <StudyGuideTab notebookId={notebook.id} materialCount={materials.length} />
        </TabsContent>
      </Tabs>

      <AddSourceSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        notebookId={notebook.id}
        onAdded={() => { setAddOpen(false); refresh(); }}
      />
    </div>
  );
};
