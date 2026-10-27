#!/bin/bash
# Prepara l'ambiente di una sessione di Codex.
#
# Un clone appena fatto (un ambiente cloud, un'altra macchina) non ha
# `node_modules`: senza le dipendenze i quattro controlli che AGENTS.md impone
# prima di ogni push — test, typecheck, lint, build — non si possono nemmeno
# lanciare.
set -euo pipefail

# Codex esegue l'hook nella cartella della sessione, che può essere una
# sottocartella: si parte dalla radice del repository.
cd "$(git rev-parse --show-toplevel)"

# Codex non dichiara con una variabile se la sessione è remota, quindi si guarda
# direttamente se le dipendenze ci sono: in locale ci sono già, e reinstallarle
# a ogni sessione sarebbe solo tempo perso.
if [ -d node_modules ]; then
  exit 0
fi

# `npm install` e non `npm ci`: riusa quello che trova invece di ripartire da
# zero. Il `postinstall` del progetto esegue già `prisma generate`, quindi il
# client c'è subito. L'output va su stderr: quello che l'hook scrive su stdout
# Codex lo aggiunge al contesto del modello.
npm install --no-audit --no-fund >&2
