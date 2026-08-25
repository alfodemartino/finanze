import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getGroupForUser, getGroupOperations } from "@/lib/groups";
import { buildGroupExport, exportFileName } from "@/lib/export";

// Il file si costruisce con lo `zlib` di Node: serve il runtime Node.
export const runtime = "nodejs";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * Intestazione del download. Il nome del file compare due volte: in ASCII per
 * i browser che non conoscono altro, e in UTF-8 secondo la RFC 5987 per tutti
 * gli altri, visto che il nome di un gruppo può avere accenti o emoji.
 */
function contentDisposition(fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

/** Scarica tutte le operazioni del gruppo come foglio di calcolo. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await currentUser();
  if (!user) redirect("/login");

  const group = await getGroupForUser(id, user.id);
  if (!group) notFound();

  // L'export è riservato all'amministratore. Qui la risposta è 403 e non 404:
  // chi è nel gruppo sa già che il gruppo esiste, non c'è niente da nascondere.
  if (group.viewer.role !== "OWNER") {
    return new Response("Solo l'amministratore del gruppo può esportare i dati.", {
      status: 403,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const { expenses, settlements } = await getGroupOperations(group.id);
  const file = buildGroupExport({
    groupName: group.name,
    currency: group.currency,
    expenses,
    settlements,
  });

  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": XLSX_MIME,
      "Content-Disposition": contentDisposition(exportFileName(group.name)),
      "Content-Length": String(file.byteLength),
      // I dati cambiano a ogni spesa: nessuna copia in cache.
      "Cache-Control": "no-store",
    },
  });
}
