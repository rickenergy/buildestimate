"use client";

import { useState, useTransition } from "react";
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
import { useDict } from "@/components/providers";
import { LANGUAGES } from "@/lib/i18n";
import { updateProfile, signOut } from "@/app/actions/profile";
import { LogOut, BookOpen } from "lucide-react";
import Link from "next/link";
import type { Profile } from "@/lib/types";

export function SettingsForm({ profile, email }: { profile: Profile; email: string }) {
  const t = useDict();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    full_name: profile.full_name ?? "",
    company_name: profile.company_name ?? "",
    phone: profile.phone ?? "",
    language: (profile.language ?? "en") as string,
    overhead_pct: String(profile.overhead_pct ?? 10),
    profit_pct: String(profile.profit_pct ?? 20),
    tax_pct: String(profile.tax_pct ?? 0),
    min_margin_pct: String(profile.min_margin_pct ?? 15),
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function save() {
    startTransition(async () => {
      await updateProfile({
        full_name: form.full_name,
        company_name: form.company_name,
        phone: form.phone,
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
      <h1 className="text-xl font-bold">{t.settings.title}</h1>
      <p className="text-xs text-muted-foreground">{email}</p>

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
