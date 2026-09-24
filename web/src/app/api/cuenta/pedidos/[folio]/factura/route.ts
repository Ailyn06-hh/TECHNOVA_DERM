import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/session";
import { getDbPool } from "@/lib/db";
import { DIAS_PARA_FACTURAR } from "@/lib/marca";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { folio: string } }
) {
  try {
    const user = getAuthUserFromRequest(req);
    if (!user?.userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { folio } = params;
    const body = await req.json().catch(() => ({}));
    const {
      rfc,
      razon_social,
      regimen_fiscal,
      codigo_postal_fiscal,
      uso_cfdi,
      correo,
    } = body;

    const pool = getDbPool();

    // 1. Obtener pedido y validar propiedad
    const [orderRows]: any = await pool.execute(
      "SELECT id, folio, usuario_id, estado, creado_en FROM pedidos WHERE folio = ? LIMIT 1",
      [folio]
    );

    if (!orderRows || orderRows.length === 0) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    const order = orderRows[0];
    if (order.usuario_id !== user.userId) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    // 2. Validar que el pedido esté en un estado facturable (pagado o entregado)
    const estadosFacturables = [
      "pagado",
      "preparando",
      "listo_para_recoger",
      "enviado",
      "entregado",
    ];

    if (!estadosFacturables.includes(order.estado)) {
      return NextResponse.json(
        { error: "Solo puedes solicitar factura de pedidos pagados o confirmados." },
        { status: 400 }
      );
    }

    // 3. Validar plazo de facturación
    const fechaPedido = new Date(order.creado_en);
    const dias = Math.floor((Date.now() - fechaPedido.getTime()) / (1000 * 60 * 60 * 24));
    if (dias > DIAS_PARA_FACTURAR) {
      return NextResponse.json(
        { error: "El plazo para facturar este pedido ha terminado (máximo 30 días)." },
        { status: 400 }
      );
    }

    // 4. Verificar si ya existe factura solicitada o emitida
    const [existing]: any = await pool.execute(
      "SELECT id, estado FROM facturas WHERE pedido_id = ? LIMIT 1",
      [order.id]
    );

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: "Ya existe una solicitud de factura para este pedido." },
        { status: 400 }
      );
    }

    // 5. Validaciones de datos fiscales
    const rfcLimpio = String(rfc || "").trim().toUpperCase();
    const cpLimpio = String(codigo_postal_fiscal || "").trim();
    const razonSocialLimpia = String(razon_social || "").trim();
    const correoLimpio = String(correo || "").trim().toLowerCase();

    // RFC: 12 caracteres (moral) o 13 caracteres (física)
    const rfcRegex = /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/;
    if (!rfcRegex.test(rfcLimpio)) {
      return NextResponse.json(
        {
          error:
            "El RFC debe tener un formato fiscal válido de 12 (persona moral) o 13 caracteres (persona física).",
        },
        { status: 400 }
      );
    }

    // Código postal: exactamente 5 dígitos numéricos
    if (!/^\d{5}$/.test(cpLimpio)) {
      return NextResponse.json(
        { error: "El código postal fiscal debe constar de exactamente 5 dígitos." },
        { status: 400 }
      );
    }

    if (!razonSocialLimpia || razonSocialLimpia.length < 3) {
      return NextResponse.json(
        { error: "La razón social o nombre fiscal es obligatorio." },
        { status: 400 }
      );
    }

    if (!regimen_fiscal || typeof regimen_fiscal !== "string") {
      return NextResponse.json(
        { error: "Debes seleccionar un régimen fiscal del SAT." },
        { status: 400 }
      );
    }

    if (!uso_cfdi || typeof uso_cfdi !== "string") {
      return NextResponse.json(
        { error: "Debes seleccionar el uso de CFDI." },
        { status: 400 }
      );
    }

    if (!correoLimpio || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoLimpio)) {
      return NextResponse.json(
        { error: "Proporciona un correo electrónico válido para enviar tu factura." },
        { status: 400 }
      );
    }

    // 6. Guardar solicitud en la tabla facturas
    // TODO: Conectar con PAC (Proveedor Autorizado de Certificación) para timbrado automático de CFDI 4.0
    const [insertRes]: any = await pool.execute(
      `INSERT INTO facturas 
        (pedido_id, rfc, razon_social, regimen_fiscal, codigo_postal_fiscal, uso_cfdi, correo, estado, creado_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'solicitada', NOW())`,
      [
        order.id,
        rfcLimpio,
        razonSocialLimpia,
        regimen_fiscal,
        cpLimpio,
        uso_cfdi,
        correoLimpio,
      ]
    );

    // Notificación omnicanal de factura solicitada
    const { notificar } = await import("@/lib/notificaciones");
    await notificar(user.userId, {
      tipo: "pedido",
      evento: "factura_solicitada",
      titulo: `Factura solicitada - #${order.folio}`,
      mensaje: `Recibimos tus datos fiscales (RFC: ${rfcLimpio}) para el pedido #${order.folio}. Te enviaremos tu CFDI por correo en cuanto esté timbrado.`,
      enlace: `/cuenta/pedidos/${order.folio}`,
      correo: correoLimpio,
    });

    return NextResponse.json({
      success: true,
      message: "Te enviaremos tu factura por correo",
      facturaId: insertRes.insertId,
      estado: "solicitada",
    });
  } catch (error: any) {
    console.error("[API SOLICITAR FACTURA ERROR]:", error);
    return NextResponse.json(
      { error: "Error interno al procesar la solicitud de factura", details: error.message },
      { status: 500 }
    );
  }
}
