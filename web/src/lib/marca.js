/**
 * Constantes institucionales de marca para Technova-Derm
 */
const NOMBRE_MARCA = "Technova-Derm";
const LEMA = "Skincare pensado en tus días. Compra en línea, en la app o en tienda.";
const ENVIO_GRATIS_DESDE = 1200;
const COSTO_ENVIO = 99;
const TIEMPO_ENVIO_DOMICILIO = "2 a 3 días";
const DIAS_ENVIO = "2 a 3 días hábiles";

const PREFIJO_FOLIO = "N";
const PREFIJO_FOLIO_POS = "V";
const DIAS_DEVOLUCION = 30;
const DIAS_PARA_FACTURAR = 30;

const MAX_DIRECCIONES = 10;
const MAX_TARJETAS = 5;

// Constantes de Inventario POS y Omnicanal
const DIAS_RITMO_VENTA = 14;
const DIAS_AGOTA_ALERTA = 7;
const DIAS_SOBRESTOCK = 45;
const DIAS_ALERTA_CADUCIDAD = 90;

// Soporte y Atención a Clientes
const WHATSAPP_SOPORTE = "5244900000000";
const HORARIO_SOPORTE = {
  dias: "Lunes a sábado",
  inicio: "09:00",
  fin: "20:00",
};

// Constantes de Corte de Caja POS
const TOLERANCIA_CORTE = 10;
const CORTE_CIEGO = false;

module.exports = {
  NOMBRE_MARCA,
  LEMA,
  ENVIO_GRATIS_DESDE,
  COSTO_ENVIO,
  TIEMPO_ENVIO_DOMICILIO,
  DIAS_ENVIO,
  PREFIJO_FOLIO,
  PREFIJO_FOLIO_POS,
  DIAS_DEVOLUCION,
  DIAS_PARA_FACTURAR,
  MAX_DIRECCIONES,
  MAX_TARJETAS,
  DIAS_RITMO_VENTA,
  DIAS_AGOTA_ALERTA,
  DIAS_SOBRESTOCK,
  DIAS_ALERTA_CADUCIDAD,
  WHATSAPP_SOPORTE,
  HORARIO_SOPORTE,
  TOLERANCIA_CORTE,
  CORTE_CIEGO,
  default: {
    NOMBRE_MARCA,
    LEMA,
    ENVIO_GRATIS_DESDE,
    COSTO_ENVIO,
    TIEMPO_ENVIO_DOMICILIO,
    DIAS_ENVIO,
    PREFIJO_FOLIO,
    PREFIJO_FOLIO_POS,
    DIAS_DEVOLUCION,
    DIAS_PARA_FACTURAR,
    MAX_DIRECCIONES,
    MAX_TARJETAS,
    DIAS_RITMO_VENTA,
    DIAS_AGOTA_ALERTA,
    DIAS_SOBRESTOCK,
    DIAS_ALERTA_CADUCIDAD,
    WHATSAPP_SOPORTE,
    HORARIO_SOPORTE,
    TOLERANCIA_CORTE,
    CORTE_CIEGO,
  },
};
