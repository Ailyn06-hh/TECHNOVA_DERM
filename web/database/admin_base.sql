-- ========================================================================
-- Technova-Derm - Base de Datos Panel de Administración / Dueña (CRM)
-- Fase 1: Acceso, Estructura y Auditoría
-- ========================================================================

-- Tabla de administradores y personal con acceso al CRM
CREATE TABLE IF NOT EXISTS `administradores` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nombre` VARCHAR(100) NOT NULL,
  `apellido` VARCHAR(100) NOT NULL,
  `correo` VARCHAR(254) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `rol` ENUM('admin', 'gerente') NOT NULL DEFAULT 'admin',
  `totp_secret` VARCHAR(64) NULL,
  `totp_configurado` TINYINT(1) NOT NULL DEFAULT 0,
  `intentos_fallidos` INT NOT NULL DEFAULT 0,
  `bloqueado_hasta` DATETIME NULL,
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `ultimo_acceso` DATETIME NULL,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_admin_correo` (`correo`),
  INDEX `idx_admin_rol` (`rol`),
  INDEX `idx_admin_activo` (`activo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Relación de sucursales asignadas para administradores con rol 'gerente'
CREATE TABLE IF NOT EXISTS `administrador_sucursales` (
  `administrador_id` INT NOT NULL,
  `sucursal_id` INT NOT NULL,
  PRIMARY KEY (`administrador_id`, `sucursal_id`),
  CONSTRAINT `fk_admin_sucursal_admin` FOREIGN KEY (`administrador_id`) REFERENCES `administradores` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_admin_sucursal_sucursal` FOREIGN KEY (`sucursal_id`) REFERENCES `sucursales` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bitácora de auditoría inmutable para todas las acciones del CRM
CREATE TABLE IF NOT EXISTS `auditoria_admin` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `administrador_id` INT NULL,
  `accion` VARCHAR(80) NOT NULL,
  `entidad` VARCHAR(50) NOT NULL,
  `entidad_id` VARCHAR(50) NULL,
  `detalle` JSON NULL,
  `ip` VARCHAR(45) NULL,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_auditoria_admin_admin` (`administrador_id`),
  INDEX `idx_auditoria_admin_entidad` (`entidad`, `entidad_id`),
  INDEX `idx_auditoria_admin_creado` (`creado_en`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar cuentas iniciales si no existen
-- Dueña / Administradora General (rol: admin, todo el sistema)
-- Password: AdminPass2026!
INSERT INTO `administradores` (`nombre`, `apellido`, `correo`, `password_hash`, `rol`, `totp_secret`, `totp_configurado`, `activo`)
VALUES (
  'Sofía',
  'Castro',
  'admin@technovaderm.mx',
  '$2b$10$B3v.cTmELGgjq9LZsgJWB.zyWoM1onL3kMuDm5F78sB87aJANUYTO',
  'admin',
  'JBSWY3DPEHPK3PXP',
  0,
  1
) ON DUPLICATE KEY UPDATE `activo` = 1;

-- Gerente de Sucursal Centro (rol: gerente, solo su sucursal asignada)
-- Password: Gerente2026!
INSERT INTO `administradores` (`nombre`, `apellido`, `correo`, `password_hash`, `rol`, `totp_secret`, `totp_configurado`, `activo`)
VALUES (
  'Mariana',
  'López',
  'gerente.centro@technovaderm.mx',
  '$2b$10$yZgLCMHOYaovFzVCdGPfOuoXKDnA0yHjuJYghqaoYLZeBK3a9DrxC',
  'gerente',
  'MZXW6YTBOI======',
  0,
  1
) ON DUPLICATE KEY UPDATE `activo` = 1;

-- Asignar Sucursal Centro (id: 1) a la gerente
INSERT IGNORE INTO `administrador_sucursales` (`administrador_id`, `sucursal_id`)
SELECT a.id, s.id
FROM `administradores` a
JOIN `sucursales` s ON s.nombre LIKE '%Centro%' OR s.id = 1
WHERE a.correo = 'gerente.centro@technovaderm.mx'
LIMIT 1;
