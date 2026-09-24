import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDbPool } from "@/lib/db";
import { encodePendingUser, PENDING_COOKIE_NAME } from "@/lib/auth-verification";
import { setAuthSessionCookie } from "@/lib/session";
import { normalizarIdentificador } from "@/lib/validaciones";
import { obtenerIpCliente } from "@/lib/rate-limiter";

// Hash ficticio precalculado con bcrypt cost factor 10 para mitigar timing attacks si el usuario no existe
const DUMMY_HASH = "$2a$10$7EqJtq98hPqEX7fNZaFWoO0LqgP2Lw5jO8L7vC9GZJ1.M7n0O7A5m";

export async function POST(req: NextRequest) {
  try {
    const ip = obtenerIpCliente(req);
    const pool = getDbPool();

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Cuerpo de solicitud JSON malformado." },
        { status: 400 }
      );
    }

    const { identifier, password, rememberMe } = body;

    // 1. Validación de campos obligatorios en el cliente / servidor
    if (!identifier || typeof identifier !== "string" || !identifier.trim()) {
      return NextResponse.json(
        { error: "Por favor ingresa tu correo electrónico o celular.", field: "identifier" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Por favor ingresa tu contraseña.", field: "password" },
        { status: 400 }
      );
    }

    const norm = normalizarIdentificador(identifier);
    if (!norm.esValido) {
      return NextResponse.json(
        {
          error: "Ingresa un correo electrónico válido o un celular de 10 dígitos.",
          field: "identifier",
        },
        { status: 400 }
      );
    }

    // 2. Protección contra fuerza bruta: Verificar bloqueo por IP (20 fallos en 15 minutos)
    const [ipRows]: any = await pool.execute(
      `SELECT COUNT(*) as total_fallos, MAX(creado_en) as ultimo_fallo 
       FROM intentos_login 
       WHERE ip = ? AND exitoso = 0 AND creado_en >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)`,
      [ip]
    );

    const fallosIp = ipRows[0]?.total_fallos || 0;
    if (fallosIp >= 20) {
      const ultimoFalloDate = new Date(ipRows[0].ultimo_fallo).getTime();
      const tiempoRestanteMs = 15 * 60 * 1000 - (Date.now() - ultimoFalloDate);
      const minutosRestantes = Math.max(1, Math.ceil(tiempoRestanteMs / (60 * 1000)));

      return NextResponse.json(
        {
          error: `Demasiados intentos fallidos desde esta conexión. Intenta de nuevo en ${minutosRestantes} minutos.`,
          blocked: true,
        },
        { status: 429 }
      );
    }

    // 3. Protección contra fuerza bruta: Verificar bloqueo por Identificador (5 fallos en 15 minutos)
    const [idRows]: any = await pool.execute(
      `SELECT COUNT(*) as total_fallos, MAX(creado_en) as ultimo_fallo 
       FROM intentos_login 
       WHERE identificador = ? AND exitoso = 0 AND creado_en >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)`,
      [norm.valor]
    );

    const fallosIdentificador = idRows[0]?.total_fallos || 0;
    if (fallosIdentificador >= 5) {
      const ultimoFalloDate = new Date(idRows[0].ultimo_fallo).getTime();
      const tiempoRestanteMs = 15 * 60 * 1000 - (Date.now() - ultimoFalloDate);
      const minutosRestantes = Math.max(1, Math.ceil(tiempoRestanteMs / (60 * 1000)));

      return NextResponse.json(
        {
          error: `Demasiados intentos. Intenta de nuevo en ${minutosRestantes} minutos o recupera tu contraseña`,
          blocked: true,
          canRecover: true,
        },
        { status: 429 }
      );
    }

    // 4. Buscar usuario por correo o celular según el tipo detectado
    let userQuery = "";
    if (norm.tipo === "correo") {
      userQuery = "SELECT id, nombre, apellido, correo, celular, password_hash, verificado, onboarding_omitido FROM usuarios WHERE correo = ? LIMIT 1";
    } else {
      userQuery = "SELECT id, nombre, apellido, correo, celular, password_hash, verificado, onboarding_omitido FROM usuarios WHERE celular = ? LIMIT 1";
    }

    const [rows]: any = await pool.execute(userQuery, [norm.valor]);

    // 5. Si el usuario no existe: se ejecuta bcrypt.compare con el hash ficticio para mitigar timing attacks
    if (!rows || rows.length === 0) {
      await bcrypt.compare(password, DUMMY_HASH);

      // Registrar intento fallido
      await pool.execute(
        "INSERT INTO intentos_login (identificador, ip, exitoso) VALUES (?, ?, 0)",
        [norm.valor, ip]
      );

      return NextResponse.json(
        { error: "Correo, celular o contraseña incorrectos." },
        { status: 401 }
      );
    }

    const user = rows[0];

    // 6. Verificar contraseña con bcrypt
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      // Registrar intento fallido
      await pool.execute(
        "INSERT INTO intentos_login (identificador, ip, exitoso) VALUES (?, ?, 0)",
        [norm.valor, ip]
      );

      return NextResponse.json(
        { error: "Correo, celular o contraseña incorrectos." },
        { status: 401 }
      );
    }

    // 7. Credenciales correctas: si la cuenta no está verificada, no iniciar sesión
    if (user.verificado === 0) {
      // Registrar intento exitoso de credenciales
      await pool.execute(
        "INSERT INTO intentos_login (identificador, ip, exitoso) VALUES (?, ?, 1)",
        [norm.valor, ip]
      );

      const response = NextResponse.json(
        {
          error: "Tu cuenta aún no está verificada. Te enviamos un código a tu correo para activarla.",
          unverified: true,
          correo: user.correo,
        },
        { status: 403 }
      );

      response.cookies.set({
        name: PENDING_COOKIE_NAME,
        value: encodePendingUser({
          userId: user.id,
          correo: user.correo,
          nombre: user.nombre,
          apellido: user.apellido,
          celular: user.celular,
          lastSentAt: Date.now(),
        }),
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60,
      });

      return response;
    }

    // 8. Inicio de sesión exitoso: reiniciar el contador de intentos fallidos de este identificador
    await pool.execute(
      "DELETE FROM intentos_login WHERE identificador = ? AND exitoso = 0",
      [norm.valor]
    );

    await pool.execute(
      "INSERT INTO intentos_login (identificador, ip, exitoso) VALUES (?, ?, 1)",
      [norm.valor, ip]
    );

    // 9. Redirigir a /onboarding/perfil al iniciar sesión
    const redirectUrl = "/onboarding/perfil";

    const response = NextResponse.json(
      {
        success: true,
        message: "Inicio de sesión exitoso.",
        redirectUrl,
        user: {
          id: user.id,
          nombre: user.nombre,
          apellido: user.apellido,
          correo: user.correo,
        },
      },
      { status: 200 }
    );

    // 10. Configurar cookie de sesión:
    // - Recordarme sin marcar: máximo 12 horas
    // - Recordarme marcado: 30 días
    setAuthSessionCookie(
      response,
      {
        userId: user.id,
        correo: user.correo,
        nombre: user.nombre,
        verificado: true,
      },
      { rememberMe: Boolean(rememberMe) }
    );

    return response;
  } catch (error: any) {
    console.error("[API LOGIN ERROR]:", error);
    return NextResponse.json(
      {
        error: "Error interno al procesar el inicio de sesión.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
