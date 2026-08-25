import { inflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { buildXlsx, columnName, sanitizeSheetName, type XlsxColumn } from "@/lib/xlsx";

/**
 * Legge l'archivio prodotto da `buildXlsx` scorrendo gli header locali fino
 * all'indice centrale. Basta a controllare che dentro ci sia quel che serve,
 * senza aggiungere una libreria di test.
 */
function readZip(archive: Buffer): Map<string, string> {
  const files = new Map<string, string>();
  let offset = 0;

  while (offset + 4 <= archive.length && archive.readUInt32LE(offset) === 0x04034b50) {
    const compressedSize = archive.readUInt32LE(offset + 18);
    const nameLength = archive.readUInt16LE(offset + 26);
    const extraLength = archive.readUInt16LE(offset + 28);
    const name = archive.subarray(offset + 30, offset + 30 + nameLength).toString("utf8");
    const start = offset + 30 + nameLength + extraLength;

    files.set(name, inflateRawSync(archive.subarray(start, start + compressedSize)).toString("utf8"));
    offset = start + compressedSize;
  }

  return files;
}

const columns: XlsxColumn[] = [
  { header: "DATA", format: "date" },
  { header: "TESTO" },
  { header: "IMPORTO", format: "currency" },
];

describe("sanitizeSheetName", () => {
  it("toglie i caratteri che Excel non accetta", () => {
    expect(sanitizeSheetName("Casa/Rossi")).toBe("Casa Rossi");
    expect(sanitizeSheetName("Spese [2026]: casa?")).toBe("Spese 2026 casa");
  });

  it("non supera i 31 caratteri", () => {
    const name = sanitizeSheetName("Un gruppo con un nome davvero lunghissimo");
    expect(name).toHaveLength(31);
    expect(name).toBe("Un gruppo con un nome davvero l");
  });

  it("non lascia apici agli estremi né nomi vuoti", () => {
    expect(sanitizeSheetName("'Casa'")).toBe("Casa");
    expect(sanitizeSheetName("///")).toBe("Export");
    expect(sanitizeSheetName("   ", "gruppo")).toBe("gruppo");
  });
});

describe("columnName", () => {
  it("segue la numerazione di Excel", () => {
    expect(columnName(0)).toBe("A");
    expect(columnName(25)).toBe("Z");
    expect(columnName(26)).toBe("AA");
    expect(columnName(27)).toBe("AB");
    expect(columnName(701)).toBe("ZZ");
  });
});

describe("buildXlsx", () => {
  const archive = readZip(
    buildXlsx({
      sheetName: "Casa Rossi",
      currency: "EUR",
      columns,
      rows: [
        [new Date("2026-08-25T00:00:00.000Z"), "Spesa & C. <urgente>", 1234],
        [new Date("1970-01-01T00:00:00.000Z"), "", -5],
      ],
    }),
  );

  it("contiene tutte le parti che Excel si aspetta", () => {
    expect([...archive.keys()]).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/workbook.xml",
      "xl/_rels/workbook.xml.rels",
      "xl/styles.xml",
      "xl/worksheets/sheet1.xml",
    ]);
  });

  it("intitola il foglio al nome richiesto", () => {
    expect(archive.get("xl/workbook.xml")).toContain('<sheet name="Casa Rossi" sheetId="1" r:id="rId1"/>');
  });

  it("scrive l'intestazione nella prima riga", () => {
    const sheet = archive.get("xl/worksheets/sheet1.xml") ?? "";
    expect(sheet).toContain('<c r="A1" s="1" t="inlineStr"><is><t>DATA</t></is></c>');
    expect(sheet).toContain('<c r="C1" s="1" t="inlineStr"><is><t>IMPORTO</t></is></c>');
    expect(sheet).toContain('ref="A1:C3"');
  });

  it("converte le date nel numero seriale di Excel", () => {
    const sheet = archive.get("xl/worksheets/sheet1.xml") ?? "";
    expect(sheet).toContain('<c r="A2" s="2"><v>46259</v></c>'); // 25/08/2026
    expect(sheet).toContain('<c r="A3" s="2"><v>25569</v></c>'); // 01/01/1970
  });

  it("scrive gli importi partendo dai centesimi, senza float", () => {
    const sheet = archive.get("xl/worksheets/sheet1.xml") ?? "";
    expect(sheet).toContain('<c r="C2" s="3"><v>12.34</v></c>');
    expect(sheet).toContain('<c r="C3" s="3"><v>-0.05</v></c>');
  });

  it("protegge l'XML dal testo scritto dagli utenti", () => {
    const sheet = archive.get("xl/worksheets/sheet1.xml") ?? "";
    expect(sheet).toContain("Spesa &amp; C. &lt;urgente&gt;");
    expect(sheet).not.toContain("<urgente>");
  });

  it("omette le celle vuote invece di scriverle vuote", () => {
    expect(archive.get("xl/worksheets/sheet1.xml")).toContain('<row r="3"><c r="A3"');
  });

  it("usa il simbolo della valuta del gruppo", () => {
    expect(archive.get("xl/styles.xml")).toContain("&quot;€&quot;");

    const dollari = readZip(buildXlsx({ sheetName: "Casa", currency: "USD", columns, rows: [] }));
    expect(dollari.get("xl/styles.xml")).toContain("&quot;$&quot;");

    const franchi = readZip(buildXlsx({ sheetName: "Casa", currency: "CHF", columns, rows: [] }));
    expect(franchi.get("xl/styles.xml")).toContain("&quot;CHF&quot;");
  });

  it("regge un foglio con la sola intestazione", () => {
    const vuoto = readZip(buildXlsx({ sheetName: "Casa", columns, rows: [] }));
    expect(vuoto.get("xl/worksheets/sheet1.xml")).toContain('<dimension ref="A1:C1"/>');
  });

  it("mette fra apici il nome del foglio nel riferimento del filtro", () => {
    const conApice = readZip(buildXlsx({ sheetName: "Casa d'Angelo", columns, rows: [] }));
    expect(conApice.get("xl/workbook.xml")).toContain("&apos;Casa d&apos;&apos;Angelo&apos;!$A$1:$C$1");
  });
});
