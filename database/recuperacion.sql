-- =====================================================================
-- Script de Migración: Recuperación de Contraseña por Enlace Seguro
-- Proyecto: Technova-Derm (HackaTec 2026)
-- Motor: MySQL / MariaDB (XAMPP / phpMyAdmin)
-- Codificación: utf8mb4_unicode_ci
-- =====================================================================

USE `technova_derm`;

-- 1. Crear tabla 'restablecimientos_password'
CREATE TABLE IF NOT EXISTS `restablecimientos_password` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `usuario_id` INT NOT NULL,
  `token_hash` CHAR(64) NOT NULL COMMENT 'Hash SHA-256 del token aleatorio de 32 bytes',
  `expira_en` DATETIME NOT NULL COMMENT 'Vigencia de 30 minutos',
  `usado` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0=Pendiente, 1=Usado o invalidado',
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_recuperacion_token` (`token_hash`),
  INDEX `idx_recuperacion_usuario` (`usuario_id`),
  INDEX `idx_recuperacion_vigencia` (`usuario_id`, `usado`, `expira_en`),
  CONSTRAINT `fk_recuperacion_usuario` 
    FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
