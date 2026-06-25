import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  variant = "default",
}: {
  className?: string;
  children: React.ReactNode;
  variant?: "default" | "elevated" | "ghost";
}) {
  const variants = {
    default:
      "rounded-2xl border border-border bg-card shadow-soft",
    elevated:
      "rounded-2xl border border-border/50 bg-card shadow-elevated",
    ghost: "rounded-2xl bg-muted/40",
  };

  return (
    <div className={cn(variants[variant], "p-6", className)}>{children}</div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div className="flex gap-3">
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary">
            {icon}
          </div>
        )}
        <div>
          <h2 className="font-display text-lg text-foreground">{title}</h2>
          {description && (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}
