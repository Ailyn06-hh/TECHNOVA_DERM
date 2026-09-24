const fs = require('fs');
let code = fs.readFileSync('scratch/qrcodegen.js', 'utf8');
code += `
function toSvgString(qr, border = 4, lightColor = "#FFFFFF", darkColor = "#000000") {
    if (border < 0) throw new RangeError("Border must be non-negative");
    const parts = [];
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

function generateQrSvg(text, border = 4) {
    const qr = qrcodegen.QrCode.encodeText(text, qrcodegen.QrCode.Ecc.MEDIUM);
    return toSvgString(qr, border);
}

module.exports = { qrcodegen, toSvgString, generateQrSvg };
`;

fs.writeFileSync('scratch/qrcodegen-wrapped.js', code, 'utf8');
const { generateQrSvg } = require('./qrcodegen-wrapped.js');
const svg = generateQrSvg('otpauth://totp/Technova-Derm:admin@technovaderm.mx?secret=JBSWY3DPEHPK3PXP&issuer=Technova-Derm');
console.log('SVG starts:', svg.slice(0, 100));
console.log('SVG length:', svg.length);
console.log('SVG valid:', svg.includes('<svg') && svg.includes('</svg>'));
