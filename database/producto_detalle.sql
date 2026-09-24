-- =====================================================================
-- Script DDL & DML: Ficha de Producto, Imágenes, Reseñas, Favoritos y Sucursales
-- Proyecto: Technova-Derm (HackaTec 2026)
-- Motor: MySQL / MariaDB (XAMPP)
-- Codificación: utf8mb4_unicode_ci
-- =====================================================================

USE `technova_derm`;

-- 1. Modificar tabla 'productos' para agregar contenido
ALTER TABLE `productos` 
  ADD COLUMN IF NOT EXISTS `contenido` VARCHAR(20) NULL AFTER `tipo_rutina`;

-- 2. Crear tabla 'producto_imagenes'
CREATE TABLE IF NOT EXISTS `producto_imagenes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `producto_id` INT NOT NULL,
  `url` VARCHAR(500) NULL,
  `color_fondo` VARCHAR(20) NOT NULL DEFAULT '#F3E1E4',
  `color_frasco` VARCHAR(20) NOT NULL DEFAULT '#D08C98',
  `alt` VARCHAR(255) NULL,
  `orden` INT NOT NULL DEFAULT 0,
  INDEX `idx_prod_img_prod` (`producto_id`, `orden`),
  CONSTRAINT `fk_prod_img_producto`
    FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Crear tabla 'resenas'
CREATE TABLE IF NOT EXISTS `resenas` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `producto_id` INT NOT NULL,
  `usuario_id` INT NOT NULL,
  `pedido_id` INT NOT NULL,
  `calificacion` TINYINT NOT NULL,
  `titulo` VARCHAR(100) NOT NULL,
  `texto` TEXT NOT NULL,
  `aprobada` TINYINT(1) NOT NULL DEFAULT 1,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_producto_usuario` (`producto_id`, `usuario_id`),
  INDEX `idx_resenas_prod_aprobada` (`producto_id`, `aprobada`, `creado_en`),
  INDEX `idx_resenas_usuario` (`usuario_id`),
  CONSTRAINT `fk_resenas_producto`
    FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_resenas_usuario`
    FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_resenas_pedido`
    FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Crear tabla 'favoritos'
CREATE TABLE IF NOT EXISTS `favoritos` (
  `usuario_id` INT NOT NULL,
  `producto_id` INT NOT NULL,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`usuario_id`, `producto_id`),
  INDEX `idx_fav_usuario` (`usuario_id`),
  CONSTRAINT `fk_fav_usuario`
    FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_fav_producto`
    FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Modificar tabla 'sucursales' para horarios y tiempo de preparación
ALTER TABLE `sucursales`
  ADD COLUMN IF NOT EXISTS `hora_apertura` TIME NOT NULL DEFAULT '10:00:00',
  ADD COLUMN IF NOT EXISTS `hora_cierre` TIME NOT NULL DEFAULT '20:00:00',
  ADD COLUMN IF NOT EXISTS `minutos_preparacion` INT NOT NULL DEFAULT 120;

-- =====================================================================
-- SEMILLAS
-- =====================================================================

-- Actualizar horarios de sucursales
UPDATE `sucursales` 
SET `hora_apertura` = '10:00:00', 
    `hora_cierre` = '20:00:00', 
    `minutos_preparacion` = 120 
WHERE `id` IN (1, 2);

-- Actualizar contenido para todos los productos
UPDATE `productos` SET `contenido` = '150 ml' WHERE `categoria_id` = 1; -- Limpiadores
UPDATE `productos` SET `contenido` = '50 ml'  WHERE `categoria_id` = 2; -- Hidratantes
UPDATE `productos` SET `contenido` = '50 ml'  WHERE `categoria_id` = 3; -- Protectores
UPDATE `productos` SET `contenido` = '30 ml'  WHERE `categoria_id` = 4; -- Sérums
UPDATE `productos` SET `contenido` = '200 ml' WHERE `categoria_id` = 5; -- Tónicos
UPDATE `productos` SET `contenido` = '15 ml'  WHERE `categoria_id` = 6; -- Contorno
UPDATE `productos` SET `contenido` = '75 ml'  WHERE `categoria_id` = 7; -- Mascarillas
UPDATE `productos` SET `contenido` = '100 ml' WHERE `categoria_id` = 8; -- Brumas
UPDATE `productos` SET `contenido` = '30 ml'  WHERE `id` = 2;          -- Sérum Niacinamida específico

-- Insertar 3 imágenes con paletas armónicas para cada producto
DELETE FROM `producto_imagenes`;

INSERT INTO `producto_imagenes` (`producto_id`, `url`, `color_fondo`, `color_frasco`, `alt`, `orden`)
SELECT 
  p.id, 
  NULL, 
  p.color_fondo, 
  p.color_frasco, 
  CONCAT(p.nombre, ' - Vista frontal'), 
  1
FROM `productos` p;

INSERT INTO `producto_imagenes` (`producto_id`, `url`, `color_fondo`, `color_frasco`, `alt`, `orden`)
SELECT 
  p.id, 
  NULL, 
  -- Ligera variación más suave para fondo 2
  CASE 
    WHEN p.color_fondo = '#F3E1E4' THEN '#F9ECEE'
    WHEN p.color_fondo = '#FBEFD6' THEN '#FFF8EA'
    WHEN p.color_fondo = '#DDE9E1' THEN '#EAF3ED'
    WHEN p.color_fondo = '#E9E3F0' THEN '#F3EEF9'
    ELSE '#F5EBE6'
  END, 
  p.color_frasco, 
  CONCAT(p.nombre, ' - Vista lateral'), 
  2
FROM `productos` p;

INSERT INTO `producto_imagenes` (`producto_id`, `url`, `color_fondo`, `color_frasco`, `alt`, `orden`)
SELECT 
  p.id, 
  NULL, 
  -- Tono crema neutro para fondo 3
  '#FAF6F0', 
  p.color_frasco, 
  CONCAT(p.nombre, ' - Detalle de textura'), 
  3
FROM `productos` p;

-- Usuarios de prueba para reseñas reales
INSERT IGNORE INTO `usuarios` 
  (`id`, `nombre`, `apellido`, `correo`, `celular`, `password_hash`, `verificado`) 
VALUES
  (20, 'Ana', 'García', 'ana.garcia@example.com', '5511223344', '$2b$10$abcdefghijklmnopqrstuu', 1),
  (21, 'Sofía', 'Mendoza', 'sofia.m@example.com', '5522334455', '$2b$10$abcdefghijklmnopqrstuu', 1),
  (22, 'Valeria', 'López', 'valeria.l@example.com', '5533445566', '$2b$10$abcdefghijklmnopqrstuu', 1),
  (23, 'Mariana', 'Torres', 'mariana.t@example.com', '5544556677', '$2b$10$abcdefghijklmnopqrstuu', 1),
  (24, 'Camila', 'Ríos', 'camila.r@example.com', '5555667788', '$2b$10$abcdefghijklmnopqrstuu', 1),
  (25, 'Fernanda', 'Díaz', 'fer.diaz@example.com', '5566778899', '$2b$10$abcdefghijklmnopqrstuu', 1),
  (26, 'Lucía', 'Navarro', 'lucia.n@example.com', '5577889900', '$2b$10$abcdefghijklmnopqrstuu', 1),
  (27, 'Daniela', 'Paz', 'daniela.p@example.com', '5588990011', '$2b$10$abcdefghijklmnopqrstuu', 1),
  (28, 'Elena', 'Morales', 'elena.m@example.com', '5599001122', '$2b$10$abcdefghijklmnopqrstuu', 1),
  (29, 'Paula', 'Sánchez', 'paula.s@example.com', '5500112233', '$2b$10$abcdefghijklmnopqrstuu', 1);

-- Pedidos entregados para los usuarios de prueba
INSERT IGNORE INTO `pedidos` (`id`, `usuario_id`, `canal`, `sucursal_id`, `total`, `estado`, `creado_en`) VALUES
  (10, 20, 'web', 1, 429.00, 'entregado', DATE_SUB(NOW(), INTERVAL 20 DAY)),
  (11, 21, 'web', 1, 429.00, 'entregado', DATE_SUB(NOW(), INTERVAL 18 DAY)),
  (12, 22, 'web', 1, 429.00, 'entregado', DATE_SUB(NOW(), INTERVAL 15 DAY)),
  (13, 23, 'web', 1, 429.00, 'entregado', DATE_SUB(NOW(), INTERVAL 12 DAY)),
  (14, 24, 'web', 1, 429.00, 'entregado', DATE_SUB(NOW(), INTERVAL 10 DAY)),
  (15, 25, 'web', 1, 429.00, 'entregado', DATE_SUB(NOW(), INTERVAL 8 DAY)),
  (16, 26, 'web', 1, 249.00, 'entregado', DATE_SUB(NOW(), INTERVAL 7 DAY)),
  (17, 27, 'web', 1, 389.00, 'entregado', DATE_SUB(NOW(), INTERVAL 6 DAY)),
  (18, 28, 'web', 1, 319.00, 'entregado', DATE_SUB(NOW(), INTERVAL 5 DAY)),
  (19, 29, 'web', 1, 429.00, 'entregado', DATE_SUB(NOW(), INTERVAL 3 DAY));

-- Items de pedidos
INSERT IGNORE INTO `pedido_items` (`id`, `pedido_id`, `producto_id`, `cantidad`, `precio_unitario`) VALUES
  (10, 10, 2, 1, 429.00),
  (11, 11, 2, 1, 429.00),
  (12, 12, 2, 1, 429.00),
  (13, 13, 2, 1, 429.00),
  (14, 14, 2, 1, 429.00),
  (15, 15, 2, 1, 429.00),
  (16, 16, 1, 1, 249.00),
  (17, 17, 3, 1, 389.00),
  (18, 18, 4, 1, 319.00),
  (19, 19, 2, 1, 429.00);

-- Reseñas reales aprobadas (ligadas a producto_id, usuario_id y pedido_id)
INSERT INTO `resenas` 
  (`id`, `producto_id`, `usuario_id`, `pedido_id`, `calificacion`, `titulo`, `texto`, `aprobada`, `creado_en`) 
VALUES
  (1, 2, 20, 10, 5, 'Disminuyó mis poros visiblemente', 
   'Llevo tres semanas usándolo mañana y noche y el cambio en la zona T es impresionante. No deja sensación pegajosa y se absorbe de inmediato.', 1, DATE_SUB(NOW(), INTERVAL 19 DAY)),

  (2, 2, 21, 11, 5, 'Controla el brillo sin resecar', 
   'Tengo piel mixta con tendencia a brillos en la frente. Desde los primeros días noté cómo regula el sebo sin dejar tirantez. Un básico absoluto en mi rutina.', 1, DATE_SUB(NOW(), INTERVAL 17 DAY)),

  (3, 2, 22, 12, 5, 'Textura ligera inmejorable', 
   'Se siente como un gel acuoso súper refrescante. Se lleva perfecto debajo del protector solar y no hace bolitas. 100% recomendado.', 1, DATE_SUB(NOW(), INTERVAL 14 DAY)),

  (4, 2, 23, 13, 4, 'Excelente para marcas de acné', 
   'Me ayudó muchísimo a desvanecer marquitas rojas post-acné en las mejillas. Mi piel luce mucho más uniforme y calmada.', 1, DATE_SUB(NOW(), INTERVAL 11 DAY)),

  (5, 2, 24, 14, 5, 'Fórmula dermatológica impecable', 
   'Tengo piel sensible y temía que el 10% fuera demasiado, pero la concentración de zinc equilibra la fórmula a la perfección. Cero irritaciones.', 1, DATE_SUB(NOW(), INTERVAL 9 DAY)),

  (6, 2, 25, 15, 4, 'Gran relación calidad-precio', 
   'Rinde muchísimo, con 3 a 4 gotas cubre rostro y cuello completos. Muy satisfecha con los resultados.', 1, DATE_SUB(NOW(), INTERVAL 7 DAY)),

  (7, 1, 26, 16, 5, 'Limpieza profunda y reconfortante', 
   'La espuma de avena es una caricia para la piel irritada. Limpia todo el exceso de impurezas sin dejar esa sensación tirante.', 1, DATE_SUB(NOW(), INTERVAL 6 DAY)),

  (8, 3, 27, 17, 5, 'El mejor protector que he probado', 
   'Cero capa blanca, acabado mate aterciopelado y no arde en los ojos. Lo reaplico cada 3 horas con total comodidad.', 1, DATE_SUB(NOW(), INTERVAL 5 DAY)),

  (9, 4, 28, 18, 5, 'Hidratación pura y fresca', 
   'El gel de aloe calma inmediatamente después del sol o tras una caminata en la ciudad. Es liviano y muy hidratante.', 1, DATE_SUB(NOW(), INTERVAL 4 DAY)),

  (10, 2, 29, 19, 5, 'Mi producto estrella diario', 
   'Es la segunda vez que lo compro. Mi dermatóloga me lo recomendó para complementar mi tratamiento y los resultados hablan por sí solos.', 1, DATE_SUB(NOW(), INTERVAL 2 DAY))
ON DUPLICATE KEY UPDATE
  `calificacion` = VALUES(`calificacion`),
  `titulo` = VALUES(`titulo`),
  `texto` = VALUES(`texto`);
