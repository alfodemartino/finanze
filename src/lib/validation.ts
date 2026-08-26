import { z } from "zod";

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

export const memberSchema = z.object({
  name: z.string().trim().min(1, "Il nome del membro è obbligatorio.").max(60),
  shareWeight: z.coerce
    .number()
    .int("La quota deve essere un numero intero.")
    .min(0, "La quota non può essere negativa.")
    .max(1000, "La quota massima è 1000."),
});

export const inviteCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{6,10}$/, "Codice di invito non valido.");

export const splitModeSchema = z.enum(["EQUAL", "SHARES", "EXACT"]);
