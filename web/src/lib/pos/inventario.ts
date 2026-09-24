import { getDbPool } from "../db";
import { DIAS_RITMO_VENTA, DIAS_AGOTA_ALERTA, DIAS_SOBRESTOCK } from "../marca";

export interface AlertaInventario {
  productoId: number;
  nombre: string;
  sku: string;
  disponibles: number;
  apartadas: number;
  ritmoDiario: number;
  diasRestantes: number | null;
  enCombo: boolean;
  tipoAlerta: "agotado" | "agotandose" | "sobrestock";
  etiquetaAlerta: string;
  enPedidosPorRecoger?: boolean;
}

/**
 * Analiza el inventario omnicanal en tiempo real para una sucursal dada.
 * Calcula disponibles, apartadas en pedidos activos y ritmo de venta de los últimos 14 días.
 */
export async function analizarInventario(sucursalId: number): Promise<AlertaInventario[]> {
  const pool = getDbPool();

  // 1. Obtener existencias actuales de todos los productos en la sucursal
  const [invRows]: any = await pool.execute(
    `SELECT i.producto_id, p.nombre, p.sku, i.existencias
     FROM inventario i
     JOIN productos p ON p.id = i.producto_id
     WHERE i.sucursal_id = ?`,
    [sucursalId]
  );

  // 2. Obtener piezas apartadas en pedidos activos de recoger para esta sucursal
  const [apartadasRows]: any = await pool.execute(
    `SELECT pi.producto_id, SUM(pi.cantidad) AS total_apartadas
     FROM pedido_items pi
     JOIN pedidos p ON p.id = pi.pedido_id
     WHERE p.sucursal_id = ?
       AND p.tipo_entrega = 'recoger'
       AND p.estado IN ('pagado', 'preparando', 'listo_para_recoger', 'por_pagar_en_tienda')
     GROUP BY pi.producto_id`,
    [sucursalId]
  );
  const apartadasMap = new Map<number, number>();
  for (const row of apartadasRows) {
    apartadasMap.set(row.producto_id, Number(row.total_apartadas) || 0);
  }

  // 3. Obtener productos presentes en pedidos por recoger activos (para priorizarlos)
  const productosEnPorRecoger = new Set<number>(apartadasMap.keys());

  // 4. Calcular ritmo de venta en los últimos 14 días en esta sucursal
  const [ventasRows]: any = await pool.execute(
    `SELECT pi.producto_id, SUM(pi.cantidad) AS total_vendidas
     FROM pedido_items pi
     JOIN pedidos p ON p.id = pi.pedido_id
     WHERE p.sucursal_id = ?
       AND p.estado IN ('pagado', 'preparando', 'listo_para_recoger', 'entregado')
       AND p.creado_en >= DATE_SUB(NOW(), INTERVAL ? DAY)
     GROUP BY pi.producto_id`,
    [sucursalId, DIAS_RITMO_VENTA]
  );
  const ritmoMap = new Map<number, number>();
  for (const row of ventasRows) {
    const total = Number(row.total_vendidas) || 0;
    ritmoMap.set(row.producto_id, total / DIAS_RITMO_VENTA);
  }

  // 5. Identificar qué productos están en combos activos
  const [comboRows]: any = await pool.execute(
    `SELECT DISTINCT cp.producto_id
     FROM combo_productos cp
     JOIN combos c ON c.id = cp.combo_id
     WHERE c.activo = 1`
  );
  const productosEnCombo = new Set<number>(comboRows.map((r: any) => r.producto_id));

  // 6. Evaluar reglas de alerta para cada producto
  const alertas: AlertaInventario[] = [];

  for (const row of invRows) {
    const prodId = Number(row.producto_id);
    const disponibles = Number(row.existencias) || 0;
    const apartadas = apartadasMap.get(prodId) || 0;
    const ritmo = ritmoMap.get(prodId) || 0;
    const enCombo = productosEnCombo.has(prodId);
    const enPorRecoger = productosEnPorRecoger.has(prodId);

    // Regla: "Agotado" si disponibles = 0 y hay ritmo de venta
    if (disponibles === 0 && ritmo > 0) {
      alertas.push({
        productoId: prodId,
        nombre: row.nombre,
        sku: row.sku,
        disponibles,
        apartadas,
        ritmoDiario: Math.round(ritmo * 100) / 100,
        diasRestantes: 0,
        enCombo,
        tipoAlerta: "agotado",
        etiquetaAlerta: "Agotado",
        enPedidosPorRecoger: enPorRecoger,
      });
      continue;
    }

    // Si hay ritmo de venta y hay existencias
    if (ritmo > 0) {
      const diasCubiertos = disponibles / ritmo;
      const diasAprox = Math.ceil(diasCubiertos);

      // Regla: "Se agota en ~N días" si disponibles / ritmo <= 7
      if (diasCubiertos <= DIAS_AGOTA_ALERTA) {
        alertas.push({
          productoId: prodId,
          nombre: row.nombre,
          sku: row.sku,
          disponibles,
          apartadas,
          ritmoDiario: Math.round(ritmo * 100) / 100,
          diasRestantes: diasAprox,
          enCombo,
          tipoAlerta: "agotandose",
          etiquetaAlerta: `Se agota en ~${diasAprox} días`,
          enPedidosPorRecoger: enPorRecoger,
        });
        continue;
      }

      // Regla: "Sobrestock · en combos" si disponibles cubren más de 45 días y está en combo activo; "Sobrestock" si no está en combos
      if (diasCubiertos > DIAS_SOBRESTOCK) {
        alertas.push({
          productoId: prodId,
          nombre: row.nombre,
          sku: row.sku,
          disponibles,
          apartadas,
          ritmoDiario: Math.round(ritmo * 100) / 100,
          diasRestantes: diasAprox,
          enCombo,
          tipoAlerta: "sobrestock",
          etiquetaAlerta: enCombo ? "Sobrestock · en combos" : "Sobrestock",
          enPedidosPorRecoger: enPorRecoger,
        });
        continue;
      }
    }
  }

  // 7. Ordenar: Primero alertas críticas (agotado, agotándose),
  // luego productos en pedidos por recoger, luego en combos activos (promoción comercial),
  // y finalmente por volumen de existencias. Máximo 5.
  alertas.sort((a, b) => {
    const esCriticaA = a.tipoAlerta === "agotado" || a.tipoAlerta === "agotandose";
    const esCriticaB = b.tipoAlerta === "agotado" || b.tipoAlerta === "agotandose";
    if (esCriticaA && !esCriticaB) return -1;
    if (!esCriticaA && esCriticaB) return 1;

    if (a.enPedidosPorRecoger && !b.enPedidosPorRecoger) return -1;
    if (!a.enPedidosPorRecoger && b.enPedidosPorRecoger) return 1;

    if (a.enCombo && !b.enCombo) return -1;
    if (!a.enCombo && b.enCombo) return 1;

    return b.disponibles - a.disponibles;
  });

  return alertas.slice(0, 5);
}
