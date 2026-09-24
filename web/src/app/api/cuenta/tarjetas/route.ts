import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/session";
import { getDbPool } from "@/lib/db";
import { getProveedorPagos } from "@/lib/pagos";
import { MAX_TARJETAS } from "@/lib/marca";
import { sendCardActivityEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = getAuthUserFromRequest(req);
    if (!session?.userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const pool = getDbPool();
    const [rows]: any = await pool.execute(
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

    const tarjetas = (rows || []).map((t: any) => {
      const mes = Number(t.mes_vencimiento);
      const anio = Number(t.anio_vencimiento);

      // Fecha fin del mes de vencimiento
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

    return NextResponse.json({ tarjetas });
  } catch (err: any) {
    console.error("[GET /api/cuenta/tarjetas Error]:", err);
    return NextResponse.json({ error: "Error al obtener tarjetas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getAuthUserFromRequest(req);
    if (!session?.userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const pool = getDbPool();

    // 1. Control de seguridad: Límite diario de 10 tarjetas agregadas
    const [dailyRows]: any = await pool.execute(
      "SELECT COUNT(*) as total_hoy FROM metodos_pago WHERE usuario_id = ? AND DATE(creado_en) = CURDATE()",
      [session.userId]
    );
    if (Number(dailyRows[0]?.total_hoy || 0) >= 10) {
      return NextResponse.json(
        {
          error:
            "Límite de seguridad alcanzado (máximo 10 tarjetas agregadas al día). Intenta más tarde.",
        },
        { status: 429 }
      );
    }

    // 2. Control de límite MAX_TARJETAS (5)
    const [countRows]: any = await pool.execute(
      "SELECT COUNT(*) as total FROM metodos_pago WHERE usuario_id = ?",
      [session.userId]
    );
    const totalActual = Number(countRows[0]?.total || 0);

    if (totalActual >= MAX_TARJETAS) {
      return NextResponse.json(
        {
          error: `Llegaste al máximo de tarjetas permitidas (${MAX_TARJETAS}); elimina una para agregar otra.`,
        },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      token,
      marca,
      ultimos4,
      titular,
      predeterminado,
    } = body;
    const mesVencimiento = body.mesVencimiento ?? body.mes_vencimiento;
    const anioVencimiento = body.anioVencimiento ?? body.anio_vencimiento;
    const marcaLimpia = marca ? (String(marca).charAt(0).toUpperCase() + String(marca).slice(1).toLowerCase()) : "Tarjeta";

    if (!token || !marca || !ultimos4 || !titular || !mesVencimiento || !anioVencimiento) {
      return NextResponse.json(
        { error: "Faltan datos obligatorios de la tarjeta." },
        { status: 400 }
      );
    }

    const mes = Number(mesVencimiento);
    const anio = Number(anioVencimiento);

    if (isNaN(mes) || mes < 1 || mes > 12 || isNaN(anio) || anio < 2000) {
      return NextResponse.json(
        { error: "Fecha de vencimiento inválida." },
        { status: 400 }
      );
    }

    // 3. Validar que no esté vencida
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    if (anio < currentYear || (anio === currentYear && mes < currentMonth)) {
      return NextResponse.json(
        { error: "No es posible registrar una tarjeta que ya está vencida." },
        { status: 400 }
      );
    }

    // 4. Validar duplicados
    const [dupRows]: any = await pool.execute(
      `SELECT id FROM metodos_pago 
       WHERE usuario_id = ? 
         AND LOWER(marca) = LOWER(?) 
         AND ultimos4 = ? 
         AND mes_vencimiento = ? 
         AND anio_vencimiento = ? 
       LIMIT 1`,
      [session.userId, marca, ultimos4, mes, anio]
    );

    if (dupRows && dupRows.length > 0) {
      return NextResponse.json(
        { error: "Esta tarjeta ya está guardada en tu cuenta." },
        { status: 409 }
      );
    }

    // 5. Guardar tarjeta con el proveedor (tokenizada de forma segura)
    const proveedor = getProveedorPagos();
    const guardada = await proveedor.guardarTarjeta(
      session.userId,
      token,
      {
        marca: marca.toLowerCase(),
        ultimos4,
        titular: titular.trim(),
        mesVencimiento: mes,
        anioVencimiento: anio,
      },
      Boolean(predeterminado)
    );

    // 6. Notificación omnicanal centralizada
    const { notificar } = await import("@/lib/notificaciones");
    await notificar(session.userId, {
      tipo: "cuenta",
      evento: "tarjeta_agregada",
      titulo: "Nueva tarjeta guardada",
      mensaje: `Se agregó la tarjeta ${marcaLimpia} terminación ${ultimos4} a tu cuenta de Technova-Derm.`,
      enlace: "/cuenta/direcciones",
      correo: session.correo,
    });

    return NextResponse.json({
      exito: true,
      mensaje: `Tarjeta ${marcaLimpia} terminación ${ultimos4} guardada correctamente.`,
      tarjeta: {
        id: guardada.id,
        marca: marca.toLowerCase(),
        marcaLabel: marcaLimpia,
        ultimos4,
        titular,
        mes_vencimiento: mes,
        anio_vencimiento: anio,
        vencimientoTexto: `${String(mes).padStart(2, "0")}/${String(anio).slice(-2)}`,
        predeterminado: Boolean(predeterminado) || totalActual === 0,
        estaVencida: false,
        vencePronto: false,
      },
    });
  } catch (err: any) {
    console.error("[POST /api/cuenta/tarjetas Error]:", err);
    return NextResponse.json(
      { error: "Error al guardar la tarjeta", details: err.message },
      { status: 500 }
    );
  }
}
