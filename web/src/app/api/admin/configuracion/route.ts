import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getAdminSessionFromRequest, registrarAuditoriaAdmin } from "@/lib/admin-session";
import { tienePermiso } from "@/lib/permisos";

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminSessionFromRequest(req);
    if (!admin || !tienePermiso(admin, "configuracion", "ver")) {
      return NextResponse.json({ ok: false, error: "No autorizado. Solo la Administradora General puede ver la configuración." }, { status: 401 });
    }

    const pool = getDbPool();

    // 1. Consultar configuración general (key-value)
    const [cfgRows]: any = await pool.query("SELECT clave, valor, descripcion FROM configuracion_general");
    const configuracion: Record<string, string> = {};
    for (const row of cfgRows) {
      configuracion[row.clave] = row.valor;
    }

    // 2. Consultar tiendas / sucursales
    const [sucursalesRows]: any = await pool.query(
      "SELECT id, nombre, direccion, ciudad, horario_texto, activa FROM sucursales ORDER BY id ASC"
    );

    return NextResponse.json({
      ok: true,
      configuracion,
      sucursales: sucursalesRows,
    });
  } catch (error) {
    console.error("[Admin Configuración GET Error]:", error);
    return NextResponse.json({ ok: false, error: "Error al obtener configuración" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminSessionFromRequest(req);
    if (!admin || admin.rol !== "admin") {
      return NextResponse.json(
        { ok: false, error: "Solo la Administradora General puede modificar la configuración del sistema" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { accion, valores, sucursal, sucursalId, canalClave, canalEstado } = body;

    const pool = getDbPool();
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";

    // Acción 1: Guardar Ajustes Generales (Envíos, Facturación, etc.)
    if (accion === "guardar_configuracion") {
      if (!valores || typeof valores !== "object") {
        return NextResponse.json({ ok: false, error: "Valores no válidos" }, { status: 400 });
      }

      for (const [clave, valor] of Object.entries(valores)) {
        await pool.query(
          `INSERT INTO configuracion_general (clave, valor)
           VALUES (?, ?)
           ON DUPLICATE KEY UPDATE valor = VALUES(valor)`,
          [clave, String(valor)]
        );
      }

      await registrarAuditoriaAdmin({
        adminId: admin.id,
        accion: "actualizar_configuracion_operacion",
        entidad: "configuracion_general",
        detalle: { claves_actualizadas: Object.keys(valores) },
        ip,
      });

      return NextResponse.json({ ok: true, mensaje: "Configuración guardada exitosamente" });
    }

    // Acción 2: Toggle Canal o Conectar Canal
    if (accion === "toggle_canal") {
      if (!canalClave) {
        return NextResponse.json({ ok: false, error: "Clave de canal requerida" }, { status: 400 });
      }

      const nuevoValor = canalEstado ? "1" : "0";
      await pool.query(
        `INSERT INTO configuracion_general (clave, valor)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE valor = VALUES(valor)`,
        [canalClave, nuevoValor]
      );

      await registrarAuditoriaAdmin({
        adminId: admin.id,
        accion: "toggle_canal_conectado",
        entidad: "configuracion_general",
        entidadId: canalClave,
        detalle: { nuevo_estado: nuevoValor },
        ip,
      });

      return NextResponse.json({
        ok: true,
        mensaje: canalEstado ? "Canal conectado correctamente" : "Canal desconectado",
      });
    }

    // Acción 3: Agregar Nueva Sucursal / Tienda
    if (accion === "agregar_tienda") {
      if (!sucursal || !sucursal.nombre || !sucursal.direccion) {
        return NextResponse.json({ ok: false, error: "Nombre y dirección de la tienda requeridos" }, { status: 400 });
      }

      const [resSuc]: any = await pool.query(
        `INSERT INTO sucursales (nombre, direccion, ciudad, horario_texto, activa)
         VALUES (?, ?, ?, ?, 1)`,
        [
          sucursal.nombre,
          sucursal.direccion,
          sucursal.ciudad || "Guadalajara",
          sucursal.horario_texto || "Todos los días 10:00 a 20:00",
        ]
      );

      await registrarAuditoriaAdmin({
        adminId: admin.id,
        accion: "crear_sucursal_tienda",
        entidad: "sucursales",
        entidadId: resSuc.insertId,
        detalle: sucursal,
        ip,
      });

      return NextResponse.json({ ok: true, mensaje: `Tienda ${sucursal.nombre} agregada exitosamente` });
    }

    // Acción 4: Toggle Estado Sucursal
    if (accion === "toggle_tienda") {
      const [sucRows]: any = await pool.query("SELECT activa FROM sucursales WHERE id = ?", [sucursalId]);
      if (sucRows.length === 0) {
        return NextResponse.json({ ok: false, error: "Tienda no encontrada" }, { status: 404 });
      }

      const nuevoActiva = sucRows[0].activa ? 0 : 1;
      await pool.query("UPDATE sucursales SET activa = ? WHERE id = ?", [nuevoActiva, sucursalId]);

      await registrarAuditoriaAdmin({
        adminId: admin.id,
        accion: "toggle_estado_sucursal",
        entidad: "sucursales",
        entidadId: sucursalId,
        detalle: { activa: nuevoActiva },
        ip,
      });

      return NextResponse.json({
        ok: true,
        mensaje: nuevoActiva ? "Tienda activada" : "Tienda desactivada",
      });
    }

    return NextResponse.json({ ok: false, error: "Acción no válida" }, { status: 400 });
  } catch (error) {
    console.error("[Admin Configuración POST Error]:", error);
    return NextResponse.json({ ok: false, error: "Error al procesar la solicitud" }, { status: 500 });
  }
}
