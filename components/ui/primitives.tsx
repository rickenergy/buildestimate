import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Shared design-system primitives — Salesforce-mobile CRM look.
 * Server-safe (pure presentational). Compose these across every screen
 * so density, elevation, and motion stay consistent.
 */

/** Screen content container: centered column, consistent gutters, entrance cascade. */
export function PageBody({
  className,
  animate = true,
  children,
  ...props
}: React.ComponentProps<"div"> & { animate?: boolean }) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-2xl space-y-4 px-4 pb-6 pt-4",
        animate && "animate-fade-up",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** Salesforce-style record header band: brand wash, avatar icon, title + meta. */
export function RecordHighlight({
  icon,
  title,
  subtitle,
  meta,
  action,
  className,
}: {
  icon: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "surface-brand flex items-center gap-3 rounded-3xl p-4 shadow-sm ring-1 ring-foreground/5",
        className
      )}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-bold leading-tight">{title}</h1>
        {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
        {meta}
      </div>
      {action}
    </div>
  );
}

/** Accent palette for stat tiles — icon chip tint + value color (light+dark). */
export type Accent = "emerald" | "blue" | "amber" | "violet" | "rose" | "primary";

const ACCENT: Record<Accent, { chip: string; value: string }> = {
  emerald: { chip: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", value: "text-emerald-600 dark:text-emerald-400" },
  blue: { chip: "bg-blue-500/15 text-blue-600 dark:text-blue-400", value: "text-blue-600 dark:text-blue-400" },
  amber: { chip: "bg-amber-500/15 text-amber-600 dark:text-amber-400", value: "text-amber-600 dark:text-amber-400" },
  violet: { chip: "bg-violet-500/15 text-violet-600 dark:text-violet-400", value: "text-violet-600 dark:text-violet-400" },
  rose: { chip: "bg-rose-500/15 text-rose-600 dark:text-rose-400", value: "text-rose-600 dark:text-rose-400" },
  primary: { chip: "bg-primary/15 text-primary", value: "text-foreground" },
};

/**
 * Moxtra-style metric tile: colored icon chip, giant bold value, uppercase
 * label. `accent` tints the chip; `colorValue` also tints the number.
 */
export function StatTile({
  icon,
  label,
  value,
  trailing,
  danger,
  accent = "primary",
  colorValue = false,
  className,
  style,
}: {
  icon?: React.ReactNode;
  label: React.ReactNode;
  value: React.ReactNode;
  trailing?: React.ReactNode;
  danger?: boolean;
  accent?: Accent;
  colorValue?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const a = ACCENT[accent];
  return (
    <div
      style={style}
      className={cn(
        "animate-fade-up press flex flex-col gap-2 rounded-2xl bg-card p-3.5 shadow-sm ring-1 ring-foreground/10",
        className
      )}
    >
      <div className="flex items-center justify-between">
        {icon && (
          <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl", a.chip)}>
            {icon}
          </span>
        )}
        {trailing}
      </div>
      <span
        className={cn(
          "truncate text-2xl font-bold leading-none tracking-tight",
          colorValue && !danger && a.value,
          danger && "text-destructive"
        )}
      >
        {value}
      </span>
      <span className="flex items-center gap-1 truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

/** Uppercase section heading used above lists/groups. */
export function SectionLabel({
  className,
  children,
  action,
}: {
  className?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-center justify-between px-1", className)}>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {children}
      </h2>
      {action}
    </div>
  );
}

/** Pressable list row card — the standard tappable record in a list. */
export function ListRow({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "press flex items-center gap-3 rounded-2xl bg-card p-3 shadow-xs ring-1 ring-foreground/10 hover:shadow-sm active:bg-accent",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
