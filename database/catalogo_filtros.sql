-- =====================================================================
-- Script DDL & DML: Filtros de Catálogo, Índices y Nuevos Productos
-- Proyecto: Technova-Derm (HackaTec 2026)
-- Motor: MySQL / MariaDB (XAMPP)
-- Codificación: utf8mb4_unicode_ci
-- =====================================================================

USE `technova_derm`;

-- 1. Modificar tabla 'usuarios' para sucursal preferida
ALTER TABLE `usuarios` 
  ADD COLUMN IF NOT EXISTS `sucursal_preferida_id` INT NULL AFTER `onboarding_omitido`;

-- Agregar foreign key si no existe
SET @fk_exists = (
  SELECT COUNT(*) 
  FROM information_schema.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'usuarios' 
    AND CONSTRAINT_NAME = 'fk_usuarios_sucursal'
);

SET @sql_fk = IF(@fk_exists = 0, 
  'ALTER TABLE `usuarios` ADD CONSTRAINT `fk_usuarios_sucursal` FOREIGN KEY (`sucursal_preferida_id`) REFERENCES `sucursales` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;', 
  'SELECT "FK ya existe";'
);
PREPARE stmt_fk FROM @sql_fk;
EXECUTE stmt_fk;
DEALLOCATE PREPARE stmt_fk;

-- 2. Índices de alta velocidad para filtros y ordenamientos
ALTER TABLE `productos` ADD INDEX IF NOT EXISTS `idx_prod_activo_cat` (`activo`, `categoria_id`);
ALTER TABLE `productos` ADD INDEX IF NOT EXISTS `idx_prod_precio` (`precio`);
ALTER TABLE `productos` ADD INDEX IF NOT EXISTS `idx_prod_creado_en` (`creado_en`);
ALTER TABLE `inventario` ADD INDEX IF NOT EXISTS `idx_inv_suc_exist` (`sucursal_id`, `existencias`);
ALTER TABLE `pedido_items` ADD INDEX IF NOT EXISTS `idx_pi_producto_id` (`producto_id`);

-- 3. Actualizar la sucursal principal a "Centro"
UPDATE `sucursales` 
SET `nombre` = 'Centro', `direccion` = 'Calle Madero 45, Centro Histórico, Cuauhtémoc, CDMX' 
WHERE `id` = 1;

-- 4. Insertar productos adicionales para contar con al menos 32 productos activos
-- (Permite probar la paginación con 12 por página: Pág 1: 12, Pág 2: 12, Pág 3: 8)
INSERT INTO `productos` 
  (`id`, `sku`, `nombre`, `slug`, `categoria_id`, `tipo_rutina`, `descripcion`, `precio`, `precio_especial`, `color_fondo`, `color_frasco`, `activo`, `creado_en`) 
VALUES
  -- 21. Sérum Péptidos de Cobre (Nuevo, creado hoy)
  (21, 'SER-PEP-021', 'Sérum Péptidos de Cobre 1%', 'serum-peptidos-de-cobre-1', 4, 'serum', 
   'Sérum regenerador que estimula la síntesis de colágeno y elastina para mejorar la firmeza y elasticidad cutánea.', 
   489.00, NULL, '#E9E3F0', '#A594B8', 1, NOW()),

  -- 22. Tónico Exfoliante BHA 2% (Ácido Salicílico)
  (22, 'TON-BHA-022', 'Tónico Exfoliante BHA 2%', 'tonico-exfoliante-bha-2', 5, 'tonico', 
   'Exfoliante líquido con ácido salicílico que desobstruye poros a profundidad, elimina puntos negros y suaviza la textura.', 
   349.00, 299.00, '#F3E1E4', '#D08C98', 1, NOW()),

  -- 23. Gel Limpiador Purificante Zinc
  (23, 'LIM-ZIN-023', 'Gel Limpiador Purificante Zinc', 'gel-limpiador-purificante-zinc', 1, 'limpiador', 
   'Gel espumoso no secante enriquecido con zinc PCA y árbol de té para controlar el exceso de sebo sin alterar el manto ácido.', 
   239.00, NULL, '#DDE9E1', '#9BBBA6', 1, NOW()),

  -- 24. Crema Nutritiva de Ceramidas
  (24, 'HID-CER-024', 'Crema Nutritiva de Ceramidas', 'crema-nutritiva-de-ceramidas', 2, 'hidratante', 
   'Crema facial rica en complejo de 3 ceramidas esenciales, fitoesfingosina y ácidos grasos para restaurar la barrera dañada.', 
   379.00, NULL, '#FBEFD6', '#E2B863', 1, NOW()),

  -- 25. Barra Solar Mineral FPS 50+
  (25, 'PRO-BAR-025', 'Barra Solar Mineral FPS 50+', 'barra-solar-mineral-fps-50', 3, 'protector', 
   'Fotoprotector en barra 100% mineral con óxido de zinc no nano. Práctico formato para reaplicar sobre el maquillaje.', 
   429.00, NULL, '#FBEFD6', '#E2B863', 1, NOW()),

  -- 26. Sérum Ácido Azelaico 10%
  (26, 'SER-AZE-026', 'Sérum Ácido Azelaico 10%', 'serum-acido-azelaico-10', 4, 'serum', 
   'Tratamiento multifuncional para manchas oscuras, rojeces y marcas post-acné. Calma la piel reactiva.', 
   399.00, 349.00, '#F3E1E4', '#D08C98', 1, NOW()),

  -- 27. Aceite Limpiador Emulsionable
  (27, 'LIM-OIL-027', 'Aceite Limpiador Emulsionable', 'aceite-limpiador-emulsionable', 1, 'limpiador', 
   'Primer paso de la doble limpieza facial con aceite de jojoba y girasol que disuelve maquillaje a prueba de agua y protector solar.', 
   289.00, NULL, '#FBEFD6', '#E2B863', 1, NOW()),

  -- 28. Tónico Calmante Centella Asiática
  (28, 'TON-CEN-028', 'Tónico Calmante Centella Asiática', 'tonico-calmante-centella-asiatica', 5, 'tonico', 
   'Bruma tónica reparadora con 84% de extracto de centella asiática de Madagascar para aliviar pieles irritadas o enrojecidas.', 
   249.00, NULL, '#DDE9E1', '#9BBBA6', 1, NOW()),

  -- 29. Protector Solar Matificante con Color FPS 50
  (29, 'PRO-COL-029', 'Protector Solar Matificante con Color FPS 50', 'protector-solar-matificante-con-color-fps-50', 3, 'protector', 
   'Unifica el tono natural mientras protege de rayos UV y luz azul. Toque seco aterciopelado.', 
   459.00, NULL, '#FBEFD6', '#E2B863', 1, NOW()),

  -- 30. Crema Reparadora Noche Retinol 0.3%
  (30, 'HID-RET-030', 'Crema Reparadora Noche Retinol 0.3%', 'crema-reparadora-noche-retinol-03', 2, 'tratamiento', 
   'Tratamiento antiedad nocturno con retinol puro encapsulado y ácido hialurónico para acelerar la renovación celular.', 
   499.00, 449.00, '#E9E3F0', '#A594B8', 1, NOW()),

  -- 31. Sérum Reparador Barrera Cutánea
  (31, 'SER-BAR-031', 'Sérum Reparador Barrera Cutánea', 'serum-reparador-barrera-cutanea', 4, 'serum', 
   'Fórmula con 5% de niacinamida, pantenol al 2% y centella asiática para restaurar pieles sensibilizadas.', 
   369.00, NULL, '#DDE9E1', '#9BBBA6', 1, NOW()),

  -- 32. Espuma Limpiadora Ácido Glicólico 3%
  (32, 'LIM-GLI-032', 'Espuma Limpiadora Ácido Glicólico 3%', 'espuma-limpiadora-acido-glicolico-3', 1, 'limpiador', 
   'Limpiador exfoliante suave que remueve células muertas, aportando luminosidad y uniformidad al cutis.', 
   269.00, NULL, '#F3E1E4', '#D08C98', 1, NOW())
ON DUPLICATE KEY UPDATE
  `nombre` = VALUES(`nombre`),
  `precio` = VALUES(`precio`),
  `precio_especial` = VALUES(`precio_especial`),
  `color_fondo` = VALUES(`color_fondo`),
  `color_frasco` = VALUES(`color_frasco`),
  `activo` = VALUES(`activo`);

-- 5. Compatibilidades de Tipo de Piel para los nuevos productos
INSERT IGNORE INTO `producto_tipos_piel` (`producto_id`, `tipo_piel`) VALUES
  -- 21. Sérum Péptidos: Seca, Normal, Sensible, Mixta
  (21, 'seca'), (21, 'normal'), (21, 'sensible'), (21, 'mixta'),
  -- 22. Tónico BHA: Grasa, Mixta
  (22, 'grasa'), (22, 'mixta'),
  -- 23. Gel Limpiador Zinc: Grasa, Mixta
  (23, 'grasa'), (23, 'mixta'),
  -- 24. Crema Ceramidas: Seca, Normal, Sensible
  (24, 'seca'), (24, 'normal'), (24, 'sensible'),
  -- 25. Barra Solar Mineral: Sensible, Mixta, Grasa, Seca, Normal
  (25, 'sensible'), (25, 'mixta'), (25, 'grasa'), (25, 'seca'), (25, 'normal'),
  -- 26. Sérum Azelaico: Grasa, Mixta, Sensible
  (26, 'grasa'), (26, 'mixta'), (26, 'sensible'),
  -- 27. Aceite Limpiador: Seca, Normal, Mixta, Sensible
  (27, 'seca'), (27, 'normal'), (27, 'mixta'), (27, 'sensible'),
  -- 28. Tónico Centella: Sensible, Seca, Mixta, Normal, Grasa
  (28, 'sensible'), (28, 'seca'), (28, 'mixta'), (28, 'normal'), (28, 'grasa'),
  -- 29. Protector Color: Mixta, Grasa, Normal
  (29, 'mixta'), (29, 'grasa'), (29, 'normal'),
  -- 30. Crema Retinol: Normal, Seca, Mixta
  (30, 'normal'), (30, 'seca'), (30, 'mixta'),
  -- 31. Sérum Barrera: Sensible, Seca, Mixta, Normal
  (31, 'sensible'), (31, 'seca'), (31, 'mixta'), (31, 'normal'),
  -- 32. Espuma Glicólico: Mixta, Grasa, Normal
  (32, 'mixta'), (32, 'grasa'), (32, 'normal');

-- 6. Preocupaciones para los nuevos productos
INSERT IGNORE INTO `producto_preocupaciones` (`producto_id`, `preocupacion`) VALUES
  (21, 'anti_edad'), (21, 'hidratacion'),
  (22, 'poros'), (22, 'manchas'),
  (23, 'poros'),
  (24, 'hidratacion'),
  (25, 'proteccion_solar'),
  (26, 'manchas'), (26, 'poros'),
  (27, 'hidratacion'),
  (28, 'hidratacion'),
  (29, 'proteccion_solar'), (29, 'manchas'),
  (30, 'anti_edad'), (30, 'manchas'),
  (31, 'hidratacion'),
  (32, 'manchas'), (32, 'poros');

-- 7. Inventario para los nuevos productos en Sucursal 1 (Centro) y Sucursal 2 (Condesa)
INSERT INTO `inventario` (`producto_id`, `sucursal_id`, `existencias`) VALUES
  -- 21. Sérum Péptidos: Centro 8, Condesa 5 (Total 13)
  (21, 1, 8), (21, 2, 5),
  -- 22. Tónico BHA: Centro 10, Condesa 6 (Total 16)
  (22, 1, 10), (22, 2, 6),
  -- 23. Gel Limpiador Zinc: Centro 15, Condesa 12 (Total 27)
  (23, 1, 15), (23, 2, 12),
  -- 24. Crema Ceramidas: Centro 7, Condesa 4 (Total 11)
  (24, 1, 7), (24, 2, 4),
  -- 25. Barra Solar Mineral: Centro 6, Condesa 8 (Total 14)
  (25, 1, 6), (25, 2, 8),
  -- 26. Sérum Azelaico: Centro 9, Condesa 7 (Total 16)
  (26, 1, 9), (26, 2, 7),
  -- 27. Aceite Limpiador: Centro 11, Condesa 9 (Total 20)
  (27, 1, 11), (27, 2, 9),
  -- 28. Tónico Centella: Centro 14, Condesa 10 (Total 24)
  (28, 1, 14), (28, 2, 10),
  -- 29. Protector Color: Centro 5, Condesa 7 (Total 12)
  (29, 1, 5), (29, 2, 7),
  -- 30. Crema Retinol: Centro 6, Condesa 4 (Total 10)
  (30, 1, 6), (30, 2, 4),
  -- 31. Sérum Barrera: Centro 8, Condesa 8 (Total 16)
  (31, 1, 8), (31, 2, 8),
  -- 32. Espuma Glicólico: Centro 12, Condesa 9 (Total 21)
  (32, 1, 12), (32, 2, 9)
ON DUPLICATE KEY UPDATE
  `existencias` = VALUES(`existencias`);
