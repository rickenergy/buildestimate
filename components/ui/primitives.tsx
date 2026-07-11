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

/** Metric tile: icon row (+optional trend/badge), big value, uppercase label. */
export function StatTile({
  icon,
  label,
  value,
  trailing,
  danger,
  className,
  style,
}: {
  icon?: React.ReactNode;
  label: React.ReactNode;
  value: React.ReactNode;
  trailing?: React.ReactNode;
  danger?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className={cn(
        "animate-fade-up flex flex-col gap-1 rounded-2xl bg-card p-3 shadow-xs ring-1 ring-foreground/10",
        className
      )}
    >
      {(icon || trailing) && (
        <div className="flex items-center justify-between">
          {icon}
          {trailing}
        </div>
      )}
      <span className={cn("truncate text-lg font-bold leading-tight", danger && "text-destructive")}>
        {value}
      </span>
      <span className="flex items-center gap-1 truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
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
