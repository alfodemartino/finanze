// Sonda per l'healthcheck del container e per capire, quando l'app non
// risponde, se il problema è il processo Node o quello che gli sta davanti.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Di proposito non interroga il database: nel piano gratuito di Neon il
 * compute si sospende dopo un po' di inattività, e un healthcheck che
 * fallisce durante il risveglio farebbe riavviare un container sano.
 */
export function GET() {
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
