import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getDbPool } from "@/lib/db";
import {
  hashToken,
  POS_DEVICE_COOKIE,
  registrarAuditoriaPos,
} from "@/lib/pos-session";
import { NOMBRE_MARCA } from "@/lib/marca";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { codigo, nombre_dispositivo } = body;

    const codigoLimpio = codigo ? String(codigo).trim() : "";
    const nombreLimpio = nombre_dispositivo ? String(nombre_dispositivo).trim() : "Terminal Caja";

    if (!codigoLimpio) {
      return NextResponse.json(
        { error: "Ingresa el código de registro proporcionado por administración." },
        { status: 400 }
      );
    }

    const codigoHash = hashToken(codigoLimpio);
    const pool = getDbPool();

    // 1. Validar código en la base de datos (no usado y no vencido)
    const [codeRows]: any = await pool.execute(
      `SELECT c.id, c.sucursal_id, c.expira_en, c.usado_en, s.nombre as sucursal_nombre
       FROM codigos_registro_dispositivo c
       JOIN sucursales s ON c.sucursal_id = s.id
       WHERE c.codigo_hash = ?
       LIMIT 1`,
      [codigoHash]
    );

    if (!codeRows || codeRows.length === 0) {
      return NextResponse.json(
        { error: "El código de registro no es válido. Verifica con tu supervisora." },
        { status: 404 }
      );
    }

    const registro = codeRows[0];

    if (registro.usado_en !== null) {
      return NextResponse.json(
        { error: "Este código de registro ya fue utilizado anteriormente." },
        { status: 400 }
      );
    }

    if (new Date(registro.expira_en).getTime() < Date.now()) {
      return NextResponse.json(
        { error: "El código de registro ha expirado. Solicita uno nuevo." },
        { status: 400 }
      );
    }

    // 2. Generar token criptográfico único de 32 bytes para el dispositivo
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);

    // 3. Registrar dispositivo y marcar código como usado en transacción
    const conn = await pool.getConnection();
    let dispositivoId = 0;
    try {
      await conn.beginTransaction();

      const [insertResult]: any = await conn.execute(
        `INSERT INTO dispositivos_pos (sucursal_id, nombre, token_hash, activo, ultimo_uso, creado_en)
         VALUES (?, ?, ?, 1, NOW(), NOW())`,
        [registro.sucursal_id, nombreLimpio, tokenHash]
      );
      dispositivoId = insertResult.insertId;

      await conn.execute(
        "UPDATE codigos_registro_dispositivo SET usado_en = NOW() WHERE id = ?",
        [registro.id]
      );

      await conn.commit();
    } catch (txError) {
      await conn.rollback();
      throw txError;
    } finally {
      conn.release();
    }

    // 4. Registrar auditoría
    await registrarAuditoriaPos(
      "registro_dispositivo",
      registro.sucursal_id,
      `Dispositivo '${nombreLimpio}' (ID: ${dispositivoId}) registrado con éxito usando código.`
    );

    const sucursalNombreCompleto = registro.sucursal_nombre.toLowerCase().includes(NOMBRE_MARCA.toLowerCase())
      ? registro.sucursal_nombre
      : `${NOMBRE_MARCA} ${registro.sucursal_nombre}`;

    // 5. Configurar cookie segura del dispositivo (1 año)
    const response = NextResponse.json({
      exito: true,
      success: true,
      mensaje: `Dispositivo registrado correctamente para ${sucursalNombreCompleto}.`,
      dispositivo: {
        id: dispositivoId,
        nombre: nombreLimpio,
        sucursalId: registro.sucursal_id,
        sucursalNombre: registro.sucursal_nombre,
        sucursalNombreCompleto,
      },
    });

    response.cookies.set({
      name: POS_DEVICE_COOKIE,
      value: rawToken,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 365 * 24 * 60 * 60, // 1 año
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (error: any) {
    console.error("[POST /api/pos/dispositivos/registrar Error]:", error);
    return NextResponse.json(
      { error: "Error al registrar dispositivo", details: error.message },
      { status: 500 }
    );
  }
}
