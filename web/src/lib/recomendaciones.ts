import { getDbPool } from "./db";

export interface RoutineStepProduct {
  id: number;
  nombre: string;
  slug: string;
  tipo_rutina: string;
  categoria_nombre: string;
  precio: number;
  precio_especial: number | null;
  color_fondo: string;
  color_frasco: string;
  total_stock: number;
}

export interface RecommendedRoutine {
  hasProfile: boolean;
  tipo_piel?: string;
  paso1?: RoutineStepProduct;
  paso2?: RoutineStepProduct;
  paso3?: RoutineStepProduct;
  totalOriginal: number;
  totalConDescuento: number;
  descuentoPorcentaje: number;
}

export async function getRecomendacionRutina(userId: number | null): Promise<RecommendedRoutine | null> {
  if (!userId) return null;

  const pool = getDbPool();

  // 1. Obtener perfil de piel
  const [profileRows]: any = await pool.execute(
    "SELECT id, tipo_piel, presupuesto FROM perfiles_piel WHERE usuario_id = ? LIMIT 1",
    [userId]
  );

  if (!profileRows || profileRows.length === 0) {
    return { hasProfile: false, totalOriginal: 0, totalConDescuento: 0, descuentoPorcentaje: 10 };
  }

  const profile = profileRows[0];
  const tipoPiel = profile.tipo_piel;
  const presupuesto = profile.presupuesto;

  // 2. Obtener preocupaciones del perfil
  const [preocRows]: any = await pool.execute(
    "SELECT preocupacion FROM perfil_preocupaciones WHERE perfil_id = ?",
    [profile.id]
  );
  const userPreocupaciones: string[] = preocRows.map((r: any) => r.preocupacion);

  // 3. Obtener productos comprados previamente por el usuario
  const [orderRows]: any = await pool.execute(
    `SELECT DISTINCT pi.producto_id 
     FROM pedidos p 
     JOIN pedido_items pi ON pi.pedido_id = p.id 
     WHERE p.usuario_id = ?`,
    [userId]
  );
  const purchasedIds = new Set<number>(orderRows.map((r: any) => Number(r.producto_id)));

  // Rango de presupuesto
  const matchesBudget = (precio: number) => {
    if (presupuesto === "bajo") return precio <= 300;
    if (presupuesto === "medio") return precio >= 250 && precio <= 450;
    if (presupuesto === "alto") return precio >= 400;
    return true;
  };

  // Función para seleccionar el mejor producto para un tipo de rutina
  async function selectBestProductForStep(tipoRutina: string): Promise<RoutineStepProduct | undefined> {
    // Consultar productos compatibles con el tipo de piel y con stock > 0
    const [candidateRows]: any = await pool.execute(
      `SELECT 
        p.id, 
        p.nombre, 
        p.slug, 
        p.tipo_rutina, 
        p.precio, 
        p.precio_especial, 
        p.color_fondo, 
        p.color_frasco,
        c.nombre as categoria_nombre,
        COALESCE(SUM(i.existencias), 0) as total_stock
       FROM productos p
       JOIN categorias c ON c.id = p.categoria_id
       JOIN producto_tipos_piel ptp ON ptp.producto_id = p.id AND ptp.tipo_piel = ?
       LEFT JOIN inventario i ON i.producto_id = p.id
       WHERE p.activo = 1 AND p.tipo_rutina = ?
       GROUP BY p.id
       HAVING total_stock > 0`,
      [tipoPiel, tipoRutina]
    );

    if (!candidateRows || candidateRows.length === 0) {
      return undefined;
    }

    // Para cada candidato, obtener número de preocupaciones coincidentes
    const candidatesWithScores = await Promise.all(
      candidateRows.map(async (p: any) => {
        const [ppRows]: any = await pool.execute(
          "SELECT preocupacion FROM producto_preocupaciones WHERE producto_id = ?",
          [p.id]
        );
        const prodPreocs: string[] = ppRows.map((r: any) => r.preocupacion);
        const matchCount = prodPreocs.filter((pr) => userPreocupaciones.includes(pr)).length;
        const precioEfectivo = Number(p.precio_especial ?? p.precio);
        const inBudget = matchesBudget(precioEfectivo);
        const wasPurchased = purchasedIds.has(p.id);

        return {
          product: {
            id: p.id,
            nombre: p.nombre,
            slug: p.slug,
            tipo_rutina: p.tipo_rutina,
            categoria_nombre: p.categoria_nombre,
            precio: Number(p.precio),
            precio_especial: p.precio_especial ? Number(p.precio_especial) : null,
            color_fondo: p.color_fondo,
            color_frasco: p.color_frasco,
            total_stock: Number(p.total_stock),
          },
          inBudget,
          matchCount,
          wasPurchased,
          precioEfectivo,
          stock: Number(p.total_stock),
        };
      })
    );

    // Ordenar según reglas del negocio:
    // 1. Entra en el presupuesto del perfil
    // 2. Coincide con más preocupaciones
    // 3. Lo que el usuario ya compró (desempate 1)
    // 4. Mayor stock (desempate 2)
    // 5. Si nada entra en presupuesto, el más barato compatible
    candidatesWithScores.sort((a, b) => {
      if (a.inBudget !== b.inBudget) {
        return a.inBudget ? -1 : 1;
      }
      if (a.matchCount !== b.matchCount) {
        return b.matchCount - a.matchCount;
      }
      if (a.wasPurchased !== b.wasPurchased) {
        return a.wasPurchased ? -1 : 1;
      }
      if (a.stock !== b.stock) {
        return b.stock - a.stock;
      }
      return a.precioEfectivo - b.precioEfectivo;
    });

    return candidatesWithScores[0]?.product;
  }

  // Obtener los 3 pasos de rutina
  const paso1 = await selectBestProductForStep("limpiador");
  const paso2 = await selectBestProductForStep("serum");
  const paso3 = await selectBestProductForStep("protector");

  const steps = [paso1, paso2, paso3].filter(Boolean) as RoutineStepProduct[];

  const totalOriginal = steps.reduce(
    (acc, item) => acc + (item.precio_especial ?? item.precio),
    0
  );

  const descuentoPorcentaje = 10;
  const totalConDescuento = Math.round(totalOriginal * (1 - descuentoPorcentaje / 100));

  return {
    hasProfile: true,
    tipo_piel: tipoPiel,
    paso1,
    paso2,
    paso3,
    totalOriginal,
    totalConDescuento,
    descuentoPorcentaje,
  };
}
