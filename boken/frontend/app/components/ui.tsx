"use client";
import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { Search, X } from "lucide-react";

type ButtonVariant = "primary" | "seal" | "outline" | "ghost";

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary: "bg-ink text-paper hover:bg-ink/90",
  seal: "bg-seal text-sheet hover:bg-seal/90",
  outline: "border border-line bg-sheet text-ink hover:border-ink/40",
  ghost: "text-ink hover:bg-ink/[0.06]",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", icon, className = "", children, ...props },
  ref
) {
  const sizes = {
    sm: "h-9 px-3.5 text-[13px] gap-1.5",
    md: "h-11 px-5 text-sm gap-2",
    lg: "h-12 px-6 text-[15px] gap-2",
  };
  return (
    <button
      ref={ref}
      className={`inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full font-semibold transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 ${sizes[size]} ${BUTTON_STYLES[variant]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
});

export function Field({
  label,
  hint,
  htmlFor,
  children,
  className = "",
}: {
  label: string;
  hint?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-semibold">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search",
  className = "",
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-full border border-line bg-sheet pl-11 pr-11 text-[15px] placeholder:text-muted/80 transition-colors hover:border-ink/40 focus:border-ink focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-ink/[0.06] hover:text-ink"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full border border-line bg-sheet p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
            value === option.value ? "bg-ink text-paper" : "text-muted hover:text-ink"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-line pb-5">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="display text-[2.6rem] sm:text-6xl">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-panel border border-dashed border-line px-6 py-16 text-center">
      <div className="halftone halftone-fade pointer-events-none absolute inset-0 text-ink/10" />
      <div className="relative">
        <p className="text-lg font-semibold">{title}</p>
        {body && <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">{body}</p>}
        {action && <div className="mt-6 flex justify-center">{action}</div>}
      </div>
    </div>
  );
}

export function ShelfSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[3/4] rounded-[10px] bg-ink/[0.07]" />
          <div className="mt-3 h-4 w-4/5 rounded bg-ink/[0.07]" />
          <div className="mt-2 h-3 w-1/2 rounded bg-ink/[0.05]" />
        </div>
      ))}
    </div>
  );
}

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}
