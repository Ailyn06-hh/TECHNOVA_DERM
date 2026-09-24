import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getAuthUserFromRequest } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productoId = parseInt(params.id, 10);
    if (isNaN(productoId)) {
      return NextResponse.json({ error: "ID de producto inválido" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const pagina = Math.max(1, parseInt(searchParams.get("pagina") || "1", 10));
    const limite = Math.min(20, Math.max(1, parseInt(searchParams.get("limite") || "6", 10)));
    const offset = (pagina - 1) * limite;

    const pool = getDbPool();

    // 1. Obtener total y promedio de reseñas aprobadas
    const [statsRows]: any = await pool.execute(
      `SELECT 
        COUNT(*) as total, 
        COALESCE(AVG(calificacion), 0) as promedio
       FROM resenas
       WHERE producto_id = ? AND aprobada = 1`,
      [productoId]
    );

    const total = Number(statsRows[0]?.total || 0);
    const promedio = parseFloat(Number(statsRows[0]?.promedio || 0).toFixed(1));

    // 2. Obtener reseñas paginadas con nombre del comprador
    const [rows]: any = await pool.execute(
      `SELECT 
        r.id,
        r.calificacion,
        r.titulo,
        r.texto,
        r.creado_en,
        u.nombre,
        u.apellido
       FROM resenas r
       JOIN usuarios u ON u.id = r.usuario_id
       WHERE r.producto_id = ? AND r.aprobada = 1
       ORDER BY r.creado_en DESC
       LIMIT ${limite} OFFSET ${offset}`,
      [productoId]
    );

    const resenas = (rows || []).map((r: any) => ({
      id: r.id,
      calificacion: Number(r.calificacion),
      titulo: r.titulo,
      texto: r.texto,
      creado_en: r.creado_en,
      autor: `${r.nombre} ${r.apellido ? r.apellido[0] + "." : ""}`.trim(),
      compraVerificada: true,
    }));

    // 3. Verificar si el usuario en sesión puede escribir reseña
    let puedeEscribir = false;
    let pedidoIdValido: number | null = null;
    const session = getAuthUserFromRequest(req);

    if (session?.userId) {
      // ¿Ya tiene reseña para este producto?
      const [existingReview]: any = await pool.execute(
        "SELECT id FROM resenas WHERE producto_id = ? AND usuario_id = ? LIMIT 1",
        [productoId, session.userId]
      );

      if (!existingReview || existingReview.length === 0) {
        // ¿Tiene pedido entregado con este producto?
        const [deliveredOrder]: any = await pool.execute(
          `SELECT ped.id 
           FROM pedidos ped
           JOIN pedido_items pi ON pi.pedido_id = ped.id
           WHERE ped.usuario_id = ? 
             AND pi.producto_id = ? 
             AND ped.estado = 'entregado'
           ORDER BY ped.creado_en DESC 
           LIMIT 1`,
          [session.userId, productoId]
        );

        if (deliveredOrder && deliveredOrder.length > 0) {
          puedeEscribir = true;
          pedidoIdValido = deliveredOrder[0].id;
        }
      }
    }

    return NextResponse.json({
      resenas,
      total,
      promedio,
      pagina,
      hayMas: offset + resenas.length < total,
      puedeEscribir,
      pedidoIdValido,
    });
  } catch (error: any) {
    console.error("Error en GET /api/productos/[id]/resenas:", error);
    return NextResponse.json(
      { error: "Error al consultar reseñas" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productoId = parseInt(params.id, 10);
    if (isNaN(productoId)) {
      return NextResponse.json({ error: "ID de producto inválido" }, { status: 400 });
    }

    const session = getAuthUserFromRequest(req);
    if (!session?.userId) {
      return NextResponse.json(
        { error: "Debes iniciar sesión para escribir una reseña." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { calificacion, titulo, texto } = body;

    const numCalificacion = parseInt(calificacion, 10);
    if (isNaN(numCalificacion) || numCalificacion < 1 || numCalificacion > 5) {
      return NextResponse.json(
        { error: "La calificación debe ser de 1 a 5 estrellas." },
        { status: 400 }
      );
    }

    const cleanTitulo = String(titulo || "").trim();
    if (cleanTitulo.length < 3 || cleanTitulo.length > 80) {
      return NextResponse.json(
        { error: "El título debe tener entre 3 y 80 caracteres." },
        { status: 400 }
      );
    }

    const cleanTexto = String(texto || "").trim();
    if (cleanTexto.length < 20 || cleanTexto.length > 1000) {
      return NextResponse.json(
        { error: "La reseña debe tener entre 20 y 1,000 caracteres." },
        { status: 400 }
      );
    }

    const pool = getDbPool();

    // 1. Validar límite diario: máximo 5 reseñas por usuario al día
    const [dailyCountRows]: any = await pool.execute(
      "SELECT COUNT(*) as hoy FROM resenas WHERE usuario_id = ? AND creado_en >= CURDATE()",
      [session.userId]
    );
    if (Number(dailyCountRows[0]?.hoy || 0) >= 5) {
      return NextResponse.json(
        { error: "Has alcanzado el límite de 5 reseñas por día." },
        { status: 429 }
      );
    }

    // 2. Verificar que no haya reseñado previamente este producto
    const [existingRows]: any = await pool.execute(
      "SELECT id FROM resenas WHERE producto_id = ? AND usuario_id = ? LIMIT 1",
      [productoId, session.userId]
    );
    if (existingRows && existingRows.length > 0) {
      return NextResponse.json(
        { error: "Ya has publicado una reseña para este producto." },
        { status: 400 }
      );
    }

    // 3. Verificar pedido entregado
    const [orderRows]: any = await pool.execute(
      `SELECT ped.id 
       FROM pedidos ped
       JOIN pedido_items pi ON pi.pedido_id = ped.id
       WHERE ped.usuario_id = ? 
         AND pi.producto_id = ? 
         AND ped.estado = 'entregado'
       ORDER BY ped.creado_en DESC 
       LIMIT 1`,
      [session.userId, productoId]
    );

    if (!orderRows || orderRows.length === 0) {
      return NextResponse.json(
        { error: "Solo compradoras con pedido entregado pueden reseñar este producto." },
        { status: 403 }
      );
    }

    const pedidoId = orderRows[0].id;

    // 4. Insertar reseña aprobada (texto escapado en render, guardado tal cual)
    const [insertResult]: any = await pool.execute(
      `INSERT INTO resenas 
        (producto_id, usuario_id, pedido_id, calificacion, titulo, texto, aprobada, creado_en) 
       VALUES (?, ?, ?, ?, ?, ?, 1, NOW())`,
      [productoId, session.userId, pedidoId, numCalificacion, cleanTitulo, cleanTexto]
    );

    // Obtener nuevo promedio y total
    const [statsRows]: any = await pool.execute(
      `SELECT COUNT(*) as total, COALESCE(AVG(calificacion), 0) as promedio 
       FROM resenas 
       WHERE producto_id = ? AND aprobada = 1`,
      [productoId]
    );

    const [userRows]: any = await pool.execute(
      "SELECT nombre, apellido FROM usuarios WHERE id = ? LIMIT 1",
      [session.userId]
    );
    const u = userRows[0];

    const nuevaResena = {
      id: insertResult.insertId,
      calificacion: numCalificacion,
      titulo: cleanTitulo,
      texto: cleanTexto,
      creado_en: new Date().toISOString(),
      autor: `${u.nombre} ${u.apellido ? u.apellido[0] + "." : ""}`.trim(),
      compraVerificada: true,
    };

    return NextResponse.json({
      success: true,
      resena: nuevaResena,
      total: Number(statsRows[0]?.total || 0),
      promedio: parseFloat(Number(statsRows[0]?.promedio || 0).toFixed(1)),
      message: "¡Gracias! Tu reseña ha sido publicada.",
    });
  } catch (error: any) {
    console.error("Error en POST /api/productos/[id]/resenas:", error);
    return NextResponse.json(
      { error: "Error al publicar la reseña." },
      { status: 500 }
    );
  }
}
