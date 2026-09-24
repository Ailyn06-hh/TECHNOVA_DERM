import { NOMBRE_MARCA } from "./marca";

interface ComprobanteItem {
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  totalLinea: number;
}

interface ComprobanteData {
  folio: string;
  fecha: string;
  canal: string;
  tipoEntrega: string;
  metodoPago: string;
  items: ComprobanteItem[];
  subtotal: number;
  descuento: number;
  costoEnvio: number;
  total: number;
  clienteNombre: string;
}

/**
 * Generador de PDF en memoria (PDF 1.4 estándar) sin dependencias externas.
 * Produce un archivo PDF compatible con Adobe Reader, Chrome, Edge y visores móviles.
 */
export function generarComprobantePdf(data: ComprobanteData): Buffer {
  const currencyFormatter = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  });

  const lines: string[] = [];

  // Configuración de texto
  lines.push("BT");
  lines.push("/F1 20 Tf"); // Helvetica-Bold 20pt
  lines.push("50 750 Td");
  lines.push(`(${escapePdf(NOMBRE_MARCA.toUpperCase())}) Tj`);

  lines.push("/F2 10 Tf"); // Helvetica 10pt
  lines.push("0 -18 Td");
  lines.push(`(COMPROBANTE DE COMPRA - PEDIDO #${escapePdf(data.folio)}) Tj`);

  lines.push("0 -16 Td");
  lines.push(`(Fecha: ${escapePdf(data.fecha)}   |   Canal: ${escapePdf(data.canal.toUpperCase())}) Tj`);

  lines.push("0 -14 Td");
  lines.push(`(Cliente: ${escapePdf(data.clienteNombre)}   |   Entrega: ${escapePdf(data.tipoEntrega)}) Tj`);

  lines.push("0 -14 Td");
  lines.push(`(Forma de pago: ${escapePdf(data.metodoPago)}) Tj`);

  // Línea separadora
  lines.push("ET");
  lines.push("0.75 w 50 670 m 550 670 l S"); // Línea horizontal

  // Encabezado de tabla
  lines.push("BT");
  lines.push("/F1 10 Tf");
  lines.push("50 650 Td");
  lines.push("(DESCRIPCION) Tj");
  lines.push("330 0 Td");
  lines.push("(CANT.) Tj");
  lines.push("70 0 Td");
  lines.push("(PRECIO) Tj");
  lines.push("60 0 Td");
  lines.push("(IMPORTE) Tj");
  lines.push("ET");

  lines.push("0.5 w 50 640 m 550 640 l S");

  // Renglones de productos
  let currentY = 620;
  for (const item of data.items) {
    const nombreTruncado = item.nombre.length > 45 ? item.nombre.slice(0, 42) + "..." : item.nombre;
    const precio = currencyFormatter.format(item.precioUnitario);
    const importe = currencyFormatter.format(item.totalLinea);

    lines.push("BT");
    lines.push("/F2 9 Tf");
    lines.push(`50 ${currentY} Td`);
    lines.push(`(${escapePdf(nombreTruncado)}) Tj`);
    lines.push(`345 0 Td`);
    lines.push(`(${item.cantidad}) Tj`);
    lines.push(`55 0 Td`);
    lines.push(`(${escapePdf(precio)}) Tj`);
    lines.push(`60 0 Td`);
    lines.push(`(${escapePdf(importe)}) Tj`);
    lines.push("ET");

    currentY -= 18;
    if (currentY < 180) break; // Límite de página única para comprobante simple
  }

  // Separador de totales
  currentY -= 10;
  lines.push(`0.5 w 300 ${currentY} m 550 ${currentY} l S`);
  currentY -= 18;

  // Desglose de totales
  lines.push("BT");
  lines.push("/F2 10 Tf");
  lines.push(`340 ${currentY} Td`);
  lines.push("(Subtotal:) Tj");
  lines.push(`120 0 Td`);
  lines.push(`(${escapePdf(currencyFormatter.format(data.subtotal))}) Tj`);
  lines.push("ET");

  if (data.descuento > 0) {
    currentY -= 16;
    lines.push("BT");
    lines.push("/F2 10 Tf");
    lines.push(`340 ${currentY} Td`);
    lines.push("(Descuento:) Tj");
    lines.push(`120 0 Td`);
    lines.push(`(-${escapePdf(currencyFormatter.format(data.descuento))}) Tj`);
    lines.push("ET");
  }

  currentY -= 16;
  lines.push("BT");
  lines.push("/F2 10 Tf");
  lines.push(`340 ${currentY} Td`);
  lines.push("(Envio:) Tj");
  lines.push(`120 0 Td`);
  lines.push(`(${escapePdf(data.costoEnvio === 0 ? "Gratis" : currencyFormatter.format(data.costoEnvio))}) Tj`);
  lines.push("ET");

  currentY -= 20;
  lines.push("BT");
  lines.push("/F1 12 Tf");
  lines.push(`340 ${currentY} Td`);
  lines.push("(TOTAL:) Tj");
  lines.push(`110 0 Td`);
  lines.push(`(${escapePdf(currencyFormatter.format(data.total))}) Tj`);
  lines.push("ET");

  // Nota legal informativa al pie
  lines.push("BT");
  lines.push("/F2 8 Tf");
  lines.push("50 70 Td");
  lines.push("(Este documento es un comprobante de compra para uso informativo de Technova-Derm.) Tj");
  lines.push("0 -12 Td");
  lines.push("(No constituye un comprobante fiscal digital por internet (CFDI). Para facturar visita tu cuenta.) Tj");
  lines.push("ET");

  const streamContent = lines.join("\n");
  const streamLength = Buffer.byteLength(streamContent, "utf-8");

  // Estructura completa de objetos PDF 1.4
  const objects = [
    // 1: Catalog
    `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj`,
    // 2: Pages
    `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj`,
    // 3: Page
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj`,
    // 4: Content Stream
    `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj`,
    // 5: Font F1 (Helvetica-Bold)
    `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj`,
    // 6: Font F2 (Helvetica)
    `6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj`,
  ];

  let body = "%PDF-1.4\n";
  const xrefOffsets: number[] = [0];

  for (const obj of objects) {
    xrefOffsets.push(Buffer.byteLength(body, "utf-8"));
    body += `${obj}\n`;
  }

  const xrefStart = Buffer.byteLength(body, "utf-8");
  body += `xref\n0 ${objects.length + 1}\n`;
  body += `0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    body += `${xrefOffsets[i].toString().padStart(10, "0")} 00000 n \n`;
  }

  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return Buffer.from(body, "utf-8");
}

function escapePdf(text: string): string {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Limpiar tildes para fuente Type 1 estándar
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}
