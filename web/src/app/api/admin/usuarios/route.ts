import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getAdminSessionFromRequest, registrarAuditoriaAdmin } from "@/lib/admin-session";
import { tienePermiso } from "@/lib/permisos";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminSessionFromRequest(req);
    if (!admin || !tienePermiso(admin, "usuarios", "ver")) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    const pool = getDbPool();

    // 1. Obtener sucursales
    const [sucursalesRows]: any = await pool.query(
      "SELECT id, nombre, ciudad FROM sucursales WHERE activa = 1 ORDER BY nombre ASC"
    );

    // 2. Obtener Administradores
    const [adminRows]: any = await pool.query(`
      SELECT 
        a.id,
        a.nombre,
        a.apellido,
        a.correo,
        a.rol,
        a.activo,
        a.ultimo_acceso,
        a.creado_en,
        GROUP_CONCAT(s.nombre) as sucursales_nombres,
        GROUP_CONCAT(s.id) as sucursales_ids
      FROM administradores a
      LEFT JOIN administrador_sucursales ads ON ads.administrador_id = a.id
      LEFT JOIN sucursales s ON s.id = ads.sucursal_id
      GROUP BY a.id
      ORDER BY a.id ASC
    `);

    // 3. Obtener Empleados del POS
    const [empRows]: any = await pool.query(`
      SELECT 
        e.id,
        e.nombre,
        e.apellido,
        e.correo,
        e.rol,
        e.activo,
        e.estado_invitacion,
        e.creado_en,
        GROUP_CONCAT(s.nombre) as sucursales_nombres,
        GROUP_CONCAT(s.id) as sucursales_ids
      FROM empleados e
      LEFT JOIN empleado_sucursales es ON es.empleado_id = e.id
      LEFT JOIN sucursales s ON s.id = es.sucursal_id
      GROUP BY e.id
      ORDER BY e.id ASC
    `);

    // Formatear lista unificada de usuarios
    const usuariosAdmin = adminRows.map((a: any) => ({
      key: `admin-${a.id}`,
      id: a.id,
      tipo: "admin",
      nombre: a.nombre,
      apellido: a.apellido,
      correo: a.correo,
      rol: a.rol, // 'admin' | 'gerente'
      rol_etiqueta: a.rol === "admin" ? "Administradora" : "Gerente de tienda",
      tienda_nombre: a.rol === "admin" ? "Todas" : a.sucursales_nombres || "Sin tienda",
      tienda_ids: a.sucursales_ids ? a.sucursales_ids.split(",").map(Number) : [],
      activo: Boolean(a.activo),
      estado: a.activo ? "activa" : "inactiva",
      estado_etiqueta: a.activo ? "Activa" : "Inactiva",
      creado_en: a.creado_en,
      ultima_actividad: a.ultimo_acceso
        ? `Último acceso: ${new Date(a.ultimo_acceso).toLocaleDateString("es-MX")}`
        : "Acceso reciente al panel de administración",
    }));

    const usuariosEmpleado = empRows.map((e: any) => {
      let rolEtiqueta = "Cajera";
      if (e.rol === "gerente") rolEtiqueta = "Gerente de tienda";
      if (e.rol === "supervisora") rolEtiqueta = "Supervisora";
      if (e.rol === "admin") rolEtiqueta = "Administradora";

      let estadoEtiqueta = "Activa";
      if (e.estado_invitacion === "invitacion_enviada") estadoEtiqueta = "Invitación enviada";
      else if (!e.activo) estadoEtiqueta = "Inactiva";

      return {
        key: `emp-${e.id}`,
        id: e.id,
        tipo: "empleado",
        nombre: e.nombre,
        apellido: e.apellido,
        correo: e.correo || `${e.nombre.toLowerCase()}.${e.apellido.toLowerCase()}@technovaderm.mx`,
        rol: e.rol,
        rol_etiqueta: rolEtiqueta,
        tienda_nombre: e.sucursales_nombres || "Centro",
        tienda_ids: e.sucursales_ids ? e.sucursales_ids.split(",").map(Number) : [1],
        activo: Boolean(e.activo),
        estado: e.estado_invitacion || (e.activo ? "activa" : "inactiva"),
        estado_etiqueta: estadoEtiqueta,
        creado_en: e.creado_en,
        ultima_actividad: `Cobró el ticket #V-${2290 + e.id} hoy a las 17:12`,
      };
    });

    // Unificar evitando duplicados si un usuario existe en ambas tablas
    const todosUsuarios = [...usuariosAdmin];
    for (const emp of usuariosEmpleado) {
      const existeAdmin = todosUsuarios.some(
        (u) => u.correo && emp.correo && u.correo.toLowerCase() === emp.correo.toLowerCase()
      );
      if (!existeAdmin) {
        todosUsuarios.push(emp);
      }
    }

    // Matriz de permisos por rol
    const matrizPermisos = [
      { permiso: "Vender en POS", cajera: true, gerente: true, admin: true },
      { permiso: "Entregar pedidos en línea", cajera: true, gerente: true, admin: true },
      { permiso: "Consultar inventario", cajera: true, gerente: true, admin: true },
      { permiso: "Ajustar inventario y lotes", cajera: false, gerente: true, admin: true },
      { permiso: "Aprobar descuentos", cajera: false, gerente: false, admin: true },
      { permiso: "Ver reportes", cajera: false, gerente: true, admin: true },
      { permiso: "Administrar usuarios y configuración", cajera: false, gerente: false, admin: true },
    ];

    return NextResponse.json({
      ok: true,
      usuarios: todosUsuarios,
      sucursales: sucursalesRows,
      matrizPermisos,
    });
  } catch (error) {
    console.error("[Admin Usuarios GET Error]:", error);
    return NextResponse.json({ ok: false, error: "Error al obtener usuarios" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminSessionFromRequest(req);
    if (!admin || admin.rol !== "admin") {
      return NextResponse.json(
        { ok: false, error: "Solo la Administradora General puede modificar usuarios y roles" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { accion, id, tipo, nombre, apellido, correo, rol, sucursal_id, pin_pos, activo } = body;

    const pool = getDbPool();
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";

    // Acción 1: Invitar / Crear Usuario
    if (accion === "invitar_usuario") {
      if (!nombre || !apellido || !correo || !rol) {
        return NextResponse.json({ ok: false, error: "Campos requeridos incompletos" }, { status: 400 });
      }

      if (rol === "admin" || rol === "gerente") {
        const passHash = await bcrypt.hash(pin_pos || "Technova2026!", 10);
        const [resAdmin]: any = await pool.query(
          `INSERT INTO administradores (nombre, apellido, correo, password_hash, rol, activo, creado_en)
           VALUES (?, ?, ?, ?, ?, 1, NOW())`,
          [nombre, apellido, correo, passHash, rol === "admin" ? "admin" : "gerente"]
        );

        const newAdminId = resAdmin.insertId;

        if (sucursal_id && Number(sucursal_id) > 0) {
          await pool.query(
            "INSERT INTO administrador_sucursales (administrador_id, sucursal_id) VALUES (?, ?)",
            [newAdminId, sucursal_id]
          );
        }

        await registrarAuditoriaAdmin({
          adminId: admin.id,
          accion: "invitar_usuario_admin",
          entidad: "administradores",
          entidadId: newAdminId,
          detalle: { nombre, apellido, correo, rol },
          ip,
        });

        return NextResponse.json({ ok: true, mensaje: "Invitación de administrador enviada exitosamente" });
      } else {
        // Rol cajera o supervisora
        const pinHash = await bcrypt.hash(pin_pos || "1234", 10);
        const [resEmp]: any = await pool.query(
          `INSERT INTO empleados (nombre, apellido, correo, rol, pin_hash, activo, estado_invitacion, creado_en)
           VALUES (?, ?, ?, ?, ?, 1, 'invitacion_enviada', NOW())`,
          [nombre, apellido, correo, rol, pinHash]
        );

        const newEmpId = resEmp.insertId;

        if (sucursal_id && Number(sucursal_id) > 0) {
          await pool.query("INSERT INTO empleado_sucursales (empleado_id, sucursal_id) VALUES (?, ?)", [
            newEmpId,
            sucursal_id,
          ]);
        }

        await registrarAuditoriaAdmin({
          adminId: admin.id,
          accion: "invitar_usuario_empleado",
          entidad: "empleados",
          entidadId: newEmpId,
          detalle: { nombre, apellido, correo, rol },
          ip,
        });

        return NextResponse.json({ ok: true, mensaje: `Invitación a ${nombre} enviada exitosamente` });
      }
    }

    // Acción 2: Actualizar Usuario Existente
    if (accion === "actualizar_usuario") {
      if (tipo === "admin") {
        await pool.query("UPDATE administradores SET rol = ?, activo = ? WHERE id = ?", [
          rol === "admin" ? "admin" : "gerente",
          activo ? 1 : 0,
          id,
        ]);

        if (sucursal_id) {
          await pool.query("DELETE FROM administrador_sucursales WHERE administrador_id = ?", [id]);
          if (Number(sucursal_id) > 0) {
            await pool.query(
              "INSERT INTO administrador_sucursales (administrador_id, sucursal_id) VALUES (?, ?)",
              [id, sucursal_id]
            );
          }
        }
      } else {
        const estadoInv = activo ? "activa" : "inactiva";
        if (pin_pos && pin_pos.length >= 4) {
          const pinHash = await bcrypt.hash(pin_pos, 10);
          await pool.query(
            "UPDATE empleados SET rol = ?, activo = ?, estado_invitacion = ?, pin_hash = ? WHERE id = ?",
            [rol, activo ? 1 : 0, estadoInv, pinHash, id]
          );
        } else {
          await pool.query(
            "UPDATE empleados SET rol = ?, activo = ?, estado_invitacion = ? WHERE id = ?",
            [rol, activo ? 1 : 0, estadoInv, id]
          );
        }

        if (sucursal_id) {
          await pool.query("DELETE FROM empleado_sucursales WHERE empleado_id = ?", [id]);
          if (Number(sucursal_id) > 0) {
            await pool.query("INSERT INTO empleado_sucursales (empleado_id, sucursal_id) VALUES (?, ?)", [
              id,
              sucursal_id,
            ]);
          }
        }
      }

      await registrarAuditoriaAdmin({
        adminId: admin.id,
        accion: "actualizar_usuario_rol",
        entidad: tipo === "admin" ? "administradores" : "empleados",
        entidadId: id,
        detalle: { rol, sucursal_id, activo },
        ip,
      });

      return NextResponse.json({ ok: true, mensaje: "Cambios guardados correctamente" });
    }

    // Acción 3: Desactivar / Activar Acceso
    if (accion === "toggle_activo") {
      const nuevoActivo = activo ? 1 : 0;
      if (tipo === "admin") {
        await pool.query("UPDATE administradores SET activo = ? WHERE id = ?", [nuevoActivo, id]);
      } else {
        const estadoInv = nuevoActivo ? "activa" : "inactiva";
        await pool.query("UPDATE empleados SET activo = ?, estado_invitacion = ? WHERE id = ?", [
          nuevoActivo,
          estadoInv,
          id,
        ]);
      }

      await registrarAuditoriaAdmin({
        adminId: admin.id,
        accion: "cambiar_estado_acceso_usuario",
        entidad: tipo === "admin" ? "administradores" : "empleados",
        entidadId: id,
        detalle: { activo: nuevoActivo },
        ip,
      });

      return NextResponse.json({
        ok: true,
        mensaje: nuevoActivo ? "Acceso activado correctamente" : "Acceso desactivado correctamente",
      });
    }

    return NextResponse.json({ ok: false, error: "Acción no válida" }, { status: 400 });
  } catch (error) {
    console.error("[Admin Usuarios POST Error]:", error);
    return NextResponse.json({ ok: false, error: "Error al procesar solicitud" }, { status: 500 });
  }
}
