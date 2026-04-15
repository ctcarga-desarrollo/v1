# CTCARGA - PRD

## Problema Original
Sistema completo de gestión logística y transporte (CTCARGA) con dashboards, ofertas, flota vehicular, y arquitectura multitenant.

## Implementado

### Login + Auth (DONE - Feb 2026)
- JWT con httpOnly cookies, bcrypt password hashing
- AuthContext en React, ProtectedRoute
- Login real con validación backend

### Multitenant (DONE - Feb 2026)
- Colección `empresas` con empresa semilla "Sueña"
- `tenant_id` en ofertas, vehiculos, remolques, direcciones_favoritas, usuarios
- Filtrado obligatorio en todas las consultas backend
- Migración automática de datos existentes al tenant por defecto

### Roles (DONE - Feb 2026)
- ADMIN, OPERADOR, CONSULTA, TESORERIA
- Validación en backend (check_role)
- ADMIN/OPERADOR: lectura + escritura; CONSULTA/TESORERIA: solo lectura

### Dashboard (DONE)
### Ofertas Lista (DONE)
### Creación de Ofertas Wizard 4 pasos (DONE)
### Módulo Flota (DONE)

## Backlog
- **P1**: Botón "Ver" en lista de Ofertas para detalles completos
- **P2**: Estados adicionales de ofertas (Asignada, En Tránsito, Completada)
- **P2**: Panel TESORERIA para servicios finalizados/pagos
- **Refactoring**: Dividir CreacionOfertas.js en sub-componentes
