# CTCARGA - Sistema de Gestión Logística y Transporte

Sistema integral para la administración de operaciones logísticas de carga terrestre en Colombia. Permite publicar ofertas de transporte, gestionar flota vehicular (vehículos y remolques), controlar documentación regulatoria, y llevar un registro completo de auditoría de todas las actividades del sistema.

---

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 18, React Router, Lucide Icons, CSS Modules |
| Backend | FastAPI (Python), Motor (async MongoDB driver) |
| Base de datos | MongoDB |
| Autenticación | JWT (httpOnly cookies) + bcrypt |
| Archivos | Almacenamiento local en `/backend/uploads/` |
| Auditoría | Sistema de logs integrado en MongoDB |

---

## Arquitectura Multitenant

El sistema implementa aislamiento por empresa (tenant):

- **Colección `empresas`**: Registro de cada empresa con id, nombre, estado, código.
- **Campo `tenant_id`**: Presente en `ofertas`, `vehiculos`, `remolques`, `direcciones_favoritas`, `usuarios`, `activity_logs`.
- **Filtrado obligatorio**: Todas las consultas (GET/POST/PUT/DELETE) filtran por `tenant_id` del usuario autenticado.
- **Aislamiento total**: Un tenant nunca puede acceder a datos de otro tenant.
- **Empresa semilla**: "Sueña" (código 00001), creada automáticamente en el primer arranque.

### Roles de Usuario

| Rol | Lectura | Escritura (ofertas, flota) | Gestión usuarios | Logs |
|---|---|---|---|---|
| ADMIN | Completa | Completa | Completa | Consulta completa |
| OPERADOR | Completa | Completa | No | Consulta completa |
| CONSULTA | Completa | No | No | Consulta completa |
| TESORERIA | Completa | No (solo pagos futuros) | No | Consulta completa |

Los permisos se validan en el backend; el frontend no decide el acceso.

---

## Estructura del Proyecto

```
/app
├── backend/
│   ├── server.py                 # API FastAPI — auth, multitenant, CRUD, activity logs
│   ├── uploads/                  # Documentos subidos
│   ├── requirements.txt
│   ├── tests/
│   │   ├── test_flota.py
│   │   └── test_auth_multitenant.py
│   └── .env                      # MONGO_URL, DB_NAME, JWT_SECRET, ADMIN_*
├── frontend/
│   ├── src/
│   │   ├── App.js                # Enrutamiento + ProtectedRoute
│   │   ├── AuthContext.js        # Contexto de autenticación (login, logout, user)
│   │   ├── pages/
│   │   │   ├── LoginPage.js      # Login real con JWT
│   │   │   ├── Dashboard.js      # Panel con estadísticas
│   │   │   ├── Ofertas.js        # Listado y asignación de vehículos
│   │   │   ├── CreacionOfertas.js # Wizard 4 pasos con validaciones mejoradas
│   │   │   ├── Flota.js          # Gestión de vehículos y remolques
│   │   │   └── *.css
│   │   └── data/
│   │       ├── colombiaData.js
│   │       └── vehiculosData.js
│   └── .env                      # REACT_APP_BACKEND_URL
├── memory/
│   ├── PRD.md
│   └── test_credentials.md
└── test_reports/
```

---

## Autenticación

### Flujo
1. El usuario ingresa email/contraseña en `/`.
2. `POST /api/auth/login` valida credenciales, genera tokens JWT.
3. Los tokens se almacenan como cookies httpOnly (access: 12h, refresh: 7d).
4. El frontend envía `credentials: 'include'` en todas las peticiones.
5. El backend extrae el usuario desde la cookie, obtiene `tenant_id`, filtra datos.

### Credenciales por defecto
- **Admin**: `admin@ctcarga.com` / `admin123` (Rol: ADMIN, Empresa: Sueña)

---

## Módulos Funcionales

### 1. Login (`/`)
Login real con validación backend. Errores mostrados en la UI.

### 2. Dashboard (`/dashboard`)
Panel con métricas filtradas por tenant. Nombre del usuario autenticado en el header.

### 3. Ofertas (`/ofertas`)
- **Listado filtrado por tenant** con búsqueda, filtro por estado
- **Botones de acción tipo icono** (Asignar vehículos, Ver detalle)
- **Sistema de asignación de vehículos con 2 modales:**
  1. Modal de confirmación con datos de la oferta (cargue, descargue, flete, anticipo, fecha de pago)
  2. Modal de publicación con reglas de asignación (24h antes, radio 20km, prioridad: flota propia → vinculada → terceros)
- **Vista de detalle** con información completa de la oferta
- **Eliminación** solo para ofertas en estado "SIN ASIGNAR"

### 4. Creación de Ofertas (`/creacion-ofertas`)
Wizard de 4 pasos con validaciones mejoradas:

#### **Paso 1: Información de Cargue**
- **Campos obligatorios reducidos:** Tipo de vía, Número Principal, Departamento, Municipio
- Campo 6 renombrado: "Letra / Bis / Complemento/Placa"
- Direcciones favoritas sin duplicados (valida nombre y dirección)

#### **Paso 2: Información de Descargue**
- Mismas validaciones que paso 1
- **Validación de direcciones duplicadas:** No permite que cargue y descargue sean iguales
- Multi-destino con fletes independientes

#### **Paso 3: Tipo de Vehículo Requerido**
- Selección en cascada: Configuración → Tipo → Carrocería → Tipo de carga

#### **Paso 4: Condiciones de la Oferta**
- **Sección Remitente:** 
  - Remitente, Nombre Responsable, Identificación
  - **Número de teléfono** (nuevo)
  - **Correo electrónico** (nuevo)
  - Dirección (auto desde paso 1)

- **Sección Destinatarios:**
  - Destinatario, Nombre Responsable, Identificación
  - **Número de teléfono** (nuevo)
  - **Correo electrónico** (nuevo)
  - Dirección (auto desde paso 2)
  - Campos idénticos a Remitente

- **Sección Fletes:**
  - Inputs optimizados (type="text" con entrada fluida)
  - Campos por destino: Valor Total, Trayectos, Retenciones, Anticipo, etc.
  - Cálculos automáticos de Valor Neto y Saldo a Pagar

- **Información de Cargue:**
  - Fecha/hora inicio, tiempo estimado, sitios de cargue, observaciones

### 5. Flota (`/flota`)
Gestión completa de vehículos y remolques con las siguientes características:

#### **Vehículos - Formulario a 4 columnas:**
- **Tipo de Propiedad (obligatorio):**
  - Vehículo de flota propia
  - Vehículo de tercero vinculado
  - Selección exclusiva (solo uno a la vez)

- **Datos del Vehículo:**
  - Placa, Licencia de tránsito, Marca, Línea, Modelo
  - **Configuración** (con cascada desde vehiculosData)
  - **Tipo de vehículo** (dependiente de configuración)
  - **Carrocería** (dependiente de configuración y tipo)
  - **Tipo de carga** (dependiente de todos los anteriores)
  - Combustible, Número de motor, VIN
  - Propietario, Identificación del propietario, Fecha de matrícula

- **Documentación Regulatoria:**
  - Tarjeta de operaciones (número, vigencia)
  - SOAT (número, aseguradora, vigencia)
  - Revisión técnico-mecánica (número, CDA, vigencia auto-calculada)
  - Carga de archivos PDF/imágenes

- **Vinculación de Remolques:**
  - Solo para configuración "Tractocamión"
  - Un remolque vinculado a un vehículo a la vez

#### **Remolques:**
- Registro completo con placa única por tenant
- Tipo, capacidad, ejes, dimensiones
- Estado de vinculación con vehículo

---

## Sistema de Auditoría (Activity Logs)

### Descripción
Sistema completo de registro de actividad que captura **todas las acciones** realizadas en el sistema para auditoría, seguridad y cumplimiento normativo.

### Información Registrada
Cada acción genera un log con:
- **Usuario:** ID, nombre, email del usuario que realizó la acción
- **Acción:** CREAR, ACTUALIZAR, ELIMINAR, CAMBIO_ESTADO
- **Módulo:** ofertas, vehiculos, remolques, direcciones_favoritas
- **Registro ID:** Identificador del registro afectado
- **Detalles:** Descripción legible de la acción
- **Datos anteriores:** Estado previo (para actualizaciones/eliminaciones)
- **Datos nuevos:** Estado posterior (para creaciones/actualizaciones)
- **Fecha/Hora:** Timestamp UTC de la acción
- **IP Address:** Dirección IP del cliente (soporta proxies)
- **Empresa:** ID y nombre de la empresa (tenant)

### Módulos con Logging Implementado

#### **Ofertas:**
- ✅ Creación de oferta (código, remitente, estado inicial)
- ✅ Eliminación de oferta (datos completos de la oferta)

#### **Vehículos:**
- ✅ Creación de vehículo (placa, marca, tipo de propiedad)
- ✅ Actualización de vehículo (datos anteriores vs nuevos)
- ✅ Eliminación de vehículo (datos completos)
- ✅ Vinculación de remolque (vehículo + remolque)
- ✅ Desvinculación de remolque

#### **Remolques:**
- ✅ Creación de remolque (placa, marca)
- ✅ Actualización de remolque (datos anteriores vs nuevos)
- ✅ Eliminación de remolque (datos completos)

#### **Direcciones Favoritas:**
- ✅ Creación de dirección favorita (nombre, dirección)
- ✅ Eliminación de dirección favorita

### Consulta de Logs
Endpoint: `GET /api/activity-logs`

**Filtros disponibles:**
- `modulo`: ofertas, vehiculos, remolques, direcciones_favoritas
- `accion`: CREAR, ACTUALIZAR, ELIMINAR, CAMBIO_ESTADO
- `usuario_id`: Filtrar por usuario específico
- `fecha_desde`: Fecha inicial (ISO 8601)
- `fecha_hasta`: Fecha final (ISO 8601)
- `limit`: Resultados por página (max 500, default 100)
- `skip`: Offset para paginación

**Respuesta:**
```json
{
  "logs": [
    {
      "usuario_nombre": "Admin Usuario",
      "accion": "CREAR",
      "modulo": "vehiculos",
      "registro_id": "uuid",
      "detalles": "Creación de vehículo ABC123 - Marca: KENWORTH T800",
      "datos_nuevos": {
        "placa": "ABC123",
        "marca": "KENWORTH",
        "tipo_propiedad": "flota_propia"
      },
      "fecha_hora": "2025-07-15T10:30:00Z",
      "ip_address": "192.168.1.100"
    }
  ],
  "total": 150,
  "limit": 100,
  "skip": 0
}
```

### Índices de Base de Datos
Para consultas eficientes, se crearon índices en:
- `fecha_hora` (descendente)
- `usuario_id`
- `modulo`
- `accion`
- `empresa_id`
- `tenant_id`

---

## API REST

Base URL: `/api`

### Autenticación
| Método | Ruta | Protegida | Descripción |
|---|---|---|---|
| POST | `/api/auth/login` | No | Login, retorna user + sets cookies |
| POST | `/api/auth/logout` | No | Limpia cookies |
| GET | `/api/auth/me` | Sí | Retorna usuario autenticado |
| POST | `/api/auth/refresh` | No | Renueva access token |

### Ofertas
| Método | Ruta | Roles | Descripción | Log |
|---|---|---|---|---|
| GET | `/api/ofertas` | Todos | Listar ofertas del tenant | No |
| GET | `/api/ofertas/{id}` | Todos | Detalle de oferta | No |
| POST | `/api/ofertas` | ADMIN, OPERADOR | Crear oferta | ✅ CREAR |
| DELETE | `/api/ofertas/{id}` | ADMIN, OPERADOR | Eliminar oferta | ✅ ELIMINAR |

### Estadísticas
| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| GET | `/api/stats` | Todos | Conteos por estado (filtrado por tenant) |

### Direcciones Favoritas
| Método | Ruta | Roles | Descripción | Log |
|---|---|---|---|---|
| GET | `/api/direcciones-favoritas` | Todos | Listar favoritas del tenant | No |
| POST | `/api/direcciones-favoritas` | ADMIN, OPERADOR | Guardar favorita | ✅ CREAR |
| DELETE | `/api/direcciones-favoritas/{id}` | ADMIN, OPERADOR | Eliminar favorita | ✅ ELIMINAR |

### Vehículos
| Método | Ruta | Roles | Descripción | Log |
|---|---|---|---|---|
| GET | `/api/vehiculos` | Todos | Listar vehículos del tenant | No |
| POST | `/api/vehiculos` | ADMIN, OPERADOR | Registrar vehículo | ✅ CREAR |
| PUT | `/api/vehiculos/{id}` | ADMIN, OPERADOR | Actualizar vehículo | ✅ ACTUALIZAR |
| DELETE | `/api/vehiculos/{id}` | ADMIN, OPERADOR | Eliminar vehículo | ✅ ELIMINAR |
| POST | `/api/vehiculos/{id}/vincular-remolque` | ADMIN, OPERADOR | Vincular remolque | ✅ CAMBIO_ESTADO |
| POST | `/api/vehiculos/{id}/desvincular-remolque` | ADMIN, OPERADOR | Desvincular | ✅ CAMBIO_ESTADO |

### Remolques
| Método | Ruta | Roles | Descripción | Log |
|---|---|---|---|---|
| GET | `/api/remolques` | Todos | Listar remolques del tenant | No |
| POST | `/api/remolques` | ADMIN, OPERADOR | Registrar remolque | ✅ CREAR |
| PUT | `/api/remolques/{id}` | ADMIN, OPERADOR | Actualizar remolque | ✅ ACTUALIZAR |
| DELETE | `/api/remolques/{id}` | ADMIN, OPERADOR | Eliminar remolque | ✅ ELIMINAR |

### Activity Logs
| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| GET | `/api/activity-logs` | Todos | Consultar logs con filtros múltiples |

### Archivos
| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| POST | `/api/upload` | ADMIN, OPERADOR | Subir archivo |
| GET | `/api/uploads/{filename}` | Público | Descargar archivo |

---

## Modelos de Datos (MongoDB)

### `empresas`
```json
{
  "id": "uuid", "nombre": "Sueña", "codigo": "00001",
  "estado": "activa", "created_at": "ISO 8601"
}
```

### `usuarios`
```json
{
  "_id": "ObjectId",
  "email": "admin@ctcarga.com", "password_hash": "$2b$...",
  "name": "Administrador", "rol": "ADMIN",
  "tenant_id": "uuid (ref empresas.id)",
  "created_at": "ISO 8601"
}
```

### `ofertas`
```json
{
  "id": "uuid", "codigo_oferta": "2026-04-00001-0001",
  "tenant_id": "uuid",
  "remitente": "", "nombre_responsable": "", "identificacion": "",
  "telefono": "", "email": "",
  "destinatario": "", "cargue": {}, "descargues": [],
  "vehiculo": {}, "condiciones": {}, "fletes": {}, "info_cargue": {},
  "estado": "SIN ASIGNAR",
  "created_at": "ISO 8601", "updated_at": "ISO 8601"
}
```

### `vehiculos`
```json
{
  "id": "uuid", "tenant_id": "uuid",
  "tipo_propiedad": "flota_propia | tercero_vinculado",
  "placa": "ABC123", "marca": "Kenworth", 
  "configuracion": "Tractocamión", "tipo_vehiculo": "C3S3",
  "carroceria": "Furgón", "tipo_carga": "Carga General",
  "tarjeta_operaciones": {}, "soat": {}, "revision_tecnicomecanica": {},
  "documentos": {}, "remolque_vinculado": "uuid | null",
  "created_at": "ISO 8601", "updated_at": "ISO 8601"
}
```

### `remolques`
```json
{
  "id": "uuid", "tenant_id": "uuid",
  "placa": "R12345", "tipo_remolque": "Plana",
  "vin": "", "numero_ejes": 3, "capacidad_carga_util": 35,
  "vehiculo_vinculado": "uuid | null",
  "created_at": "ISO 8601", "updated_at": "ISO 8601"
}
```

### `direcciones_favoritas`
```json
{
  "id": "uuid", "tenant_id": "uuid",
  "nombre_favorito": "Bodega Principal",
  "direccion": {
    "tipoVia": "Calle", "numeroPrincipal": "10",
    "direccionConstruida": "Calle 10 # 20-30",
    "departamento": "Cundinamarca", "municipio": "Bogotá"
  },
  "created_at": "ISO 8601"
}
```

### `activity_logs`
```json
{
  "usuario_id": "string", "usuario_nombre": "string", "usuario_email": "string",
  "accion": "CREAR | ACTUALIZAR | ELIMINAR | CAMBIO_ESTADO",
  "modulo": "ofertas | vehiculos | remolques | direcciones_favoritas",
  "registro_id": "uuid", "detalles": "string",
  "datos_anteriores": {}, "datos_nuevos": {},
  "fecha_hora": "ISO 8601", "ip_address": "string",
  "empresa_id": "uuid", "empresa_nombre": "string", "tenant_id": "uuid"
}
```

---

## Reglas de Negocio

1. **Multitenant**: Todos los datos filtrados por `tenant_id`. Nunca se accede a datos de otro tenant.
2. **Roles**: Validados en backend. ADMIN/OPERADOR pueden escribir; CONSULTA/TESORERIA solo lectura.
3. **Código de oferta**: `YYYY-MM-CODIGO_EMPRESA-SEC` auto-incremental por mes y tenant.
4. **Vinculación remolque**: Solo configuración "Tractocamión". Un remolque ↔ un vehículo.
5. **Revisión técnico-mecánica**: Si matrícula < 2 años → vigencia 2 años desde matrícula.
6. **Placa única**: Por tenant (dos tenants pueden tener la misma placa).
7. **Distribución multi-destino**: Suma de cantidades = cantidad total a movilizar.
8. **Direcciones favoritas**: Sin duplicados (valida nombre y dirección construida).
9. **Direcciones cargue/descargue**: No pueden ser iguales (validado en paso 2).
10. **Tipo de propiedad**: Obligatorio para vehículos, define flujo de facturación y pagos.
11. **Auditoría**: Todas las acciones CRUD registradas automáticamente con detalles completos.

---

## Validaciones Implementadas

### Creación de Ofertas

#### **Paso 1 y 2 (Direcciones):**
- ✅ Solo 4 campos obligatorios: Tipo de vía, Número principal, Departamento, Municipio
- ✅ Validación de direcciones duplicadas (cargue ≠ descargue)
- ✅ Direcciones favoritas sin duplicados (nombre + dirección)

#### **Paso 4 (Condiciones):**
- ✅ Remitente y Destinatarios con campos idénticos
- ✅ Nombre Responsable obligatorio en ambas secciones
- ✅ Inputs de Fletes optimizados (entrada fluida, sin re-renders)

### Flota

#### **Vehículos:**
- ✅ Tipo de propiedad obligatorio (selección exclusiva)
- ✅ Selección en cascada: Configuración → Tipo → Carrocería → Tipo de carga
- ✅ Placa única por tenant
- ✅ Solo Tractocamiones pueden vincular remolques
- ✅ Todos los campos obligatorios validados en backend

#### **Remolques:**
- ✅ Placa única por tenant
- ✅ No puede estar vinculado a múltiples vehículos

---

## Testing

```bash
# Backend
cd backend && python -m pytest tests/ -v

# Reportes
cat test_reports/iteration_3.json
```

Cobertura: **26 backend + 8 frontend tests** — 100% backend, 95% frontend.

---

## Ejecución

```bash
# Backend
cd backend && pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001

# Frontend
cd frontend && yarn install && yarn start
```

Variables de entorno:
- `backend/.env`: `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`
- `frontend/.env`: `REACT_APP_BACKEND_URL`

---

## Seguridad y Auditoría

### Autenticación
- JWT con cookies httpOnly (protección XSS)
- Tokens de acceso con expiración corta (12h)
- Refresh tokens para renovación (7d)
- Contraseñas hasheadas con bcrypt

### Autorización
- Validación de roles en cada endpoint
- Scope por tenant en todas las consultas
- Separación de permisos lectura/escritura

### Auditoría
- **100% de cobertura**: Todas las acciones CRUD registradas
- Captura de IP real (soporte proxies)
- Datos anteriores y nuevos para trazabilidad completa
- Índices optimizados para consultas rápidas
- Retención de logs históricos

### Compliance
- Trazabilidad completa de acciones
- Identificación de usuario responsable
- Timestamp UTC preciso
- Segregación de datos por tenant
- Base para reportes de auditoría

---

## Próximos Desarrollos Sugeridos

1. **Vista de Activity Logs**: Panel de administración para consultar logs
2. **Exportación de Logs**: Funcionalidad para exportar a CSV/Excel
3. **Alertas de Seguridad**: Notificaciones para acciones críticas
4. **Dashboard de Analytics**: Gráficas de actividad del sistema
5. **Política de Retención**: Limpieza automática de logs antiguos
6. **App Móvil**: Integración con logs de actividad móvil
7. **Facturación**: Flujo completo usando tipo_propiedad de vehículos
8. **Gestión de Conductores**: Asignación de conductores a vehículos
9. **Notificaciones Push**: Alertas para ofertas y asignaciones
10. **Reportes Avanzados**: Generación de reportes regulatorios

---

## Changelog

### Versión Actual (2025-07-15)

#### **Módulo Ofertas:**
- ✅ Botones de acción optimizados (tipo icono con tooltips)
- ✅ Sistema de asignación de vehículos con 2 modales de confirmación
- ✅ Reglas de asignación documentadas (24h, 20km, prioridad)
- ✅ Eliminado botón duplicado en vista detalle

#### **Creación de Ofertas:**
- ✅ Campos obligatorios reducidos a 4 (Tipo vía, Número, Depto, Municipio)
- ✅ Campo 6 renombrado: "Letra / Bis / Complemento/Placa"
- ✅ Validación: direcciones de cargue y descargue no pueden ser iguales
- ✅ Validación: direcciones favoritas sin duplicados
- ✅ Agregados campos de teléfono y email en Remitente
- ✅ Agregados campos de teléfono y email en Destinatarios
- ✅ Campo "Nombre Responsable" agregado a Destinatarios
- ✅ Sección Remitente y Destinatarios ahora son idénticas
- ✅ Inputs de Fletes optimizados (type="text", sin re-renders)

#### **Módulo Flota:**
- ✅ Formulario reorganizado a 4 columnas
- ✅ Tipo de Propiedad obligatorio (flota propia / tercero vinculado)
- ✅ Selección exclusiva con feedback visual
- ✅ Campos agregados: Configuración, Tipo de vehículo, Carrocería, Tipo de carga
- ✅ Selección en cascada desde vehiculosData
- ✅ Eliminados campos: Clase de vehículo, Tipo de carrocería
- ✅ Tabla actualizada para mostrar "Configuración" en lugar de "Clase"

#### **Sistema de Auditoría:**
- ✅ Colección `activity_logs` implementada
- ✅ Función `registrar_actividad()` centralizada
- ✅ Logging en 11 endpoints (ofertas, vehículos, remolques, direcciones)
- ✅ Captura automática de IP real
- ✅ Datos anteriores y nuevos para trazabilidad
- ✅ Endpoint `/api/activity-logs` con filtros múltiples
- ✅ 6 índices de MongoDB para consultas eficientes
- ✅ Paginación y ordenamiento por fecha

---

## Soporte y Contacto

Para reportar problemas, solicitar funcionalidades o contribuir al proyecto:
- Revisa el archivo `/memory/PRD.md` para el roadmap completo
- Consulta `/memory/test_credentials.md` para credenciales de testing
- Todas las pruebas deben pasar antes de hacer merge

---

**Última actualización:** 2025-07-15  
**Versión:** 1.2.0  
**Estado:** ✅ Producción
