-- ========================================================================
-- Technova-Derm - Base de Datos Reabastecimiento y Proveedores
-- CRM Administradora (Dueña)
-- ========================================================================

-- Catálogo de Proveedores
CREATE TABLE IF NOT EXISTS `proveedores` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nombre` VARCHAR(100) NOT NULL,
  `contacto` VARCHAR(100) NULL,
  `correo` VARCHAR(254) NULL,
  `telefono` VARCHAR(30) NULL,
  `especialidades` VARCHAR(200) NULL,
  `dias_entrega` INT NOT NULL DEFAULT 3,
  `activo` TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sembrar proveedores del mockup
INSERT INTO `proveedores` (`nombre`, `especialidades`, `dias_entrega`, `correo`)
VALUES
  ('Laboratorio Botánico MX', 'Sérums y tónicos · entrega 3 días', 3, 'contacto@laboratoriobotanico.mx'),
  ('Dermalab del Bajío', 'Hidratantes · entrega 5 días', 5, 'pedidos@dermalab.mx'),
  ('SolarCare', 'Protección solar · entrega 7 días', 7, 'ventas@solarcare.mx')
ON DUPLICATE KEY UPDATE `especialidades` = VALUES(`especialidades`), `dias_entrega` = VALUES(`dias_entrega`);

-- Extender ordenes_compra si falta columna costo_total o fecha_deseada
ALTER TABLE `ordenes_compra` ADD COLUMN `costo_total` DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER `sucursal_destino_id`;
ALTER TABLE `ordenes_compra` ADD COLUMN `fecha_deseada` DATE NULL AFTER `llegada_estimada`;

-- Sembrar Órdenes de Compra calcadas del mockup
INSERT INTO `ordenes_compra` (`folio`, `proveedor`, `sucursal_destino_id`, `costo_total`, `estado`, `llegada_estimada`, `fecha_deseada`, `creado_en`)
VALUES
  ('OC-118', 'Laboratorio Botánico MX', 3, 4560.00, 'En camino', '2026-09-26', '2026-09-26', NOW()),
  ('OC-117', 'Dermalab del Bajío', 3, 2790.00, 'Recibida', '2026-09-20', '2026-09-20', DATE_SUB(NOW(), INTERVAL 5 DAY))
ON DUPLICATE KEY UPDATE `estado` = VALUES(`estado`);
