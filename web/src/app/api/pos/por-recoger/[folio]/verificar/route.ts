import { NextRequest, NextResponse } from "next/server";
import { getDispositivoFromRequest, getPosSessionFromRequest } from "@/lib/pos-session";
import { getDbPool } from "@/lib/db";
import { validarCodigoRecogida } from "@/lib/pedidos";
import { marcarCodigoVerificado } from "@/lib/pos/verificacion-cache";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { folio: string } }
) {
  try {
    const dispositivo = await getDispositivoFromRequest(req);
    const session = await getPosSessionFromRequest(req);

    if (!dispositivo || !session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const folio = params.folio?.toUpperCase();
    if (!folio) {
      return NextResponse.json({ error: "Folio no especificado" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const codigo = String(body.codigo || "").trim();

    if (!codigo || codigo.length !== 4) {
      return NextResponse.json(
        { error: "El código de recogida debe ser de 4 dígitos" },
        { status: 400 }
      );
    }

    const pool = getDbPool();

    // Validar que el pedido pertenece a esta sucursal
    const [rows]: any = await pool.execute(
      `SELECT id, folio, sucursal_id, tipo_entrega, estado,
              COALESCE(intentos_codigo, intentos_codigo_recogida, 0) as intentos_fallidos
       FROM pedidos
       WHERE folio = ? LIMIT 1`,
      [folio]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    const pedido = rows[0];

    if (pedido.sucursal_id !== dispositivo.sucursalId) {
      return NextResponse.json(
        { error: "Este pedido pertenece a otra sucursal y no puede gestionarse aquí." },
        { status: 403 }
      );
    }

    if (pedido.tipo_entrega !== "recoger") {
      return NextResponse.json(
        { error: "Este pedido no es para recolección en tienda." },
        { status: 400 }
      );
    }

    if (Number(pedido.intentos_fallidos) >= 5) {
      return NextResponse.json(
        {
          exito: false,
          bloqueado: true,
          error: "Código bloqueado. Pide a una supervisora que autorice la entrega.",
          intentosRestantes: 0,
        },
        { status: 400 }
      );
    }

    // Llamar a validarCodigoRecogida de lib/pedidos
    const resultado = await validarCodigoRecogida(folio, codigo);

    if (!resultado.valido) {
      return NextResponse.json(
        {
          exito: false,
          bloqueado: Boolean(resultado.bloqueado),
          error: resultado.error || "El código no coincide con el pedido.",
          intentosRestantes: resultado.intentosRestantes ?? 0,
        },
        { status: 400 }
      );
    }

    // Código coincide: registrar en caché temporal de 5 minutos
    marcarCodigoVerificado(folio, session.empleadoId);

    return NextResponse.json({
      exito: true,
      mensaje: "El código coincide con el pedido.",
    });
  } catch (error: any) {
    console.error("[POST /api/pos/por-recoger/[folio]/verificar Error]:", error);
    return NextResponse.json(
      { error: "Error interno al verificar código", details: error.message },
      { status: 500 }
    );
  }
}
