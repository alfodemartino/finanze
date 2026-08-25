import type { ComponentProps, ReactNode } from "react";
import { NavLink } from "@/components/NavLink";

/**
 * Il riquadro delle liste raggruppate di iOS: il titolo sta fuori, in piccolo e
 * in grigio, e il contenuto dentro un rettangolo arrotondato. `flush` toglie il
 * margine interno alle card che contengono un elenco, così le righe e i loro
 * separatori arrivano fino al bordo come nelle impostazioni di sistema.
 */
export function Card({
  title,
  description,
  actions,
  flush = false,
  children,
  className = "",
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  flush?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  return (
    // `flex-col` più `flex-1` sul riquadro: nelle griglie le card affiancate
    // finiscono alla stessa altezza anche con testi di lunghezza diversa.
    <section className={`flex h-full flex-col ${className}`}>
      {(title || actions) && (
        <header className="mb-2 flex flex-wrap items-end justify-between gap-3 px-1">
          <div>
            {title && <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>}
            {description && (
              <p className="mt-0.5 text-[13px] text-label-secondary">{description}</p>
            )}
          </div>
          {actions}
        </header>
      )}
      <div
        className={`flex-1 overflow-hidden rounded-card bg-surface ${flush ? "" : "p-4 sm:p-5"}`}
      >
        {children}
      </div>
    </section>
  );
}

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-control font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:active:scale-100";

/*
 * I pulsanti di iOS non cambiano colore quando li premi: si schiariscono. Da
 * qui l'opacità al posto di una seconda tinta per gli stati.
 */
const buttonVariants = {
  primary: "bg-tint text-white hover:opacity-90 active:opacity-80",
  secondary: "bg-fill text-tint hover:bg-fill-strong",
  ghost: "text-tint hover:bg-fill",
  danger: "text-negative hover:bg-negative/10",
} as const;

const buttonSizes = {
  /* 44 px di altezza: il bersaglio minimo per un dito, secondo Apple. */
  md: "min-h-11 px-4 py-2.5 text-[15px]",
  sm: "px-3 py-1.5 text-[13px]",
} as const;

export type ButtonVariant = keyof typeof buttonVariants;
export type ButtonSize = keyof typeof buttonSizes;

export function buttonClass(variant: ButtonVariant = "primary", extra = "", size: ButtonSize = "md") {
  return `${buttonBase} ${buttonSizes[size]} ${buttonVariants[variant]} ${extra}`;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<typeof NavLink> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <NavLink className={buttonClass(variant, className, size)} {...props} />;
}

export function Field({
  label,
  hint,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-label-secondary">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[12px] text-label-secondary">{hint}</span>}
    </label>
  );
}

/*
 * I campi di iOS non hanno un bordo: hanno un fondo grigio appena accennato.
 * Il bordo trasparente serve solo a non far ballare il campo quando il fuoco
 * lo colora. 16 px di testo perché sotto, su iPhone, Safari ingrandisce la
 * pagina al primo tocco.
 */
export const inputClass =
  "w-full rounded-control border border-transparent bg-fill px-3.5 py-2.5 text-base text-label outline-none placeholder:text-label-tertiary focus:border-tint focus:ring-2 focus:ring-tint/25";

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function Select(props: ComponentProps<"select">) {
  return <select {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function Alert({ tone, children }: { tone: "error" | "success" | "info"; children: ReactNode }) {
  const tones = {
    error: "bg-negative/10 text-negative",
    success: "bg-positive/10 text-positive",
    info: "bg-fill text-label-secondary",
  } as const;

  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-control px-3.5 py-2.5 text-[13px] font-medium ${tones[tone]}`}
    >
      {children}
    </p>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="px-4 py-10 text-center text-[15px] text-label-secondary">{children}</p>
  );
}

/** Il segno «›» che su iOS chiude ogni riga che porta da qualche parte. */
export function Chevron({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`size-3.5 shrink-0 text-label-tertiary ${className}`}
    >
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

/** Importo colorato: verde se in credito, rosso se in debito. */
export function Money({ cents, formatted }: { cents: number; formatted: string }) {
  const tone =
    cents > 0 ? "text-positive" : cents < 0 ? "text-negative" : "text-label-secondary";
  return <span className={`font-semibold tabular-nums ${tone}`}>{formatted}</span>;
}
