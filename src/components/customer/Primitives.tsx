"use client";

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  useId,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  RotateCcw,
  XCircle,
} from "lucide-react";

export function LuxurySurface({
  className = "",
  as: Tag = "section",
  children,
  ...rest
}: HTMLAttributes<HTMLElement> & { as?: "section" | "div" | "article" }) {
  return (
    <Tag className={`rounded-3xl border border-border-subtle bg-surface-1 p-5 sm:p-6 ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
  fullWidth?: boolean;
};

export const PrimaryAction = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", loading, fullWidth, className = "", children, disabled, ...rest }, ref) => {
    const base = "inline-flex h-12 min-w-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-medium transition-all duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-50";
    const styles = variant === "primary"
      ? "gradient-primary text-white shadow-[0_10px_30px_-12px_rgba(139,53,232,0.7)] hover:brightness-110 active:scale-[0.99]"
      : variant === "secondary"
        ? "surface-2 text-text-primary border border-border-subtle hover:border-border-strong"
        : "text-text-secondary hover:bg-surface-1 hover:text-text-primary";
    return (
      <button ref={ref} disabled={disabled || loading} aria-busy={loading || undefined} className={`${base} ${styles} ${fullWidth ? "w-full" : ""} ${className}`} {...rest}>
        {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {children}
      </button>
    );
  },
);
PrimaryAction.displayName = "PrimaryAction";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
  trailing?: ReactNode;
};

export const Field = forwardRef<HTMLInputElement, FieldProps>(
  ({ label, hint, error, trailing, id, className = "", ...rest }, ref) => {
    const generatedId = useId();
    const inputId = id ?? `field-${generatedId.replace(/:/g, "")}`;
    const hintId = `${inputId}-hint`;
    const errorId = `${inputId}-error`;
    return (
      <div className="space-y-1.5">
        <label htmlFor={inputId} className="block text-xs font-medium uppercase tracking-[0.12em] text-text-muted">{label}</label>
        <div className={`flex items-center gap-2 rounded-2xl border bg-surface-2 px-3.5 transition-colors focus-within:border-accent-violet ${error ? "border-danger" : "border-border-subtle"}`}>
          <input ref={ref} id={inputId} aria-invalid={!!error || undefined} aria-describedby={error ? errorId : hint ? hintId : undefined} className={`h-12 min-w-0 flex-1 bg-transparent text-[15px] text-text-primary outline-none placeholder:text-text-muted ${className}`} {...rest} />
          {trailing}
        </div>
        {error ? <p id={errorId} role="alert" className="flex items-center gap-1.5 text-xs text-danger"><AlertCircle className="size-3.5" aria-hidden />{error}</p> : hint ? <p id={hintId} className="text-xs text-text-muted">{hint}</p> : null}
      </div>
    );
  },
);
Field.displayName = "Field";

export type Status = "pending" | "processing" | "accepted" | "completed" | "failed" | "rejected" | "refunded" | "available" | "unavailable" | "claimed";

export function StatusBadge({ status }: { status: Status | string }) {
  const normalized = status.toLowerCase();
  const map: Record<string, { Icon: typeof Clock; label: string; tone: string }> = {
    completed: { Icon: CheckCircle2, label: "Completed", tone: "text-success" },
    accepted: { Icon: CheckCircle2, label: "Accepted", tone: "text-success" },
    available: { Icon: CheckCircle2, label: "Available", tone: "text-success" },
    claimed: { Icon: CheckCircle2, label: "Claimed", tone: "text-text-secondary" },
    pending: { Icon: Clock, label: "Pending", tone: "text-warning" },
    processing: { Icon: Clock, label: "Processing", tone: "text-warning" },
    failed: { Icon: XCircle, label: "Failed", tone: "text-danger" },
    rejected: { Icon: XCircle, label: "Rejected", tone: "text-danger" },
    unavailable: { Icon: AlertCircle, label: "Unavailable", tone: "text-text-muted" },
    refunded: { Icon: RotateCcw, label: "Refunded", tone: "text-text-secondary" },
  };
  const item = map[normalized] ?? { Icon: Clock, label: status || "Pending", tone: "text-text-secondary" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface-2 px-2.5 py-1 text-xs ${item.tone}`}>
      <item.Icon className="size-3.5" aria-hidden />
      <span className="text-text-secondary">{item.label}</span>
    </span>
  );
}

export function SkeletonSurface({ className = "", rounded = "rounded-3xl" }: { className?: string; rounded?: string }) {
  return <div aria-hidden className={`animate-pulse surface-2 ${rounded} ${className}`} />;
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: React.ComponentType<{ className?: string }>; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border-subtle bg-surface-1 px-6 py-12 text-center">
      <div className="grid size-12 place-items-center rounded-2xl surface-2 text-text-secondary"><Icon className="size-5" /></div>
      <h3 className="mt-4 text-base font-medium text-text-primary">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-text-secondary">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", description = "We couldn't load this just now.", onRetry }: { title?: string; description?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center rounded-3xl border border-border-subtle bg-surface-1 px-6 py-12 text-center">
      <div className="grid size-12 place-items-center rounded-2xl bg-[rgba(255,116,127,0.12)] text-danger"><AlertCircle className="size-5" aria-hidden /></div>
      <h3 className="mt-4 text-base font-medium text-text-primary">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-text-secondary">{description}</p>
      {onRetry && <PrimaryAction variant="secondary" className="mt-5" onClick={onRetry}><RotateCcw className="size-4" aria-hidden /> Try again</PrimaryAction>}
    </div>
  );
}
