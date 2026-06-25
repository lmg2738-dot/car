import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center shadow-soft",
        className
      )}
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-muted to-muted/50">
        {icon}
      </div>
      <h2 className="mt-6 font-display text-xl text-foreground">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}
