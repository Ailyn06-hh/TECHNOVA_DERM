import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/session";
import { getDbPool } from "@/lib/db";

export const dynamic = "force-dynamic";

function generarMascaraCorreo(correo: string): string {
  const partes = correo.split("@");
  if (partes.length !== 2) return "u***@correo.com";
  const [usuario, dominio] = partes;
  const inicial = usuario.charAt(0);
  return `${inicial}***@${dominio}`;
}

export async function POST(req: NextRequest) {
  try {
    const session = getAuthUserFromRequest(req);
    if (!session?.userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const pool = getDbPool();

    // Obtener correo actualizado del usuario
    const [uRows]: any = await pool.execute(
      "SELECT correo FROM usuarios WHERE id = ? LIMIT 1",
      [session.userId]
    );
    const correoUsuario = uRows && uRows[0]?.correo ? uRows[0].correo : session.correo || "usuario@technovaderm.com";
    const cuentaMascara = generarMascaraCorreo(correoUsuario);

    // TODO: En producción con adaptador Mercado Pago real, iniciar flujo OAuth de autorización
    await pool.execute(
      `INSERT INTO cuentas_vinculadas (usuario_id, proveedor, cuenta_mascara, conectado_en)
       VALUES (?, 'mercadopago', ?, NOW())
       ON DUPLICATE KEY UPDATE cuenta_mascara = VALUES(cuenta_mascara), conectado_en = NOW()`,
      [session.userId, cuentaMascara]
    );

    return NextResponse.json({
      exito: true,
      conectado: true,
      cuentaMascara,
      mensaje: "Cuenta de Mercado Pago conectada exitosamente.",
    });
  } catch (err: any) {
    console.error("[POST /api/cuenta/vinculaciones/mercadopago Error]:", err);
    return NextResponse.json(
      { error: "Error al vincular cuenta de Mercado Pago", details: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = getAuthUserFromRequest(req);
    if (!session?.userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const pool = getDbPool();
    await pool.execute(
      "DELETE FROM cuentas_vinculadas WHERE usuario_id = ? AND proveedor = 'mercadopago'",
      [session.userId]
    );

    return NextResponse.json({
      exito: true,
      conectado: false,
      mensaje: "Cuenta de Mercado Pago desconectada.",
    });
  } catch (err: any) {
    console.error("[DELETE /api/cuenta/vinculaciones/mercadopago Error]:", err);
    return NextResponse.json(
      { error: "Error al desvincular cuenta de Mercado Pago", details: err.message },
      { status: 500 }
    );
  }
}
