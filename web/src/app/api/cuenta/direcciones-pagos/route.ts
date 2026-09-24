import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/session";
import { getDbPool } from "@/lib/db";
import { MAX_DIRECCIONES, MAX_TARJETAS } from "@/lib/marca";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = getAuthUserFromRequest(req);
    if (!session?.userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const pool = getDbPool();

    // 1. Obtener direcciones
    const [dirRows]: any = await pool.execute(
      `SELECT id, alias, calle_y_numero, calle, numero_exterior, numero_interior, 
              colonia, codigo_postal, ciudad, estado, referencias, predeterminada, creado_en
       FROM direcciones 
       WHERE usuario_id = ? 
       ORDER BY predeterminada DESC, id DESC`,
      [session.userId]
    );

    const direcciones = (dirRows || []).map((r: any) => ({
      id: r.id,
      alias: r.alias || "Casa",
      calle_y_numero: r.calle_y_numero || `${r.calle || ""} ${r.numero_exterior || ""}`.trim(),
      numero_interior: r.numero_interior || null,
      colonia: r.colonia,
      codigo_postal: r.codigo_postal,
      ciudad: r.ciudad,
      estado: r.estado,
      referencias: r.referencias || null,
      predeterminada: r.predeterminada === 1,
      creado_en: r.creado_en,
    }));

    // 2. Obtener tarjetas
    const [cardRows]: any = await pool.execute(
      `SELECT id, proveedor, marca, ultimos4, titular, mes_vencimiento, anio_vencimiento, predeterminado, creado_en
       FROM metodos_pago
       WHERE usuario_id = ?
       ORDER BY predeterminado DESC, id DESC`,
      [session.userId]
    );

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const tarjetas = (cardRows || []).map((t: any) => {
      const mes = Number(t.mes_vencimiento);
      const anio = Number(t.anio_vencimiento);
      const cardExpDate = new Date(anio, mes, 0, 23, 59, 59);
      const estaVencida =
        anio < currentYear || (anio === currentYear && mes < currentMonth);
      const vencePronto = !estaVencida && cardExpDate <= in60Days;

      return {
        id: t.id,
        proveedor: t.proveedor,
        marca: t.marca.toLowerCase(),
        marcaLabel: t.marca.toUpperCase(),
        ultimos4: t.ultimos4,
        titular: t.titular,
        mes_vencimiento: mes,
        anio_vencimiento: anio,
        vencimientoTexto: `${String(mes).padStart(2, "0")}/${String(anio).slice(-2)}`,
        predeterminado: t.predeterminado === 1,
        estaVencida,
        vencePronto,
        creado_en: t.creado_en,
      };
    });

    // 3. Obtener cuentas vinculadas (ej. Mercado Pago)
    const [vincRows]: any = await pool.execute(
      `SELECT proveedor, cuenta_mascara, conectado_en
       FROM cuentas_vinculadas
       WHERE usuario_id = ?`,
      [session.userId]
    );

    const cuentasVinculadas: Record<
      string,
      { conectado: boolean; cuentaMascara?: string; cuenta_mascara?: string; conectadoEn?: string }
    > = {
      mercadopago: { conectado: false },
    };

    if (Array.isArray(vincRows)) {
      for (const row of vincRows) {
        cuentasVinculadas[row.proveedor] = {
          conectado: true,
          cuentaMascara: row.cuenta_mascara,
          cuenta_mascara: row.cuenta_mascara,
          conectadoEn: row.conectado_en,
        };
      }
    }

    return NextResponse.json({
      direcciones,
      tarjetas,
      metodosPago: tarjetas,
      cuentasVinculadas,
      limites: {
        maxDirecciones: MAX_DIRECCIONES,
        maxTarjetas: MAX_TARJETAS,
      },
    });
  } catch (err: any) {
    console.error("[GET /api/cuenta/direcciones-pagos Error]:", err);
    return NextResponse.json(
      { error: "Error al obtener direcciones y métodos de pago", details: err.message },
      { status: 500 }
    );
  }
}
