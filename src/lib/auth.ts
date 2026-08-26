import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { avvisaBenvenuto } from "@/lib/mail/notify";
import { credentialsSchema } from "@/lib/validation";

const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "Email e password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(raw) {
      const parsed = credentialsSchema.safeParse(raw);
      if (!parsed.success) return null;

      const { email, password } = parsed.data;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user?.passwordHash) return null;

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return null;

      return { id: user.id, name: user.name, email: user.email, image: user.image };
    },
  }),
];

// Il login con Google si attiva da solo se le credenziali sono configurate.
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  // Dietro il proxy di Vercel l'host arriva negli header inoltrati: senza
  // questo Auth.js rifiuta ogni richiesta con UntrustedHost, e login e
  // registrazione falliscono. Vale per qualunque dominio del progetto
  // (produzione, anteprime, dominio personalizzato) senza doverlo elencare.
  trustHost: true,
  providers,
  events: {
    /**
     * Scatta quando è l'adapter a creare l'utente, cioè al primo accesso con
     * Google: chi si registra con email e password passa da `registerAction`,
     * che crea l'utente da sé e manda il benvenuto per conto suo. Le due
     * strade non si incrociano, quindi nessuno riceve la mail due volte.
     */
    async createUser({ user }) {
      if (user.email) await avvisaBenvenuto({ email: user.email, nome: user.name });
    },
  },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub && session.user) session.user.id = token.sub;
      return session;
    },
  },
});

/** Utente della richiesta corrente, oppure `null` se non autenticato. */
export async function currentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return { id: session.user.id, name: session.user.name, email: session.user.email };
}
