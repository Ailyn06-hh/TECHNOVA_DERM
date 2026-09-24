-- =====================================================================
-- Script DML: Semillas de Catálogo, Inventario, Combos y Compatibilidades
-- Proyecto: Technova-Derm (HackaTec 2026)
-- Motor: MySQL / MariaDB (XAMPP / phpMyAdmin)
-- Codificación: utf8mb4_unicode_ci
-- =====================================================================

USE `technova_derm`;

-- 1. Insertar Categorías
INSERT INTO `categorias` (`id`, `nombre`, `slug`, `orden`) VALUES
  (1, 'Limpieza', 'limpieza', 1),
  (2, 'Hidratación', 'hidratacion', 2),
  (3, 'Protección solar', 'proteccion-solar', 3),
  (4, 'Sérum', 'serum', 4),
  (5, 'Tónico', 'tonico', 5),
  (6, 'Contorno', 'contorno', 6),
  (7, 'Mascarilla', 'mascarilla', 7),
  (8, 'Bruma', 'bruma', 8)
ON DUPLICATE KEY UPDATE 
  `nombre` = VALUES(`nombre`), 
  `orden` = VALUES(`orden`);

-- 2. Insertar Sucursales Físicas Omnicanal
INSERT INTO `sucursales` (`id`, `nombre`, `direccion`, `activa`) VALUES
  (1, 'Sucursal Roma Norte', 'Av. Álvaro Obregón 150, Roma Norte, Cuauhtémoc, CDMX', 1),
  (2, 'Sucursal Condesa', 'Av. Michoacán 72, Hipódromo Condesa, Cuauhtémoc, CDMX', 1)
ON DUPLICATE KEY UPDATE 
  `nombre` = VALUES(`nombre`), 
  `direccion` = VALUES(`direccion`);

-- 3. Insertar Catálogo de Productos (20 productos con colores pastel del mockup)
INSERT INTO `productos` 
  (`id`, `sku`, `nombre`, `slug`, `categoria_id`, `tipo_rutina`, `descripcion`, `precio`, `precio_especial`, `color_fondo`, `color_frasco`, `activo`) 
VALUES
  -- 1. Limpiador de Avena
  (1, 'LIM-AVE-001', 'Espuma Suave de Avena', 'espuma-suave-de-avena', 1, 'limpiador', 
   'Limpiador facial espumoso con extracto de avena coloidal y glicerina que limpia con suavidad respetando la barrera cutánea.', 
   249.00, NULL, '#F3E1E4', '#D08C98', 1),

  -- 2. Sérum Niacinamida 10% (Stock bajo: 2 piezas en total)
  (2, 'SER-NIA-002', 'Sérum Niacinamida 10%', 'serum-niacinamida-10', 4, 'serum', 
   'Fórmula clarificante con 10% de niacinamida y zinc PCA que minimiza la apariencia de poros y regula la producción de grasa.', 
   429.00, NULL, '#F3E1E4', '#D08C98', 1),

  -- 3. Fluido Solar FPS 50
  (3, 'PRO-FLU-003', 'Fluido Solar FPS 50', 'fluido-solar-fps-50', 3, 'protector', 
   'Fotoprotector fluido ultraligero de amplio espectro contra radiación UVA y UVB. Acabado invisible sin brillo graso.', 
   389.00, NULL, '#FBEFD6', '#E2B863', 1),

  -- 4. Gel Hidratante Aloe (Stock bajo: 3 piezas en total)
  (4, 'HID-ALO-004', 'Gel Hidratante Aloe', 'gel-hidratante-aloe', 2, 'hidratante', 
   'Hidratación ligera no comedogénica formulada con jugo de aloe vera orgánico y pantenol para reconfortar la piel.', 
   319.00, NULL, '#DDE9E1', '#9BBBA6', 1),

  -- 5. Crema Contorno de Ojos (Stock bajo: 4 piezas en total)
  (5, 'CON-OJO-005', 'Crema Contorno de Ojos', 'crema-contorno-de-ojos', 6, 'tratamiento', 
   'Cuidado específico para el área periocular con cafeína vegetal y péptidos para descongestionar bolsas y ojeras.', 
   359.00, NULL, '#E9E3F0', '#A594B8', 1),

  -- 6. Mascarilla Arcilla Rosa (Stock bajo: 1 pieza en total -> Última pieza)
  (6, 'MAS-ARC-006', 'Mascarilla Arcilla Rosa', 'mascarilla-arcilla-rosa', 7, 'tratamiento', 
   'Tratamiento semanal desintoxicante con arcilla caolín francesa que purifica profundamente sin resecar.', 
   279.00, NULL, '#FBEFD6', '#D08C98', 1),

  -- 7. Bruma Hidratante
  (7, 'BRU-HID-007', 'Bruma Hidratante', 'bruma-hidratante', 8, 'tonico', 
   'Bruma facial refrescante enriquecida con hidrolato de té verde y ácido hialurónico para hidratar sobre la marcha.', 
   229.00, NULL, '#DDE9E1', '#9BBBA6', 1),

  -- 8. Tónico de Rosa (Con precio especial)
  (8, 'TON-ROS-008', 'Tónico de Rosa', 'tonico-de-rosa', 5, 'tonico', 
   'Tónico facial calmante con infusión de rosas y niacinamida para tonificar, restaurar el pH y mejorar la luminosidad.', 
   289.00, 249.00, '#F3E1E4', '#D08C98', 1),

  -- 9. Sérum Vitamina C 15%
  (9, 'SER-VIT-009', 'Sérum Vitamina C 15%', 'serum-vitamina-c-15', 4, 'serum', 
   'Potente antioxidante diario con ácido L-ascórbico puro al 15% y ácido ferúlico para atenuar manchas y emparejar el tono.', 
   469.00, NULL, '#FBEFD6', '#E2B863', 1),

  -- 10. Sérum Ácido Hialurónico
  (10, 'SER-HIA-010', 'Sérum Ácido Hialurónico', 'serum-acido-hialuronico', 4, 'serum', 
   'Complejo multihidratante con 4 pesos moleculares de ácido hialurónico para retener la humedad en todas las capas cutáneas.', 
   399.00, NULL, '#E9E3F0', '#A594B8', 1),

  -- 11. Limpiador en Gel Salicílico
  (11, 'LIM-SAL-011', 'Limpiador Gel Salicílico 2%', 'limpiador-gel-salicilico', 1, 'limpiador', 
   'Limpiador purificante con BHA para destapar poros y desvanecer brotes en pieles mixtas a grasas.', 
   289.00, NULL, '#DDE9E1', '#9BBBA6', 1),

  -- 12. Aceite Limpiador Botánico
  (12, 'LIM-ACE-012', 'Aceite Limpiador Botánico', 'aceite-limpiador-botanico', 1, 'limpiador', 
   'Aceite suave para primer paso de doble limpieza que disuelve maquillaje pesado y filtros solares.', 
   349.00, NULL, '#FBEFD6', '#E2B863', 1),

  -- 13. Tónico Exfoliante AHA/BHA
  (13, 'TON-AHA-013', 'Tónico Exfoliante AHA/BHA', 'tonico-exfoliante-aha-bha', 5, 'tonico', 
   'Tónico renovador con ácido glicólico y salicílico para refinar la textura de la piel y desvanecer manchitas.', 
   329.00, NULL, '#E9E3F0', '#A594B8', 1),

  -- 14. Tónico Calmante Centella
  (14, 'TON-CEN-014', 'Tónico Calmante Centella', 'tonico-calmante-centella', 5, 'tonico', 
   'Tónico acuoso con 85% de extracto de Centella Asiática para aliviar rojeces y reparar la barrera cutánea.', 
   269.00, NULL, '#DDE9E1', '#9BBBA6', 1),

  -- 15. Sérum Retinol 0.3%
  (15, 'SER-RET-015', 'Sérum Retinol 0.3%', 'serum-retinol-03', 4, 'serum', 
   'Tratamiento nocturno antiedad formulado con retinol microencapsulado en escualano vegetal.', 
   499.00, NULL, '#F3E1E4', '#D08C98', 1),

  -- 16. Sérum Péptidos Reafirmante
  (16, 'SER-PEP-016', 'Sérum Péptidos Reafirmante', 'serum-peptidos-reafirmante', 4, 'serum', 
   'Sérum concentrado con Matrixyl 3000 y complejo de tripéptidos que estimula la producción de colágeno natural.', 
   539.00, NULL, '#E9E3F0', '#A594B8', 1),

  -- 17. Crema Hidratante Ceramidas
  (17, 'HID-CER-017', 'Crema Hidratante Ceramidas', 'crema-hidratante-ceramidas', 2, 'hidratante', 
   'Crema nutritiva con 3 ceramidas esenciales, colesterol y ácidos grasos para sellar la hidratación en pieles secas.', 
   379.00, NULL, '#F3E1E4', '#D08C98', 1),

  -- 18. Emulsión Ligera Matificante
  (18, 'HID-MAT-018', 'Emulsión Ligera Matificante', 'emulsion-ligera-matificante', 2, 'hidratante', 
   'Loción matificante de tacto sedoso con extracto de arroz y silicio que mantiene el brillo bajo control todo el día.', 
   299.00, NULL, '#DDE9E1', '#9BBBA6', 1),

  -- 19. Gel Protector Toque Seco FPS 50
  (19, 'PRO-SEC-019', 'Gel Protector Toque Seco FPS 50', 'gel-protector-toque-seco-fps-50', 3, 'protector', 
   'Fotoprotector en gel toque seco con tecnología antimanchas y antioxidantes botánicos.', 
   419.00, NULL, '#FBEFD6', '#E2B863', 1),

  -- 20. Bálsamo Reparador Cica
  (20, 'TRA-CIC-020', 'Bálsamo Reparador Cica', 'balsamo-reparador-cica', 7, 'tratamiento', 
   'Bálsamo calmante intensivo con madecassoside y manteca de karité para zonas irritadas o descamadas.', 
   339.00, NULL, '#DDE9E1', '#9BBBA6', 1)
ON DUPLICATE KEY UPDATE
  `nombre` = VALUES(`nombre`),
  `precio` = VALUES(`precio`),
  `precio_especial` = VALUES(`precio_especial`),
  `color_fondo` = VALUES(`color_fondo`),
  `color_frasco` = VALUES(`color_frasco`);

-- 4. Insertar Compatibilidad de Tipos de Piel (producto_tipos_piel)
INSERT IGNORE INTO `producto_tipos_piel` (`producto_id`, `tipo_piel`) VALUES
  -- 1. Espuma Avena: Mixta, Normal, Sensible, Seca
  (1, 'mixta'), (1, 'normal'), (1, 'sensible'), (1, 'seca'),
  -- 2. Sérum Niacinamida: Mixta, Grasa, Normal
  (2, 'mixta'), (2, 'grasa'), (2, 'normal'),
  -- 3. Fluido Solar: Mixta, Grasa, Normal, Seca, Sensible
  (3, 'mixta'), (3, 'grasa'), (3, 'normal'), (3, 'seca'), (3, 'sensible'),
  -- 4. Gel Aloe: Mixta, Grasa, Sensible
  (4, 'mixta'), (4, 'grasa'), (4, 'sensible'),
  -- 5. Crema Contorno Ojos: Todas
  (5, 'seca'), (5, 'grasa'), (5, 'mixta'), (5, 'normal'), (5, 'sensible'),
  -- 6. Mascarilla Arcilla: Mixta, Grasa, Normal
  (6, 'mixta'), (6, 'grasa'), (6, 'normal'),
  -- 7. Bruma Hidratante: Todas
  (7, 'seca'), (7, 'grasa'), (7, 'mixta'), (7, 'normal'), (7, 'sensible'),
  -- 8. Tónico de Rosa: Mixta, Normal, Sensible, Seca
  (8, 'mixta'), (8, 'normal'), (8, 'sensible'), (8, 'seca'),
  -- 9. Sérum Vitamina C: Mixta, Normal, Seca
  (9, 'mixta'), (9, 'normal'), (9, 'seca'),
  -- 10. Sérum Ácido Hialurónico: Todas
  (10, 'seca'), (10, 'grasa'), (10, 'mixta'), (10, 'normal'), (10, 'sensible'),
  -- 11. Limpiador Gel Salicílico: Grasa, Mixta
  (11, 'grasa'), (11, 'mixta'),
  -- 12. Aceite Limpiador: Seca, Normal, Sensible
  (12, 'seca'), (12, 'normal'), (12, 'sensible'),
  -- 13. Tónico AHA/BHA: Grasa, Mixta
  (13, 'grasa'), (13, 'mixta'),
  -- 14. Tónico Centella: Sensible, Mixta, Seca
  (14, 'sensible'), (14, 'mixta'), (14, 'seca'),
  -- 15. Sérum Retinol: Seca, Normal, Mixta
  (15, 'seca'), (15, 'normal'), (15, 'mixta'),
  -- 16. Sérum Péptidos: Seca, Normal, Sensible
  (16, 'seca'), (16, 'normal'), (16, 'sensible'),
  -- 17. Crema Ceramidas: Seca, Sensible, Normal
  (17, 'seca'), (17, 'sensible'), (17, 'normal'),
  -- 18. Emulsión Matificante: Grasa, Mixta
  (18, 'grasa'), (18, 'mixta'),
  -- 19. Gel Protector Seco: Grasa, Mixta
  (19, 'grasa'), (19, 'mixta'),
  -- 20. Bálsamo Cica: Sensible, Seca
  (20, 'sensible'), (20, 'seca');

-- 5. Insertar Preocupaciones que atiende cada producto (producto_preocupaciones)
INSERT IGNORE INTO `producto_preocupaciones` (`producto_id`, `preocupacion`) VALUES
  -- 1. Espuma Avena: Hidratación
  (1, 'hidratacion'),
  -- 2. Sérum Niacinamida: Poros, Manchas
  (2, 'poros'), (2, 'manchas'),
  -- 3. Fluido Solar: Protección Solar, Manchas
  (3, 'proteccion_solar'), (3, 'manchas'),
  -- 4. Gel Aloe: Hidratación, Poros
  (4, 'hidratacion'), (4, 'poros'),
  -- 5. Crema Contorno Ojos: Anti-edad, Hidratación
  (5, 'anti_edad'), (5, 'hidratacion'),
  -- 6. Mascarilla Arcilla: Poros
  (6, 'poros'),
  -- 7. Bruma Hidratante: Hidratación
  (7, 'hidratacion'),
  -- 8. Tónico de Rosa: Hidratación, Manchas
  (8, 'hidratacion'), (8, 'manchas'),
  -- 9. Sérum Vitamina C: Manchas, Anti-edad
  (9, 'manchas'), (9, 'anti_edad'),
  -- 10. Sérum Ácido Hialurónico: Hidratación, Anti-edad
  (10, 'hidratacion'), (10, 'anti_edad'),
  -- 11. Limpiador Salicílico: Poros
  (11, 'poros'),
  -- 12. Aceite Botánico: Hidratación
  (12, 'hidratacion'),
  -- 13. Tónico AHA/BHA: Poros, Manchas
  (13, 'poros'), (13, 'manchas'),
  -- 14. Tónico Centella: Hidratación, Poros
  (14, 'hidratacion'), (14, 'poros'),
  -- 15. Sérum Retinol: Anti-edad, Manchas
  (15, 'anti_edad'), (15, 'manchas'),
  -- 16. Sérum Péptidos: Anti-edad
  (16, 'anti_edad'),
  -- 17. Crema Ceramidas: Hidratación, Anti-edad
  (17, 'hidratacion'), (17, 'anti_edad'),
  -- 18. Emulsión Matificante: Poros
  (18, 'poros'),
  -- 19. Gel Protector Seco: Protección Solar, Poros
  (19, 'proteccion_solar'), (19, 'poros'),
  -- 20. Bálsamo Cica: Hidratación
  (20, 'hidratacion');

-- 6. Insertar Inventario por Sucursal
-- Con pocas piezas en total para la sección 'Últimas piezas':
-- - Sérum Niacinamida 10% (id 2): 2 piezas (1 en Roma, 1 en Condesa)
-- - Gel Hidratante Aloe (id 4): 3 piezas (2 en Roma, 1 en Condesa)
-- - Crema Contorno Ojos (id 5): 4 piezas (2 en Roma, 2 en Condesa)
-- - Mascarilla Arcilla Rosa (id 6): 1 pieza (1 en Roma, 0 en Condesa)
INSERT INTO `inventario` (`producto_id`, `sucursal_id`, `existencias`) VALUES
  (1, 1, 15), (1, 2, 10),
  (2, 1, 1),  (2, 2, 1),   -- Total: 2
  (3, 1, 20), (3, 2, 15),
  (4, 1, 2),  (4, 2, 1),   -- Total: 3
  (5, 1, 2),  (5, 2, 2),   -- Total: 4
  (6, 1, 1),  (6, 2, 0),   -- Total: 1 (Última pieza)
  (7, 1, 12), (7, 2, 8),
  (8, 1, 18), (8, 2, 14),
  (9, 1, 10), (9, 2, 12),
  (10, 1, 15), (10, 2, 15),
  (11, 1, 10), (11, 2, 8),
  (12, 1, 12), (12, 2, 10),
  (13, 1, 14), (13, 2, 11),
  (14, 1, 16), (14, 2, 12),
  (15, 1, 8),  (15, 2, 6),
  (16, 1, 9),  (16, 2, 7),
  (17, 1, 20), (17, 2, 18),
  (18, 1, 14), (18, 2, 12),
  (19, 1, 22), (19, 2, 19),
  (20, 1, 11), (20, 2, 9)
ON DUPLICATE KEY UPDATE `existencias` = VALUES(`existencias`);

-- 7. Insertar Combos de la Semana
INSERT INTO `combos` 
  (`id`, `nombre`, `slug`, `descripcion_corta`, `descuento_porcentaje`, `color_fondo`, `activo`) 
VALUES
  (1, 'Rutina piel mixta', 'rutina-piel-mixta', 'Limpiador de avena + tónico de rosa + gel hidratante', 15, '#DDE9E1', 1),
  (2, 'Dúo tónico rosa', 'duo-tonico-rosa', 'Tónico de rosa + mascarilla de arcilla', 20, '#F3E1E4', 1),
  (3, 'Protección diaria', 'proteccion-diaria', 'Fluido solar FPS 50 + bruma hidratante', 10, '#FBEFD6', 1)
ON DUPLICATE KEY UPDATE 
  `nombre` = VALUES(`nombre`),
  `descripcion_corta` = VALUES(`descripcion_corta`),
  `descuento_porcentaje` = VALUES(`descuento_porcentaje`),
  `color_fondo` = VALUES(`color_fondo`);

-- 8. Insertar Productos de cada Combo
INSERT IGNORE INTO `combo_productos` (`combo_id`, `producto_id`, `cantidad`) VALUES
  -- Combo 1 (Rutina piel mixta): Limpiador Avena ($249) + Tónico Rosa ($289) + Gel Aloe ($319) = $857 - 15% ($128.55) = $728
  (1, 1, 1),
  (1, 8, 1),
  (1, 4, 1),
  -- Combo 2 (Dúo tónico rosa): Tónico Rosa ($289) + Mascarilla Arcilla ($279) = $568 - 20% ($113.60) = $454 (o $439 con especial)
  (2, 8, 1),
  (2, 6, 1),
  -- Combo 3 (Protección diaria): Fluido Solar ($389) + Bruma Hidratante ($229) = $618 - 10% ($61.80) = $556
  (3, 3, 1),
  (3, 7, 1);

-- 9. Insertar Productos Relacionados para "Porque compraste Tónico de Rosa" (id 8)
INSERT IGNORE INTO `productos_relacionados` (`producto_id`, `relacionado_id`, `prioridad`) VALUES
  (8, 7, 1),  -- Bruma Hidratante
  (8, 9, 2),  -- Sérum Vitamina C 15%
  (8, 10, 3), -- Sérum Ácido Hialurónico
  (8, 6, 4);  -- Mascarilla Arcilla Rosa

-- 10. Insertar Pedido anterior de ejemplo con Tónico de Rosa para el usuario principal
-- (Asocia el pedido al primer usuario disponible en la base de datos)
INSERT INTO `pedidos` (`id`, `usuario_id`, `canal`, `sucursal_id`, `total`, `estado`, `creado_en`)
SELECT 1, u.id, 'web', 1, 249.00, 'entregado', DATE_SUB(NOW(), INTERVAL 5 DAY)
FROM `usuarios` u
ORDER BY u.id ASC
LIMIT 1
ON DUPLICATE KEY UPDATE `total` = VALUES(`total`);

-- Insertar el item de ese pedido (Tónico de Rosa)
INSERT INTO `pedido_items` (`id`, `pedido_id`, `producto_id`, `cantidad`, `precio_unitario`) VALUES
  (1, 1, 8, 1, 249.00)
ON DUPLICATE KEY UPDATE `precio_unitario` = VALUES(`precio_unitario`);

-- 11. Insertar Notificaciones de Ejemplo para el usuario
INSERT INTO `notificaciones` (`usuario_id`, `titulo`, `mensaje`, `leida`, `creado_en`)
SELECT u.id, '¡Bienvenida a Technova-Derm!', 'Tu cuenta ha sido activada exitosamente. Descubre tu rutina personalizada en la sección de inicio.', 0, DATE_SUB(NOW(), INTERVAL 2 DAY)
FROM `usuarios` u ORDER BY u.id ASC LIMIT 1;

INSERT INTO `notificaciones` (`usuario_id`, `titulo`, `mensaje`, `leida`, `creado_en`)
SELECT u.id, 'Pedido entregado', 'Tu pedido con Tónico de Rosa fue entregado en Sucursal Roma Norte. ¡Gracias por tu compra!', 1, DATE_SUB(NOW(), INTERVAL 5 DAY)
FROM `usuarios` u ORDER BY u.id ASC LIMIT 1;

INSERT INTO `notificaciones` (`usuario_id`, `titulo`, `mensaje`, `leida`, `creado_en`)
SELECT u.id, 'Pocas piezas en stock', 'El Sérum Niacinamida 10% tiene solo 2 piezas restantes en tienda física y web.', 0, DATE_SUB(NOW(), INTERVAL 3 HOUR)
FROM `usuarios` u ORDER BY u.id ASC LIMIT 1;
