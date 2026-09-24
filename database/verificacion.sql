-- =====================================================================
-- Script de Migración: Verificación de Cuenta por Código
-- Proyecto: Technova-Derm (HackaTec 2026)
-- Motor: MySQL / MariaDB (XAMPP / phpMyAdmin)
-- Codificación: utf8mb4_unicode_ci
-- =====================================================================

USE `technova_derm`;

-- 1. Agregar columna 'verificado' a la tabla 'usuarios'
-- Si ya existe no generará conflicto con IF NOT EXISTS
ALTER TABLE `usuarios` 
ADD COLUMN IF NOT EXISTS `verificado` TINYINT(1) NOT NULL DEFAULT 0 AFTER `acepta_promociones`;

-- 2. Crear tabla 'codigos_verificacion'
CREATE TABLE IF NOT EXISTS `codigos_verificacion` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `usuario_id` INT NOT NULL,
  `codigo_hash` VARCHAR(255) NOT NULL COMMENT 'Código de 6 dígitos hasheado con bcrypt',
  `expira_en` DATETIME NOT NULL COMMENT 'Vigencia de 10 minutos',
  `intentos` INT NOT NULL DEFAULT 0 COMMENT 'Contador de intentos de validación (máx 5)',
  `usado` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0=Pendiente, 1=Usado o invalidado',
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_codigos_usuario` (`usuario_id`),
  INDEX `idx_codigos_vigencia` (`usuario_id`, `usado`, `expira_en`),
  CONSTRAINT `fk_codigos_usuario` 
    FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
