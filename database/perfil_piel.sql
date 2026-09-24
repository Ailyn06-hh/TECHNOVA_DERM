-- =====================================================================
-- Script de Migración: Perfil de Piel y Onboarding
-- Proyecto: Technova-Derm (HackaTec 2026)
-- Motor: MySQL / MariaDB (XAMPP / phpMyAdmin)
-- Codificación: utf8mb4_unicode_ci
-- =====================================================================

USE `technova_derm`;

-- 1. Agregar columna 'onboarding_omitido' a 'usuarios' si no existe
ALTER TABLE `usuarios` 
ADD COLUMN IF NOT EXISTS `onboarding_omitido` TINYINT(1) NOT NULL DEFAULT 0 AFTER `verificado`;

-- 2. Tabla 'perfiles_piel'
CREATE TABLE IF NOT EXISTS `perfiles_piel` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `usuario_id` INT NOT NULL UNIQUE,
  `tipo_piel` ENUM('seca', 'grasa', 'mixta', 'normal', 'sensible') NOT NULL,
  `presupuesto` ENUM('bajo', 'medio', 'alto') NOT NULL,
  `actualizado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_perfiles_usuario` (`usuario_id`),
  CONSTRAINT `fk_perfiles_usuario` 
    FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabla 'perfil_preocupaciones' (relación muchos a muchos)
CREATE TABLE IF NOT EXISTS `perfil_preocupaciones` (
  `perfil_id` INT NOT NULL,
  `preocupacion` ENUM('hidratacion', 'manchas', 'poros', 'proteccion_solar', 'anti_edad') NOT NULL,
  PRIMARY KEY (`perfil_id`, `preocupacion`),
  INDEX `idx_preocupaciones_perfil` (`perfil_id`),
  CONSTRAINT `fk_preocupaciones_perfil` 
    FOREIGN KEY (`perfil_id`) REFERENCES `perfiles_piel` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
