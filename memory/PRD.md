# CTCARGA - Sistema de Gestión Logística

## Problema Original
Desarrollar un sistema completo de gestión logística y transporte (CTCARGA) con dashboards dinámicos, lista de Ofertas, wizard de 4 pasos para crear ofertas, y módulo de gestión de flota.

## Arquitectura
- **Frontend**: React + TailwindCSS + Lucide Icons
- **Backend**: FastAPI + Motor (MongoDB async)
- **DB**: MongoDB

## Funcionalidades Implementadas

### Login (DONE)
- Página de login con navegación al dashboard

### Dashboard (DONE)
- Estadísticas generales de ofertas

### Ofertas - Lista (DONE)
- Cards personalizadas por oferta
- Búsqueda y filtros por estado
- Eliminar ofertas

### Creación de Ofertas - Wizard 4 pasos (DONE)
- Paso 1: Información de Cargue con validaciones y modal de confirmación
- Paso 2: Multi-destino con validaciones por destino y modal de confirmación
- Paso 3: Configuración de vehículo con validaciones obligatorias
- Paso 4: Condiciones (Remitente, Destinatario por destino, distribución multi-destino, Fletes independientes por destino)

### Módulo Flota (DONE - Feb 2026)
#### Vehículos
- Registro completo: placa, licencia tránsito, marca (20 opciones), línea, modelo, clase (13 tipos), carrocería, combustible, motor, VIN, propietario, identificación, fecha matrícula
- Tarjeta de Operaciones: número, fechas con vigencia auto-calculada (1 año)
- SOAT: póliza, aseguradora, fechas con vigencia auto-calculada (1 año)
- Revisión Técnico-Mecánica: número, CDA, fechas con regla especial (2 años si matrícula < 2 años)
- Carga de documentos (PDF, JPG, PNG): licencia tránsito, SOAT, revisión, tarjeta operaciones
- Lista con búsqueda, edición y eliminación

#### Remolques / Semirremolques
- Registro: placa, tipo (13 opciones), VIN, ejes, capacidad carga útil
- Lista con búsqueda, edición y eliminación

#### Vinculación Vehículo-Remolque
- Solo Tractocamiones pueden vincular remolques
- Modal de selección de remolques disponibles
- Vinculación/desvinculación editable

## API Endpoints
- `GET/POST /api/ofertas`, `DELETE /api/ofertas/{id}`
- `GET/POST /api/direcciones-favoritas`, `DELETE /api/direcciones-favoritas/{id}`
- `GET /api/stats`
- `GET/POST /api/vehiculos`, `PUT/DELETE /api/vehiculos/{id}`
- `GET/POST /api/remolques`, `PUT/DELETE /api/remolques/{id}`
- `POST /api/vehiculos/{id}/vincular-remolque`
- `POST /api/vehiculos/{id}/desvincular-remolque`
- `POST /api/upload`, `GET /api/uploads/{filename}`

## Archivos Clave
- `/app/frontend/src/pages/Flota.js` - Módulo de flota
- `/app/frontend/src/pages/CreacionOfertas.js` - Wizard 4 pasos
- `/app/frontend/src/pages/Ofertas.js` - Lista de ofertas
- `/app/backend/server.py` - API FastAPI

## Backlog
- **P1**: Botón "Ver" en lista de Ofertas para detalles completos
- **P2**: Estados adicionales de ofertas (Asignada, En Tránsito, Completada)
- **Refactoring**: Dividir CreacionOfertas.js en sub-componentes
