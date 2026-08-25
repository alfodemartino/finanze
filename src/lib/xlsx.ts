/**
 * Generatore di file xlsx.
 *
 * Un xlsx è un archivio ZIP di documenti XML (SpreadsheetML). Qui serve solo
 * scrivere un foglio con un'intestazione e delle righe: invece di aggiungere
 * una libreria — sono tutte parecchio più grandi di questo file — l'archivio
 * lo componiamo con lo `zlib` di Node.
 *
 * Il modulo è puro: riceve valori, restituisce i byte del file. Non sa niente
 * né del database né delle spese.
 */

import { deflateRawSync } from "node:zlib";

/** Come va formattata una colonna nel foglio. */
export type XlsxFormat = "text" | "date" | "currency";

export type XlsxColumn = {
  header: string;
  /** Larghezza in caratteri, la stessa misura che usa Excel. */
  width?: number;
  format?: XlsxFormat;
};

/**
 * Valore di una cella. Nelle colonne `currency` è un numero **intero di
 * centesimi**, come ovunque nell'applicazione: la conversione a decimale
 * avviene solo qui sotto, senza passare dai float.
 */
export type XlsxValue = string | number | Date | null;

/** Una cella libera, per i blocchi affiancati alla tabella. */
export type XlsxCell = {
  value: XlsxValue;
  format?: XlsxFormat;
  /** In grassetto, come le intestazioni della tabella. */
  bold?: boolean;
};

/**
 * Un blocco di celle appoggiato a destra della tabella principale, per i
 * riepiloghi: righe e colonne proprie, indipendenti da quelle della tabella.
 */
export type XlsxSide = {
  /** Indice della prima colonna occupata (0 = A). */
  startColumn: number;
  /** Larghezza di ogni colonna del blocco, dalla prima. */
  widths: number[];
  /** Righe di celle, dalla prima riga del foglio. */
  rows: XlsxCell[][];
};

// ---------------------------------------------------------------------------
// Conversioni
// ---------------------------------------------------------------------------

/**
 * Numero seriale delle date in Excel: giorni trascorsi dal 30/12/1899.
 * Non è un errore di battitura, è l'epoca che compensa il bug per cui Excel
 * considera il 1900 bisestile. Il 01/01/1970 vale 25569.
 *
 * Si conta in UTC — le date arrivano dai campi `<input type="date">`, che
 * vengono letti come mezzanotte UTC — così il giorno esportato è sempre
 * quello scritto dall'utente, qualunque sia il fuso orario del server.
 */
function toExcelSerial(date: Date): number {
  return Math.floor(date.getTime() / 86_400_000) + 25_569;
}

/** Da centesimi a decimale senza aritmetica in virgola mobile: 1234 → "12.34". */
function centsToDecimal(cents: number): string {
  const rounded = Math.round(cents);
  const sign = rounded < 0 ? "-" : "";
  const abs = Math.abs(rounded);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** Nome della colonna a partire dall'indice: 0 → "A", 26 → "AA". */
export function columnName(index: number): string {
  let name = "";
  let rest = index;
  do {
    name = String.fromCharCode(65 + (rest % 26)) + name;
    rest = Math.floor(rest / 26) - 1;
  } while (rest >= 0);
  return name;
}

const xmlEntities: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

/**
 * Testo sicuro dentro l'XML. Oltre alle entità toglie i caratteri di
 * controllo che XML 1.0 non ammette: ne basterebbe uno finito per sbaglio in
 * una nota per rendere illeggibile l'intero file.
 */
function escapeXml(value: string): string {
  return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "").replace(/[&<>"']/g, (char) => xmlEntities[char]);
}

const currencySymbols: Record<string, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  JPY: "¥",
};

/** Formato numerico della colonna degli importi, col simbolo della valuta. */
function currencyFormat(currency: string): string {
  const code = currency.trim().toUpperCase();
  return `#,##0.00\\ "${currencySymbols[code] ?? code}"`;
}

/**
 * Adatta un nome qualsiasi ai vincoli di Excel per il nome di un foglio:
 * niente `\ / ? * : [ ]`, niente apici agli estremi, al massimo 31 caratteri
 * e mai vuoto. Un nome non valido non dà un errore: apre un file corrotto.
 */
export function sanitizeSheetName(name: string, fallback = "Export"): string {
  const cleaned = name
    .replace(/[\\/*?:[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 31)
    .replace(/^'+|'+$/g, "")
    .trim();

  return cleaned || fallback;
}

/** Da "A1:E9" a "$A$1:$E$9": i riferimenti nelle formule sono assoluti. */
function toAbsolute(reference: string): string {
  return reference.replace(/([A-Z]+)([0-9]+)/g, (_match, column, row) => `$${column}$${row}`);
}

/** Riferimento a un intervallo del foglio, come lo scrive Excel nelle formule. */
function sheetRange(sheetName: string, reference: string): string {
  return `'${sheetName.replace(/'/g, "''")}'!${toAbsolute(reference)}`;
}

// ---------------------------------------------------------------------------
// Archivio ZIP
// ---------------------------------------------------------------------------

// Data fissa (01/01/1980, il minimo rappresentabile in un ZIP) al posto
// dell'ora corrente: a parità di dati il file prodotto è identico byte per
// byte, e quindi verificabile nei test.
const DOS_TIME = 0;
const DOS_DATE = 0x0021;

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let value = i;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[i] = value >>> 0;
  }
  return table;
})();

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Raccoglie i documenti in un archivio ZIP compresso con deflate. */
function zip(entries: { name: string; content: string }[]): Buffer {
  const chunks: Buffer[] = [];
  const directory: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const content = Buffer.from(entry.content, "utf8");
    const compressed = deflateRawSync(content, { level: 9 });
    const crc = crc32(content);

    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0); // firma
    local.writeUInt16LE(20, 4); // versione necessaria per leggerlo
    local.writeUInt16LE(0x0800, 6); // nomi dei file in UTF-8
    local.writeUInt16LE(8, 8); // metodo deflate
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(content.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28); // nessun campo extra
    name.copy(local, 30);

    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0); // firma
    central.writeUInt16LE(20, 4); // versione di chi ha scritto
    central.writeUInt16LE(20, 6); // versione necessaria per leggerlo
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(content.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30); // campo extra
    central.writeUInt16LE(0, 32); // commento
    central.writeUInt16LE(0, 34); // disco di partenza
    central.writeUInt16LE(0, 36); // attributi interni
    central.writeUInt32LE(0, 38); // attributi esterni
    central.writeUInt32LE(offset, 42); // posizione dell'header locale
    name.copy(central, 46);

    chunks.push(local, compressed);
    directory.push(central);
    offset += local.length + compressed.length;
  }

  const directorySize = directory.reduce((sum, part) => sum + part.length, 0);

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); // firma
  end.writeUInt16LE(0, 4); // numero del disco
  end.writeUInt16LE(0, 6); // disco che contiene l'indice
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directorySize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20); // nessun commento

  return Buffer.concat([...chunks, ...directory, end]);
}

// ---------------------------------------------------------------------------
// Documenti del foglio di calcolo
// ---------------------------------------------------------------------------

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const RELS_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
const DOC_RELS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

// Indici degli stili dichiarati in `styles.xml`, nell'ordine in cui compaiono.
const STYLE_TEXT = 0;
const STYLE_HEADER = 1;
const STYLE_DATE = 2;
const STYLE_CURRENCY = 3;
const STYLE_CURRENCY_BOLD = 4;

/** Lo stile con cui va scritta una cella, fra quelli dichiarati sopra. */
function styleFor(format: XlsxFormat, bold: boolean): number {
  if (format === "date") return STYLE_DATE;
  if (format === "currency") return bold ? STYLE_CURRENCY_BOLD : STYLE_CURRENCY;
  return bold ? STYLE_HEADER : STYLE_TEXT;
}

function stylesXml(currency: string): string {
  return `${XML_HEADER}
<styleSheet xmlns="${MAIN_NS}">
<numFmts count="2"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="${escapeXml(currencyFormat(currency))}"/></numFmts>
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
}

/** Una cella del foglio; le celle vuote si omettono, il formato le ammette. */
function cellXml(reference: string, cell: XlsxCell): string {
  const { value } = cell;
  if (value === null || value === "") return "";

  const format = cell.format ?? "text";
  const style = styleFor(format, cell.bold ?? false);

  if (format === "date" && value instanceof Date) {
    return `<c r="${reference}" s="${style}"><v>${toExcelSerial(value)}</v></c>`;
  }

  if (format === "currency" && typeof value === "number") {
    return `<c r="${reference}" s="${style}"><v>${centsToDecimal(value)}</v></c>`;
  }

  if (typeof value === "number") {
    return `<c r="${reference}" s="${style}"><v>${value}</v></c>`;
  }

  const text = value instanceof Date ? value.toISOString() : String(value);
  return `<c r="${reference}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(text)}</t></is></c>`;
}

function sheetXml({
  columns,
  rows,
  side,
  tableRef,
  dimensionRef,
}: {
  columns: XlsxColumn[];
  rows: XlsxValue[][];
  side?: XlsxSide;
  tableRef: string;
  dimensionRef: string;
}): string {
  // Un `<cols>` senza figli non è ammesso dallo schema: se non ci sono
  // colonne l'elemento va omesso, non lasciato vuoto.
  const cols = [
    ...columns.map((column, index) => ({ index, width: column.width ?? 14 })),
    ...(side?.widths ?? []).map((width, index) => ({ index: side!.startColumn + index, width })),
  ]
    .map(({ index, width }) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`)
    .join("");

  // Il foglio arriva fin dove arriva la più lunga fra la tabella e il blocco
  // affiancato: i due possono avere altezze diverse.
  const lastRow = Math.max(rows.length + 1, side?.rows.length ?? 0);

  const body: string[] = [];
  for (let number = 1; number <= lastRow; number += 1) {
    const table = columns.map((column, index) => {
      const reference = `${columnName(index)}${number}`;
      return number === 1
        ? cellXml(reference, { value: column.header, bold: true })
        : cellXml(reference, { value: rows[number - 2]?.[index] ?? null, format: column.format });
    });

    const aside = (side?.rows[number - 1] ?? []).map((cell, index) =>
      cellXml(`${columnName((side as XlsxSide).startColumn + index)}${number}`, cell),
    );

    const cells = [...table, ...aside].join("");
    // Le righe del tutto vuote non si scrivono: le lascia il blocco
    // affiancato per separare una sezione dall'altra.
    if (cells) body.push(`<row r="${number}">${cells}</row>`);
  }

  return `${XML_HEADER}
<worksheet xmlns="${MAIN_NS}">
<dimension ref="${dimensionRef}"/>
<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
${cols ? `<cols>${cols}</cols>` : ""}
<sheetData>${body.join("")}</sheetData>
<autoFilter ref="${tableRef}"/>
</worksheet>`;
}

function workbookXml(sheetName: string, reference: string): string {
  // `_xlnm._FilterDatabase` è il nome riservato che lega il filtro automatico
  // al foglio: senza, Excel disegna i pulsanti del filtro ma non li applica.
  return `${XML_HEADER}
<workbook xmlns="${MAIN_NS}" xmlns:r="${DOC_RELS}">
<sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets>
<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">${escapeXml(sheetRange(sheetName, reference))}</definedName></definedNames>
</workbook>`;
}

/**
 * Costruisce un file xlsx con un solo foglio: una tabella a partire da A1 e,
 * se serve, un blocco di riepilogo appoggiato alla sua destra.
 *
 * `sheetName` viene adattato ai vincoli di Excel, così chi chiama può passare
 * direttamente il nome del gruppo.
 */
export function buildXlsx({
  sheetName,
  columns,
  rows,
  side,
  currency = "EUR",
}: {
  sheetName: string;
  columns: XlsxColumn[];
  rows: XlsxValue[][];
  side?: XlsxSide;
  currency?: string;
}): Buffer {
  const name = sanitizeSheetName(sheetName);

  // Il filtro automatico copre la sola tabella: se comprendesse anche il
  // riepilogo, filtrare le spese ne nasconderebbe pezzi.
  const tableRef = `A1:${columnName(Math.max(columns.length - 1, 0))}${rows.length + 1}`;

  const sideWidth = side ? Math.max(0, ...side.rows.map((row) => row.length)) : 0;
  const lastColumn = Math.max(
    columns.length - 1,
    sideWidth > 0 ? side!.startColumn + sideWidth - 1 : 0,
  );
  const lastRow = Math.max(rows.length + 1, side?.rows.length ?? 0);
  const dimensionRef = `A1:${columnName(lastColumn)}${lastRow}`;

  return zip([
    {
      name: "[Content_Types].xml",
      content: `${XML_HEADER}
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,
    },
    {
      name: "_rels/.rels",
      content: `${XML_HEADER}
<Relationships xmlns="${RELS_NS}">
<Relationship Id="rId1" Type="${DOC_RELS}/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    { name: "xl/workbook.xml", content: workbookXml(name, tableRef) },
    {
      name: "xl/_rels/workbook.xml.rels",
      content: `${XML_HEADER}
<Relationships xmlns="${RELS_NS}">
<Relationship Id="rId1" Type="${DOC_RELS}/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="${DOC_RELS}/styles" Target="styles.xml"/>
</Relationships>`,
    },
    { name: "xl/styles.xml", content: stylesXml(currency) },
    {
      name: "xl/worksheets/sheet1.xml",
      content: sheetXml({ columns, rows, side, tableRef, dimensionRef }),
    },
  ]);
}
