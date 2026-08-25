"use client";

import { useEffect, useState } from "react";
import { parseStoredTheme, THEME_STORAGE_KEY, type Theme } from "@/lib/theme";

const options: { value: Theme; label: string; icon: React.ReactNode }[] = [
  {
    value: "light",
    label: "Chiaro",
    icon: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    ),
  },
  {
    value: "dark",
    label: "Scuro",
    icon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  },
  {
    value: "system",
    label: "Sistema",
    icon: (
      <>
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8m-4-4v4" />
      </>
    ),
  },
];

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

export function ThemeToggle() {
  // Il server non conosce la scelta dell'utente: parte da "system" e si allinea
  // dopo il mount, quando localStorage è leggibile.
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    try {
      setTheme(parseStoredTheme(localStorage.getItem(THEME_STORAGE_KEY)));
    } catch {
      // Storage non disponibile (modalità privata): resta "system".
    }
  }, []);

  function choose(next: Theme) {
    setTheme(next);
    applyTheme(next);
    try {
      if (next === "system") localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // La scelta vale comunque per questa sessione.
    }
  }

  return (
    <div
      role="group"
      aria-label="Tema"
      className="inline-flex items-center rounded-lg border border-slate-300 p-0.5 dark:border-slate-700"
    >
      {options.map((option) => {
        const active = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => choose(option.value)}
            aria-pressed={active}
            title={option.label}
            className={`rounded-md p-1.5 transition ${
              active
                ? "bg-slate-100 text-emerald-600 dark:bg-slate-800 dark:text-emerald-400"
                : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="size-4"
            >
              {option.icon}
            </svg>
            <span className="sr-only">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
