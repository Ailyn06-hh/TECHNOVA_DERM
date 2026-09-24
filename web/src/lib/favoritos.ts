import { getDbPool } from "./db";
import { notificar } from "./notificaciones";

/**
 * Revisa el inventario y precios de los productos en la lista de favoritos del usuario.
 * Si detecta pocas existencias (≤ 3) o precio de descuento, emite notificación con control anti-spam.
 */
export async function revisarFavoritos(usuarioId: number): Promise<{ revisados: number; notificados: number }> {
  if (!usuarioId) return { revisados: 0, notificados: 0 };

  const pool = getDbPool();
  let notificados = 0;

  try {
    const [rows]: any = await pool.execute(
      `SELECT f.producto_id, p.nombre, p.slug, p.precio, p.precio_especial,
              COALESCE(SUM(i.existencias), 0) as total_stock
       FROM favoritos f
       JOIN productos p ON p.id = f.producto_id
       LEFT JOIN inventario i ON i.producto_id = p.id
       WHERE f.usuario_id = ? AND p.activo = 1
       GROUP BY p.id`,
      [usuarioId]
    );

    if (!rows || rows.length === 0) {
      return { revisados: 0, notificados: 0 };
    }

    for (const prod of rows) {
      const stock = Number(prod.total_stock || 0);
      const precioOriginal = Number(prod.precio || 0);
      const precioEspecial = prod.precio_especial ? Number(prod.precio_especial) : null;
      const enlace = `/producto/${prod.slug}`;

      // 1. Alerta de stock bajo (1 a 3 piezas)
      if (stock > 0 && stock <= 3) {
        // Anti-spam: máximo 1 aviso de stock cada 48 horas para el mismo producto
        const [prevStock]: any = await pool.execute(
          `SELECT id FROM notificaciones 
           WHERE usuario_id = ? 
             AND tipo = 'favorito' 
             AND evento = 'favorito_stock' 
             AND enlace = ? 
             AND creado_en > DATE_SUB(NOW(), INTERVAL 48 HOUR)
           LIMIT 1`,
          [usuarioId, enlace]
        );

        if (!prevStock || prevStock.length === 0) {
          await notificar(usuarioId, {
            tipo: "favorito",
            evento: "favorito_stock",
            titulo: `Últimas piezas de ${prod.nombre}`,
            mensaje: `Quedan solo ${stock} piezas de uno de tus productos guardados en favoritos.`,
            enlace,
          });
          notificados++;
        }
      }

      // 2. Alerta de precio especial / oferta
      if (precioEspecial && precioEspecial < precioOriginal) {
        // Anti-spam: máximo 1 aviso de precio cada 7 días para el mismo producto
        const [prevPrice]: any = await pool.execute(
          `SELECT id FROM notificaciones 
           WHERE usuario_id = ? 
             AND tipo = 'favorito' 
             AND evento = 'favorito_precio' 
             AND enlace = ? 
             AND creado_en > DATE_SUB(NOW(), INTERVAL 7 DAY)
           LIMIT 1`,
          [usuarioId, enlace]
        );

        if (!prevPrice || prevPrice.length === 0) {
          await notificar(usuarioId, {
            tipo: "favorito",
            evento: "favorito_precio",
            titulo: `¡Oferta especial en ${prod.nombre}!`,
            mensaje: `Uno de tus favoritos ahora tiene un precio especial de $${precioEspecial.toFixed(2)}.`,
            enlace,
          });
          notificados++;
        }
      }
    }

    return { revisados: rows.length, notificados };
  } catch (err: any) {
    console.error("[revisarFavoritos Error]:", err.message);
    return { revisados: 0, notificados };
  }
}
