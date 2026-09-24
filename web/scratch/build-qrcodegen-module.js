const fs = require('fs');

let code = fs.readFileSync('scratch/qrcodegen.js', 'utf8');

// Replace top-level function wrappers if needed and append ES export
const esExport = `
export function toSvgString(qr, border = 4, lightColor = "#FFFFFF", darkColor = "#000000") {
    if (border < 0) throw new RangeError("Border must be non-negative");
    const parts = [];
    for (let y = 0; y < qr.size; y++) {
        for (let x = 0; x < qr.size; x++) {
            if (qr.getModule(x, y)) {
                parts.push("M" + (x + border) + "," + (y + border) + "h1v1h-1z");
            }
        }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + (qr.size + border * 2) + ' ' + (qr.size + border * 2) + '" shape-rendering="crispEdges">' +
        '<rect width="100%" height="100%" fill="' + lightColor + '"/>' +
        '<path d="' + parts.join(" ") + '" fill="' + darkColor + '"/>' +
        '</svg>';
}

export function generateQrSvg(text, border = 4) {
    const qr = qrcodegen.QrCode.encodeText(text, qrcodegen.QrCode.Ecc.MEDIUM);
    return toSvgString(qr, border);
}

export { qrcodegen };
`;

fs.writeFileSync('src/lib/qrcodegen.js', code + '\n' + esExport, 'utf8');
console.log('src/lib/qrcodegen.js written successfully');
