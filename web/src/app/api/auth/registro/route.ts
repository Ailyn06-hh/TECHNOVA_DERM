import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDbPool } from "@/lib/db";
import {
  createAndSendVerificationCode,
  encodePendingUser,
  PENDING_COOKIE_NAME,
} from "@/lib/auth-verification";
import {
  normalizarTexto,
  normalizarCorreo,
  normalizarCelular,
  validarContrasena,
  MENSAJES_VALIDACION,
} from "@/lib/validaciones";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      nombre,
      apellido,
      correo,
      celular,
      password,
      acepta_terminos,
      acepta_promociones,
    } = body;

    // 1. Normalización y validaciones del lado del servidor
    const cleanNombre = normalizarTexto(nombre);
    if (!cleanNombre || cleanNombre.length < 2) {
      return NextResponse.json(
        { error: MENSAJES_VALIDACION.NOMBRE_REQUERIDO, field: "nombre" },
        { status: 400 }
      );
    }

    const cleanApellido = normalizarTexto(apellido);
    if (!cleanApellido || cleanApellido.length < 2) {
      return NextResponse.json(
        { error: MENSAJES_VALIDACION.APELLIDO_REQUERIDO, field: "apellido" },
        { status: 400 }
      );
    }

    const cleanEmail = normalizarCorreo(correo);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { error: MENSAJES_VALIDACION.CORREO_INVALIDO, field: "correo" },
        { status: 400 }
      );
    }

    const cleanPhone = normalizarCelular(celular);
    if (cleanPhone.length !== 10) {
      return NextResponse.json(
        { error: MENSAJES_VALIDACION.CELULAR_INVALIDO, field: "celular" },
        { status: 400 }
      );
    }

    // Validación exhaustiva de contraseña (límite 72 bytes, no común, sin datos personales)
    const passResult = validarContrasena(password, {
      nombre: cleanNombre,
      apellido: cleanApellido,
      correo: cleanEmail,
    });

    if (!passResult.valida) {
      return NextResponse.json(
        {
          error: passResult.errores[0] || MENSAJES_VALIDACION.CONTRASENA_NO_CUMPLE_REQUISITOS,
          field: "password",
          errores: passResult.errores,
        },
        { status: 400 }
      );
    }

    if (!acepta_terminos) {
      return NextResponse.json(
        {
          error: "Debes aceptar el aviso de privacidad y los términos para continuar.",
          field: "acepta_terminos",
        },
        { status: 400 }
      );
    }

    // 2. Conectar al pool de MySQL (XAMPP) y verificar que no existan duplicados
    const pool = getDbPool();

    // Consulta parametrizada anti-inyección SQL
    const [existingRows]: any = await pool.execute(
      "SELECT id, correo, celular FROM usuarios WHERE correo = ? OR celular = ? LIMIT 1",
      [cleanEmail, cleanPhone]
    );

    if (existingRows && existingRows.length > 0) {
      const match = existingRows[0];
      if (match.correo.toLowerCase() === cleanEmail) {
        return NextResponse.json(
          {
            error: "Este correo electrónico ya está registrado. Inicia sesión o usa otro.",
            field: "correo",
          },
          { status: 409 }
        );
      }
      if (match.celular === cleanPhone) {
        return NextResponse.json(
          {
            error: "Este número celular ya está registrado con otra cuenta.",
            field: "celular",
          },
          { status: 409 }
        );
      }
    }

    // 3. Hashear la contraseña con bcrypt (cost factor 10)
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Inserción con consulta estrictamente parametrizada
    const [insertResult]: any = await pool.execute(
      `INSERT INTO usuarios 
        (nombre, apellido, correo, celular, password_hash, acepta_terminos, acepta_promociones) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre.trim(),
        apellido.trim(),
        cleanEmail,
        cleanPhone,
        passwordHash,
        acepta_terminos ? 1 : 0,
        acepta_promociones ? 1 : 0,
      ]
    );

    const newUserId = insertResult.insertId;

    // TODO: Vincular pedidos previos realizados como invitada con este correo o celular
    // Ejemplo:
    // await pool.execute(
    //   "UPDATE orders SET customer_user_id = ? WHERE customer_email = ? OR customer_phone = ?",
    //   [newUserId, cleanEmail, cleanPhone]
    // );

    // 5. Generar código de verificación criptográfico (6 dígitos), hashearlo y enviarlo
    await createAndSendVerificationCode(newUserId, cleanEmail, nombre.trim());

    // 6. Configurar cookie temporal httpOnly para la pantalla de verificación
    const response = NextResponse.json(
      {
        success: true,
        message: "Cuenta creada exitosamente. Te enviamos un código de verificación.",
        userId: newUserId,
        redirectUrl: "/verificar",
      },
      { status: 201 }
    );

    response.cookies.set({
      name: PENDING_COOKIE_NAME,
      value: encodePendingUser({
        userId: newUserId,
        correo: cleanEmail,
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        celular: cleanPhone,
        lastSentAt: Date.now(),
      }),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60, // 1 hora de validez
    });

    return response;
  } catch (error: any) {
    console.error("[API REGISTRO ERROR]:", error);
    return NextResponse.json(
      {
        error:
          "Error al conectar con la base de datos MySQL en XAMPP. Asegúrate de que MySQL esté iniciado en el panel de XAMPP.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
