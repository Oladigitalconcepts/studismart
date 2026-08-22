import { useRef, useState } from "react";
import { Camera, FileText, ImagePlus, Library, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  title: string;
  setTitle: (v: string) => void;
  files: File[];
  setFiles: (f: File[]) => void;
  pastedText: string;
  setPastedText: (v: string) => void;
  onContinue: () => void;
  ctaLabel?: string;
  onPickLibrary?: () => void;
}

export const TestUpload = ({
  title, setTitle, files, setFiles, pastedText, setPastedText, onContinue, ctaLabel = "Continue", onPickLibrary,
}: Props) => {

  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list);
    setFiles([...files, ...incoming].slice(0, 8));
  };
  const removeAt = (i: number) => setFiles(files.filter((_, idx) => idx !== i));

  const canContinue = files.length > 0 || pastedText.trim().length >= 30;

  return (
    <div className="px-5 mt-2 space-y-4 animate-fade-in">
      <Input
        placeholder="Test title (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value.slice(0, 80))}
        className="h-12 rounded-xl"
      />

      {onPickLibrary && (
        <button
          onClick={onPickLibrary}
          className="w-full rounded-2xl border border-border bg-card p-3 flex items-center gap-3 tap-scale text-left"
        >
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Library className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">Pick from library</p>
            <p className="text-[11px] text-muted-foreground break-words">Use a material you already uploaded</p>
          </div>
        </button>
      )}



      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded-2xl border-2 border-dashed border-primary/40 bg-primary-soft/40 p-4 flex flex-col items-center text-center tap-scale"
        >
          <UploadCloud className="h-6 w-6 text-primary mb-1" />
          <span className="text-xs font-medium">Files</span>
        </button>
        <button
          onClick={() => imgRef.current?.click()}
          className="rounded-2xl border-2 border-dashed border-primary/40 bg-primary-soft/40 p-4 flex flex-col items-center text-center tap-scale"
        >
          <ImagePlus className="h-6 w-6 text-primary mb-1" />
          <span className="text-xs font-medium">Images</span>
        </button>
        <button
          onClick={() => camRef.current?.click()}
          className="rounded-2xl border-2 border-dashed border-primary/40 bg-primary-soft/40 p-4 flex flex-col items-center text-center tap-scale"
        >
          <Camera className="h-6 w-6 text-primary mb-1" />
          <span className="text-xs font-medium">Camera</span>
        </button>
      </div>

      <input ref={fileRef} type="file" multiple accept=".pdf,.docx,.txt,.md,text/*" className="hidden" onChange={(e) => addFiles(e.target.files)} />
      <input ref={imgRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => addFiles(e.target.files)} />
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => addFiles(e.target.files)} />

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 truncate text-sm">{f.name}</span>
              <button onClick={() => removeAt(i)} className="h-7 w-7 rounded-full hover:bg-background flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">Or paste your text</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <Textarea
        value={pastedText}
        onChange={(e) => setPastedText(e.target.value.slice(0, 18000))}
        placeholder="Paste lecture notes…"
        className="min-h-[120px] rounded-2xl"
      />

      <Button
        disabled={!canContinue}
        onClick={onContinue}
        className="w-full h-12 rounded-2xl gradient-primary tap-scale font-semibold"
      >
        {ctaLabel}
      </Button>
    </div>
  );
};
