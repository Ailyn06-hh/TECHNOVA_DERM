import React from "react";
import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { getAuthUserServer } from "@/lib/session";
import { getDbPool } from "@/lib/db";
import { pasosSeguimiento } from "@/lib/pedidos";
import { NOMBRE_MARCA } from "@/lib/marca";
import CheckoutLayout from "@/components/checkout/CheckoutLayout";
import ConfirmationPage from "@/components/checkout/confirmation/ConfirmationPage";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { folio: string };
}): Promise<Metadata> {
  const folioFormat = params.folio.startsWith("#") ? params.folio : `#${params.folio}`;
  return {
    title: `Pedido ${folioFormat} confirmado · ${NOMBRE_MARCA}`,
    description: `Detalles y confirmación de tu pedido en ${NOMBRE_MARCA}.`,
  };
}

export default async function ConfirmacionPedidoRoute({
  params,
}: {
  params: { folio: string };
}) {
  const user = getAuthUserServer();
  if (!user?.userId) {
    redirect(`/login?volver=/checkout/confirmacion/${params.folio}`);
  }

  const { folio } = params;
  const pool = getDbPool();

  // 1. Acceso protegido: Solo el dueño del pedido puede verlo. Si no existe o es de otro, responder 404 (para no revelar que existe)
  const [orderRows]: any = await pool.execute(
    `SELECT p.*, 
            s.nombre as sucursal_nombre, s.direccion as sucursal_direccion, 
            s.direccion_corta as sucursal_direccion_corta, s.hora_apertura, s.hora_cierre,
            u.nombre as usuario_nombre, u.correo as usuario_correo
     FROM pedidos p
     JOIN usuarios u ON u.id = p.usuario_id
     LEFT JOIN sucursales s ON s.id = p.sucursal_id
     WHERE p.folio = ? AND p.usuario_id = ? 
     LIMIT 1`,
    [folio, user.userId]
  );

  if (!orderRows || orderRows.length === 0) {
    notFound();
  }

  const pedido = orderRows[0];

  // 2. Obtener items del pedido
  const [items]: any = await pool.execute(
    `SELECT pi.*, pr.nombre, pr.slug, pr.color_fondo, pr.color_frasco
     FROM pedido_items pi
     JOIN productos pr ON pr.id = pi.producto_id
     WHERE pi.pedido_id = ?`,
    [pedido.id]
  );

  // 3. Obtener eventos del pedido
  const [eventos]: any = await pool.execute(
    `SELECT id, estado, nota, creado_en 
     FROM pedido_eventos 
     WHERE pedido_id = ? 
     ORDER BY creado_en ASC`,
    [pedido.id]
  );

  // 4. Mapeo de estados a pasos
  const pasos = pasosSeguimiento(pedido, eventos || []);

  const sucursalNombreFinal = pedido.sucursal_nombre
    ? pedido.sucursal_nombre.startsWith(NOMBRE_MARCA)
      ? pedido.sucursal_nombre
      : `${NOMBRE_MARCA} ${pedido.sucursal_nombre}`
    : null;

  const initialData = {
    pedido: {
      id: pedido.id,
      folio: pedido.folio,
      canal: pedido.canal === "web" ? "Web" : (pedido.canal || "Web"),
      tipo_entrega: pedido.tipo_entrega as "recoger" | "envio",
      sucursal: pedido.sucursal_id
        ? {
            id: pedido.sucursal_id,
            nombre: sucursalNombreFinal || "Technova-Derm",
            direccion: pedido.sucursal_direccion,
            direccion_corta: pedido.sucursal_direccion_corta,
            horario: pedido.hora_apertura && pedido.hora_cierre
              ? `${pedido.hora_apertura.slice(0, 5)} - ${pedido.hora_cierre.slice(0, 5)}`
              : null,
          }
        : null,
      envio: pedido.tipo_entrega === "envio"
        ? {
            calle: pedido.envio_calle,
            numero: pedido.envio_numero,
            colonia: pedido.envio_colonia,
            cp: pedido.envio_cp,
            ciudad: pedido.envio_ciudad,
            estado: pedido.envio_estado,
            referencias: pedido.envio_referencias,
            direccionCompleta: `${pedido.envio_calle} #${pedido.envio_numero}, Col. ${pedido.envio_colonia}, C.P. ${pedido.envio_cp}, ${pedido.envio_ciudad}, ${pedido.envio_estado}`,
          }
        : null,
      totales: {
        subtotal: Number(pedido.subtotal),
        descuento: Number(pedido.descuento),
        costo_envio: Number(pedido.costo_envio),
        total: Number(pedido.total),
      },
      metodo_pago: pedido.metodo_pago,
      estado: pedido.estado,
      codigo_recogida: pedido.codigo_recogida,
      reserva_expira_en: pedido.reserva_expira_en,
      creado_en: pedido.creado_en ? new Date(pedido.creado_en).toISOString() : new Date().toISOString(),
    },
    cliente: {
      nombre: pedido.usuario_nombre || user.nombre || "Cliente",
      correo: pedido.usuario_correo || user.correo || "",
    },
    items: (items || []).map((it: any) => ({
      id: it.id,
      producto_id: it.producto_id,
      nombre: it.nombre,
      cantidad: Number(it.cantidad),
      precio_unitario: Number(it.precio_unitario),
      descuento: Number(it.descuento || 0),
      grupo_tipo: it.grupo_tipo,
      slug: it.slug,
      color_fondo: it.color_fondo,
      color_frasco: it.color_frasco,
    })),
    eventos: (eventos || []).map((e: any) => ({
      id: e.id,
      estado: e.estado,
      nota: e.nota,
      creado_en: e.creado_en ? new Date(e.creado_en).toISOString() : new Date().toISOString(),
    })),
    pasos,
  };

  return (
    <CheckoutLayout minimal>
      <ConfirmationPage initialData={initialData} />
    </CheckoutLayout>
  );
}
