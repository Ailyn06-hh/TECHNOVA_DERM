import { getDbPool } from "../src/lib/db.ts";

async function migrateConfiguracion() {
  console.log("=== Ejecutando migración Módulo Configuración ===");
  const pool = getDbPool();

  try {
    // 1. Crear tabla configuracion_general
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`configuracion_general\` (
        \`clave\` VARCHAR(100) PRIMARY KEY,
        \`valor\` TEXT NOT NULL,
        \`descripcion\` VARCHAR(255) NULL,
        \`actualizado_en\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✔ Tabla configuracion_general creada/verificada");

    // 2. Sembrar valores por defecto
    const valoresDefecto = [
      ["costo_envio_local", "99.00", "Costo envío zona capital"],
      ["tiempo_envio_local", "2 a 3 días", "Tiempo estimado entrega local"],
      ["costo_envio_nacional", "149.00", "Costo envío resto del país"],
      ["tiempo_envio_nacional", "4 a 6 días", "Tiempo estimado entrega nacional"],
      ["monto_envio_gratis", "1200.00", "Monto mínimo para envío gratis"],
      ["permitir_recoger_tienda", "1", "Habilitar opción de recoger en tienda gratis"],
      ["mercadopago_conectado", "1", "Estado pasarela Mercado Pago"],
      ["terminal_pos_conectado", "1", "Estado terminal bancaria POS"],
      ["pago_en_tienda_conectado", "1", "Estado pago presencial al recoger"],
      ["tienda_web_conectado", "1", "Estado canal tienda web"],
      ["app_movil_conectado", "1", "Estado canal app móvil"],
      ["whatsapp_conectado", "1", "Estado canal WhatsApp Business"],
      ["marketplace_conectado", "0", "Estado canal Marketplace"],
      ["rfc_negocio", "TDE260101XYZ", "RFC del negocio para facturación"],
      ["regimen_fiscal", "601 - General de Ley Personas Morales", "Régimen fiscal del SAT"],
      ["serie_facturas", "N", "Serie o folio inicial de facturación"],
      ["permitir_descargar_facturas", "1", "Permitir descarga automática de facturas a clientas"],
    ];

    for (const [clave, valor, descripcion] of valoresDefecto) {
      await pool.query(
        `INSERT INTO configuracion_general (clave, valor, descripcion)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE valor = COALESCE(valor, VALUES(valor)), descripcion = VALUES(descripcion)`,
        [clave, valor, descripcion]
      );
    }

    console.log("✔ Valores iniciales de configuración sembrados");
    console.log("=== Migración Módulo Configuración Finalizada con Éxito ===");
  } catch (err) {
    console.error("❌ Error en migración de configuración:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrateConfiguracion();
