import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

const fieldStyles =
  "flex w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none transition-all duration-200 placeholder:text-muted-foreground/60 hover:border-border focus:border-primary/40 focus:ring-4 focus:ring-primary/10";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(fieldStyles, "h-11", className)} {...props} />
));

Input.displayName = "Input";

export const Label = ({
  className,
  children,
  required,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) => (
  <label
    className={cn(
      "mb-2 block text-sm font-medium text-foreground/80",
      className
    )}
    {...props}
  >
    {children}
    {required && <span className="ml-0.5 text-gold">*</span>}
  </label>
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(fieldStyles, "min-h-[120px] resize-y", className)}
    {...props}
  />
));

Textarea.displayName = "Textarea";

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn(fieldStyles, "h-11", className)} {...props}>
    {children}
  </select>
));

Select.displayName = "Select";

export function FormField({
  label,
  required,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <Label required={required}>{label}</Label>
      {children}
      {hint && (
        <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
