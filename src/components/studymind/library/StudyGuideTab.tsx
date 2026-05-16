import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Loader2, Sparkles, Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";

interface Guide {
  summary: string;
  topics: { name: string; blurb: string }[];
  faqs: { q: string; a: string }[];
  glossary: { term: string; definition: string }[];
  generated_at: string;
}

export const StudyGuideTab = ({
  notebookId, materialCount,
}: { notebookId: string; materialCount: number }) => {
  const [guide, setGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("notebook_guides")
      .select("summary, topics, faqs, glossary, generated_at")
      .eq("notebook_id", notebookId)
      .maybeSingle();
    if (data) setGuide(data as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, [notebookId]);

  const generate = async () => {
    if (materialCount === 0) { toast.error("Add at least one source first"); return; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-notebook-guide", {
        body: { notebook_id: notebookId },
      });
      if (error) throw error;
      const g = (data as any)?.guide;
      if (g) setGuide(g);
      toast.success("Study guide ready");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't generate guide");
    } finally { setGenerating(false); }
  };

  const exportPdf = () => {
    if (!guide) return;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 48;
    let y = 60;
    const writeWrap = (text: string, size: number, bold = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(text, pageW - margin * 2);
      for (const line of lines) {
        if (y > 780) { doc.addPage(); y = 60; }
        doc.text(line, margin, y);
        y += size + 4;
      }
    };
    writeWrap("Notebook Study Guide", 22, true);
    y += 10;
    writeWrap("Summary", 14, true);
    writeWrap(guide.summary, 11);
    y += 8;
    writeWrap("Topics", 14, true);
    guide.topics.forEach((t) => {
      writeWrap(`• ${t.name}`, 12, true);
      writeWrap(t.blurb, 11);
    });
    y += 8;
    writeWrap("FAQs", 14, true);
    guide.faqs.forEach((f) => {
      writeWrap(`Q: ${f.q}`, 12, true);
      writeWrap(`A: ${f.a}`, 11);
    });
    y += 8;
    writeWrap("Glossary", 14, true);
    guide.glossary.forEach((g) => {
      writeWrap(`${g.term}: ${g.definition}`, 11);
    });
    doc.save("notebook-study-guide.pdf");
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  if (!guide) {
    return (
      <div className="text-center py-10">
        <Sparkles className="h-10 w-10 mx-auto mb-3 text-primary" />
        <p className="font-semibold">Generate a study guide</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
          AI builds a summary, topic breakdown, FAQs and glossary from every source in this notebook.
        </p>
        <Button
          onClick={generate}
          disabled={generating || materialCount === 0}
          className="mt-4 rounded-xl gradient-primary text-white"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Generate study guide
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button onClick={generate} disabled={generating} variant="outline" size="sm" className="rounded-xl">
          {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Regenerate
        </Button>
        <Button onClick={exportPdf} size="sm" className="rounded-xl">
          <Download className="h-4 w-4 mr-2" /> PDF
        </Button>
      </div>

      <div className="rounded-2xl bg-card border border-border p-4">
        <h3 className="font-semibold text-sm mb-2">Summary</h3>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{guide.summary}</p>
      </div>

      <div>
        <h3 className="font-semibold text-sm mb-2 px-1">Topics</h3>
        <Accordion type="multiple" className="rounded-2xl bg-card border border-border px-3">
          {guide.topics.map((t, i) => (
            <AccordionItem key={i} value={`t${i}`} className="border-b last:border-0">
              <AccordionTrigger className="text-sm font-medium text-left">{t.name}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{t.blurb}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      <div>
        <h3 className="font-semibold text-sm mb-2 px-1">FAQs</h3>
        <Accordion type="multiple" className="rounded-2xl bg-card border border-border px-3">
          {guide.faqs.map((f, i) => (
            <AccordionItem key={i} value={`f${i}`} className="border-b last:border-0">
              <AccordionTrigger className="text-sm font-medium text-left">{f.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {guide.glossary.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-2 px-1">Glossary</h3>
          <div className="rounded-2xl bg-card border border-border p-4 space-y-2">
            {guide.glossary.map((g, i) => (
              <p key={i} className="text-sm">
                <span className="font-semibold">{g.term}: </span>
                <span className="text-muted-foreground">{g.definition}</span>
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
