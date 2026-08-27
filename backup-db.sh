#!/usr/bin/env bash
#
# Copia giornaliera del database su questa macchina.
#
# Neon fa i suoi backup, ma vivono dentro Neon: non coprono la perdita
# dell'accesso all'account, e recuperare «com'erano i conti tre settimane fa»
# dipende da quanta storia tiene il piano. Questa è la copia che resta in mano
# nostra.
#
#   sudo ./backup-db.sh
#
# Di norma non si lancia a mano: lo fa il timer systemd in deploy/. Serve root
# perché i file nella cartella dei backup nascono di proprietà di root, creati
# dal container.

set -euo pipefail

cd "$(dirname "$0")"

# Esportate perché le legge `docker compose` interpolando docker-compose.yml,
# non questo script.
export BACKUP_DIR="${BACKUP_DIR:-/var/backups/finanze}"
KEEP_DAYS="${KEEP_DAYS:-30}"

mkdir -p "$BACKUP_DIR"

name="finanze-$(date +%Y%m%d-%H%M%S).dump"

# Dump, verifica e rinomina avvengono tutti dentro lo stesso container, in un
# comando solo, per due ragioni:
#
#   - il file nasce con estensione `.partial` e la perde solo alla fine, quindi
#     una corsa interrotta a metà non lascia in giro qualcosa che sembra un
#     backup valido;
#   - `pg_restore --list` rilegge l'indice dell'archivio appena scritto. Un
#     backup mai verificato non è un backup: è un file che si scopre illeggibile
#     il giorno in cui serve.
#
# `--no-TTY` non è un dettaglio di stile: senza, Compose alloca un terminale e
# il dump binario esce corrotto.
docker compose run --rm --no-TTY -e DUMP="/backups/$name" backup sh -c '
  set -e
  pg_dump --format=custom --compress=9 --no-owner --no-privileges \
          -d "$DATABASE_URL" -f "$DUMP.partial"
  pg_restore --list "$DUMP.partial" > /dev/null
  mv "$DUMP.partial" "$DUMP"
'

# Marcatore leggibile a colpo d'occhio: `ls -l` sulla cartella dice quando è
# andata bene l'ultima volta, senza dover interrogare il journal.
touch "$BACKUP_DIR/.ultimo-successo"

# La rotazione viene dopo la verifica, di proposito: se il dump di oggi fosse
# fallito, i vecchi sono l'unica cosa che resta e non vanno toccati.
find "$BACKUP_DIR" -maxdepth 1 -name 'finanze-*.dump' -mtime "+$KEEP_DAYS" -delete
find "$BACKUP_DIR" -maxdepth 1 -name 'finanze-*.dump.partial' -mtime +1 -delete

echo "Backup completato: $BACKUP_DIR/$name"
ls -lh "$BACKUP_DIR/$name"
