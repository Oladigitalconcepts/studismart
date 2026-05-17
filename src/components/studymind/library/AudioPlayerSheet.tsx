import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Segment {
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  materialId: string | null;
}

const fmt = (s: number) => {
  if (!Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

export const AudioPlayerSheet = ({ open, onOpenChange, materialId }: Props) => {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [transcript, setTranscript] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open || !materialId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setAudioUrl(null);
      setSegments([]);
      setTranscript("");
      try {
        const { data, error } = await supabase
          .from("materials")
          .select("title, storage_path, transcript, transcript_segments")
          .eq("id", materialId)
          .single();
        if (error) throw error;
        if (cancelled) return;
        setTitle(data.title ?? "Audio");
        setTranscript((data as any).transcript ?? "");
        const segs = ((data as any).transcript_segments ?? []) as Segment[];
        setSegments(Array.isArray(segs) ? segs : []);
        if ((data as any).storage_path) {
          const { data: signed, error: sErr } = await supabase
            .storage.from("materials")
            .createSignedUrl((data as any).storage_path, 60 * 60);
          if (sErr) throw sErr;
          if (!cancelled) setAudioUrl(signed.signedUrl);
        }
      } catch (e: any) {
        toast.error(e.message ?? "Failed to load audio");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, materialId]);

  // Find active segment index
  const activeIdx = segments.findIndex(
    (s) => currentTime >= s.start && currentTime < s.end
  );

  // Scroll active line into view
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [activeIdx]);

  const seekTo = (t: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = t;
    a.play().catch(() => {});
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[88vh] p-0 flex flex-col">
        <SheetHeader className="px-5 py-3 border-b">
          <SheetTitle className="flex items-center gap-2 text-left">
            <Mic className="h-4 w-4 text-primary" />
            <span className="truncate">{title || "Audio"}</span>
          </SheetTitle>
        </SheetHeader>

        <div className="px-5 py-3 border-b bg-card">
          {audioUrl ? (
            <audio
              ref={audioRef}
              src={audioUrl}
              controls
              className="w-full"
              onTimeUpdate={(e) => setCurrentTime((e.target as HTMLAudioElement).currentTime)}
            />
          ) : (
            <div className="h-12 flex items-center justify-center text-sm text-muted-foreground">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Audio unavailable"}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : segments.length > 0 ? (
            <div className="space-y-1">
              {segments.map((seg, i) => {
                const active = i === activeIdx;
                return (
                  <button
                    key={i}
                    ref={active ? activeRef : null}
                    onClick={() => seekTo(seg.start)}
                    className={cn(
                      "w-full text-left p-3 rounded-xl flex gap-3 tap-scale transition-colors",
                      active
                        ? "bg-primary-soft text-foreground border border-primary/40"
                        : "hover:bg-secondary"
                    )}
                  >
                    <span className="text-xs font-mono text-muted-foreground shrink-0 mt-0.5 w-12">
                      {fmt(seg.start)}
                    </span>
                    <span className="text-sm leading-relaxed flex-1">
                      {seg.speaker ? (
                        <span className="font-semibold text-primary mr-1">
                          {seg.speaker}:
                        </span>
                      ) : null}
                      {seg.text}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : transcript ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{transcript}</p>
          ) : (
            <div className="text-center py-10 text-sm text-muted-foreground">
              Transcript not ready yet.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
