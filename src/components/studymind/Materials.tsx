import { ArrowLeft, Search, SlidersHorizontal, FolderOpen, FileText, Plus } from "lucide-react";
import { StatusBar } from "./StatusBar";
import { Input } from "@/components/ui/input";

interface Props { onUpload: () => void; }

const folders = [
  { name: "CSC 101", count: 12 },
  { name: "MTH 202", count: 8 },
  { name: "PHY 103", count: 10 },
  { name: "GST 201", count: 6 },
];
const recent = [
  { name: "Data Structures.pdf", course: "CSC 101 • 2 hours ago" },
  { name: "Calculus II Notes.pdf", course: "MTH 202 • Yesterday" },
];

export const Materials = ({ onUpload }: Props) => (
  <div className="animate-fade-in">
    <StatusBar />
    <header className="flex items-center justify-between px-5 py-3">
      <button className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center tap-scale">
        <ArrowLeft className="h-5 w-5" />
      </button>
      <h1 className="font-bold">Materials Library</h1>
      <button className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center tap-scale">
        <SlidersHorizontal className="h-5 w-5" />
      </button>
    </header>

    <div className="px-5 mt-2 relative">
      <Search className="absolute left-9 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input placeholder="Search materials" className="pl-10 h-12 rounded-2xl bg-secondary border-0" />
    </div>

    <div className="px-5 mt-6">
      <h3 className="font-bold mb-3 text-sm">Folders</h3>
      <div className="space-y-2">
        {folders.map((f) => (
          <button key={f.name} className="w-full p-4 rounded-2xl bg-card border border-border flex items-center gap-3 tap-scale hover:shadow-card transition-base text-left">
            <div className="h-10 w-10 rounded-xl bg-primary-soft flex items-center justify-center">
              <FolderOpen className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">{f.name}</p>
              <p className="text-xs text-muted-foreground">{f.count} files</p>
            </div>
          </button>
        ))}
      </div>

      <h3 className="font-bold mt-6 mb-3 text-sm">Recent Files</h3>
      <div className="space-y-2">
        {recent.map((r) => (
          <button key={r.name} className="w-full p-4 rounded-2xl bg-card border border-border flex items-center gap-3 tap-scale text-left">
            <div className="h-10 w-10 rounded-xl bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-300 flex items-center justify-center">
              <FileText className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{r.name}</p>
              <p className="text-xs text-muted-foreground">{r.course}</p>
            </div>
          </button>
        ))}
      </div>
    </div>

    <button
      onClick={onUpload}
      className="fixed bottom-20 left-1/2 translate-x-[7.5rem] h-14 w-14 rounded-full gradient-primary text-white shadow-elevated flex items-center justify-center tap-scale z-40"
      aria-label="Upload material"
    >
      <Plus className="h-6 w-6" />
    </button>
  </div>
);
