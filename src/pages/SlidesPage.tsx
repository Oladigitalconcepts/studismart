import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Presentation,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { StatusBar } from "@/components/studymind/StatusBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { track } from "@/lib/analytics";

interface Slide {
  type: "title" | "content" | "summary";
  title: string;
  subtitle?: string;
  bullets?: string[];
  note?: string;
}

interface PlanDay {
  day: string;
  focus: string;
  tasks: string[];
  duration_minutes?: number;
}

interface Deck {
  id: string;
  title: string;
  slides: Slide[];
  study_plan?: PlanDay[];
}

const SlidesPage = () => {
  const { packId } = useParams<{ packId: string }>();
  const navigate = useNavigate();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [idx, setIdx] = useState(0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Slide | null>(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<null | "pdf" | "pptx" | "topics">(null);

  const load = async (force = false) => {
    if (!packId) return;
    setGenerating(force);
    try {
      if (!force) {
        const { data } = await supabase
          .from("slide_decks")
          .select("*")
          .eq("study_pack_id", packId)
          .maybeSingle();
        if (data) {
          setDeck(data as unknown as Deck);
          track("slides_viewed", {
            study_pack_id: packId,
            slides: (data as any).slides?.length ?? 0,
          });
          setLoading(false);
          return;
        }
      }
      track("slides_generation_started", { study_pack_id: packId, force });
      const { data, error } = await supabase.functions.invoke("generate-slides", {
        body: { study_pack_id: packId, force },
      });
      if (error) throw error;
      const d = (data as any)?.deck;
      setDeck(d);
      track("slides_generated", {
        study_pack_id: packId,
        slides: d?.slides?.length ?? 0,
      });
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

  // ───────── Editing ─────────
  const startEdit = () => {
    if (!slide) return;
    setDraft({ ...slide, bullets: [...(slide.bullets ?? [])] });
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft(null);
  };

  const saveEdit = async () => {
    if (!deck || !draft) return;
    const nextSlides = deck.slides.map((s, i) => (i === idx ? draft : s));
    setSaving(true);
    try {
      const { error } = await supabase
        .from("slide_decks")
        .update({ slides: nextSlides as any })
        .eq("id", deck.id);
      if (error) throw error;
      setDeck({ ...deck, slides: nextSlides });
      track("slides_edited", { study_pack_id: packId, slide_index: idx });
      toast({ title: "Slide updated" });
      cancelEdit();
    } catch (e: any) {
      toast({ title: e?.message ?? "Could not save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const updateBullet = (i: number, val: string) => {
    if (!draft) return;
    const next = [...(draft.bullets ?? [])];
    next[i] = val;
    setDraft({ ...draft, bullets: next });
  };

  const addBullet = () => {
    if (!draft) return;
    setDraft({ ...draft, bullets: [...(draft.bullets ?? []), ""] });
  };

  const removeBullet = (i: number) => {
    if (!draft) return;
    setDraft({
      ...draft,
      bullets: (draft.bullets ?? []).filter((_, j) => j !== i),
    });
  };

  // ───────── Export ─────────
  const exportPdf = async () => {
    if (!deck) return;
    setExporting("pdf");
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: [960, 720] });
      deck.slides.forEach((s, i) => {
        if (i > 0) pdf.addPage();
        // Background
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, 960, 720, "F");
        // Accent bar
        pdf.setFillColor(99, 102, 241);
        pdf.rect(48, 60, 60, 6, "F");
        // Title
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(17, 24, 39);
        pdf.setFontSize(s.type === "title" ? 44 : 30);
        const titleLines = pdf.splitTextToSize(s.title || "", 860);
        pdf.text(titleLines, 48, s.type === "title" ? 320 : 110);
        // Subtitle
        if (s.subtitle) {
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(s.type === "title" ? 18 : 14);
          pdf.setTextColor(107, 114, 128);
          const subLines = pdf.splitTextToSize(s.subtitle, 860);
          pdf.text(subLines, 48, s.type === "title" ? 360 : 150);
        }
        // Bullets
        if (s.bullets && s.bullets.length > 0 && s.type !== "title") {
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(16);
          pdf.setTextColor(31, 41, 55);
          let y = 200;
          s.bullets.forEach((b) => {
            pdf.setFillColor(99, 102, 241);
            pdf.circle(58, y - 5, 3, "F");
            const lines = pdf.splitTextToSize(b, 820);
            pdf.text(lines, 78, y);
            y += 14 + lines.length * 22;
          });
        }
        // Footer
        pdf.setFontSize(10);
        pdf.setTextColor(156, 163, 175);
        pdf.text(deck.title, 48, 690);
        pdf.text(`${i + 1} / ${deck.slides.length}`, 880, 690);
      });
      pdf.save(`${deck.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "slides"}.pdf`);
      track("slides_exported", { format: "pdf", slides: deck.slides.length });
    } catch (e: any) {
      toast({ title: e?.message ?? "Export failed", variant: "destructive" });
    } finally {
      setExporting(null);
    }
  };

  const exportPptx = async () => {
    if (!deck) return;
    setExporting("pptx");
    try {
      const PptxGenJS = (await import("pptxgenjs")).default;
      const pptx = new PptxGenJS();
      pptx.layout = "LAYOUT_WIDE";
      pptx.title = deck.title;

      deck.slides.forEach((s) => {
        const slide = pptx.addSlide();
        slide.background = { color: "FFFFFF" };
        // Accent bar
        slide.addShape("rect", {
          x: 0.5,
          y: 0.55,
          w: 0.6,
          h: 0.08,
          fill: { color: "6366F1" },
          line: { color: "6366F1" },
        });
        if (s.type === "title") {
          slide.addText(s.title, {
            x: 0.5,
            y: 2.6,
            w: 12.3,
            h: 1.2,
            fontSize: 44,
            bold: true,
            color: "111827",
            fontFace: "Helvetica",
          });
          if (s.subtitle) {
            slide.addText(s.subtitle, {
              x: 0.5,
              y: 3.9,
              w: 12.3,
              h: 0.6,
              fontSize: 18,
              color: "6B7280",
              fontFace: "Helvetica",
            });
          }
        } else {
          slide.addText(s.title, {
            x: 0.5,
            y: 0.85,
            w: 12.3,
            h: 0.9,
            fontSize: 30,
            bold: true,
            color: "111827",
            fontFace: "Helvetica",
          });
          if (s.subtitle) {
            slide.addText(s.subtitle, {
              x: 0.5,
              y: 1.7,
              w: 12.3,
              h: 0.4,
              fontSize: 14,
              color: "6B7280",
              fontFace: "Helvetica",
            });
          }
          if (s.bullets && s.bullets.length > 0) {
            slide.addText(
              s.bullets.map((b) => ({ text: b, options: { bullet: { code: "25CF" } } })),
              {
                x: 0.6,
                y: 2.3,
                w: 12.1,
                h: 4.5,
                fontSize: 16,
                color: "1F2937",
                fontFace: "Helvetica",
                paraSpaceAfter: 8,
              },
            );
          }
        }
        // Footer
        slide.addText(deck.title, {
          x: 0.5,
          y: 7.0,
          w: 6,
          h: 0.3,
          fontSize: 9,
          color: "9CA3AF",
        });
      });

      const filename = `${deck.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "slides"}.pptx`;
      await pptx.writeFile({ fileName: filename });
      track("slides_exported", { format: "pptx", slides: deck.slides.length });
    } catch (e: any) {
      toast({ title: e?.message ?? "Export failed", variant: "destructive" });
    } finally {
      setExporting(null);
    }
  };

  const exportTopicSummaries = async () => {
    if (!packId) return;
    setExporting("topics");
    try {
      const { data: pack } = await supabase
        .from("study_packs")
        .select("id, summary, topics, materials(title)")
        .eq("id", packId)
        .maybeSingle();
      const topics: { name: string }[] = Array.isArray((pack as any)?.topics)
        ? (pack as any).topics
        : [];
      if (!topics.length) {
        toast({ title: "No topics found for this pack", variant: "destructive" });
        return;
      }
      const materialTitle = (pack as any)?.materials?.title ?? deck?.title ?? "Study Pack";

      toast({ title: `Generating ${topics.length} topic summaries…` });

      const sections: { topic: string; content: string }[] = [];
      for (const t of topics) {
        try {
          const { data, error } = await supabase.functions.invoke("generate-topic-content", {
            body: { study_pack_id: packId, topic: t.name },
          });
          if (error) throw error;
          sections.push({
            topic: t.name,
            content: ((data as any)?.content as string) ?? "(no content)",
          });
        } catch (e: any) {
          sections.push({ topic: t.name, content: `(failed: ${e?.message ?? "error"})` });
        }
      }

      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 48;
      const maxW = pageW - margin * 2;

      // Cover
      pdf.setFillColor(99, 102, 241);
      pdf.rect(0, 0, pageW, 8, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(17, 24, 39);
      pdf.setFontSize(26);
      pdf.text(pdf.splitTextToSize(materialTitle, maxW), margin, 120);
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(107, 114, 128);
      pdf.text("Topic-by-topic study summary", margin, 150);
      pdf.setFontSize(11);
      pdf.text(new Date().toLocaleDateString(), margin, 170);

      // TOC
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.setTextColor(17, 24, 39);
      pdf.text("Contents", margin, 220);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      let tocY = 244;
      sections.forEach((s, i) => {
        if (tocY > pageH - margin) {
          pdf.addPage();
          tocY = margin + 20;
        }
        pdf.setTextColor(31, 41, 55);
        pdf.text(`${i + 1}. ${s.topic}`, margin, tocY);
        tocY += 18;
      });

      // Sections
      sections.forEach((s, i) => {
        pdf.addPage();
        pdf.setFillColor(99, 102, 241);
        pdf.rect(margin, margin, 36, 4, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(18);
        pdf.setTextColor(17, 24, 39);
        const titleLines = pdf.splitTextToSize(`${i + 1}. ${s.topic}`, maxW);
        pdf.text(titleLines, margin, margin + 30);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(11);
        pdf.setTextColor(31, 41, 55);
        const bodyLines = pdf.splitTextToSize(s.content, maxW);
        let y = margin + 30 + titleLines.length * 22 + 14;
        const lineH = 16;
        bodyLines.forEach((line: string) => {
          if (y > pageH - margin) {
            pdf.addPage();
            y = margin + 20;
          }
          pdf.text(line, margin, y);
          y += lineH;
        });

        // Footer
        pdf.setFontSize(9);
        pdf.setTextColor(156, 163, 175);
        pdf.text(materialTitle, margin, pageH - 24);
      });

      const fname = `${materialTitle.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "topics"}-summaries.pdf`;
      pdf.save(fname);
      track("topic_summaries_exported", { study_pack_id: packId, topics: sections.length });
      toast({ title: "Topic summaries downloaded" });
    } catch (e: any) {
      toast({ title: e?.message ?? "Export failed", variant: "destructive" });
    } finally {
      setExporting(null);
    }
  };

  // ───────── Study plan ─────────
  const planDays = useMemo(
    () => (Array.isArray(deck?.study_plan) ? deck!.study_plan! : []),
    [deck],
  );

  return (
    <div className="animate-fade-in min-h-screen flex flex-col">
      <StatusBar />
      <header className="flex items-center justify-between px-5 py-3 gap-2">
        <button
          onClick={() => navigate(-1)}
          className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center tap-scale shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
          <Presentation className="h-4 w-4 text-primary shrink-0" />
          <h1 className="font-bold text-base truncate">{deck?.title ?? "Slides"}</h1>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {planDays.length > 0 && (
            <Sheet onOpenChange={(o) => o && track("study_plan_viewed", { study_pack_id: packId })}>
              <SheetTrigger asChild>
                <button
                  className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center tap-scale"
                  aria-label="Study plan"
                >
                  <CalendarDays className="h-4 w-4" />
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    Study plan
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-3 pb-6">
                  {planDays.map((d, i) => (
                    <div
                      key={i}
                      className="rounded-2xl border border-border p-4 bg-card"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-primary">
                          {d.day}
                        </span>
                        {d.duration_minutes ? (
                          <span className="text-[10px] text-muted-foreground">
                            ~{d.duration_minutes} min
                          </span>
                        ) : null}
                      </div>
                      <h3 className="font-semibold text-sm leading-snug mb-2">{d.focus}</h3>
                      <ul className="space-y-1.5">
                        {d.tasks.map((t, j) => (
                          <li key={j} className="flex gap-2 text-xs text-muted-foreground">
                            <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                            <span>{t}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                disabled={!deck || !!exporting}
                className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center tap-scale disabled:opacity-50"
                aria-label="Export"
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportPdf}>
                <FileText className="h-4 w-4 mr-2" /> Slides as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportPptx}>
                <Presentation className="h-4 w-4 mr-2" /> Slides as PowerPoint
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportTopicSummaries}>
                <FileText className="h-4 w-4 mr-2" /> Topic summaries (PDF)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={() => load(true)}
            disabled={generating || loading}
            className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center tap-scale disabled:opacity-50"
            aria-label="Regenerate"
          >
            <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />
          </button>
        </div>
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
              className="aspect-[4/3] w-full rounded-3xl border border-border shadow-elevated bg-card flex flex-col p-6 animate-fade-in relative"
            >
              {!editing && (
                <button
                  onClick={startEdit}
                  className="absolute top-3 right-3 h-9 w-9 rounded-full bg-secondary/80 backdrop-blur flex items-center justify-center tap-scale"
                  aria-label="Edit slide"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}

              {editing && draft ? (
                <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-8 rounded-full gradient-primary" />
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                      Editing slide {idx + 1}
                    </span>
                  </div>
                  <Input
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    placeholder="Slide title"
                    className="font-bold text-base"
                  />
                  <Input
                    value={draft.subtitle ?? ""}
                    onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
                    placeholder="Subtitle (optional)"
                    className="text-sm"
                  />
                  {draft.type !== "title" && (
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                        Bullets
                      </p>
                      {(draft.bullets ?? []).map((b, i) => (
                        <div key={i} className="flex gap-1.5 items-start">
                          <Textarea
                            value={b}
                            onChange={(e) => updateBullet(i, e.target.value)}
                            placeholder="Bullet point"
                            className="text-xs min-h-[44px] resize-none"
                            rows={2}
                          />
                          <button
                            onClick={() => removeBullet(i)}
                            className="h-9 w-9 rounded-md bg-secondary flex items-center justify-center shrink-0"
                            aria-label="Remove bullet"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={addBullet}
                        className="w-full h-9 rounded-md border border-dashed border-border flex items-center justify-center gap-1 text-xs text-muted-foreground tap-scale"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add bullet
                      </button>
                    </div>
                  )}
                  <div className="mt-auto flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={cancelEdit}
                      disabled={saving}
                      className="flex-1 h-10 rounded-xl"
                    >
                      <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                    <Button
                      onClick={saveEdit}
                      disabled={saving}
                      className="flex-1 h-10 rounded-xl gradient-primary font-semibold"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1" /> Save
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : slide?.type === "title" ? (
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
                  <h2 className="mt-3 text-xl font-bold leading-snug pr-10">{slide?.title}</h2>
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
              {!editing && (
                <div className="mt-auto pt-3 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="truncate max-w-[60%]">{deck.title}</span>
                  <span>
                    {idx + 1} / {total}
                  </span>
                </div>
              )}
            </div>
          </div>

          {!editing && (
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
          )}
        </>
      )}
    </div>
  );
};

export default SlidesPage;
