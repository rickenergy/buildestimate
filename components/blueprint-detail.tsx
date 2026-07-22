"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLang } from "@/components/providers";
import { VoiceInput } from "@/components/voice-input";
import {
  analyzeBlueprintPage,
  saveBlueprintAnswers,
  setBlueprintTrade,
  mapPlanTrades,
  buildTradeScope,
  selectTradeWorks,
  saveBuilderRequest,
  quantifyTrade,
  saveWorkQuantities,
  estimateFromBlueprint,
  type BlueprintRow,
  type SheetType,
  type WorkQuantity,
} from "@/app/actions/blueprints";
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  HelpCircle,
  CheckCircle2,
  Ruler,
  TriangleAlert,
  ListChecks,
  ClipboardList,
  Ruler as RulerIcon,
  Calculator,
  FileText,
  Receipt,
} from "lucide-react";

const BUILDER_REQUEST_KEY = "__builder_request";
const ESTIMATE_ID_KEY = "__estimate_id";
const UNITS = ["sqft", "lf", "ea", "cy", "sq", "ls"] as const;

type Lang = "en" | "pt" | "es";

const SHEET_LABEL: Record<SheetType, Record<Lang, string>> = {
  architectural: { en: "Architectural", pt: "Arquitetônica", es: "Arquitectónica" },
  structural: { en: "Structural", pt: "Estrutural", es: "Estructural" },
  mep: { en: "MEP (mech/elec/plumb)", pt: "MEP (elétrica/hidráulica)", es: "MEP (mec/elec/plom)" },
  civil: { en: "Civil / Site", pt: "Civil / Terreno", es: "Civil / Sitio" },
  demolition: { en: "Demolition", pt: "Demolição", es: "Demolición" },
  landscape: { en: "Landscape", pt: "Paisagismo", es: "Paisajismo" },
  other: { en: "Other", pt: "Outra", es: "Otra" },
};
const SHEET_CLS: Record<SheetType, string> = {
  architectural: "bg-primary/15 text-primary",
  structural: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  mep: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
  civil: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  demolition: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  landscape: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  other: "bg-muted text-muted-foreground",
};

const L = {
  back: { en: "All plans", pt: "Todas as plantas", es: "Todos los planos" },
  intro: {
    en: "Tap a sheet to read it. The AI classifies the discipline, lists the trades, and asks about anything it can't be sure of — it never invents a number.",
    pt: "Toque numa folha para lê-la. A IA classifica a disciplina, lista os trades e pergunta o que não tem certeza — nunca inventa número.",
    es: "Toca una hoja para leerla. La IA clasifica la disciplina, lista los oficios y pregunta lo que no puede asegurar — nunca inventa un número.",
  },
  sheets: { en: "Sheets", pt: "Folhas", es: "Hojas" },
  read: { en: "Read this sheet", pt: "Ler esta folha", es: "Leer esta hoja" },
  reading: { en: "Reading…", pt: "Lendo…", es: "Leyendo…" },
  reread: { en: "Read again", pt: "Ler de novo", es: "Leer de nuevo" },
  needsKey: { en: "AI key not configured (AI_GATEWAY_API_KEY).", pt: "Chave de IA não configurada.", es: "Clave de IA no configurada." },
  scope: { en: "Scope", pt: "Escopo", es: "Alcance" },
  trades: { en: "Trades on this sheet", pt: "Trades nesta folha", es: "Oficios en esta hoja" },
  questions: { en: "Confirm before measuring", pt: "Confirme antes de medir", es: "Confirma antes de medir" },
  questionsHint: {
    en: "Anything the AI couldn't be sure of — it asks instead of guessing.",
    pt: "Tudo que a IA não teve certeza — ela pergunta em vez de chutar.",
    es: "Todo lo que la IA no pudo asegurar — pregunta en vez de adivinar.",
  },
  answer: { en: "Answer…", pt: "Resposta…", es: "Respuesta…" },
  save: { en: "Save answers", pt: "Salvar respostas", es: "Guardar respuestas" },
  pick: { en: "Take off this trade", pt: "Fazer takeoff deste trade", es: "Takeoff de este oficio" },
  chosen: { en: "Taking off", pt: "Fazendo takeoff de", es: "Takeoff de" },
  scaleWarn: {
    en: "Scale not detected — confirm it in the questions.",
    pt: "Escala não detectada — confirme nas perguntas.",
    es: "Escala no detectada — confírmala en las preguntas.",
  },
  next: {
    en: "Scale calibration + area measuring is the next phase.",
    pt: "Calibração de escala + medição de áreas é a próxima fase.",
    es: "Calibración de escala + medición de áreas es la próxima fase.",
  },
  // Phase 2
  mapTitle: { en: "1 · Understand the whole plan", pt: "1 · Entender a planta inteira", es: "1 · Entender todo el plano" },
  mapHint: {
    en: "AI reads the sheet index and maps every trade in the set — before any takeoff.",
    pt: "A IA lê o índice e mapeia todos os trades do conjunto — antes de qualquer takeoff.",
    es: "La IA lee el índice y mapea todos los oficios del conjunto — antes del takeoff.",
  },
  mapBtn: { en: "Read the plan index", pt: "Ler o índice da planta", es: "Leer el índice del plano" },
  mapping: { en: "Reading the index…", pt: "Lendo o índice…", es: "Leyendo el índice…" },
  pickTradeTitle: { en: "2 · Choose the trade to take off", pt: "2 · Escolha o trade pra fazer o takeoff", es: "2 · Elige el oficio" },
  onSheets: { en: "on sheets", pt: "nas folhas", es: "en hojas" },
  building: { en: "Finding all the work…", pt: "Buscando todos os trabalhos…", es: "Buscando todo el trabajo…" },
  scopeTitle: { en: "3 · Scope of work", pt: "3 · Escopo do trabalho", es: "3 · Alcance del trabajo" },
  scopeHint: {
    en: "Everything found for this trade, per the book method. Select the works to take off.",
    pt: "Tudo encontrado pra este trade, pela metodologia dos livros. Selecione os trabalhos.",
    es: "Todo lo encontrado, según el método. Selecciona los trabajos.",
  },
  measure: { en: "Measure", pt: "Medir", es: "Medir" },
  selectAll: { en: "Select all", pt: "Selecionar tudo", es: "Seleccionar todo" },
  saveSel: { en: "Save selection", pt: "Salvar seleção", es: "Guardar selección" },
  readyMeasure: {
    en: "Selected works are queued. Next: run the takeoff to get quantities.",
    pt: "Trabalhos selecionados na fila. A seguir: rodar o takeoff pra ter as quantidades.",
    es: "Trabajos en cola. Siguiente: correr el takeoff.",
  },
  // Builder request
  brTitle: { en: "Builder's request (optional)", pt: "Solicitação do builder (opcional)", es: "Solicitud del builder (opcional)" },
  brHint: {
    en: "Type exactly what the builder asked for. The AI reads it and scopes + quantifies precisely to it.",
    pt: "Escreva exatamente o que o builder pediu. A IA lê e faz o escopo + as quantidades exatamente conforme.",
    es: "Escribe exactamente lo que pidió el builder. La IA lo lee y ajusta el alcance y las cantidades.",
  },
  brPlaceholder: {
    en: "e.g. Paint all 2nd-floor bedrooms & hallway, walls + ceilings, 2 coats. Include closet interiors.",
    pt: "ex.: Pintar todos os quartos e corredor do 2º andar, paredes + tetos, 2 demãos. Incluir closets.",
    es: "ej.: Pintar todos los dormitorios y pasillo del 2º piso, muros + techos, 2 manos.",
  },
  brSave: { en: "Save request", pt: "Salvar solicitação", es: "Guardar solicitud" },
  // Quantify / takeoff
  quantify: { en: "Run takeoff (get quantities)", pt: "Rodar takeoff (quantidades)", es: "Correr takeoff (cantidades)" },
  requantify: { en: "Re-run takeoff", pt: "Rodar takeoff de novo", es: "Correr de nuevo" },
  quantifying: { en: "Measuring quantities…", pt: "Medindo quantidades…", es: "Midiendo cantidades…" },
  qtyTitle: { en: "4 · Takeoff quantities (review & edit)", pt: "4 · Quantidades do takeoff (revise e ajuste)", es: "4 · Cantidades (revisa y edita)" },
  qtyHint: {
    en: "First-pass numbers from the AI — with what it read. Edit any value before pricing; the price engine adds waste per trade.",
    pt: "Números do 1º passe da IA — com a base que leu. Ajuste qualquer valor antes do preço; o motor adiciona a perda por trade.",
    es: "Números del primer pase de la IA. Edita cualquier valor antes del precio.",
  },
  basis: { en: "Read from", pt: "Base", es: "Base" },
  assumed: { en: "Assumed", pt: "Assumido", es: "Asumido" },
  saveQty: { en: "Save quantities", pt: "Salvar quantidades", es: "Guardar cantidades" },
  // Estimate
  genEstimate: { en: "Generate professional estimate", pt: "Gerar orçamento profissional", es: "Generar presupuesto profesional" },
  generating: { en: "Pricing…", pt: "Precificando…", es: "Cotizando…" },
  viewEstimate: { en: "View the estimate", pt: "Ver o orçamento", es: "Ver el presupuesto" },
  estimateReady: {
    en: "Estimate created — priced with your book, waste, labor, location & margins. Review, edit lines, and send the proposal.",
    pt: "Orçamento criado — precificado com seu catálogo, perda, mão de obra, localização e margens. Revise, edite linhas e envie a proposta.",
    es: "Presupuesto creado — con tu catálogo, desperdicio, mano de obra y márgenes. Revísalo y envía la propuesta.",
  },
} as const;

export function BlueprintDetail({
  blueprint,
  pageUrls,
}: {
  blueprint: BlueprintRow;
  pageUrls: Record<number, string>;
}) {
  const lang = useLang() as Lang;
  const tr = (m: Record<Lang, string>) => m[lang] ?? m.en;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reading, setReading] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(blueprint.page_count === 1 ? 1 : null);
  const [answers, setAnswers] = useState<Record<string, string>>(blueprint.answers ?? {});
  const [mapping, setMapping] = useState(false);
  const [building, setBuilding] = useState<string | null>(null);
  const initialSel = blueprint.chosen_trade
    ? new Set(blueprint.trade_scopes?.[blueprint.chosen_trade]?.selected ?? [])
    : new Set<string>();
  const [pickedWorks, setPickedWorks] = useState<Set<string>>(initialSel);
  const [builderReq, setBuilderReq] = useState<string>((blueprint.answers ?? {})[BUILDER_REQUEST_KEY] ?? "");
  const [quantifying, setQuantifying] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [qtyEdits, setQtyEdits] = useState<Record<string, WorkQuantity>>(
    (blueprint.chosen_trade ? blueprint.trade_scopes?.[blueprint.chosen_trade]?.quantities : undefined) ?? {}
  );

  const pages = blueprint.pages ?? [];
  const analysis = blueprint.analysis ?? {};
  const tradeMap = blueprint.trade_map ?? [];
  const activeScope = blueprint.chosen_trade ? blueprint.trade_scopes?.[blueprint.chosen_trade] : undefined;
  const estimateId = (blueprint.answers ?? {})[ESTIMATE_ID_KEY];
  const selectedWorkIds = activeScope?.selected?.length
    ? activeScope.selected
    : activeScope?.works.map((w) => w.id) ?? [];
  const quantifiedWorks = (activeScope?.works ?? []).filter(
    (w) => selectedWorkIds.includes(w.id) && (qtyEdits[w.id] || activeScope?.quantities?.[w.id])
  );

  function runMap() {
    setMapping(true);
    startTransition(async () => {
      const res = await mapPlanTrades(blueprint.id);
      setMapping(false);
      if (res.needsKey) toast.error(tr(L.needsKey));
      else if (res.ok) router.refresh();
      else toast.error(res.error ?? "Error");
    });
  }
  function chooseTrade(trade: string) {
    setBuilding(trade);
    startTransition(async () => {
      const res = await buildTradeScope(blueprint.id, trade);
      setBuilding(null);
      if (res.needsKey) toast.error(tr(L.needsKey));
      else if (res.ok) router.refresh();
      else toast.error(res.error ?? "Error");
    });
  }
  function toggleWork(id: string) {
    setPickedWorks((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function saveSelection() {
    if (!blueprint.chosen_trade) return;
    startTransition(async () => {
      await selectTradeWorks(blueprint.id, blueprint.chosen_trade!, [...pickedWorks]);
      router.refresh();
      toast.success("✓");
    });
  }

  function saveBuilderReq() {
    startTransition(async () => {
      await saveBuilderRequest(blueprint.id, builderReq.trim());
      router.refresh();
      toast.success("✓");
    });
  }
  function runQuantify() {
    if (!blueprint.chosen_trade) return;
    setQuantifying(true);
    startTransition(async () => {
      const res = await quantifyTrade(blueprint.id, blueprint.chosen_trade!);
      setQuantifying(false);
      if (res.needsKey) toast.error(tr(L.needsKey));
      else if (res.ok) router.refresh();
      else toast.error(res.error ?? "Error");
    });
  }
  function editQty(id: string, patch: Partial<WorkQuantity>) {
    setQtyEdits((s) => {
      const base = s[id] ?? activeScope?.quantities?.[id] ?? { qty: 0, unit: "sqft", basis: "", confidence: 0 };
      return { ...s, [id]: { ...base, ...patch } };
    });
  }
  function saveQuantities() {
    if (!blueprint.chosen_trade || Object.keys(qtyEdits).length === 0) return;
    startTransition(async () => {
      await saveWorkQuantities(blueprint.id, blueprint.chosen_trade!, qtyEdits);
      router.refresh();
      toast.success("✓");
    });
  }
  function generateEstimate() {
    if (!blueprint.chosen_trade) return;
    setGenerating(true);
    startTransition(async () => {
      // Persist any pending edits first so the price uses them.
      if (Object.keys(qtyEdits).length > 0) await saveWorkQuantities(blueprint.id, blueprint.chosen_trade!, qtyEdits);
      const res = await estimateFromBlueprint(blueprint.id, blueprint.chosen_trade!);
      setGenerating(false);
      if (res.ok && res.id) {
        toast.success("✓");
        router.push(`/estimate/${res.id}`);
      } else toast.error(res.error ?? "Error");
    });
  }

  function analyze(i: number) {
    setReading(i);
    startTransition(async () => {
      const res = await analyzeBlueprintPage(blueprint.id, i);
      setReading(null);
      if (res.needsKey) toast.error(tr(L.needsKey));
      else if (res.ok) router.refresh();
      else toast.error(res.error ?? "Error");
    });
  }
  function saveAnswers() {
    startTransition(async () => {
      await saveBlueprintAnswers(blueprint.id, answers);
      router.refresh();
      toast.success("✓");
    });
  }
  function pickTrade(key: string) {
    startTransition(async () => {
      await setBlueprintTrade(blueprint.id, key);
      router.refresh();
    });
  }

  const sel = selected != null ? analysis[String(selected)] : undefined;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6">
      <Link href="/blueprints" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {tr(L.back)}
      </Link>
      <h1 className="text-xl font-bold">{blueprint.name}</h1>
      <p className="-mt-2 text-sm text-muted-foreground">{tr(L.intro)}</p>

      {/* Builder's request — fed into scope + quantities */}
      <Card>
        <CardContent className="grid gap-2 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="h-4 w-4 text-primary" /> {tr(L.brTitle)}
          </p>
          <p className="text-xs text-muted-foreground">{tr(L.brHint)}</p>
          <div className="flex items-start gap-1.5">
            <Textarea
              value={builderReq}
              onChange={(e) => setBuilderReq(e.target.value)}
              placeholder={tr(L.brPlaceholder)}
              className="min-h-20"
            />
            <VoiceInput onTranscript={(text) => setBuilderReq((s) => (s.trim() ? `${s.trim()} ` : "") + text)} />
          </div>
          <div className="flex justify-end">
            <Button size="sm" variant="outline" disabled={pending} onClick={saveBuilderReq}>
              {tr(L.brSave)}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Phase 2: whole-plan trade map → pick trade → scope ── */}
      {/* Step 1: map trades */}
      {tradeMap.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-5 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ListChecks className="h-5 w-5" />
            </span>
            <p className="text-sm font-semibold">{tr(L.mapTitle)}</p>
            <p className="max-w-sm text-xs text-muted-foreground">{tr(L.mapHint)}</p>
            <Button disabled={mapping} onClick={runMap}>
              {mapping ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
              {mapping ? tr(L.mapping) : tr(L.mapBtn)}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Step 2: pick trade */}
          <Card>
            <CardContent className="grid gap-1.5 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{tr(L.pickTradeTitle)}</p>
              {tradeMap.map((t) => {
                const active = blueprint.chosen_trade === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => chooseTrade(t.key)}
                    disabled={building !== null}
                    className={
                      "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition " +
                      (active ? "border-primary bg-primary/5" : "hover:bg-muted")
                    }
                  >
                    {building === t.key ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                    ) : active ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <ClipboardList className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="min-w-0 flex-1 truncate font-medium">{t.label}</span>
                    {t.sheets.length > 0 && (
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {tr(L.onSheets)} {t.sheets.slice(0, 6).join(", ")}
                      </span>
                    )}
                  </button>
                );
              })}
              {building && <p className="text-xs text-muted-foreground">{tr(L.building)}</p>}
            </CardContent>
          </Card>

          {/* Step 3: scope of work for the chosen trade */}
          {activeScope && (
            <Card>
              <CardContent className="grid gap-3 p-4">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <RulerIcon className="h-4 w-4 text-primary" /> {tr(L.scopeTitle)}
                    {activeScope.method_note && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
                        {activeScope.method_note}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{tr(L.scopeHint)}</p>
                </div>

                {activeScope.works.length > 0 && (
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPickedWorks(new Set(activeScope.works.map((w) => w.id)))}
                    >
                      {tr(L.selectAll)}
                    </Button>
                  </div>
                )}

                {activeScope.works.map((w) => {
                  const on = pickedWorks.has(w.id);
                  return (
                    <button
                      key={w.id}
                      onClick={() => toggleWork(w.id)}
                      className={
                        "grid gap-1 rounded-lg border p-3 text-left transition " +
                        (on ? "border-primary bg-primary/5" : "hover:bg-muted")
                      }
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={
                            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border " +
                            (on ? "border-primary bg-primary text-white" : "border-muted-foreground/40")
                          }
                        >
                          {on && <CheckCircle2 className="h-3 w-3" />}
                        </span>
                        <span className="min-w-0 flex-1 text-sm font-medium">
                          {w.label}
                          {w.sheet != null && <span className="ml-1 text-xs text-muted-foreground">· {tr(L.sheets)} {w.sheet}</span>}
                        </span>
                      </div>
                      {w.measures.length > 0 && (
                        <p className="pl-6 text-xs text-muted-foreground">
                          {tr(L.measure)}: {w.measures.join(" · ")}
                        </p>
                      )}
                    </button>
                  );
                })}

                {activeScope.questions.length > 0 && (
                  <div className="grid gap-3 rounded-lg bg-muted/40 p-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold">
                      <HelpCircle className="h-3.5 w-3.5 text-primary" /> {tr(L.questions)}
                    </p>
                    {activeScope.questions.map((qq) => (
                      <div key={qq.id} className="grid gap-1">
                        <p className="text-sm font-medium">{qq.q}</p>
                        <p className="text-xs text-muted-foreground">💡 {qq.why}</p>
                        <div className="flex items-center gap-1.5">
                          <Input
                            value={answers[qq.id] ?? ""}
                            onChange={(e) => setAnswers((s) => ({ ...s, [qq.id]: e.target.value }))}
                            placeholder={tr(L.answer)}
                            className="h-9"
                          />
                          <VoiceInput
                            onTranscript={(text) =>
                              setAnswers((s) => ({ ...s, [qq.id]: (s[qq.id]?.trim() ? `${s[qq.id].trim()} ` : "") + text }))
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" disabled={pending} onClick={saveSelection}>
                    {pending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
                    {tr(L.saveSel)} ({pickedWorks.size})
                  </Button>
                  <Button size="sm" variant="outline" disabled={pending} onClick={saveAnswers}>
                    {tr(L.save)}
                  </Button>
                </div>
                {pickedWorks.size > 0 && quantifiedWorks.length === 0 && (
                  <p className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                    <TriangleAlert className="h-3.5 w-3.5" /> {tr(L.readyMeasure)}
                  </p>
                )}

                {/* Step 4: run takeoff → quantities */}
                {selectedWorkIds.length > 0 && (
                  <Button variant="secondary" disabled={quantifying || pending} onClick={runQuantify}>
                    {quantifying ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Calculator className="mr-1 h-4 w-4" />}
                    {quantifying ? tr(L.quantifying) : quantifiedWorks.length > 0 ? tr(L.requantify) : tr(L.quantify)}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 4 card: takeoff quantities (review & edit) */}
          {activeScope && quantifiedWorks.length > 0 && (
            <Card>
              <CardContent className="grid gap-3 p-4">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <Calculator className="h-4 w-4 text-primary" /> {tr(L.qtyTitle)}
                  </p>
                  <p className="text-xs text-muted-foreground">{tr(L.qtyHint)}</p>
                </div>

                {quantifiedWorks.map((w) => {
                  const q = qtyEdits[w.id] ?? activeScope.quantities?.[w.id];
                  if (!q) return null;
                  const conf = Math.round((q.confidence ?? 0) * 100);
                  return (
                    <div key={w.id} className="grid gap-1.5 rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="min-w-0 flex-1 text-sm font-medium">{w.label}</span>
                        <span
                          className={
                            "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold " +
                            (conf >= 75
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : conf >= 45
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                : "bg-rose-500/15 text-rose-600 dark:text-rose-400")
                          }
                        >
                          {conf}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          inputMode="decimal"
                          value={q.qty}
                          onChange={(e) => editQty(w.id, { qty: Number(e.target.value) })}
                          className="h-9 w-28"
                        />
                        <select
                          value={q.unit}
                          onChange={(e) => editQty(w.id, { unit: e.target.value })}
                          className="h-9 rounded-md border bg-background px-2 text-sm"
                        >
                          {UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </div>
                      {q.basis && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">{tr(L.basis)}:</span> {q.basis}
                        </p>
                      )}
                      {q.assumptions && (
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                          <span className="font-medium">{tr(L.assumed)}:</span> {q.assumptions}
                        </p>
                      )}
                    </div>
                  );
                })}

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" disabled={pending} onClick={saveQuantities}>
                    {tr(L.saveQty)}
                  </Button>
                  <Button size="sm" className="flex-1" disabled={generating || pending} onClick={generateEstimate}>
                    {generating ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Receipt className="mr-1 h-4 w-4" />}
                    {generating ? tr(L.generating) : tr(L.genEstimate)}
                  </Button>
                </div>

                {estimateId && (
                  <div className="grid gap-1.5 rounded-lg bg-emerald-500/10 p-3">
                    <p className="text-xs text-emerald-800 dark:text-emerald-300">{tr(L.estimateReady)}</p>
                    <Link href={`/estimate/${estimateId}`} className="text-sm font-semibold text-primary hover:underline">
                      {tr(L.viewEstimate)} →
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Sheets grid (per-sheet detail — secondary) */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {tr(L.sheets)} · {blueprint.page_count}
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {pages.map((p) => {
            const done = analysis[String(p.i)];
            const active = selected === p.i;
            return (
              <button
                key={p.i}
                onClick={() => setSelected(p.i)}
                className={
                  "relative overflow-hidden rounded-xl border text-left transition " +
                  (active ? "ring-2 ring-primary" : "hover:opacity-90")
                }
              >
                {pageUrls[p.i] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pageUrls[p.i]} alt={`Sheet ${p.i}`} className="aspect-[3/4] w-full bg-white object-cover" />
                ) : (
                  <div className="aspect-[3/4] w-full bg-muted" />
                )}
                <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {p.i}
                </span>
                {done && (
                  <span className={`absolute bottom-1 left-1 right-1 truncate rounded px-1 py-0.5 text-center text-[9px] font-semibold ${SHEET_CLS[done.sheet_type]}`}>
                    {SHEET_LABEL[done.sheet_type][lang] ?? SHEET_LABEL[done.sheet_type].en}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected sheet */}
      {selected != null && (
        <div className="space-y-3">
          {/* big preview */}
          {pageUrls[selected] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pageUrls[selected]} alt={`Sheet ${selected}`} className="w-full rounded-2xl border bg-white object-contain" />
          )}

          {!sel ? (
            <Button className="w-full" disabled={reading === selected} onClick={() => analyze(selected)}>
              {reading === selected ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
              {reading === selected ? tr(L.reading) : tr(L.read)}
            </Button>
          ) : (
            <>
              {/* Discipline + label */}
              <div className="flex items-center justify-between gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${SHEET_CLS[sel.sheet_type]}`}>
                  {SHEET_LABEL[sel.sheet_type][lang] ?? SHEET_LABEL[sel.sheet_type].en}
                </span>
                <span className="min-w-0 truncate text-xs text-muted-foreground">{sel.sheet_label}</span>
              </div>

              {/* Scope */}
              <Card>
                <CardContent className="space-y-2 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{tr(L.scope)}</p>
                  <p className="text-sm leading-relaxed">{sel.scope}</p>
                  {!sel.scale_detected && (
                    <p className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                      <Ruler className="h-3.5 w-3.5" /> {tr(L.scaleWarn)}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Trades */}
              {sel.trades.length > 0 && (
                <Card>
                  <CardContent className="grid gap-1.5 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{tr(L.trades)}</p>
                    {sel.trades.map((t) => {
                      const chosen = blueprint.chosen_trade === t.key;
                      const conf = Math.round(t.confidence * 100);
                      return (
                        <button
                          key={t.key}
                          onClick={() => pickTrade(t.key)}
                          disabled={pending}
                          className={
                            "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition " +
                            (chosen ? "border-primary bg-primary/5" : "hover:bg-muted")
                          }
                        >
                          {chosen ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                          ) : (
                            <span className="h-4 w-4 shrink-0 rounded-full border" />
                          )}
                          <span className="min-w-0 flex-1 truncate font-medium">{t.label}</span>
                          <span
                            className={
                              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold " +
                              (conf >= 75
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : conf >= 45
                                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                  : "bg-rose-500/15 text-rose-600 dark:text-rose-400")
                            }
                          >
                            {conf}%
                          </span>
                        </button>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {/* Confidence-gated questions */}
              {sel.questions.length > 0 && (
                <Card>
                  <CardContent className="grid gap-3 p-4">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-semibold">
                        <HelpCircle className="h-4 w-4 text-primary" /> {tr(L.questions)}
                      </p>
                      <p className="text-xs text-muted-foreground">{tr(L.questionsHint)}</p>
                    </div>
                    {sel.questions.map((qq) => (
                      <div key={qq.id} className="grid gap-1.5 rounded-lg border p-3">
                        <p className="text-sm font-medium">{qq.q}</p>
                        <p className="text-xs text-muted-foreground">💡 {qq.why}</p>
                        <div className="flex items-center gap-1.5">
                          <Input
                            value={answers[qq.id] ?? ""}
                            onChange={(e) => setAnswers((s) => ({ ...s, [qq.id]: e.target.value }))}
                            placeholder={tr(L.answer)}
                            className="h-9"
                          />
                          <VoiceInput
                            onTranscript={(text) =>
                              setAnswers((s) => ({ ...s, [qq.id]: (s[qq.id]?.trim() ? `${s[qq.id].trim()} ` : "") + text }))
                            }
                          />
                        </div>
                      </div>
                    ))}
                    <Button size="sm" disabled={pending} onClick={saveAnswers}>
                      {pending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
                      {tr(L.save)}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {blueprint.chosen_trade && (
                <div className="rounded-2xl border bg-muted/40 p-4 text-center">
                  <p className="text-sm font-medium">
                    {tr(L.chosen)}: <span className="text-primary">{blueprint.chosen_trade}</span>
                  </p>
                  <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <TriangleAlert className="h-3.5 w-3.5" /> {tr(L.next)}
                  </p>
                </div>
              )}

              <div className="flex justify-end">
                <Button variant="outline" size="sm" disabled={reading === selected} onClick={() => analyze(selected)}>
                  {reading === selected ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
                  {tr(L.reread)}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </main>
  );
}
