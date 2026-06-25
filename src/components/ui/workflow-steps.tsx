import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

type Step = {
  id: string;
  label: string;
  description?: string;
  done: boolean;
  current?: boolean;
};

export function WorkflowSteps({ steps }: { steps: Step[] }) {
  return (
    <div className="mb-8 overflow-x-auto">
      <div className="flex min-w-max items-center gap-0">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-all",
                  step.done
                    ? "bg-success text-white"
                    : step.current
                      ? "bg-primary text-white ring-4 ring-primary/20"
                      : "bg-muted text-muted-foreground"
                )}
              >
                {step.done ? (
                  <Check className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>
              <div className="hidden sm:block">
                <p
                  className={cn(
                    "text-sm font-medium",
                    step.current ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-xs text-muted-foreground">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "mx-4 h-px w-12 sm:w-20",
                  step.done ? "bg-success" : "bg-border"
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
