"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDict } from "@/components/providers";
import { Plus, Trash2 } from "lucide-react";

interface AreaRow {
  id: string;
  name: string;
  length: string;
  width: string;
  sqft: string; // direct override
  photo: string; // "" = none, else "1".."n"
}

const empty = (): AreaRow => ({
  id: Math.random().toString(36).slice(2),
  name: "",
  length: "",
  width: "",
  sqft: "",
  photo: "",
});

function rowSqft(a: AreaRow): number {
  const direct = Number(a.sqft);
  if (direct > 0) return direct;
  const l = Number(a.length);
  const w = Number(a.width);
  return l > 0 && w > 0 ? l * w : 0;
}

interface Props {
  photoCount: number;
  onChange: (summary: string, totalSqft: number) => void;
}

/** Add rooms/areas with numeric measurements; sqft auto-calculated. */
export function AreaMeasures({ photoCount, onChange }: Props) {
  const t = useDict();
  const [rows, setRows] = useState<AreaRow[]>([empty()]);

  const total = Math.round(rows.reduce((s, a) => s + rowSqft(a), 0));

  // report up whenever rows change
  useEffect(() => {
    const parts = rows
      .filter((a) => rowSqft(a) > 0)
      .map((a) => {
        const name = a.name.trim() || t.ai.area;
        const dims =
          Number(a.sqft) > 0
            ? `${Math.round(rowSqft(a))} sqft`
            : `${a.length}×${a.width} ft = ${Math.round(rowSqft(a))} sqft`;
        const photo = a.photo ? ` (photo ${a.photo})` : "";
        return `${name}: ${dims}${photo}`;
      });
    const summary = parts.length ? `${parts.join("; ")}. Total ${total} sqft.` : "";
    onChange(summary, total);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  function patch(id: string, p: Partial<AreaRow>) {
    setRows((prev) => prev.map((a) => (a.id === id ? { ...a, ...p } : a)));
  }

  return (
    <div className="space-y-2">
      {rows.map((a) => (
        <div key={a.id} className="rounded-xl border bg-card p-2">
          <div className="flex items-center gap-2">
            <Input
              value={a.name}
              onChange={(e) => patch(a.id, { name: e.target.value })}
              placeholder={t.ai.areaName}
              className="h-8 flex-1 text-xs"
            />
            {photoCount > 0 && (
              <Select
                value={a.photo || "__none__"}
                onValueChange={(v) => patch(a.id, { photo: v === "__none__" ? "" : v })}
              >
                <SelectTrigger className="h-8 w-24 text-xs">
                  <SelectValue placeholder={t.ai.photoLink} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t.ai.noPhoto}</SelectItem>
                  {Array.from({ length: photoCount }).map((_, i) => (
                    <SelectItem key={i} value={String(i + 1)}>
                      {t.ai.photo} {i + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0"
              aria-label={t.common.delete}
              onClick={() => setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== a.id) : prev))}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs">
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              value={a.length}
              onChange={(e) => patch(a.id, { length: e.target.value, sqft: "" })}
              placeholder={t.form.length}
              className="h-8 w-16 px-1 text-center"
            />
            <span className="text-muted-foreground">×</span>
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              value={a.width}
              onChange={(e) => patch(a.id, { width: e.target.value, sqft: "" })}
              placeholder={t.form.width}
              className="h-8 w-16 px-1 text-center"
            />
            <span className="text-muted-foreground">{t.ai.orDirect}</span>
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              value={a.sqft}
              onChange={(e) => patch(a.id, { sqft: e.target.value })}
              placeholder="sqft"
              className="h-8 w-20 px-1 text-center"
            />
            <span className="ml-auto font-semibold tabular-nums">
              {Math.round(rowSqft(a))} sqft
            </span>
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setRows((prev) => [...prev, empty()])}
        >
          <Plus className="mr-1 h-4 w-4" /> {t.ai.addArea}
        </Button>
        <span className="text-sm font-bold">
          {t.wizard.totalArea}: {total} sqft
        </span>
      </div>
    </div>
  );
}
