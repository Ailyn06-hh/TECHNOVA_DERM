-- Script de inicialización de la tabla 'usuarios' para Technova-Derm
-- Base de datos: MySQL / MariaDB (XAMPP)

CREATE DATABASE IF NOT EXISTS `technova_derm` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `technova_derm`;

CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nombre` VARCHAR(100) NOT NULL,
  `apellido` VARCHAR(100) NOT NULL,
  `correo` VARCHAR(150) NOT NULL UNIQUE,
  `celular` VARCHAR(10) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `acepta_terminos` TINYINT(1) NOT NULL DEFAULT 1,
  `acepta_promociones` TINYINT(1) NOT NULL DEFAULT 0,
  `fecha_registro` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_usuarios_correo` (`correo`),
  INDEX `idx_usuarios_celular` (`celular`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
