"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLang } from "@/components/providers";
import { parseCsv } from "@/lib/csv-export";
import { Upload, FileSpreadsheet, ArrowRight } from "lucide-react";

export interface ImportField {
  key: string;
  label: string;
  required?: boolean;
  aliases: string[]; // header names (lowercased) that auto-map to this field
}

type Lang = "en" | "pt" | "es";

const T = {
  import: { en: "Import CSV", pt: "Importar CSV", es: "Importar CSV" },
  title: { en: "Import from CSV", pt: "Importar de CSV", es: "Importar de CSV" },
  pick: { en: "Choose a .csv file", pt: "Escolher arquivo .csv", es: "Elegir archivo .csv" },
  mapHint: {
    en: "Match your columns to our fields. We guessed — adjust if needed.",
    pt: "Ligue suas colunas aos nossos campos. Adivinhamos — ajuste se precisar.",
    es: "Vincula tus columnas a nuestros campos. Adivinamos — ajusta si hace falta.",
  },
  none: { en: "— skip —", pt: "— ignorar —", es: "— omitir —" },
  rows: { en: "rows found", pt: "linhas encontradas", es: "filas encontradas" },
  doImport: { en: "Import", pt: "Importar", es: "Importar" },
  done: { en: "Imported", pt: "Importado", es: "Importado" },
  needName: { en: "Map the required field first", pt: "Mapeie o campo obrigatório", es: "Mapea el campo requerido" },
  error: { en: "Import failed", pt: "Falha ao importar", es: "Error al importar" },
} as const;

function autoMap(fields: ImportField[], headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  const lowered = headers.map((h) => h.toLowerCase().trim());
  for (const f of fields) {
    const idx = lowered.findIndex((h) => f.aliases.some((a) => h === a || h.includes(a)));
    if (idx >= 0) map[f.key] = headers[idx];
  }
  return map;
}

export function CsvImport({
  fields,
  onImport,
  buttonLabel,
}: {
  fields: ImportField[];
  onImport: (rows: Record<string, string>[]) => Promise<{ inserted: number }>;
  buttonLabel?: string;
}) {
  const lang = useLang() as Lang;
  const tr = (m: Record<Lang, string>) => m[lang] ?? m.en;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    const parsed = parseCsv(text);
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    setMapping(autoMap(fields, parsed.headers));
  }

  function reset() {
    setHeaders([]);
    setRows([]);
    setMapping({});
  }

  function runImport() {
    const requiredField = fields.find((f) => f.required);
    if (requiredField && !mapping[requiredField.key]) {
      toast.error(tr(T.needName));
      return;
    }
    const colIndex: Record<string, number> = {};
    for (const f of fields) {
      const h = mapping[f.key];
      if (h) colIndex[f.key] = headers.indexOf(h);
    }
    const mapped = rows.map((r) => {
      const obj: Record<string, string> = {};
      for (const f of fields) {
        const i = colIndex[f.key];
        if (i != null && i >= 0) obj[f.key] = (r[i] ?? "").trim();
      }
      return obj;
    });

    startTransition(async () => {
      try {
        const res = await onImport(mapped);
        toast.success(`${tr(T.done)}: ${res.inserted}`);
        setOpen(false);
        reset();
        router.refresh();
      } catch {
        toast.error(tr(T.error));
      }
    });
  }

  return (
    <>
      <Button
        size="icon"
        variant="outline"
        className="shrink-0"
        aria-label={buttonLabel ?? tr(T.import)}
        onClick={() => setOpen(true)}
      >
        <Upload className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-h-[90dvh] max-w-sm overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{tr(T.title)}</DialogTitle>
          </DialogHeader>

          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(e) => {
              onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />

          {headers.length === 0 ? (
            <button
              onClick={() => inputRef.current?.click()}
              className="press flex flex-col items-center gap-2 rounded-2xl border border-dashed p-8 text-sm text-muted-foreground hover:border-primary hover:text-foreground"
            >
              <FileSpreadsheet className="h-8 w-8" />
              {tr(T.pick)}
            </button>
          ) : (
            <div className="grid gap-3">
              <p className="text-xs text-muted-foreground">{tr(T.mapHint)}</p>
              {fields.map((f) => (
                <div key={f.key} className="flex items-center gap-2 text-sm">
                  <span className="w-24 shrink-0 font-medium">
                    {f.label}
                    {f.required && <span className="text-destructive"> *</span>}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <Select
                    value={mapping[f.key] ?? "__none__"}
                    onValueChange={(v) =>
                      setMapping((m) => ({ ...m, [f.key]: v === "__none__" ? "" : v }))
                    }
                  >
                    <SelectTrigger className="h-8 flex-1 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{tr(T.none)}</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}

              <p className="text-xs text-muted-foreground">
                {rows.length} {tr(T.rows)}
              </p>
              <Button onClick={runImport} disabled={pending}>
                <Upload className="mr-1 h-4 w-4" /> {tr(T.doImport)} ({rows.length})
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
