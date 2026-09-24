import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDbPool } from "@/lib/db";
import { getAuthUserServer } from "@/lib/session";
import { calcularDisponibilidad } from "@/lib/disponibilidad";
import { getRutinaParaProducto } from "@/lib/recomendaciones";
import ProductPage from "@/components/product/ProductPage";
import { NOMBRE_MARCA } from "@/lib/marca";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { slug: string };
}

// 1. Metadatos SEO dinámicos
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const pool = getDbPool();
  const [rows]: any = await pool.execute(
    "SELECT nombre, descripcion FROM productos WHERE slug = ? AND activo = 1 LIMIT 1",
    [params.slug]
  );

  if (!rows || rows.length === 0) {
    return {
      title: `Producto no encontrado — ${NOMBRE_MARCA}`,
    };
  }

  const p = rows[0];
  return {
    title: `${p.nombre} · ${NOMBRE_MARCA}`,
    description: p.descripcion,
  };
}

// 2. Componente de Servidor principal
export default async function ProductoDetalleRoute({ params }: PageProps) {
  const pool = getDbPool();

  // A. Consultar producto por slug
  const [prodRows]: any = await pool.execute(
    `SELECT 
      p.id, 
      p.sku, 
      p.nombre, 
      p.slug, 
      p.categoria_id, 
      p.tipo_rutina,
      p.contenido,
      p.descripcion, 
      p.precio, 
      p.precio_especial, 
      p.color_fondo, 
      p.color_frasco, 
      p.imagen_url,
      p.activo,
      c.nombre as categoria_nombre,
      c.slug as categoria_slug,
      COALESCE(SUM(i.existencias), 0) as total_stock
     FROM productos p
     JOIN categorias c ON c.id = p.categoria_id
     LEFT JOIN inventario i ON i.producto_id = p.id
     WHERE p.slug = ? AND p.activo = 1
     GROUP BY p.id
     LIMIT 1`,
    [params.slug]
  );

  if (!prodRows || prodRows.length === 0) {
    notFound();
  }

  const p = prodRows[0];
  const productoId = Number(p.id);

  // B. Sesión de usuario para verificaciones y personalización
  const session = getAuthUserServer();
  const userId = session?.userId || null;

  // C. Consultas en paralelo para máximo rendimiento en el servidor
  const [
    imgRowsResult,
    statsRowsResult,
    reviewsRowsResult,
    disponibilidad,
    rutinaData,
    orderRowsResult,
    existingReviewResult,
  ] = await Promise.all([
    // 1. Imágenes del producto
    pool.execute(
      "SELECT id, url, color_fondo, color_frasco, alt FROM producto_imagenes WHERE producto_id = ? ORDER BY orden ASC",
      [productoId]
    ),
    // 2. Estadísticas de reseñas
    pool.execute(
      "SELECT COUNT(*) as total, COALESCE(AVG(calificacion), 0) as promedio FROM resenas WHERE producto_id = ? AND aprobada = 1",
      [productoId]
    ),
    // 3. Primeras 3 reseñas
    pool.execute(
      `SELECT r.id, r.calificacion, r.titulo, r.texto, r.creado_en, u.nombre, u.apellido
       FROM resenas r
       JOIN usuarios u ON u.id = r.usuario_id
       WHERE r.producto_id = ? AND r.aprobada = 1
       ORDER BY r.creado_en DESC
       LIMIT 3`,
      [productoId]
    ),
    // 4. Disponibilidad omnicanal
    calcularDisponibilidad(productoId),
    // 5. Rutina sugerida o combo
    getRutinaParaProducto(productoId, userId),
    // 6. Verificar pedido entregado del usuario actual (si hay sesión)
    userId
      ? pool.execute(
          `SELECT ped.id 
           FROM pedidos ped 
           JOIN pedido_items pi ON pi.pedido_id = ped.id 
           WHERE ped.usuario_id = ? AND pi.producto_id = ? AND ped.estado = 'entregado' 
           LIMIT 1`,
          [userId, productoId]
        )
      : Promise.resolve([[]] as any),
    // 7. Verificar si el usuario ya escribió reseña
    userId
      ? pool.execute(
          "SELECT id FROM resenas WHERE producto_id = ? AND usuario_id = ? LIMIT 1",
          [productoId, userId]
        )
      : Promise.resolve([[]] as any),
  ]);

  // Formatear imágenes
  const [imgRows]: any = imgRowsResult;
  const imagenes = (imgRows || []).map((r: any) => ({
    id: Number(r.id),
    url: r.url,
    color_fondo: r.color_fondo || p.color_fondo,
    color_frasco: r.color_frasco || p.color_frasco,
    alt: r.alt,
  }));

  // Formatear estadísticas de reseñas
  const [statsRows]: any = statsRowsResult;
  const totalResenas = Number(statsRows[0]?.total || 0);
  const promedioResenas = parseFloat(Number(statsRows[0]?.promedio || 0).toFixed(1));

  // Formatear reseñas iniciales
  const [reviewsRows]: any = reviewsRowsResult;
  const initialReviews = (reviewsRows || []).map((r: any) => ({
    id: Number(r.id),
    calificacion: Number(r.calificacion),
    titulo: r.titulo,
    texto: r.texto,
    creado_en: r.creado_en,
    autor: `${r.nombre} ${r.apellido ? r.apellido[0] + "." : ""}`.trim(),
    compraVerificada: true,
  }));

  // Elegibilidad para escribir reseña
  const [orderRows]: any = orderRowsResult;
  const [existingReviewRows]: any = existingReviewResult;
  const puedeEscribirInicial = Boolean(
    userId &&
      orderRows &&
      orderRows.length > 0 &&
      (!existingReviewRows || existingReviewRows.length === 0)
  );

  const productoData = {
    id: productoId,
    nombre: p.nombre,
    slug: p.slug,
    categoria_nombre: p.categoria_nombre,
    contenido: p.contenido,
    descripcion: p.descripcion,
    precio: Number(p.precio),
    precio_especial: p.precio_especial ? Number(p.precio_especial) : null,
    total_stock: Number(p.total_stock),
    promedio_resenas: promedioResenas,
    total_resenas: totalResenas,
  };

  return (
    <ProductPage
      producto={productoData}
      categoriaSlug={p.categoria_slug}
      imagenes={imagenes}
      disponibilidad={disponibilidad}
      rutinaData={rutinaData}
      initialReviews={initialReviews}
      totalResenas={totalResenas}
      promedioResenas={promedioResenas}
      puedeEscribirInicial={puedeEscribirInicial}
    />
  );
}
