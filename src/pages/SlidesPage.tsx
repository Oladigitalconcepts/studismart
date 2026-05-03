import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Presentation, RefreshCw } from "lucide-react";
import { StatusBar } from "@/components/studymind/StatusBar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Slide {
  type: "title" | "content" | "summary";
  title: string;
  subtitle?: string;
  bullets?: string[];
  note?: string;
}

interface Deck {
  id: string;
  title: string;
  slides: Slide[];
}

const SlidesPage = () => {
  const { packId } = useParams<{ packId: string }>();
  const navigate = useNavigate();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [idx, setIdx] = useState(0);

  const load = async (force = false) => {
    if (!packId) return;
    setGenerating(force);
    try {
      // Try existing first
      if (!force) {
        const { data } = await supabase
          .from("slide_decks")
          .select("*")
          .eq("study_pack_id", packId)
          .maybeSingle();
        if (data) {
          setDeck(data as unknown as Deck);
          setLoading(false);
          return;
        }
      }
      const { data, error } = await supabase.functions.invoke("generate-slides", {
        body: { study_pack_id: packId, force },
      });
      if (error) throw error;
      setDeck((data as any)?.deck);
    } catch (e: any) {
      toast({ title: e?.message ?? "Could not generate slides", variant: "destructive" });
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  };

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packId]);

  const total = deck?.slides.length ?? 0;
  const slide = deck?.slides[idx];

  return (
    <div className="animate-fade-in min-h-screen flex flex-col">
      <StatusBar />
      <header className="flex items-center justify-between px-5 py-3">
        <button onClick={() => navigate(-1)} className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center tap-scale">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <Presentation className="h-4 w-4 text-primary" />
          <h1 className="font-bold text-base truncate max-w-[180px]">{deck?.title ?? "Slides"}</h1>
        </div>
        <button
          onClick={() => load(true)}
          disabled={generating || loading}
          className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center tap-scale disabled:opacity-50"
          aria-label="Regenerate"
        >
          <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />
        </button>
      </header>

      {loading || generating ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {generating ? "Crafting your slides…" : "Loading…"}
          </p>
        </div>
      ) : !deck || total === 0 ? (
        <div className="flex-1 flex items-center justify-center px-6 text-center">
          <p className="text-sm text-muted-foreground">No slides yet.</p>
        </div>
      ) : (
        <>
          <div className="flex-1 px-5 pb-3">
            <div
              key={idx}
              className="aspect-[4/3] w-full rounded-3xl border border-border shadow-elevated bg-card flex flex-col p-6 animate-fade-in"
            >
              {slide?.type === "title" ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
                  <span className="text-xs uppercase tracking-widest text-primary font-semibold">
                    {deck.title}
                  </span>
                  <h2 className="text-2xl font-bold leading-tight">{slide.title}</h2>
                  {slide.subtitle && (
                    <p className="text-sm text-muted-foreground">{slide.subtitle}</p>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-8 rounded-full gradient-primary" />
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                      {slide?.type === "summary" ? "Recap" : `Slide ${idx + 1}`}
                    </span>
                  </div>
                  <h2 className="mt-3 text-xl font-bold leading-snug">{slide?.title}</h2>
                  {slide?.subtitle && (
                    <p className="mt-1 text-sm text-muted-foreground">{slide.subtitle}</p>
                  )}
                  {slide?.bullets && slide.bullets.length > 0 && (
                    <ul className="mt-4 space-y-2.5 flex-1">
                      {slide.bullets.map((b, i) => (
                        <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
              <div className="mt-auto pt-3 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{deck.title}</span>
                <span>
                  {idx + 1} / {total}
                </span>
              </div>
            </div>
          </div>

          <div className="px-5 pb-6 flex items-center gap-2">
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-2xl"
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
              disabled={idx === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button
              className="flex-1 h-12 rounded-2xl gradient-primary font-semibold"
              onClick={() => setIdx((i) => Math.min(total - 1, i + 1))}
              disabled={idx >= total - 1}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default SlidesPage;
