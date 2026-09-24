# Casos de Prueba y Especificación de Reglas de Validación
**Módulo Centralizado de Validaciones — Technova-Derm**

Este documento detalla los casos de prueba esperados, entradas, salidas y comportamiento de las funciones puras en `lib/validaciones/`, compartidas de forma idéntica entre el frontend (Next.js App Router) y el backend (API Routes).

---

## 1. Normalización de Entradas (`normalizar.ts`)

### 1.1 Correo Electrónico (`normalizarCorreo`)
*Regla: Convertir a minúsculas y quitar espacios iniciales/finales.*

| Caso de Prueba | Entrada | Salida Esperada | Comportamiento |
| :--- | :--- | :--- | :--- |
| Con espacios al inicio y final | `"  ana.lopez@correo.com  "` | `"ana.lopez@correo.com"` | Elimina espacios |
| Con mayúsculas | `"ANA.LOPEZ@HOTMAIL.COM"` | `"ana.lopez@hotmail.com"` | Todo a minúsculas |
| Mixto con espacios y mayúsculas | `"  Ana.Lopez@Dominio.COM  "` | `"ana.lopez@dominio.com"` | Normalizado completo |
| Cadena vacía / null / undefined | `""`, `null`, `undefined` | `""` | Devuelve cadena vacía |

### 1.2 Teléfono Celular Mexicano (`normalizarCelular`)
*Regla: Extraer exactamente 10 dígitos. Retirar prefijo `+52` o `52` si viene con 12 dígitos.*

| Caso de Prueba | Entrada | Salida Esperada | Longitud Válida (10) |
| :--- | :--- | :--- | :--- |
| Formato estándar con espacios | `"449 123 4567"` | `"4491234567"` | Sí (10 dígitos) |
| Formato con guiones y paréntesis | `"(449) 123-4567"` | `"4491234567"` | Sí (10 dígitos) |
| Con prefijo internacional `+52` | `"+52 449 123 4567"` | `"4491234567"` | Sí (10 dígitos) |
| Con prefijo `52` directo (12 dígitos) | `"524491234567"` | `"4491234567"` | Sí (10 dígitos) |
| Prefijo histórico `052` (13 dígitos) | `"0524491234567"` | `"4491234567"` | Sí (10 dígitos) |
| Celular incompleto (9 dígitos) | `"449123456"` | `"449123456"` | No (9 dígitos) |
| Solo letras o símbolos inválidos | `"abc-xyz"` | `""` | No (0 dígitos) |

### 1.3 Nombres y Apellidos (`normalizarTexto`)
*Regla: Quitar espacios en extremos y colapsar múltiples espacios consecutivos a uno solo.*

| Caso de Prueba | Entrada | Salida Esperada |
| :--- | :--- | :--- |
| Múltiples espacios intermedios | `"Ana    María"` | `"Ana María"` |
| Espacios al inicio y final | `"   López de la Vega   "` | `"López de la Vega"` |
| Espacios tabuladores y saltos | `"Carlos \t  Alberto"` | `"Carlos Alberto"` |

### 1.4 Identificador Mixto (`normalizarIdentificador`)
*Regla: Si contiene `@` se evalúa como correo; si no, como celular.*

| Caso de Prueba | Entrada | `tipo` | `valor` | `esValido` |
| :--- | :--- | :--- | :--- | :--- |
| Correo válido | `" Ana@Correo.com "` | `"correo"` | `"ana@correo.com"` | `true` |
| Correo inválido (sin dominio) | `"ana@"` | `"correo"` | `"ana@"` | `false` |
| Celular con `+52` | `"+52 449 987 6543"` | `"celular"` | `"4499876543"` | `true` |
| Celular con menos de 10 dígitos | `"12345"` | `"celular"` | `"12345"` | `false` |
| Entrada en blanco | `"   "` | `"celular"` | `""` | `false` |

---

## 2. Reglas de Validación de Contraseñas (`contrasena.ts`)

> [!IMPORTANT]
> **REGLA DE ORO DE CONTRASEÑAS**:
> La contraseña **NUNCA se normaliza ni se recortan sus espacios (`trim`)**. Los espacios ingresados por el usuario forman parte de su secreto. Si el usuario ingresa un espacio al inicio o al final, la regla `sin_espacios_extremos` lo detectará y rechazará explícitamente para evitar contraseñas ambiguas creadas por error de tipeo.

### 2.1 Longitud Mínima (8 caracteres)
| Entrada | Longitud | ¿Pasa `minimo_caracteres`? |
| :--- | :--- | :--- |
| `"Abc1234"` | 7 caracteres | **Falla** (Mínimo 8 caracteres) |
| `"Abc12345"` | 8 caracteres | **Pasa** |
| `"ContrasenaSegura2026"` | 20 caracteres | **Pasa** |

### 2.2 Longitud Máxima en UTF-8 (72 Bytes — Límite de Bcrypt)
*Bcrypt trunca silenciosamente a los 72 bytes. Evaluamos `Buffer.byteLength` / `TextEncoder` para evitar contraseñas truncadas por caracteres multibyte.*

| Entrada | Caracteres | Bytes UTF-8 | ¿Pasa `maximo_bytes`? |
| :--- | :--- | :--- | :--- |
| `"ClaveSegura123!"` (ASCII) | 16 | 16 bytes | **Pasa** |
| Cadena ASCII de 72 caracteres: `'A'.repeat(71) + '1'` | 72 | 72 bytes | **Pasa** |
| Cadena ASCII de 73 caracteres: `'A'.repeat(72) + '1'` | 73 | 73 bytes | **Falla** (Excede 72 bytes) |
| Con acentos en español (2 bytes c/u): `'Áéíóúñ'.repeat(6) + '1'` (37 caracteres) | 37 | $(6 \times 12) + 1 = 73$ bytes | **Falla** (Excede 72 bytes aunque tenga solo 37 chars) |
| Con emojis (4 bytes c/u): `'🌸'.repeat(18) + 'A1'` | 20 | $(18 \times 4) + 2 = 74$ bytes | **Falla** (Excede 72 bytes) |

### 2.3 Mayúsculas, Minúsculas y Números
| Entrada | Mayúscula | Minúscula | Número | ¿Pasa formato? |
| :--- | :--- | :--- | :--- | :--- |
| `"solominusculas123"` | No | Sí | Sí | **Falla** (falta mayúscula) |
| `"SOLOMAYUSCULAS123"` | Sí | No | Sí | **Falla** (falta minúscula) |
| `"SinNumerosClave"` | Sí | Sí | No | **Falla** (falta número) |
| `"Valida1234"` | Sí | Sí | Sí | **Pasa** |
| Con caracteres en español: `"Ñandú2026"` | Sí (`Ñ`) | Sí (`a`) | Sí (`2`) | **Pasa** |

### 2.4 Espacios al Inicio o al Final
| Entrada | Inicio | Final | ¿Pasa `sin_espacios_extremos`? |
| :--- | :--- | :--- | :--- |
| `" Clave1234"` | Espacio al inicio | Caracter | **Falla** |
| `"Clave1234 "` | Caracter | Espacio al final | **Falla** |
| `" Clave1234 "` | Espacio al inicio | Espacio al final | **Falla** |
| `"Clave Segura 1234"` | Caracter | Caracter (espacio en medio) | **Pasa** (los espacios interiores son válidos como passphrase) |

### 2.5 Prohibición de Datos Personales (Nombre, Apellido, Usuario de Correo)
*Regla: No debe contener fragmentos $\ge 3$ caracteres del nombre, apellido o parte local del correo (insensible a mayúsculas).*

Contexto de prueba: `{ nombre: "Ana", apellido: "López", correo: "ana.lopez@dominio.com" }`

| Entrada de Contraseña | Término detectado | Resultado |
| :--- | :--- | :--- |
| `"Ana123456!"` | `"ana"` (del nombre) | **Falla** |
| `"MiClaveLopez2026"` | `"lopez"` (del apellido) | **Falla** |
| `"claveana.lopez1"` | `"ana.lopez"` (del correo) | **Falla** |
| `"SkincareSeguro2026"` | Ninguno | **Pasa** |

### 2.6 Bloqueo de Contraseñas Comunes / Predecibles
*Regla: Bloquea un diccionario de más de 100 contraseñas comúnmente vulneradas.*

| Entrada de Contraseña | ¿Está en lista negra? | Resultado |
| :--- | :--- | :--- |
| `"Password123"` | Sí | **Falla** |
| `"Admin1234"` | Sí | **Falla** |
| `"Technova2026"` | Sí | **Falla** |
| `"12345678"` | Sí | **Falla** |
| `"Temporal123"` | Sí | **Falla** |
| `"K$9vP#mQ2xL!"` | No | **Pasa** |

### 2.7 Validación de Confirmación (`validarConfirmacion`)
| Contraseña | Confirmación | Resultado |
| :--- | :--- | :--- |
| `"Clave1234"` | `""` | **Falla** (Confirmación requerida) |
| `"Clave1234"` | `"Clave1235"` | **Falla** (Las contraseñas no coinciden) |
| `"Clave1234"` | `"clave1234"` (case-sensitive) | **Falla** (Las contraseñas no coinciden) |
| `"Clave1234"` | `"Clave1234"` | **Pasa** |

---

## 3. Matriz de Integración en Pantallas

| Pantalla / Endpoint | Normalización Aplicada | Validación de Contraseña | Componente UI |
| :--- | :--- | :--- | :--- |
| `/registro` & `POST /api/auth/registro` | `normalizarTexto`, `normalizarCorreo`, `normalizarCelular` | `validarContrasena` (con contexto personal) | `<PasswordRequirements />` en vivo al enfocar o escribir |
| `/recuperar/nueva` & `POST /api/auth/recuperar/nueva` | Token sanitizado | `validarContrasena`, `validarConfirmacion`, `bcrypt.compare` (diferente a la actual) | `<PasswordRequirements />` en vivo al enfocar o escribir |
| `/login` & `POST /api/auth/login` | `normalizarIdentificador` (correo o celular) | Comparación con hash de base de datos | Input con toggler show/hide |
| `/recuperar` & `POST /api/auth/recuperar` | `normalizarIdentificador` | No aplica | Anti-enumeración y Rate-limit 3 req/15 min |
