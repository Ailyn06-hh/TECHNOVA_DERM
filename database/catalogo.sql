-- =====================================================================
-- Script DDL: Catálogo Omnicanal, Inventario, Combos, Carrito y Pedidos
-- Proyecto: Technova-Derm (HackaTec 2026)
-- Motor: MySQL / MariaDB (XAMPP / phpMyAdmin)
-- Codificación: utf8mb4_unicode_ci
-- =====================================================================

USE `technova_derm`;

-- 1. Tabla 'categorias'
CREATE TABLE IF NOT EXISTS `categorias` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nombre` VARCHAR(100) NOT NULL,
  `slug` VARCHAR(100) NOT NULL UNIQUE,
  `orden` INT NOT NULL DEFAULT 0,
  INDEX `idx_categorias_slug` (`slug`),
  INDEX `idx_categorias_orden` (`orden`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabla 'productos'
CREATE TABLE IF NOT EXISTS `productos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sku` VARCHAR(50) NOT NULL UNIQUE,
  `nombre` VARCHAR(200) NOT NULL,
  `slug` VARCHAR(200) NOT NULL UNIQUE,
  `categoria_id` INT NOT NULL,
  `tipo_rutina` ENUM('limpiador', 'tonico', 'serum', 'hidratante', 'protector', 'tratamiento') NULL,
  `descripcion` TEXT NULL,
  `precio` DECIMAL(10,2) NOT NULL,
  `precio_especial` DECIMAL(10,2) NULL,
  `color_fondo` VARCHAR(20) NOT NULL DEFAULT '#F3E1E4',
  `color_frasco` VARCHAR(20) NOT NULL DEFAULT '#D08C98',
  `imagen_url` VARCHAR(500) NULL,
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_productos_sku` (`sku`),
  INDEX `idx_productos_slug` (`slug`),
  INDEX `idx_productos_categoria` (`categoria_id`),
  INDEX `idx_productos_tipo_rutina` (`tipo_rutina`),
  INDEX `idx_productos_activo` (`activo`),
  CONSTRAINT `fk_productos_categoria` 
    FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`) 
    ON DELETE RESTRICT 
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabla 'producto_tipos_piel' (Mapeo de compatibilidad con perfiles_piel)
CREATE TABLE IF NOT EXISTS `producto_tipos_piel` (
  `producto_id` INT NOT NULL,
  `tipo_piel` ENUM('seca', 'grasa', 'mixta', 'normal', 'sensible') NOT NULL,
  PRIMARY KEY (`producto_id`, `tipo_piel`),
  INDEX `idx_ptp_tipo_piel` (`tipo_piel`),
  CONSTRAINT `fk_ptp_producto` 
    FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabla 'producto_preocupaciones' (Mapeo de compatibilidad con perfil_preocupaciones)
CREATE TABLE IF NOT EXISTS `producto_preocupaciones` (
  `producto_id` INT NOT NULL,
  `preocupacion` ENUM('hidratacion', 'manchas', 'poros', 'proteccion_solar', 'anti_edad') NOT NULL,
  PRIMARY KEY (`producto_id`, `preocupacion`),
  INDEX `idx_pp_preocupacion` (`preocupacion`),
  CONSTRAINT `fk_pp_producto` 
    FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabla 'productos_relacionados'
CREATE TABLE IF NOT EXISTS `productos_relacionados` (
  `producto_id` INT NOT NULL,
  `relacionado_id` INT NOT NULL,
  `prioridad` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`producto_id`, `relacionado_id`),
  INDEX `idx_pr_relacionado` (`relacionado_id`),
  CONSTRAINT `fk_pr_producto` 
    FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
  CONSTRAINT `fk_pr_relacionado` 
    FOREIGN KEY (`relacionado_id`) REFERENCES `productos` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tabla 'sucursales'
CREATE TABLE IF NOT EXISTS `sucursales` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nombre` VARCHAR(150) NOT NULL,
  `direccion` VARCHAR(255) NOT NULL,
  `activa` TINYINT(1) NOT NULL DEFAULT 1,
  INDEX `idx_sucursales_activa` (`activa`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Tabla 'inventario' (PK compuesta por producto y sucursal)
CREATE TABLE IF NOT EXISTS `inventario` (
  `producto_id` INT NOT NULL,
  `sucursal_id` INT NOT NULL,
  `existencias` INT NOT NULL DEFAULT 0,
  `actualizado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`producto_id`, `sucursal_id`),
  INDEX `idx_inventario_sucursal` (`sucursal_id`),
  CONSTRAINT `fk_inventario_producto` 
    FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
  CONSTRAINT `fk_inventario_sucursal` 
    FOREIGN KEY (`sucursal_id`) REFERENCES `sucursales` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Tabla 'combos'
CREATE TABLE IF NOT EXISTS `combos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nombre` VARCHAR(150) NOT NULL,
  `slug` VARCHAR(150) NOT NULL UNIQUE,
  `descripcion_corta` VARCHAR(255) NOT NULL,
  `descuento_porcentaje` INT NOT NULL DEFAULT 0,
  `color_fondo` VARCHAR(20) NOT NULL DEFAULT '#F3E1E4',
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `inicia_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `termina_en` DATETIME NULL,
  INDEX `idx_combos_slug` (`slug`),
  INDEX `idx_combos_activo` (`activo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Tabla 'combo_productos'
CREATE TABLE IF NOT EXISTS `combo_productos` (
  `combo_id` INT NOT NULL,
  `producto_id` INT NOT NULL,
  `cantidad` INT NOT NULL DEFAULT 1,
  PRIMARY KEY (`combo_id`, `producto_id`),
  CONSTRAINT `fk_cp_combo` 
    FOREIGN KEY (`combo_id`) REFERENCES `combos` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
  CONSTRAINT `fk_cp_producto` 
    FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Tabla 'carritos' (un solo carrito por usuario o por token de invitado)
CREATE TABLE IF NOT EXISTS `carritos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `usuario_id` INT NULL UNIQUE,
  `token_invitado` VARCHAR(64) NULL UNIQUE,
  `actualizado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_carritos_usuario` (`usuario_id`),
  INDEX `idx_carritos_token` (`token_invitado`),
  CONSTRAINT `fk_carritos_usuario` 
    FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Tabla 'carrito_items'
CREATE TABLE IF NOT EXISTS `carrito_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `carrito_id` INT NOT NULL,
  `producto_id` INT NULL,
  `combo_id` INT NULL,
  `cantidad` INT NOT NULL DEFAULT 1,
  `precio_unitario_al_agregar` DECIMAL(10,2) NOT NULL,
  INDEX `idx_ci_carrito` (`carrito_id`),
  INDEX `idx_ci_producto` (`producto_id`),
  INDEX `idx_ci_combo` (`combo_id`),
  CONSTRAINT `fk_ci_carrito` 
    FOREIGN KEY (`carrito_id`) REFERENCES `carritos` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
  CONSTRAINT `fk_ci_producto` 
    FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
  CONSTRAINT `fk_ci_combo` 
    FOREIGN KEY (`combo_id`) REFERENCES `combos` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Tabla 'pedidos'
CREATE TABLE IF NOT EXISTS `pedidos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `usuario_id` INT NOT NULL,
  `canal` ENUM('web', 'app', 'tienda') NOT NULL DEFAULT 'web',
  `sucursal_id` INT NULL,
  `total` DECIMAL(10,2) NOT NULL,
  `estado` ENUM('pendiente', 'pagado', 'en_preparacion', 'listo_recoleccion', 'entregado', 'cancelado') NOT NULL DEFAULT 'pagado',
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_pedidos_usuario` (`usuario_id`),
  INDEX `idx_pedidos_canal` (`canal`),
  INDEX `idx_pedidos_estado` (`estado`),
  CONSTRAINT `fk_pedidos_usuario` 
    FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
  CONSTRAINT `fk_pedidos_sucursal` 
    FOREIGN KEY (`sucursal_id`) REFERENCES `sucursales` (`id`) 
    ON DELETE SET NULL 
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Tabla 'pedido_items'
CREATE TABLE IF NOT EXISTS `pedido_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `pedido_id` INT NOT NULL,
  `producto_id` INT NOT NULL,
  `cantidad` INT NOT NULL DEFAULT 1,
  `precio_unitario` DECIMAL(10,2) NOT NULL,
  INDEX `idx_pi_pedido` (`pedido_id`),
  INDEX `idx_pi_producto` (`producto_id`),
  CONSTRAINT `fk_pi_pedido` 
    FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
  CONSTRAINT `fk_pi_producto` 
    FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) 
    ON DELETE RESTRICT 
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Tabla 'notificaciones'
CREATE TABLE IF NOT EXISTS `notificaciones` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `usuario_id` INT NOT NULL,
  `titulo` VARCHAR(150) NOT NULL,
  `mensaje` TEXT NOT NULL,
  `leida` TINYINT(1) NOT NULL DEFAULT 0,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_notificaciones_usuario` (`usuario_id`),
  INDEX `idx_notificaciones_leida` (`leida`),
  CONSTRAINT `fk_notificaciones_usuario` 
    FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
