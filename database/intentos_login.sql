-- =====================================================================
-- Script de Creación de Tabla: intentos_login
-- Proyecto: Technova-Derm (HackaTec 2026)
-- Motor: MySQL / MariaDB (XAMPP / phpMyAdmin)
-- Codificación: utf8mb4_unicode_ci
-- =====================================================================

USE `technova_derm`;

CREATE TABLE IF NOT EXISTS `intentos_login` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `identificador` VARCHAR(150) NOT NULL COMMENT 'Correo en minúsculas o celular de 10 dígitos normalizado',
  `ip` VARCHAR(45) NOT NULL COMMENT 'Dirección IP v4 o v6 del cliente',
  `exitoso` TINYINT(1) NOT NULL COMMENT '0=Fallido, 1=Exitoso',
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_identificador_creado` (`identificador`, `creado_en`),
  INDEX `idx_ip_creado` (`ip`, `creado_en`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TODO: Mantenimiento y depuración automática de registros con más de 30 días de antigüedad.
-- En un entorno de producción con MySQL Event Scheduler habilitado (SET GLOBAL event_scheduler = ON;):
--
-- CREATE EVENT IF NOT EXISTS `limpiar_intentos_login_antiguos`
-- ON SCHEDULE EVERY 1 DAY
-- DO
--   DELETE FROM `intentos_login` WHERE `creado_en` < DATE_SUB(NOW(), INTERVAL 30 DAY);
