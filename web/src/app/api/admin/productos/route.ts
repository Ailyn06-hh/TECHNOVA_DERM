import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getAdminSessionFromRequest, registrarAuditoriaAdmin } from "@/lib/admin-session";
import { tienePermiso } from "@/lib/permisos";

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminSessionFromRequest(req);
    if (!admin || !tienePermiso(admin, "productos", "ver")) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const busqueda = (searchParams.get("q") || "").trim();
    const categoriaId = searchParams.get("categoriaId");
    const estado = searchParams.get("estado"); // activo, borrador, archivado

    const pool = getDbPool();
    let whereClauses: string[] = ["1=1"];
    const params: any[] = [];

    if (busqueda) {
      whereClauses.push("(pr.nombre LIKE ? OR pr.sku LIKE ? OR pr.codigo_barras LIKE ?)");
      params.push(`%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`);
    }

    if (categoriaId && categoriaId !== "todas") {
      whereClauses.push("pr.categoria_id = ?");
      params.push(categoriaId);
    }

    if (estado && estado !== "todos") {
      if (estado === "activo") whereClauses.push("pr.activo = 1");
      else if (estado === "archivado") whereClauses.push("pr.activo = 0");
    }

    const [rows]: any = await pool.query(
      `SELECT
        pr.id,
        pr.nombre,
        pr.sku,
        pr.codigo_barras,
        pr.slug,
        pr.categoria_id,
        c.nombre as categoria_nombre,
        pr.precio,
        pr.precio_especial,
        pr.descripcion,
        pr.imagen_url,
        pr.activo,
        pr.creado_en,
        COALESCE(SUM(i.existencias), 0) as stock_total
       FROM productos pr
       LEFT JOIN categorias c ON pr.categoria_id = c.id
       LEFT JOIN inventario i ON pr.id = i.producto_id
       WHERE ${whereClauses.join(" AND ")}
       GROUP BY pr.id, pr.nombre, pr.sku, pr.codigo_barras, pr.slug, pr.categoria_id, c.nombre, pr.precio, pr.precio_especial, pr.descripcion, pr.imagen_url, pr.activo, pr.creado_en
       ORDER BY pr.id DESC`,
      params
    );

    // Obtener lista de categorías para los filtros
    const [catRows]: any = await pool.query("SELECT id, nombre FROM categorias ORDER BY nombre ASC");

    return NextResponse.json({
      ok: true,
      productos: rows,
      categorias: catRows,
    });
  } catch (error) {
    console.error("[Admin Productos API Error]:", error);
    return NextResponse.json({ ok: false, error: "Error al obtener productos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminSessionFromRequest(req);
    if (!admin || !tienePermiso(admin, "productos", "crear")) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const { nombre, sku, codigoBarras, categoriaId, precio, precioEspecial, descripcion, activo } = body;

    if (!nombre || !precio) {
      return NextResponse.json({ ok: false, error: "Nombre y precio son obligatorios" }, { status: 400 });
    }

    const pool = getDbPool();
    const slug = nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const [result]: any = await pool.query(
      `INSERT INTO productos (nombre, sku, codigo_barras, slug, categoria_id, precio, precio_especial, descripcion, activo, creado_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        nombre.trim(),
        sku || `SKU-${Date.now()}`,
        codigoBarras || null,
        slug,
        categoriaId || 1,
        precio,
        precioEspecial || null,
        descripcion || null,
        activo !== undefined ? (activo ? 1 : 0) : 1,
      ]
    );

    const productoId = result.insertId;
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";

    await registrarAuditoriaAdmin({
      adminId: admin.id,
      accion: "crear_producto",
      entidad: "productos",
      entidadId: productoId,
      detalle: { nombre, precio, sku },
      ip,
    });

    return NextResponse.json({ ok: true, productoId, mensaje: "Producto creado exitosamente" });
  } catch (error) {
    console.error("[Admin Productos Create Error]:", error);
    return NextResponse.json({ ok: false, error: "Error al crear producto" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await getAdminSessionFromRequest(req);
    if (!admin || !tienePermiso(admin, "productos", "editar")) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const { id, nombre, sku, codigoBarras, categoriaId, precio, precioEspecial, descripcion, activo } = body;

    if (!id || !nombre || !precio) {
      return NextResponse.json({ ok: false, error: "ID, nombre y precio son obligatorios" }, { status: 400 });
    }

    const pool = getDbPool();

    await pool.query(
      `UPDATE productos
       SET nombre = ?,
           sku = ?,
           codigo_barras = ?,
           categoria_id = ?,
           precio = ?,
           precio_especial = ?,
           descripcion = ?,
           activo = ?
       WHERE id = ?`,
      [
        nombre.trim(),
        sku || null,
        codigoBarras || null,
        categoriaId || 1,
        precio,
        precioEspecial || null,
        descripcion || null,
        activo ? 1 : 0,
        id,
      ]
    );

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";

    await registrarAuditoriaAdmin({
      adminId: admin.id,
      accion: "editar_producto",
      entidad: "productos",
      entidadId: id,
      detalle: { nombre, precio, activo },
      ip,
    });

    return NextResponse.json({ ok: true, mensaje: "Producto actualizado exitosamente" });
  } catch (error) {
    console.error("[Admin Productos Edit Error]:", error);
    return NextResponse.json({ ok: false, error: "Error al actualizar producto" }, { status: 500 });
  }
}
