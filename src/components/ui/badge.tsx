import { cn } from "@/lib/utils";
import type { VehicleStatus } from "@/types/database";
import { STATUS_LABELS } from "@/types/database";

const statusStyles: Record<VehicleStatus, string> = {
  draft: "bg-slate-100 text-slate-600 ring-slate-200",
  analyzing: "bg-amber-50 text-amber-700 ring-amber-200",
  ready: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  published: "bg-blue-50 text-blue-700 ring-blue-200",
};

export function Badge({
  status,
  className,
}: {
  status: VehicleStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase ring-1 ring-inset",
        statusStyles[status],
        className
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        {icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/5 text-primary">
            {icon}
          </div>
        )}
      </div>
      <p className="mt-2 font-display text-2xl text-foreground">{value}</p>
      {sub && (
        <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
      )}
    </div>
  );
}
