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

export interface ProductoRutinaResponse {
  esRutina3Pasos: boolean;
  paso1?: RoutineStepProduct;
  paso2?: RoutineStepProduct;
  paso3?: RoutineStepProduct;
  combo?: any | null;
}

/**
 * Obtiene la sección "Completa tu rutina" para la ficha de un producto.
 * Si el producto es limpiador, serum o protector: arma la rutina de 3 pasos con este fijo.
 * Si no: busca un combo activo que lo contenga.
 */
export async function getRutinaParaProducto(
  productoId: number,
  userId: number | null
): Promise<ProductoRutinaResponse> {
  const pool = getDbPool();

  // 1. Consultar el producto actual
  const [prodRows]: any = await pool.execute(
    `SELECT 
      p.id, 
      p.nombre, 
      p.slug, 
      p.tipo_rutina, 
      c.nombre as categoria_nombre, 
      p.precio, 
      p.precio_especial, 
      p.color_fondo, 
      p.color_frasco,
      COALESCE(SUM(i.existencias), 0) as total_stock
     FROM productos p
     JOIN categorias c ON c.id = p.categoria_id
     LEFT JOIN inventario i ON i.producto_id = p.id
     WHERE p.id = ? AND p.activo = 1
     GROUP BY p.id`,
    [productoId]
  );

  if (!prodRows || prodRows.length === 0) {
    return { esRutina3Pasos: false, combo: null };
  }

  const currentProd = prodRows[0];
  const currentStep = currentProd.tipo_rutina;

  const currentStepProduct: RoutineStepProduct = {
    id: Number(currentProd.id),
    nombre: currentProd.nombre,
    slug: currentProd.slug,
    tipo_rutina: currentProd.tipo_rutina,
    categoria_nombre: currentProd.categoria_nombre,
    precio: Number(currentProd.precio),
    precio_especial: currentProd.precio_especial ? Number(currentProd.precio_especial) : null,
    color_fondo: currentProd.color_fondo,
    color_frasco: currentProd.color_frasco,
    total_stock: Number(currentProd.total_stock),
  };

  const RUTINA_VALID_STEPS = ["limpiador", "serum", "protector"];

  if (RUTINA_VALID_STEPS.includes(currentStep)) {
    // Es uno de los 3 pasos: fijamos este producto y buscamos los otros dos
    const routineData = await getRecomendacionRutina(userId);

    // Si no hay perfil, buscamos los más vendidos para los pasos faltantes
    const getFallbackStep = async (step: string) => {
      const [rows]: any = await pool.execute(
        `SELECT 
          p.id, p.nombre, p.slug, p.tipo_rutina, c.nombre as categoria_nombre, 
          p.precio, p.precio_especial, p.color_fondo, p.color_frasco,
          COALESCE(SUM(i.existencias), 0) as total_stock
         FROM productos p
         JOIN categorias c ON c.id = p.categoria_id
         LEFT JOIN inventario i ON i.producto_id = p.id
         WHERE p.tipo_rutina = ? AND p.activo = 1 AND p.id != ?
         GROUP BY p.id
         HAVING total_stock > 0
         ORDER BY (
           SELECT COALESCE(SUM(pi.cantidad), 0) 
           FROM pedido_items pi 
           WHERE pi.producto_id = p.id
         ) DESC, p.id ASC
         LIMIT 1`,
        [step, productoId]
      );
      if (!rows || rows.length === 0) return undefined;
      const r = rows[0];
      return {
        id: Number(r.id),
        nombre: r.nombre,
        slug: r.slug,
        tipo_rutina: r.tipo_rutina,
        categoria_nombre: r.categoria_nombre,
        precio: Number(r.precio),
        precio_especial: r.precio_especial ? Number(r.precio_especial) : null,
        color_fondo: r.color_fondo,
        color_frasco: r.color_frasco,
        total_stock: Number(r.total_stock),
      };
    };

    let paso1: RoutineStepProduct | undefined;
    let paso2: RoutineStepProduct | undefined;
    let paso3: RoutineStepProduct | undefined;

    if (currentStep === "limpiador") {
      paso1 = currentStepProduct;
      paso2 = routineData?.paso2 || (await getFallbackStep("serum"));
      paso3 = routineData?.paso3 || (await getFallbackStep("protector"));
    } else if (currentStep === "serum") {
      paso1 = routineData?.paso1 || (await getFallbackStep("limpiador"));
      paso2 = currentStepProduct;
      paso3 = routineData?.paso3 || (await getFallbackStep("protector"));
    } else if (currentStep === "protector") {
      paso1 = routineData?.paso1 || (await getFallbackStep("limpiador"));
      paso2 = routineData?.paso2 || (await getFallbackStep("serum"));
      paso3 = currentStepProduct;
    }

    return {
      esRutina3Pasos: true,
      paso1,
      paso2,
      paso3,
      combo: null,
    };
  }

  // Si no pertenece a limpiador, serum o protector: buscamos si hay un combo activo que lo incluya
  const [comboRows]: any = await pool.execute(
    `SELECT c.id, c.nombre, c.slug, c.descripcion_corta, c.descuento_porcentaje, c.color_fondo
     FROM combos c
     JOIN combo_productos cp ON cp.combo_id = c.id
     WHERE cp.producto_id = ? AND c.activo = 1
     LIMIT 1`,
    [productoId]
  );

  if (comboRows && comboRows.length > 0) {
    const c = comboRows[0];
    const [prodItems]: any = await pool.execute(
      `SELECT cp.producto_id, cp.cantidad, p.nombre, p.precio, p.precio_especial,
              COALESCE(SUM(i.existencias), 0) as total_stock
       FROM combo_productos cp
       JOIN productos p ON p.id = cp.producto_id
       LEFT JOIN inventario i ON i.producto_id = cp.producto_id
       WHERE cp.combo_id = ?
       GROUP BY cp.producto_id`,
      [c.id]
    );

    const prods = prodItems || [];
    const subtotal = prods.reduce((acc: number, item: any) => {
      return acc + Number(item.precio_especial ?? item.precio) * Number(item.cantidad);
    }, 0);
    const descPct = Number(c.descuento_porcentaje || 0);
    const finalPrice = Math.round(subtotal * (1 - descPct / 100));
    const agotado = prods.some((p: any) => Number(p.total_stock) < Number(p.cantidad));

    return {
      esRutina3Pasos: false,
      combo: {
        id: Number(c.id),
        nombre: c.nombre,
        slug: c.slug,
        descripcion_corta: c.descripcion_corta,
        descuento_porcentaje: descPct,
        color_fondo: c.color_fondo,
        precio_original: subtotal,
        precio_final: finalPrice,
        agotado,
        productos: prods,
      },
    };
  }

  return { esRutina3Pasos: false, combo: null };
}

// =====================================================================
// PANTALLA RUTINAS Y COMBOS — REGLAS DE NEGOCIO Y ARMADO DINÁMICO
// =====================================================================

export interface RutinaArmadaProducto {
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
  orden_paso: number;
  etiqueta_paso: string;
}

export interface RutinaArmada {
  plantillaId: number;
  clave: string;
  nombre: string;
  descripcion: string;
  descuentoPorcentaje: number;
  tipoPiel: string;
  disponible: boolean;
  pasoFaltante?: string;
  mensajeIndisponible?: string;
  productos: RutinaArmadaProducto[];
  totalOriginal: number;
  totalConDescuento: number;
}

export interface SeccionRutina {
  tipoPiel: string;
  label: string;
  rutinas: RutinaArmada[];
}

export interface ComboRutinasItem {
  id: number;
  nombre: string;
  slug: string;
  descripcion_corta: string;
  descuento_porcentaje: number;
  color_fondo: string;
  inicia_en: string;
  termina_en: string | null;
  vigencia_texto: string;
  precio_original: number;
  precio_final: number;
  agotado: boolean;
  esIdealParaTuPiel?: boolean;
  productos: Array<{
    producto_id: number;
    nombre: string;
    slug: string;
    color_fondo: string;
    color_frasco: string;
    cantidad: number;
    precio: number;
    precio_especial: number | null;
    total_stock: number;
  }>;
}

/**
 * Calcula el texto de vigencia de un combo según reglas de negocio:
 * - "Hasta agotar existencias" si no tiene termina_en
 * - "Termina en N días" si faltan 7 días o menos
 * - "Hasta el {día} de {mes}" en cualquier otro caso
 */
export function calcularVigenciaTexto(terminaEn: string | Date | null | undefined): string {
  if (!terminaEn) {
    return "Hasta agotar existencias";
  }

  const targetDate = new Date(terminaEn);
  if (isNaN(targetDate.getTime())) {
    return "Hasta agotar existencias";
  }

  const now = new Date();
  const diffTime = targetDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return "Termina hoy";
  }
  if (diffDays <= 7) {
    return `Termina en ${diffDays} ${diffDays === 1 ? "día" : "días"}`;
  }

  const meses = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
  ];
  const dia = targetDate.getDate();
  const mes = meses[targetDate.getMonth()];
  return `Hasta el ${dia} de ${mes}`;
}

/**
 * Arma una rutina individual seleccionando los mejores productos para cada paso de la plantilla.
 * Prioridades:
 * - Si hay sesión y el tipo de piel coincide con su perfil: preocupaciones > presupuesto > compras previas > stock
 * - En cualquier otro caso: más vendidos de los últimos 90 días compatibles con ese tipo de piel
 * - Un mismo producto no puede repetirse dentro de la misma rutina
 */
export async function armarRutina(
  plantillaOrClave: string | { id: number; clave: string; nombre: string; descripcion: string; descuento_porcentaje: number },
  tipoPiel: string,
  userId: number | null = null
): Promise<RutinaArmada> {
  const pool = getDbPool();

  // 1. Obtener la plantilla activa
  let plantilla: {
    id: number;
    clave: string;
    nombre: string;
    descripcion: string;
    descuento_porcentaje: number;
  };

  if (typeof plantillaOrClave === "string") {
    const [rows]: any = await pool.execute(
      "SELECT id, clave, nombre, descripcion, descuento_porcentaje FROM plantillas_rutina WHERE clave = ? AND activa = 1 LIMIT 1",
      [plantillaOrClave]
    );
    if (!rows || rows.length === 0) {
      throw new Error(`Plantilla de rutina "${plantillaOrClave}" no encontrada.`);
    }
    plantilla = rows[0];
  } else {
    plantilla = plantillaOrClave;
  }

  const descuentoPorcentaje = Number(plantilla.descuento_porcentaje || 0);

  // 2. Obtener los pasos de la plantilla
  const [pasoRows]: any = await pool.execute(
    "SELECT orden, tipo_rutina, etiqueta FROM plantilla_pasos WHERE plantilla_id = ? ORDER BY orden ASC",
    [plantilla.id]
  );
  const pasos: Array<{ orden: number; tipo_rutina: string; etiqueta: string }> = pasoRows || [];

  // 3. Revisar perfil del usuario para personalización
  let matchesUserProfile = false;
  let userPreocupaciones: string[] = [];
  let userPresupuesto: string = "medio";
  let purchasedIds = new Set<number>();

  if (userId) {
    const [profileRows]: any = await pool.execute(
      "SELECT id, tipo_piel, presupuesto FROM perfiles_piel WHERE usuario_id = ? LIMIT 1",
      [userId]
    );

    if (profileRows && profileRows.length > 0) {
      const p = profileRows[0];
      if (p.tipo_piel === tipoPiel) {
        matchesUserProfile = true;
        userPresupuesto = p.presupuesto || "medio";

        const [preocRows]: any = await pool.execute(
          "SELECT preocupacion FROM perfil_preocupaciones WHERE perfil_id = ?",
          [p.id]
        );
        userPreocupaciones = (preocRows || []).map((r: any) => r.preocupacion);

        const [orderRows]: any = await pool.execute(
          `SELECT DISTINCT pi.producto_id 
           FROM pedidos ped 
           JOIN pedido_items pi ON pi.pedido_id = ped.id 
           WHERE ped.usuario_id = ?`,
          [userId]
        );
        purchasedIds = new Set<number>((orderRows || []).map((r: any) => Number(r.producto_id)));
      }
    }
  }

  const matchesBudget = (precio: number) => {
    if (userPresupuesto === "bajo") return precio <= 300;
    if (userPresupuesto === "medio") return precio >= 250 && precio <= 450;
    if (userPresupuesto === "alto") return precio >= 400;
    return true;
  };

  // Conjunto de productos ya usados dentro de ESTA rutina para no repetir
  const usedInRoutine = new Set<number>();
  const productosArmados: RutinaArmadaProducto[] = [];
  let rutinaDisponible = true;
  let pasoFaltante: string | undefined = undefined;

  for (const paso of pasos) {
    // Buscar candidatos compatibles con tipo_piel y tipo_rutina con stock > 0
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
        COALESCE(SUM(i.existencias), 0) as total_stock,
        (
          SELECT COALESCE(SUM(pi.cantidad), 0) 
          FROM pedido_items pi 
          JOIN pedidos ped ON ped.id = pi.pedido_id 
          WHERE pi.producto_id = p.id 
            AND ped.creado_en >= DATE_SUB(NOW(), INTERVAL 90 DAY)
        ) as ventas_90_dias
       FROM productos p
       JOIN categorias c ON c.id = p.categoria_id
       JOIN producto_tipos_piel ptp ON ptp.producto_id = p.id AND ptp.tipo_piel = ?
       LEFT JOIN inventario i ON i.producto_id = p.id
       WHERE p.activo = 1 AND p.tipo_rutina = ?
       GROUP BY p.id
       HAVING total_stock > 0`,
      [tipoPiel, paso.tipo_rutina]
    );

    // Filtrar los que ya se hayan seleccionado en pasos anteriores de esta misma rutina
    const availableCandidates = (candidateRows || []).filter(
      (c: any) => !usedInRoutine.has(Number(c.id))
    );

    if (availableCandidates.length === 0) {
      rutinaDisponible = false;
      if (!pasoFaltante) {
        pasoFaltante = paso.etiqueta;
      }
      continue;
    }

    if (matchesUserProfile) {
      // Priorizar por perfil: preocupaciones > presupuesto > compras previas > stock
      const candidatesScored = await Promise.all(
        availableCandidates.map(async (c: any) => {
          const [ppRows]: any = await pool.execute(
            "SELECT preocupacion FROM producto_preocupaciones WHERE producto_id = ?",
            [c.id]
          );
          const prodPreocs: string[] = (ppRows || []).map((r: any) => r.preocupacion);
          const matchCount = prodPreocs.filter((pr) => userPreocupaciones.includes(pr)).length;
          const precioEfectivo = Number(c.precio_especial ?? c.precio);
          const inBudget = matchesBudget(precioEfectivo);
          const wasPurchased = purchasedIds.has(Number(c.id));

          return {
            raw: c,
            matchCount,
            inBudget,
            wasPurchased,
            stock: Number(c.total_stock),
            precioEfectivo,
          };
        })
      );

      candidatesScored.sort((a, b) => {
        if (a.matchCount !== b.matchCount) {
          return b.matchCount - a.matchCount;
        }
        if (a.inBudget !== b.inBudget) {
          return a.inBudget ? -1 : 1;
        }
        if (a.wasPurchased !== b.wasPurchased) {
          return a.wasPurchased ? -1 : 1;
        }
        if (a.stock !== b.stock) {
          return b.stock - a.stock;
        }
        return a.precioEfectivo - b.precioEfectivo;
      });

      const best = candidatesScored[0].raw;
      usedInRoutine.add(Number(best.id));
      productosArmados.push({
        id: Number(best.id),
        nombre: best.nombre,
        slug: best.slug,
        tipo_rutina: best.tipo_rutina,
        categoria_nombre: best.categoria_nombre,
        precio: Number(best.precio),
        precio_especial: best.precio_especial ? Number(best.precio_especial) : null,
        color_fondo: best.color_fondo,
        color_frasco: best.color_frasco,
        total_stock: Number(best.total_stock),
        orden_paso: paso.orden,
        etiqueta_paso: paso.etiqueta,
      });
    } else {
      // Priorizar los más vendidos de los últimos 90 días compatibles
      availableCandidates.sort((a: any, b: any) => {
        const ventasA = Number(a.ventas_90_dias || 0);
        const ventasB = Number(b.ventas_90_dias || 0);
        if (ventasA !== ventasB) {
          return ventasB - ventasA;
        }
        const stockA = Number(a.total_stock || 0);
        const stockB = Number(b.total_stock || 0);
        if (stockA !== stockB) {
          return stockB - stockA;
        }
        const pA = Number(a.precio_especial ?? a.precio);
        const pB = Number(b.precio_especial ?? b.precio);
        return pA - pB;
      });

      const best = availableCandidates[0];
      usedInRoutine.add(Number(best.id));
      productosArmados.push({
        id: Number(best.id),
        nombre: best.nombre,
        slug: best.slug,
        tipo_rutina: best.tipo_rutina,
        categoria_nombre: best.categoria_nombre,
        precio: Number(best.precio),
        precio_especial: best.precio_especial ? Number(best.precio_especial) : null,
        color_fondo: best.color_fondo,
        color_frasco: best.color_frasco,
        total_stock: Number(best.total_stock),
        orden_paso: paso.orden,
        etiqueta_paso: paso.etiqueta,
      });
    }
  }

  const totalOriginal = productosArmados.reduce(
    (acc, p) => acc + (p.precio_especial ?? p.precio),
    0
  );
  const totalConDescuento = Math.round(totalOriginal * (1 - descuentoPorcentaje / 100));

  return {
    plantillaId: plantilla.id,
    clave: plantilla.clave,
    nombre: plantilla.nombre,
    descripcion: plantilla.descripcion,
    descuentoPorcentaje,
    tipoPiel,
    disponible: rutinaDisponible && productosArmados.length === pasos.length,
    pasoFaltante,
    mensajeIndisponible:
      !rutinaDisponible || productosArmados.length !== pasos.length
        ? "Esta rutina no está disponible hoy"
        : undefined,
    productos: productosArmados,
    totalOriginal,
    totalConDescuento,
  };
}

const NOMBRES_TIPO_PIEL: Record<string, string> = {
  mixta: "Piel mixta",
  seca: "Piel seca",
  grasa: "Piel grasa",
  normal: "Piel normal",
  sensible: "Piel sensible",
};

/**
 * Obtiene las secciones de rutinas armadas para un tipo de piel específico o para todas
 */
export async function getRutinasArmadas(
  tipoPiel: string,
  userId: number | null = null
): Promise<SeccionRutina[]> {
  const pool = getDbPool();

  // Obtener plantillas activas ordenadas
  const [plantillas]: any = await pool.execute(
    "SELECT id, clave, nombre, descripcion, descuento_porcentaje FROM plantillas_rutina WHERE activa = 1 ORDER BY orden ASC"
  );

  const plantillasActivas = plantillas || [];

  const armarSeccion = async (piel: string): Promise<SeccionRutina> => {
    const rutinas = await Promise.all(
      plantillasActivas.map((pl: any) => armarRutina(pl, piel, userId))
    );
    return {
      tipoPiel: piel,
      label: NOMBRES_TIPO_PIEL[piel] || `Piel ${piel}`,
      rutinas,
    };
  };

  if (tipoPiel === "todas") {
    const ordenTipos = ["mixta", "seca", "grasa", "normal", "sensible"];
    const secciones = await Promise.all(ordenTipos.map((tp) => armarSeccion(tp)));
    return secciones;
  }

  const seccion = await armarSeccion(tipoPiel);
  return [seccion];
}

/**
 * Obtiene los combos vigentes de la semana ordenados según especificación:
 * - Vigencia entre inicia_en y termina_en (o sin término)
 * - Compatibles con el tipo de piel del usuario primero ("Ideal para tu piel")
 * - Luego por descuento mayor a menor
 */
export async function getCombosParaRutinas(
  userId: number | null = null
): Promise<ComboRutinasItem[]> {
  const pool = getDbPool();

  let userTipoPiel: string | null = null;
  if (userId) {
    const [profileRows]: any = await pool.execute(
      "SELECT tipo_piel FROM perfiles_piel WHERE usuario_id = ? LIMIT 1",
      [userId]
    );
    if (profileRows && profileRows.length > 0) {
      userTipoPiel = profileRows[0].tipo_piel;
    }
  }

  const [comboRows]: any = await pool.execute(
    `SELECT 
      id, nombre, slug, descripcion_corta, descuento_porcentaje, color_fondo, 
      inicia_en, termina_en
     FROM combos
     WHERE activo = 1 
       AND inicia_en <= NOW() 
       AND (termina_en IS NULL OR termina_en >= NOW())
     ORDER BY descuento_porcentaje DESC`
  );

  const combos: ComboRutinasItem[] = await Promise.all(
    (comboRows || []).map(async (c: any) => {
      const [prodRows]: any = await pool.execute(
        `SELECT 
          cp.producto_id, 
          cp.cantidad, 
          p.nombre, 
          p.slug,
          p.color_fondo,
          p.color_frasco,
          p.precio, 
          p.precio_especial,
          COALESCE(SUM(i.existencias), 0) as total_stock
         FROM combo_productos cp
         JOIN productos p ON p.id = cp.producto_id
         LEFT JOIN inventario i ON i.producto_id = cp.producto_id
         WHERE cp.combo_id = ?
         GROUP BY cp.producto_id`,
        [c.id]
      );

      const prods = prodRows || [];
      const subtotal = prods.reduce((acc: number, p: any) => {
        const precioUnit = Number(p.precio_especial ?? p.precio);
        return acc + precioUnit * Number(p.cantidad);
      }, 0);

      const descPct = Number(c.descuento_porcentaje || 0);
      const precioFinal = Math.round(subtotal * (1 - descPct / 100));
      const agotado = prods.some((p: any) => Number(p.total_stock) < Number(p.cantidad));
      const vigenciaTexto = calcularVigenciaTexto(c.termina_en);

      // Evaluar si es compatible con el tipo de piel del perfil
      let esIdealParaTuPiel = false;
      if (userTipoPiel && prods.length > 0) {
        const compatibilidades = await Promise.all(
          prods.map(async (p: any) => {
            const [cRows]: any = await pool.execute(
              "SELECT 1 FROM producto_tipos_piel WHERE producto_id = ? AND tipo_piel = ? LIMIT 1",
              [p.producto_id, userTipoPiel]
            );
            return cRows && cRows.length > 0;
          })
        );
        // Si todos los productos del combo son compatibles con su piel
        esIdealParaTuPiel = compatibilidades.every(Boolean);
      }

      return {
        id: Number(c.id),
        nombre: c.nombre,
        slug: c.slug,
        descripcion_corta: c.descripcion_corta,
        descuento_porcentaje: descPct,
        color_fondo: c.color_fondo || "#FDF2F4",
        inicia_en: c.inicia_en,
        termina_en: c.termina_en,
        vigencia_texto: vigenciaTexto,
        precio_original: subtotal,
        precio_final: precioFinal,
        agotado,
        esIdealParaTuPiel,
        productos: prods.map((p: any) => ({
          producto_id: Number(p.producto_id),
          nombre: p.nombre,
          slug: p.slug,
          color_fondo: p.color_fondo,
          color_frasco: p.color_frasco,
          cantidad: Number(p.cantidad),
          precio: Number(p.precio),
          precio_especial: p.precio_especial ? Number(p.precio_especial) : null,
          total_stock: Number(p.total_stock),
        })),
      };
    })
  );

  // Ordenar: Ideales para tu piel primero, luego mayor descuento
  combos.sort((a, b) => {
    if (a.esIdealParaTuPiel !== b.esIdealParaTuPiel) {
      return a.esIdealParaTuPiel ? -1 : 1;
    }
    return b.descuento_porcentaje - a.descuento_porcentaje;
  });

  return combos;
}

export interface SugerenciaProducto {
  id: number;
  nombre: string;
  slug: string;
  precio: number;
  precio_especial: number | null;
  color_fondo: string;
  color_frasco: string;
  badge?: string | null;
}

/**
 * Obtiene hasta 4 productos sugeridos para la sección 'También te puede gustar' del carrito.
 * Prioriza productos relacionados con los que están en el carrito; si faltan, compatibles
 * con el perfil de piel o los más vendidos. Excluye artículos ya presentes en el carrito.
 */
export async function getSugerenciasCarrito(
  carritoId: number,
  userId: number | null = null
): Promise<SugerenciaProducto[]> {
  const pool = getDbPool();

  // 1. Obtener IDs de productos actualmente en el carrito
  const [cartItemRows]: any = await pool.execute(
    "SELECT DISTINCT producto_id FROM carrito_items WHERE carrito_id = ? AND producto_id IS NOT NULL AND eliminado_en IS NULL",
    [carritoId]
  );

  const cartProdIds = (cartItemRows || [])
    .map((r: any) => Number(r.producto_id))
    .filter((id: number) => !isNaN(id) && id > 0);

  if (cartProdIds.length === 0) {
    return [];
  }

  const sugerencias: SugerenciaProducto[] = [];
  const excludedIds = new Set<number>(cartProdIds);

  // 2. Buscar en productos_relacionados
  const placeholders = cartProdIds.map(() => "?").join(",");
  const [relRows]: any = await pool.execute(
    `SELECT 
      p.id, p.nombre, p.slug, p.precio, p.precio_especial, p.color_fondo, p.color_frasco,
      COALESCE(SUM(i.existencias), 0) as total_stock
     FROM productos_relacionados pr
     JOIN productos p ON p.id = pr.relacionado_id
     LEFT JOIN inventario i ON i.producto_id = p.id
     WHERE pr.producto_id IN (${placeholders}) 
       AND p.activo = 1 
       AND p.id NOT IN (${placeholders})
     GROUP BY p.id
     HAVING total_stock > 0
     ORDER BY pr.prioridad ASC
     LIMIT 4`,
    [...cartProdIds, ...cartProdIds]
  );

  for (const r of relRows || []) {
    if (sugerencias.length >= 4) break;
    const pId = Number(r.id);
    if (!excludedIds.has(pId)) {
      excludedIds.add(pId);
      const stock = Number(r.total_stock);
      const pEsp = r.precio_especial ? Number(r.precio_especial) : null;
      const pNorm = Number(r.precio);
      let badge: string | null = null;
      if (pEsp && pEsp < pNorm) {
        badge = "Precio especial";
      } else if (stock <= 5) {
        badge = `Quedan ${stock}`;
      }

      sugerencias.push({
        id: pId,
        nombre: r.nombre,
        slug: r.slug,
        precio: pNorm,
        precio_especial: pEsp,
        color_fondo: r.color_fondo,
        color_frasco: r.color_frasco,
        badge,
      });
    }
  }

  // 3. Si faltan para 4, buscar compatibles con el perfil de piel del usuario
  if (sugerencias.length < 4 && userId) {
    const [profileRows]: any = await pool.execute(
      "SELECT tipo_piel FROM perfiles_piel WHERE usuario_id = ? LIMIT 1",
      [userId]
    );
    if (profileRows && profileRows.length > 0 && profileRows[0].tipo_piel) {
      const tipoPiel = profileRows[0].tipo_piel;
      const exArray = Array.from(excludedIds);
      const exPlaceholders = exArray.map(() => "?").join(",");
      const limit = 4 - sugerencias.length;

      const [profRows]: any = await pool.execute(
        `SELECT 
          p.id, p.nombre, p.slug, p.precio, p.precio_especial, p.color_fondo, p.color_frasco,
          COALESCE(SUM(i.existencias), 0) as total_stock
         FROM productos p
         JOIN producto_tipos_piel ptp ON ptp.producto_id = p.id AND ptp.tipo_piel = ?
         LEFT JOIN inventario i ON i.producto_id = p.id
         WHERE p.activo = 1 
           AND p.id NOT IN (${exPlaceholders})
         GROUP BY p.id
         HAVING total_stock > 0
         ORDER BY p.id ASC
         LIMIT ${limit}`,
        [tipoPiel, ...exArray]
      );

      for (const r of profRows || []) {
        if (sugerencias.length >= 4) break;
        const pId = Number(r.id);
        if (!excludedIds.has(pId)) {
          excludedIds.add(pId);
          const stock = Number(r.total_stock);
          const pEsp = r.precio_especial ? Number(r.precio_especial) : null;
          const pNorm = Number(r.precio);
          let badge: string | null = null;
          if (pEsp && pEsp < pNorm) {
            badge = "Precio especial";
          } else if (stock <= 5) {
            badge = `Quedan ${stock}`;
          }

          sugerencias.push({
            id: pId,
            nombre: r.nombre,
            slug: r.slug,
            precio: pNorm,
            precio_especial: pEsp,
            color_fondo: r.color_fondo,
            color_frasco: r.color_frasco,
            badge,
          });
        }
      }
    }
  }

  // 4. Si aún faltan para 4, complementar con los más vendidos
  if (sugerencias.length < 4) {
    const exArray = Array.from(excludedIds);
    const exPlaceholders = exArray.map(() => "?").join(",");
    const limit = 4 - sugerencias.length;

    const [topRows]: any = await pool.execute(
      `SELECT 
        p.id, p.nombre, p.slug, p.precio, p.precio_especial, p.color_fondo, p.color_frasco,
        COALESCE(SUM(i.existencias), 0) as total_stock,
        (SELECT COALESCE(SUM(pi.cantidad), 0) FROM pedido_items pi WHERE pi.producto_id = p.id) as ventas
       FROM productos p
       LEFT JOIN inventario i ON i.producto_id = p.id
       WHERE p.activo = 1 
         AND p.id NOT IN (${exPlaceholders})
       GROUP BY p.id
       HAVING total_stock > 0
       ORDER BY ventas DESC, p.id ASC
       LIMIT ${limit}`,
      [...exArray]
    );

    for (const r of topRows || []) {
      if (sugerencias.length >= 4) break;
      const pId = Number(r.id);
      if (!excludedIds.has(pId)) {
        excludedIds.add(pId);
        const stock = Number(r.total_stock);
        const pEsp = r.precio_especial ? Number(r.precio_especial) : null;
        const pNorm = Number(r.precio);
        let badge: string | null = null;
        if (pEsp && pEsp < pNorm) {
          badge = "Precio especial";
        } else if (stock <= 5) {
          badge = `Quedan ${stock}`;
        }

        sugerencias.push({
          id: pId,
          nombre: r.nombre,
          slug: r.slug,
          precio: pNorm,
          precio_especial: pEsp,
          color_fondo: r.color_fondo,
          color_frasco: r.color_frasco,
          badge,
        });
      }
    }
  }

  return sugerencias;
}


