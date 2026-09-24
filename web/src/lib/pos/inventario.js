// CommonJS wrapper / re-export for lib/pos/inventario
const { analizarInventario } = require("./inventario.ts");

module.exports = {
  analizarInventario,
};
