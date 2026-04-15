# CTCARGA - PRD

## Problema Original
Sistema completo de gestión logística y transporte (CTCARGA) con dashboards, ofertas, flota vehicular, y arquitectura multitenant.

## Implementado

### Login + Auth (DONE)
- JWT con httpOnly cookies, bcrypt, AuthContext, ProtectedRoute

### Multitenant (DONE)
- Empresa "Sueña", tenant_id en todo, filtrado obligatorio

### Roles (DONE)
- ADMIN, OPERADOR, CONSULTA, TESORERIA con validación backend

### Dashboard (DONE)
### Creación de Ofertas Wizard 4 pasos (DONE)
### Módulo Flota (DONE)

### Ofertas - Listado + Detalle (DONE - Feb 2026)
- Vista principal: tabla con columnas ID, Remitente, Fecha Cargue, Estado, Acción (Ver)
- Botón Ver abre vista detalle con info completa
- 7 estados: SIN ASIGNAR, ASIGNADO, EN PROCESO DE CARGUE, EN RUTA, EN PROCESO DE DESCARGUE, PENDIENTE DOCUMENTACIÓN, FINALIZADA
- Detalle: botón "Asignar Vehículos" + Eliminar (SIN ASIGNAR) / Cancelar (ASIGNADO)
- Búsqueda y filtro por estado

## Backlog
- **P1**: Funcionalidad de "Asignar Vehículos" desde la vista detalle
- **P2**: Reglas de transición de estados
- **P2**: Panel TESORERIA
- **Refactoring**: Dividir CreacionOfertas.js en sub-componentes
