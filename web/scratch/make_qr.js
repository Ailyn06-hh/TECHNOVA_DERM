const fs = require('fs');
let code = fs.readFileSync('scratch/qrcodegen.ts', 'utf8');
code = code.replace('namespace qrcodegen {', 'export namespace qrcodegen {');
const appendCode = `
export function toSvgString(qr: qrcodegen.QrCode, border = 4, lightColor = "#FFFFFF", darkColor = "#000000"): string {
    if (border < 0) throw new RangeError("Border must be non-negative");
    const parts: string[] = [];
    for (let y = 0; y < qr.size; y++) {
        for (let x = 0; x < qr.size; x++) {
            if (qr.getModule(x, y)) {
                parts.push('M' + (x + border) + ',' + (y + border) + 'h1v1h-1z');
            }
        }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + (qr.size + border * 2) + ' ' + (qr.size + border * 2) + '" shape-rendering="crispEdges">' +
        '<rect width="100%" height="100%" fill="' + lightColor + '"/>' +
        '<path d="' + parts.join(' ') + '" fill="' + darkColor + '"/>' +
        '</svg>';
}

export function generateQrSvg(text: string, border = 4): string {
    const qr = qrcodegen.QrCode.encodeText(text, qrcodegen.QrCode.Ecc.MEDIUM);
    return toSvgString(qr, border);
}
`;
fs.writeFileSync('src/lib/qrcodegen.ts', code + appendCode, 'utf8');
console.log('src/lib/qrcodegen.ts created successfully!');
