import {
  Baby,
  Car,
  Cigarette,
  Gift,
  GraduationCap,
  HandHeart,
  HeartPulse,
  House,
  Landmark,
  Laptop,
  PawPrint,
  Plane,
  Shapes,
  Shirt,
  ShoppingCart,
  Sparkles,
  Tag,
  Ticket,
  UtensilsCrossed,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { ExpenseCategory } from "@/lib/categories";

/*
 * Glifo e colore di ogni categoria. Le classi sono scritte per intero perché
 * Tailwind genera solo quelle che trova nel sorgente: `bg-category-${id}`
 * composta al volo non esisterebbe nel foglio di stile.
 */
const appearance: Record<ExpenseCategory, { Icon: LucideIcon; background: string }> = {
  GROCERIES: { Icon: ShoppingCart, background: "bg-category-groceries" },
  RESTAURANTS: { Icon: UtensilsCrossed, background: "bg-category-restaurants" },
  HOME: { Icon: House, background: "bg-category-home" },
  UTILITIES: { Icon: Zap, background: "bg-category-utilities" },
  TRANSPORT: { Icon: Car, background: "bg-category-transport" },
  TRAVEL: { Icon: Plane, background: "bg-category-travel" },
  HEALTH: { Icon: HeartPulse, background: "bg-category-health" },
  LEISURE: { Icon: Ticket, background: "bg-category-leisure" },
  CLOTHING: { Icon: Shirt, background: "bg-category-clothing" },
  EDUCATION: { Icon: GraduationCap, background: "bg-category-education" },
  PETS: { Icon: PawPrint, background: "bg-category-pets" },
  GIFTS: { Icon: Gift, background: "bg-category-gifts" },
  TAXES: { Icon: Landmark, background: "bg-category-taxes" },
  SMOKING: { Icon: Cigarette, background: "bg-category-smoking" },
  CHILDREN: { Icon: Baby, background: "bg-category-children" },
  PERSONAL_CARE: { Icon: Sparkles, background: "bg-category-personal-care" },
  TECHNOLOGY: { Icon: Laptop, background: "bg-category-technology" },
  CHARITY: { Icon: HandHeart, background: "bg-category-charity" },
  OTHER: { Icon: Shapes, background: "bg-category-other" },
};

/**
 * Il fondo del colore di una categoria, per chi lo usa fuori dall'icona: le
 * barre dei totali. Senza categoria è il grigio delle etichette secondarie, che
 * a differenza del `bg-fill` del cerchio si vede anche come barra sottile.
 */
export function categoryBackground(category: ExpenseCategory | null) {
  return category ? appearance[category].background : "bg-label-secondary";
}

const sizes = {
  /* Accanto a una riga dello storico: alta quanto la descrizione e i dettagli. */
  md: { circle: "size-9", glyph: "size-[18px]" },
  /* Dentro un campo del form. */
  sm: { circle: "size-6", glyph: "size-3.5" },
} as const;

/**
 * L'icona di una categoria alla maniera dei Promemoria di iOS: glifo bianco su
 * un cerchio del colore della categoria. È l'unico posto dell'app dove i colori
 * non seguono la regola «blu per ciò che si tocca, verde e rosso per il
 * denaro»: servono a riconoscere la categoria a colpo d'occhio.
 *
 * È decorativa: accanto c'è sempre il nome della categoria, che è quello che
 * legge un lettore di schermo. Senza categoria il cerchio resta neutro.
 */
export function CategoryIcon({
  category,
  size = "md",
  className = "",
}: {
  category: ExpenseCategory | null;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const { Icon, background } = category
    ? appearance[category]
    : { Icon: Tag, background: "bg-fill" };
  const { circle, glyph } = sizes[size];

  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${circle} ${background} ${
        category ? "text-white" : "text-label-secondary"
      } ${className}`}
    >
      <Icon className={glyph} strokeWidth={2.25} />
    </span>
  );
}
