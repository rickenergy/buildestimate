"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDict, useLang } from "@/components/providers";
import { LANGUAGES } from "@/lib/i18n";
import { updateProfile, signOut } from "@/app/actions/profile";
import { uploadBranding } from "@/lib/upload-client";
import { LogOut, BookOpen, Sun, Moon, ImagePlus, Loader2, Trash2, HardHat, Truck } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import type { Profile } from "@/lib/types";

const APPEARANCE = {
  title: { en: "Appearance", pt: "Aparência", es: "Apariencia" },
  light: { en: "Light", pt: "Claro", es: "Claro" },
  dark: { en: "Dark", pt: "Escuro", es: "Oscuro" },
} as const;

const NETWORK = {
  subs: { en: "Subcontractors", pt: "Subcontratados", es: "Subcontratistas" },
  suppliers: { en: "Suppliers", pt: "Fornecedores", es: "Proveedores" },
} as const;

const BRAND = {
  title: { en: "Brand", pt: "Marca", es: "Marca" },
  hint: {
    en: "Used on your proposal and PDF.",
    pt: "Usados na sua proposta e no PDF.",
    es: "Se usan en tu propuesta y PDF.",
  },
  logo: { en: "Logo", pt: "Logo", es: "Logo" },
  banner: { en: "Banner (wide)", pt: "Banner (retangular)", es: "Banner (ancho)" },
  add: { en: "Upload", pt: "Enviar", es: "Subir" },
  remove: { en: "Remove", pt: "Remover", es: "Quitar" },
  address: { en: "Company address", pt: "Endereço da empresa", es: "Dirección" },
  cEmail: { en: "Company email", pt: "Email da empresa", es: "Email" },
  license: { en: "License #", pt: "Nº da licença", es: "Nº de licencia" },
  uploaded: { en: "Image saved", pt: "Imagem salva", es: "Imagen guardada" },
  failed: { en: "Upload failed", pt: "Falha no envio", es: "Error al subir" },
} as const;

export function SettingsForm({ profile, email }: { profile: Profile; email: string }) {
  const t = useDict();
  const lang = useLang() as "en" | "pt" | "es";
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    full_name: profile.full_name ?? "",
    company_name: profile.company_name ?? "",
    phone: profile.phone ?? "",
    company_address: profile.company_address ?? "",
    company_email: profile.company_email ?? "",
    license_number: profile.license_number ?? "",
    language: (profile.language ?? "en") as string,
    overhead_pct: String(profile.overhead_pct ?? 10),
    profit_pct: String(profile.profit_pct ?? 20),
    tax_pct: String(profile.tax_pct ?? 0),
    min_margin_pct: String(profile.min_margin_pct ?? 15),
  });

  const [logoUrl, setLogoUrl] = useState(profile.logo_url);
  const [bannerUrl, setBannerUrl] = useState(profile.banner_url);
  const [uploading, setUploading] = useState<"logo" | "banner" | null>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const tr = (m: Record<"en" | "pt" | "es", string>) => m[lang] ?? m.en;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  /** Upload + persist immediately so branding survives without hitting Save. */
  async function pickBrand(kind: "logo" | "banner", file: File | undefined) {
    if (!file) return;
    setUploading(kind);
    try {
      const url = await uploadBranding(kind, file);
      await updateProfile(kind === "logo" ? { logo_url: url } : { banner_url: url });
      if (kind === "logo") setLogoUrl(url);
      else setBannerUrl(url);
      toast.success(tr(BRAND.uploaded));
      router.refresh();
    } catch {
      toast.error(tr(BRAND.failed));
    } finally {
      setUploading(null);
    }
  }

  function clearBrand(kind: "logo" | "banner") {
    startTransition(async () => {
      await updateProfile(kind === "logo" ? { logo_url: null } : { banner_url: null });
      if (kind === "logo") setLogoUrl(null);
      else setBannerUrl(null);
      router.refresh();
    });
  }

  function save() {
    startTransition(async () => {
      await updateProfile({
        full_name: form.full_name,
        company_name: form.company_name,
        phone: form.phone,
        company_address: form.company_address || null,
        company_email: form.company_email || null,
        license_number: form.license_number || null,
        language: form.language,
        overhead_pct: Number(form.overhead_pct) || 10,
        profit_pct: Number(form.profit_pct) || 20,
        tax_pct: Number(form.tax_pct) || 0,
        min_margin_pct: Number(form.min_margin_pct) || 15,
      });
      toast.success(t.settings.saved);
      router.refresh();
    });
  }

  return (
    <main className="flex flex-col gap-4 px-4 py-6">
      <header className="animate-fade-up">
        <h1 className="text-xl font-bold">{t.settings.title}</h1>
        <p className="text-xs text-muted-foreground">{email}</p>
      </header>

      <Card>
        <CardContent className="grid gap-3 p-4">
          <Field label={t.settings.yourName}>
            <Input value={form.full_name} onChange={set("full_name")} />
          </Field>
          <Field label={t.settings.company}>
            <Input value={form.company_name} onChange={set("company_name")} />
          </Field>
          <Field label={t.settings.phone}>
            <Input value={form.phone} onChange={set("phone")} type="tel" />
          </Field>
          <Field label={tr(BRAND.address)}>
            <Input value={form.company_address} onChange={set("company_address")} />
          </Field>
          <Field label={tr(BRAND.cEmail)}>
            <Input value={form.company_email} onChange={set("company_email")} type="email" />
          </Field>
          <Field label={tr(BRAND.license)}>
            <Input value={form.license_number} onChange={set("license_number")} />
          </Field>
          <Field label={t.settings.language}>
            <Select
              value={form.language}
              onValueChange={(v) => setForm((f) => ({ ...f, language: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      {/* Brand — logo + wide banner used on the proposal and PDF */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{tr(BRAND.title)}</CardTitle>
          <p className="text-xs text-muted-foreground">{tr(BRAND.hint)}</p>
        </CardHeader>
        <CardContent className="grid gap-4 p-4 pt-0">
          <input
            ref={logoInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              pickBrand("logo", e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <input
            ref={bannerInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              pickBrand("banner", e.target.files?.[0]);
              e.target.value = "";
            }}
          />

          {/* logo */}
          <div className="grid gap-1.5">
            <Label>{tr(BRAND.logo)}</Label>
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/10">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ImagePlus className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={uploading === "logo"}
                onClick={() => logoInput.current?.click()}
              >
                {uploading === "logo" ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="mr-1 h-4 w-4" />
                )}
                {tr(BRAND.add)}
              </Button>
              {logoUrl && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground"
                  aria-label={tr(BRAND.remove)}
                  onClick={() => clearBrand("logo")}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* banner */}
          <div className="grid gap-1.5">
            <Label>{tr(BRAND.banner)}</Label>
            <div className="flex h-24 w-full items-center justify-center overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/10">
              {bannerUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={bannerUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <ImagePlus className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="flex-1"
                disabled={uploading === "banner"}
                onClick={() => bannerInput.current?.click()}
              >
                {uploading === "banner" ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="mr-1 h-4 w-4" />
                )}
                {tr(BRAND.add)}
              </Button>
              {bannerUrl && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={() => clearBrand("banner")}
                >
                  <Trash2 className="mr-1 h-4 w-4" /> {tr(BRAND.remove)}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between gap-3 p-4">
          <span className="text-sm font-medium">{tr(APPEARANCE.title)}</span>
          <div className="inline-flex rounded-full bg-muted p-1">
            <button
              type="button"
              onClick={() => setTheme("light")}
              aria-pressed={mounted && theme !== "dark"}
              className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                mounted && theme !== "dark" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              <Sun className="h-3.5 w-3.5" /> {tr(APPEARANCE.light)}
            </button>
            <button
              type="button"
              onClick={() => setTheme("dark")}
              aria-pressed={mounted && theme === "dark"}
              className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                mounted && theme === "dark" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              <Moon className="h-3.5 w-3.5" /> {tr(APPEARANCE.dark)}
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t.settings.numbers}</CardTitle>
          <p className="text-xs text-muted-foreground">{t.settings.numbersHint}</p>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 p-4 pt-0">
          <Field label={t.settings.overhead}>
            <Input type="number" inputMode="decimal" value={form.overhead_pct} onChange={set("overhead_pct")} />
          </Field>
          <Field label={t.settings.profit}>
            <Input type="number" inputMode="decimal" value={form.profit_pct} onChange={set("profit_pct")} />
          </Field>
          <Field label={t.settings.tax}>
            <Input type="number" inputMode="decimal" value={form.tax_pct} onChange={set("tax_pct")} />
          </Field>
          <Field label={t.settings.minMargin}>
            <Input type="number" inputMode="decimal" value={form.min_margin_pct} onChange={set("min_margin_pct")} />
          </Field>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={pending} size="lg">
        {pending ? "…" : t.settings.save}
      </Button>

      <Button asChild variant="outline">
        <Link href="/prices">
          <BookOpen className="mr-1 h-4 w-4" /> {t.prices.title}
        </Link>
      </Button>

      <div className="grid grid-cols-2 gap-2">
        <Button asChild variant="outline">
          <Link href="/subcontractors">
            <HardHat className="mr-1 h-4 w-4" /> {tr(NETWORK.subs)}
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/suppliers">
            <Truck className="mr-1 h-4 w-4" /> {tr(NETWORK.suppliers)}
          </Link>
        </Button>
      </div>

      <Button variant="outline" onClick={() => signOut()}>
        <LogOut className="mr-1 h-4 w-4" /> {t.auth.signOut}
      </Button>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
