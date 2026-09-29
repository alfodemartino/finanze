-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('GROCERIES', 'RESTAURANTS', 'HOME', 'UTILITIES', 'TRANSPORT', 'TRAVEL', 'HEALTH', 'LEISURE', 'CLOTHING', 'EDUCATION', 'PETS', 'GIFTS', 'TAXES', 'OTHER');

-- AlterTable
-- La colonna nasce vuota: le spese già registrate restano «senza categoria».
-- Non le categorizza la migrazione, perché le regole del riconoscimento stanno
-- nel codice (`src/lib/categories.ts`) e ricopiarle qui in SQL vorrebbe dire
-- tenerne due versioni: lo fa il pulsante «Categorizza» nello storico.
ALTER TABLE "Expense" ADD COLUMN     "category" "ExpenseCategory";
