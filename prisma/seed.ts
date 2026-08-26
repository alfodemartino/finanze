/**
 * Dati di esempio per lo sviluppo.
 *
 *   npm run db:seed
 *
 * Crea una famiglia con tre membri, qualche spesa e un rimborso, così
 * l'applicazione ha subito qualcosa da mostrare.
 */
import { hashPassword } from "../src/lib/password";
import { prisma } from "../src/lib/db";
import { computeSplits } from "../src/lib/split";
import { deleteGroupCascade } from "../src/lib/groups";

const DEMO_EMAIL = "demo@finanze.local";
const DEMO_PASSWORD = "password123";

async function main() {
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { passwordHash },
    create: { email: DEMO_EMAIL, name: "Anna", passwordHash },
  });

  // Si riparte da zero a ogni seed, per avere sempre lo stesso scenario.
  // Serve la cascata ordinata: cancellare il gruppo e basta si scontra con i
  // vincoli verso `Member`, e dal secondo seed in poi non ripartiva niente.
  const precedente = await prisma.group.findUnique({ where: { inviteCode: "DEMO123" } });
  if (precedente) await deleteGroupCascade(precedente.id);

  const group = await prisma.group.create({
    data: {
      name: "Casa Demo",
      currency: "EUR",
      inviteCode: "DEMO123",
      members: {
        create: [
          { userId: user.id, name: "Anna", role: "OWNER", shareWeight: 60 },
          { name: "Bruno", shareWeight: 40 },
          { name: "Carla", shareWeight: 100 },
        ],
      },
    },
    include: { members: true },
  });

  const byName = new Map(group.members.map((member) => [member.name, member]));
  const anna = byName.get("Anna")!;
  const bruno = byName.get("Bruno")!;
  const carla = byName.get("Carla")!;

  const expenses = [
    {
      description: "Spesa supermercato",
      amountCents: 8450,
      payerId: anna.id,
      splitMode: "EQUAL" as const,
      participants: [anna, bruno, carla],
    },
    {
      description: "Bolletta luce",
      amountCents: 12000,
      payerId: bruno.id,
      splitMode: "SHARES" as const,
      participants: [anna, bruno],
    },
    {
      description: "Cena fuori",
      amountCents: 6000,
      payerId: carla.id,
      splitMode: "EQUAL" as const,
      participants: [anna, bruno, carla],
    },
  ];

  for (const expense of expenses) {
    const splits = computeSplits(
      expense.amountCents,
      expense.splitMode,
      expense.participants.map((member) => ({
        memberId: member.id,
        shareWeight: member.shareWeight,
      })),
    );

    await prisma.expense.create({
      data: {
        groupId: group.id,
        description: expense.description,
        amountCents: expense.amountCents,
        splitMode: expense.splitMode,
        payerId: expense.payerId,
        splits: { createMany: { data: splits } },
      },
    });
  }

  await prisma.settlement.create({
    data: {
      groupId: group.id,
      fromMemberId: carla.id,
      toMemberId: anna.id,
      amountCents: 1000,
      note: "Acconto",
    },
  });

  console.log(`Gruppo "${group.name}" pronto.`);
  console.log(`Accedi con ${DEMO_EMAIL} / ${DEMO_PASSWORD} (codice invito: DEMO123).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
