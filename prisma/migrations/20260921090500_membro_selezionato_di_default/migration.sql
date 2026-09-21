-- AlterTable
-- I membri già esistenti restano selezionati: prima di questa colonna la
-- nuova spesa li spuntava tutti, e l'aggiornamento non deve cambiare
-- l'abitudine di chi usa già l'app.
ALTER TABLE "Member" ADD COLUMN     "defaultSelected" BOOLEAN NOT NULL DEFAULT true;
