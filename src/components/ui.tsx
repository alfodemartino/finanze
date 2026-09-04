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

/**
 * Il rettangolo grigio che tiene il posto di un dato mentre il server lo
 * prepara: stessa forma e stessa altezza del testo che sostituirà, così quando
 * il contenuto arriva la pagina non salta. Pulsa piano per dire che sta
 * lavorando, e sta fermo per chi ha chiesto meno animazioni.
 *
 * È decorativo: l'attesa la annuncia `SkeletonPage`, non i singoli blocchi.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`block animate-pulse rounded-md bg-fill motion-reduce:animate-none ${className}`}
    />
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

/**
 * Il simbolo dell'app: un euro che una fessura diagonale divide in due, cioè la
 * spesa divisa. Il tratto è `currentColor`, così prende il colore di chi lo
 * contiene ed è giusto sia in chiaro sia in scuro.
 *
 * La fessura separa le due metà senza scostarle: il simbolo resta un euro anche
 * quando è piccolo. Il bianco e il nero della maschera non sono colori che si
 * vedono — dicono solo cosa resta e cosa viene tolto — quindi non passano dai
 * token del tema. Il riquadro arrotondato per la scheda del browser è invece in
 * `src/app/icon.svg`.
 */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={`size-6 shrink-0 ${className}`}>
      <mask id="logo-fessura" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
        <rect width="64" height="64" fill="#fff" />
        <path d="M28.6-6 40.6 70 37 70 25-6Z" fill="#000" />
      </mask>
      <g
        mask="url(#logo-fessura)"
        fill="none"
        stroke="currentColor"
        strokeWidth="6.5"
        strokeLinecap="round"
      >
        <path d="M46.6 18.2A19.4 19.4 0 1 0 46.6 45.8" />
        <path d="M11.5 27H41" />
        <path d="M11.5 38H41" />
      </g>
    </svg>
  );
}

/** Importo colorato: verde se in credito, rosso se in debito. */
export function Money({ cents, formatted }: { cents: number; formatted: string }) {
  const tone =
    cents > 0 ? "text-positive" : cents < 0 ? "text-negative" : "text-label-secondary";
  return <span className={`font-semibold tabular-nums ${tone}`}>{formatted}</span>;
}
