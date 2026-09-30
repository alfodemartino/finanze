import { z } from "zod";
import { CATEGORY_IDS, keywordKey } from "@/lib/categories";

export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email("Indirizzo email non valido."),
  password: z.string().min(8, "La password deve avere almeno 8 caratteri."),
});

export const registerSchema = credentialsSchema.extend({
  name: z.string().trim().min(1, "Il nome è obbligatorio.").max(60),
});

export const groupSchema = z.object({
  name: z.string().trim().min(1, "Dai un nome al gruppo.").max(60),
  currency: z.string().trim().length(3).toUpperCase().default("EUR"),
});

/**
 * Una casella di spunta non compare affatto nei dati del form quando è
 * vuota, e vale `"on"` quando è spuntata: `null` e `undefined` sono quindi
 * un «no», non un dato mancante.
 */
const checkboxSchema = z.preprocess((value) => value === "on" || value === "true", z.boolean());

export const memberSchema = z.object({
  name: z.string().trim().min(1, "Il nome del membro è obbligatorio.").max(60),
  shareWeight: z.coerce
    .number()
    .int("La quota deve essere un numero intero.")
    .min(0, "La quota non può essere negativa.")
    .max(1000, "La quota massima è 1000."),
  defaultSelected: checkboxSchema,
});

export const inviteCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{6,10}$/, "Codice di invito non valido.");

export const splitModeSchema = z.enum(["EQUAL", "SHARES", "EXACT"]);

/**
 * La categoria scelta nel form: vuota vuol dire «senza categoria» (`null`),
 * che è una scelta valida quanto le altre.
 */
export const categoryFieldSchema = z.union([
  z.literal("").transform(() => null),
  z.enum(CATEGORY_IDS),
]);

/**
 * Una parola chiave scritta dal proprietario del gruppo, già nella forma in cui
 * si salva (`keywordKey`). Due lettere almeno, tre con l'asterisco: «a*»
 * troverebbe mezzo vocabolario.
 */
export const keywordSchema = z
  .string()
  .max(60, "La parola chiave è troppo lunga.")
  .transform(keywordKey)
  .refine((key) => key.length > 0, "Scrivi una parola chiave.")
  .refine((key) => key.replace(/\*$/, "").length <= 40, "La parola chiave è troppo lunga.")
  .refine(
    (key) => key.replace(/\*$/, "").length >= (key.endsWith("*") ? 3 : 2),
    "La parola chiave è troppo corta.",
  );
