import { useState } from "react";
import { ArrowLeft, Bookmark, Download, ChevronRight, FileQuestion, Pencil, AlignLeft } from "lucide-react";
import { StatusBar } from "./StatusBar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  onBack: () => void;
  onPractice: () => void;
}

const topics = [
  "Introduction to Data Structures",
  "Arrays",
  "Linked Lists",
  "Stacks",
  "Queues",
  "Trees",
  "Graphs",
  "Sorting Algorithms",
];

const questionSets = [
  { icon: FileQuestion, title: "Multiple Choice", count: "25 Questions", color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300" },
  { icon: AlignLeft, title: "Short Answers", count: "15 Questions", color: "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300" },
  { icon: Pencil, title: "Essay Questions", count: "10 Questions", color: "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300" },
];

export const StudyPack = ({ onBack, onPractice }: Props) => {
  const [tab, setTab] = useState<"summary" | "topics" | "questions">("summary");

  return (
    <div className="animate-fade-in">
      <StatusBar />
      <header className="flex items-center justify-between px-5 py-3">
        <button onClick={onBack} className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center tap-scale">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <h1 className="font-bold text-base leading-tight">CSC 101</h1>
          <p className="text-xs text-muted-foreground">Data Structures.pdf</p>
        </div>
        <button className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center tap-scale">
          <Bookmark className="h-5 w-5" />
        </button>
      </header>

      <div className="px-5 mt-2">
        <div className="bg-secondary p-1 rounded-2xl grid grid-cols-3 gap-1">
          {(["summary", "topics", "questions"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "h-10 rounded-xl text-sm font-semibold capitalize transition-base tap-scale",
                tab === t ? "gradient-primary text-white shadow-soft" : "text-muted-foreground"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 mt-5 animate-fade-in" key={tab}>
        {tab === "summary" && (
          <div className="space-y-5">
            <section>
              <h3 className="font-bold mb-2">Quick Overview</h3>
              <div className="rounded-2xl bg-card border border-border p-4 text-sm leading-relaxed text-muted-foreground">
                This document explains the fundamental concepts of data structures including arrays,
                linked lists, stacks, queues, trees and graphs. It covers their operations,
                implementations and real-world applications.
              </div>
            </section>
            <section>
              <h3 className="font-bold mb-2">Key Points</h3>
              <ul className="space-y-2">
                {[
                  "Linear vs Non-linear data structures",
                  "Arrays and their limitations",
                  "Linked lists and memory allocation",
                  "Stacks and queues operations",
                  "Trees and traversals",
                  "Graphs and applications",
                ].map((p) => (
                  <li key={p} className="flex items-start gap-3 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </section>
            <Button variant="outline" className="w-full h-12 rounded-2xl border-primary/30 bg-primary-soft text-primary hover:bg-primary/10 hover:text-primary tap-scale font-semibold">
              <Download className="h-4 w-4 mr-2" /> Download Summary
            </Button>
          </div>
        )}

        {tab === "topics" && (
          <div className="space-y-2">
            <h3 className="font-bold mb-2">Topics</h3>
            {topics.map((t, i) => (
              <button
                key={t}
                className={cn(
                  "w-full p-4 rounded-2xl flex items-center gap-3 tap-scale transition-base text-left border",
                  i === 1 ? "bg-primary-soft border-primary/30" : "bg-card border-border hover:bg-muted/50"
                )}
              >
                <div className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                  i === 1 ? "gradient-primary text-white" : "bg-muted text-muted-foreground"
                )}>
                  {i + 1}
                </div>
                <span className="flex-1 text-sm font-medium">{t}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}

        {tab === "questions" && (
          <div className="space-y-3">
            <h3 className="font-bold mb-1">Question Sets</h3>
            {questionSets.map((q) => (
              <button
                key={q.title}
                onClick={onPractice}
                className="w-full p-4 rounded-2xl bg-card border border-border flex items-center gap-3 tap-scale hover:shadow-card transition-base text-left"
              >
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${q.color}`}>
                  <q.icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{q.title}</p>
                  <p className="text-xs text-muted-foreground">{q.count}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
            <Button onClick={onPractice} className="w-full h-12 mt-2 rounded-2xl gradient-primary tap-scale font-semibold">
              Generate More Questions
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
