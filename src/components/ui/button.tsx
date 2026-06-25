import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "accent" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const variants = {
      primary:
        "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md",
      accent:
        "bg-gradient-to-r from-gold to-gold-dark text-[#1a1508] shadow-sm hover:brightness-105 hover:shadow-md",
      secondary: "bg-foreground text-white hover:bg-foreground/90",
      outline:
        "border border-border bg-card text-foreground hover:border-primary/30 hover:bg-muted/50",
      ghost: "text-foreground/70 hover:bg-muted hover:text-foreground",
      danger: "bg-red-600 text-white hover:bg-red-700",
    };

    const sizes = {
      sm: "h-8 px-3.5 text-xs rounded-lg",
      md: "h-10 px-5 text-sm rounded-xl",
      lg: "h-12 px-7 text-base rounded-xl",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
