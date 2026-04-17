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

## Modo de Operación y Pruebas

### Flujo Operativo Real del Sistema

El sistema CTCARGA sigue un flujo de trabajo lógico desde la creación de una oferta hasta la finalización del servicio. Este flujo está diseñado para reflejar la operación real de una empresa de transporte de carga.

#### 1️⃣ Creación de Oferta

**Ubicación:** Módulo "Ofertas" → Botón "Nueva Oferta"

- Wizard de 4 pasos:
  1. **Paso 1 - Datos de carga:** Tipo, peso, volumen, requisitos especiales
  2. **Paso 2 - Remitente y Destinatario:** Direcciones de cargue y descargue, contactos
  3. **Paso 3 - Configuración de vehículos:** Tipo, configuración, carrocería requerida
  4. **Paso 4 - Programación:** Fecha/hora inicio, tiempo estimado cargue, sitios disponibles
- La oferta se crea en estado **"SIN ASIGNAR"**
- El sistema calcula automáticamente:
  - Turnos de cargue (basado en hora inicio + tiempo estimado + holgura)
  - Capacidad por turno (según sitios de cargue disponibles)

#### 2️⃣ Publicación de Oferta

**Ubicación:** Tabla de ofertas → Botón "Publicar oferta"

Al publicar, el sistema:
- Cambia el estado a **"EN PROCESO DE ASIGNACIÓN"**
- Inicia el proceso de asignación automática de vehículos (si `ENABLE_SIMULATION=false`)
- Genera estructura de asignación en colección `asignaciones_vehiculos`
- Registra actividad en logs de auditoría

**Importante:** Una vez publicada, la oferta NO puede volver a estado "SIN ASIGNAR"

#### 3️⃣ Asignación de Vehículos

El sistema soporta **dos modos de asignación**:

##### A. Asignación Automática (Producción)
**Configuración:** `ENABLE_SIMULATION=false` en `/backend/.env`

- El sistema busca vehículos disponibles siguiendo prioridad:
  1. **Flota propia** (menor costo)
  2. **Terceros vinculados** (costo medio)
  3. **Terceros externos** (mayor costo, contacto manual)
- Valida requisitos:
  - Configuración de vehículo (sencillo, tractocamión, etc.)
  - Tipo de vehículo (rígido, articulado)
  - Carrocería compatible
  - Capacidad de carga
  - Proximidad (< 20km simulado)
- Asigna turnos de cargue automáticamente según orden de aceptación
- Sistema de reintentos (hasta 3 ciclos si no hay suficientes vehículos)

##### B. Asignación Manual Progresiva (Pruebas)
**Configuración:** `ENABLE_SIMULATION=true` en `/backend/.env`

- Permite agregar vehículos simulados uno por uno
- Ideal para pruebas funcionales sin necesidad de vehículos reales registrados
- Los vehículos simulados tienen:
  - Placa generada (formato: SIM + 3 dígitos)
  - Marca "SIMULADO" (identificable con badge amarillo)
  - Conductor simulado con datos ficticios
  - GPS simulado con coordenadas aleatorias
  - Documentación simulada (licencia, SOAT, RTM)

#### 4️⃣ Visualización de Vehículos Asignados

**Ubicación:** Tabla de ofertas → Botón "Vehículos asignados" (🚛)

**Disponible solo para ofertas con estado:**
- ✅ "EN PROCESO DE ASIGNACIÓN"
- ✅ "PUBLICADA"
- ✅ "FINALIZADA"
- ❌ "SIN ASIGNAR" (botón oculto)

**Vista de Vehículos Asignados incluye:**

| Columna | Descripción |
|---------|-------------|
| **Placa** | Identificación del vehículo + badge "SIMULADO" si aplica |
| **Conductor** | Nombre y teléfono del conductor asignado |
| **Tipo** | Badge de color según tipo de propiedad (Flota propia / Tercero vinculado / Tercero) |
| **Estado del proceso** | Estado actual + semáforo de tiempo (verde/rojo) |
| **Turno de Cargue** | Número de turno + hora programada |
| **Acciones** | Ver documentación / GPS tracking / Contacto |
| **Avanzar Estado** | Botón para simular avance en el flujo operativo |

**Métricas del resumen:**
- Total vehículos asignados (desglose: reales + simulados)
- Turnos programados
- % Completitud de asignación

#### 5️⃣ Simulación Progresiva de Asignación

**Ubicación:** Vista "Vehículos Asignados" → Botón "+" (debajo de la tabla)

**Solo visible cuando:** `ENABLE_SIMULATION=true`

**Funcionalidad:**
- Agrega 1 vehículo simulado por click
- Límite: cantidad de vehículos requeridos en la oferta
- Asigna turno de cargue automáticamente al vehículo agregado
- La **tabla se actualiza instantáneamente** sin necesidad de refresh manual (F5)

**Flujo técnico:**
```
Click botón "Simular Asignación"
   → POST /api/ofertas/{id}/simular-asignacion-progresiva
   → Backend crea vehículo simulado + asigna turno
   → Frontend recibe respuesta
   → setDatos() con nueva referencia
   → React detecta cambio y re-renderiza tabla
   → Usuario ve nuevo vehículo en la tabla (instantáneo)
```

**Persistencia:**
- Los datos simulados NO se eliminan entre recargas
- Quedan guardados en MongoDB para seguimiento de pruebas
- Permiten simular operación real completa

#### 6️⃣ Avance de Estados por Vehículo

**Ubicación:** Vista "Vehículos Asignados" → Columna "Avanzar Estado" → Botón verde (►)

**Flujo de estados:**
```
ASIGNADO → EN_CARGUE → EN_RUTA → EN_DESCARGUE → FINALIZADO
```

**Características:**
- ✅ Avance **individual por vehículo** (no grupal)
- ✅ No permite saltar estados ni retroceder
- ✅ Actualiza `fecha_cambio_estado` para cálculo de semáforo
- ✅ Botón deshabilitado cuando el vehículo llega a "FINALIZADO"
- ✅ Feedback visual durante el avance (loading state)
- ✅ **UI se actualiza automáticamente** sin refresh manual
- ✅ Registro completo en `activity_logs` para auditoría

**Semáforo de tiempo:**
- 🟢 **Verde:** Dentro del tiempo estimado para ese estado
- 🔴 **Rojo:** Fuera del tiempo estimado (posible retraso)
- Cálculo: `tiempo_transcurrido <= tiempo_estimado` (en minutos)
- Solo visible para estados: EN_CARGUE, EN_RUTA, EN_DESCARGUE

**Tiempos estimados por estado (configurables):**
- EN_CARGUE: 60 minutos (desde el campo `tiempo_estimado_cargue` de la oferta)
- EN_RUTA: 180 minutos (tiempo estimado de tránsito)
- EN_DESCARGUE: 45 minutos (tiempo estimado de descarga)

#### 7️⃣ Finalización del Servicio

**Opciones de finalización:**

1. **Finalización individual:** Cada vehículo llega a estado "FINALIZADO"
2. **Finalización de oferta completa:** Botón "Finalizar oferta" en tabla de ofertas
   - Cambia estado de la oferta a "FINALIZADA"
   - Libera vehículos (estado → "disponible")
   - Registra `tiempo_disponible_desde` para próximas asignaciones
   - Cierra el ciclo completo

---

### Diferencia entre Modo Producción y Modo Pruebas

#### 🔵 Modo Producción (`ENABLE_SIMULATION=false`)

**Características:**
- Asignación automática real basada en vehículos registrados en la base de datos
- Algoritmo de prioridad por costo (flota propia → vinculados → externos)
- Validaciones estrictas de proximidad y capacidad
- Notificaciones reales a conductores (futuro)
- Integración GPS real (futuro)

**Configuración:**
```env
# /backend/.env
ENABLE_SIMULATION=false
```

**Uso recomendado:**
- Ambiente de producción
- Operación real con vehículos físicos
- Datos de conductores y propietarios reales

#### 🟡 Modo Pruebas (`ENABLE_SIMULATION=true`)

**Características:**
- Asignación manual progresiva mediante botón "Simular Asignación"
- Vehículos simulados con datos ficticios completos
- GPS simulado (coordenadas aleatorias)
- Documentación simulada (licencia, SOAT, RTM vigentes)
- Conductores simulados con nombres y teléfonos ficticios
- Permite probar flujo completo sin necesidad de datos reales

**Configuración:**
```env
# /backend/.env
ENABLE_SIMULATION=true
```

**Uso recomendado:**
- Ambiente de desarrollo
- Pruebas funcionales y QA
- Demostraciones del sistema
- Training de usuarios

**Identificación visual:**
- Badge amarillo "SIMULADO" en la columna Placa
- Métricas separadas: "X reales + Y simulados"
- Notas azules en modales: "Datos simulados - Integración pendiente"

---

### Datos Simulados en Modo Pruebas

Cuando `ENABLE_SIMULATION=true`, el sistema genera automáticamente:

#### Vehículos Simulados
```python
{
  "vehiculo_id": "TERCERO_<uuid>",
  "placa": "SIM479",  # Generada aleatoriamente
  "marca": "SIMULADO",
  "linea": "MODELO-X",
  "tipo_propiedad": "tercero_externo",
  "configuracion": "<copiada de la oferta>",
  "tipo_vehiculo": "<copiado de la oferta>",
  "carroceria": "<copiada de la oferta>",
  "estado": "asignado",
  "turno_cargue": 1,  # Asignado automáticamente
  "hora_cargue": "2026-04-17T08:00:00Z"
}
```

#### Conductores Simulados
```python
{
  "nombre": "Conductor Simulado",
  "telefono": "+57 300 123 4567",
  "email": "conductor.sim479@example.com"
}
```

#### GPS Tracking Simulado
```javascript
{
  "latitud": 4.XXXXXX,   // Coordenadas aleatorias Colombia
  "longitud": -74.XXXXXX,
  "velocidad": "XX km/h",
  "ultima_actualizacion": "<timestamp actual>"
}
```

#### Documentación Simulada
- ✅ Licencia de Conducción (vigente hasta 2026-12-31)
- ✅ SOAT (vigente hasta 2026-06-30)
- ✅ Revisión Técnico-Mecánica (vigente hasta 2026-08-15)

**Nota:** Estos datos son **persistentes** y quedan guardados en MongoDB. Esto permite:
- Continuar pruebas entre sesiones
- Validar lógica de estados completa
- Simular operación real de principio a fin

---

### Comportamiento Importante de la UI

#### ✅ Actualización Automática Sin Refresh

**Problema resuelto:** Anteriormente, después de "Simular Asignación" o "Avanzar Estado", la tabla no se actualizaba y requería F5 manual.

**Solución implementada:**
- Forzado de nuevas referencias de estado en React mediante spread operator
- Contador `refreshKey` interno para garantizar re-render
- Clave única en el map (`vehiculo.vehiculo_id` en lugar de índice)

**Resultado:**
```
Usuario hace click → Backend actualiza DB → Frontend recarga datos
→ setDatos() con nueva referencia → React detecta cambio
→ Tabla se actualiza INSTANTÁNEAMENTE ✅
```

**Sin necesidad de:**
- ❌ Presionar F5
- ❌ Hacer click en "Volver" y regresar
- ❌ Cerrar y reabrir la vista

#### ✅ Asignación Progresiva (No Todo al Inicio)

**Comportamiento:**
- Una oferta puede iniciar con **0 vehículos asignados**
- Los vehículos se agregan progresivamente (en producción: por aceptación gradual)
- En pruebas: se agregan manualmente con botón "Simular Asignación"
- La asignación puede completarse al 20%, 40%, 60%, 80%, 100%
- El sistema permite operación parcial mientras se completa la asignación

**Ventajas:**
- Refleja operación real (vehículos no siempre están listos al mismo tiempo)
- Permite publicar oferta y comenzar operación sin esperar asignación 100%
- Facilita pruebas graduales del flujo completo

#### ✅ Persistencia Total de Datos

**Comportamiento:**
- Los datos de prueba NO se eliminan entre sesiones
- Vehículos simulados quedan guardados en MongoDB
- Estados de vehículos se mantienen entre recargas
- Permite seguimiento completo del flujo operativo

**Ventajas:**
- Continuidad en pruebas funcionales
- Trazabilidad completa en `activity_logs`
- Validación de lógica de estados a lo largo del tiempo

---

### Variables de Entorno Clave

#### Backend (`/backend/.env`)

```env
# Control de modo de simulación
ENABLE_SIMULATION=true          # true = Modo Pruebas | false = Modo Producción

# Conexión a base de datos
MONGO_URL=mongodb://localhost:27017
DB_NAME=ctcarga_db

# Autenticación
JWT_SECRET=<secreto_seguro>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_HOURS=12
REFRESH_TOKEN_EXPIRE_DAYS=7

# Admin semilla (creado automáticamente)
ADMIN_EMAIL=admin@ctcarga.com
ADMIN_PASSWORD=admin123
ADMIN_NAME=Administrador
```

#### Frontend (`/frontend/.env`)

```env
# URL del backend (Kubernetes Ingress en producción)
REACT_APP_BACKEND_URL=https://<dominio-produccion>
```

**Importante:** En desarrollo local, el frontend usa `localhost:3000` y el backend `localhost:8001`, pero en producción todo pasa por el ingress de Kubernetes con prefijo `/api` para el backend.

---

### Casos de Uso Comunes

#### Caso 1: Prueba de Flujo Completo (Modo Simulación)

1. Crear nueva oferta con 5 vehículos requeridos
2. Publicar oferta (estado → "EN PROCESO DE ASIGNACIÓN")
3. Ir a "Vehículos asignados" (inicialmente vacío)
4. Click en "Simular Asignación" 5 veces (agregar vehículos progresivamente)
5. Verificar que cada vehículo aparece con turno asignado
6. Avanzar estado del primer vehículo: ASIGNADO → EN_CARGUE
7. Verificar semáforo verde (dentro de tiempo estimado)
8. Continuar avanzando estados: EN_RUTA → EN_DESCARGUE → FINALIZADO
9. Repetir con otros vehículos
10. Finalizar oferta completa

**Validaciones:**
- ✅ UI se actualiza sin refresh en cada paso
- ✅ Semáforos funcionan correctamente
- ✅ Turnos se asignan secuencialmente
- ✅ Estados no permiten retrocesos ni saltos

#### Caso 2: Operación Real (Modo Producción)

1. Registrar vehículos reales en módulo "Flota"
2. Asignar conductores y propietarios
3. Configurar vehículos como "disponibles"
4. Crear oferta con requisitos específicos
5. Publicar oferta
6. Sistema asigna automáticamente vehículos compatibles
7. Conductores reciben notificación (futuro)
8. Conductores aceptan/rechazan oferta
9. Seguimiento GPS real durante el servicio
10. Finalización con confirmación de entrega

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


---

## Sistema de Asignación Automática de Vehículos

### Descripción
Sistema inteligente que asigna automáticamente vehículos a ofertas publicadas, siguiendo un orden de prioridad y reglas de negocio específicas.

### Flujo de Asignación

#### 1. Publicación de Oferta
Al hacer clic en "Publicar" en una oferta:
- El estado cambia a **"EN PROCESO DE ASIGNACIÓN"**
- Se inicia el proceso de asignación en segundo plano
- Se crea un registro en `asignaciones_vehiculos`

#### 2. Proceso por Etapas
El sistema ejecuta 3 etapas en orden de prioridad:

##### **ETAPA 1: Flota Propia**
- Busca vehículos con `tipo_propiedad = "flota_propia"`
- Filtra por requisitos de la oferta (configuración, tipo, carrocería, tipo de carga)
- Verifica proximidad al sitio de cargue (< 20km)
- Simula envío y espera de respuesta (5 minutos en producción)
- Asigna los que aceptan

##### **ETAPA 2: Flota de Terceros Vinculados**
- Si no se completó con flota propia
- Busca vehículos con `tipo_propiedad = "tercero_vinculado"`
- Aplica las mismas validaciones y proceso

##### **ETAPA 3: Terceros Externos**
- Si aún faltan vehículos
- Simula publicación a plataforma de terceros
- Asigna vehículos externos disponibles

#### 3. Ciclos de Reintento
- Si no se completa la asignación, el sistema ejecuta hasta 3 ciclos
- Cada ciclo repite las 3 etapas
- Se detiene al alcanzar el objetivo o completar 3 ciclos

### Reglas de Negocio

#### Validación de Requisitos
Un vehículo debe cumplir:
- ✅ Configuración coincide con la requerida
- ✅ Tipo de vehículo coincide
- ✅ Carrocería coincide
- ✅ Tipo de carga coincide
- ✅ Ubicado a menos de 20km del sitio de cargue
- ✅ **Estado "disponible"** (no asignado a otra oferta)

#### Prioridad por Tiempo de Espera
**Nuevo:** El sistema prioriza vehículos por su tiempo en estado disponible:
- ✅ Se ordenan por `tiempo_disponible_desde` (más antiguo primero)
- ✅ El tiempo **NO** cuenta desde el login del vehículo
- ✅ El tiempo **SOLO** cuenta cuando está en estado "disponible"
- ✅ Si estuvo en "en_ruta", "en_cargue" o "en_descargue", ese tiempo no cuenta
- ✅ Al volver a "disponible", se registra nuevo timestamp
- ✅ Cada nueva oferta reinicia la priorización

**Ejemplo:**
```
Vehículo A: Disponible hace 3 horas → Prioridad 1
Vehículo B: Disponible hace 1 hora  → Prioridad 2
Vehículo C: Logeado hace 5 horas pero en ruta hace 30 min, disponible hace 10 min → Prioridad 3
```

#### Regla de No Repetición
**Nuevo:** Si un vehículo rechaza o no responde:
- ✅ Se guarda en lista `vehiculos_contactados` de la oferta
- ✅ No se vuelve a contactar para esa misma oferta en ciclos posteriores
- ✅ Cada oferta nueva reinicia la lista (oferta diferente = nuevo intento)

#### Simulación de Respuesta
Cada vehículo:
- Tiene 70% de probabilidad de aceptar
- Puede rechazar por:
  - Vehículo no disponible
  - Conductor en descanso
  - Mantenimiento programado
  - Ya asignado a otra oferta
  - Sin respuesta (timeout)

### Simulación Dinámica

El sistema varía el porcentaje de completitud:
- **100% completado:** 50% de probabilidad
- **80% completado:** 30% de probabilidad
- **40% completado:** 20% de probabilidad

Esto genera resultados realistas y permite probar diferentes escenarios.

### Estados de Asignación

| Estado | Descripción |
|---|---|
| EN_PROCESO | Asignación en progreso |
| COMPLETADA | 100% de vehículos asignados |
| PARCIAL | 50% o más asignados |
| INSUFICIENTE | Menos del 50% asignados |
| ERROR | Error en el proceso |

### Estados de Vehículos

| Estado | Descripción | Siguiente Estado |
|---|---|---|
| **disponible** | Vehículo libre, puede recibir ofertas | asignado |
| **asignado** | Vehículo asignado a una oferta | en_ruta |
| **en_ruta** | En trayecto hacia cargue/descargue | en_cargue / en_descargue |
| **en_cargue** | Cargando mercancía | en_ruta |
| **en_descargue** | Descargando mercancía | disponible |
| **mantenimiento** | Fuera de servicio | disponible |

**Cambios Automáticos:**
- ✅ Al asignar vehículo → estado cambia a "asignado"
- ✅ Al finalizar oferta → vehículos vuelven a "disponible"
- ✅ Al cambiar a "disponible" → se registra `tiempo_disponible_desde`

### Sistema de Alertas

#### Alerta de Asignación Insuficiente
Se genera cuando:
- Faltan **5 horas o menos** para el cargue
- Se ha asignado **menos del 50%** de vehículos requeridos
- **Criticidad:** ALTA

```json
{
  "tipo": "ASIGNACION_INSUFICIENTE",
  "mensaje": "Solo se ha asignado el 45% de los vehículos y faltan 4.5 horas para el cargue",
  "timestamp": "2025-07-15T10:00:00Z",
  "criticidad": "ALTA"
}
```

### Modelo de Datos: asignaciones_vehiculos

```json
{
  "id": "uuid",
  "oferta_id": "uuid",
  "oferta_codigo": "2026-04-00001-0001",
  "tenant_id": "uuid",
  "estado_asignacion": "COMPLETADA",
  "vehiculos_requeridos": 1,
  "vehiculos_objetivo": 1,
  "vehiculos_asignados": [
    {
      "vehiculo_id": "uuid",
      "placa": "ABC123",
      "marca": "KENWORTH",
      "linea": "T800",
      "tipo_propiedad": "flota_propia",
      "estado": "ASIGNADO",
      "distancia_km": 12.5,
      "etapa": "FLOTA_PROPIA",
      "ciclo": 1,
      "timestamp": "2025-07-15T10:00:00Z"
    }
  ],
  "vehiculos_rechazados": [
    {
      "vehiculo_id": "uuid",
      "placa": "XYZ789",
      "tipo_propiedad": "tercero_vinculado",
      "estado": "RECHAZADO",
      "motivo": "Vehículo no disponible",
      "etapa": "TERCEROS_VINCULADOS",
      "ciclo": 1,
      "timestamp": "2025-07-15T10:05:00Z"
    }
  ],
  "etapa_actual": "FLOTA_PROPIA",
  "ciclo_actual": 1,
  "ciclos_ejecutados": 1,
  "alertas": [],
  "fecha_cargue": "2025-07-16T08:00:00",
  "fecha_inicio_asignacion": "2025-07-15T10:00:00Z",
  "fecha_ultima_actualizacion": "2025-07-15T10:10:00Z",
  "porcentaje_completado": 100
}
```

### Consulta de Estado de Asignación

Endpoint: `GET /api/ofertas/{id}/asignacion`

**Respuesta:**
```json
{
  "oferta_id": "uuid",
  "estado_asignacion": "COMPLETADA",
  "vehiculos_asignados": [ /* detalles */ ],
  "vehiculos_rechazados": [ /* detalles */ ],
  "porcentaje_completado": 100,
  "alertas": []
}
```

### Métricas de Asignación

El sistema registra:
- ✅ Cantidad de vehículos por tipo de propiedad
- ✅ Tasa de aceptación/rechazo
- ✅ Tiempo promedio de asignación
- ✅ Etapa en que se completó
- ✅ Ciclos necesarios
- ✅ Motivos de rechazo

### Próximas Funcionalidades

1. **Vista en tiempo real**: Dashboard para monitorear asignaciones activas
2. **Notificaciones push**: Alertas a conductores y administradores
3. **Geolocalización real**: Integración con GPS de vehículos
4. **App móvil**: Aceptación/rechazo desde dispositivos móviles
5. **Machine learning**: Predicción de tasa de aceptación
6. **Reasignación automática**: Si un vehículo cancela después de aceptar

---

## Sistema de Programación de Turnos de Cargue

### Descripción
Sistema automático que calcula y asigna turnos de cargue a los vehículos en función del orden de aceptación, la capacidad de los sitios de cargue y los tiempos estimados.

### Flujo de Programación

#### 1. Cálculo Previo de Turnos
Cuando una oferta es **publicada**, el sistema:
- ✅ Lee los parámetros de `info_cargue`:
  - `fechaInicio` / `horaInicio`: Hora de inicio del primer turno
  - `tiempoEstimado`: Tiempo de cargue por vehículo (en minutos)
  - `sitiosCargue`: Número de sitios/bahías de cargue disponibles
- ✅ Calcula el tiempo por turno: `tiempoEstimado + 10 minutos de holgura`
- ✅ Calcula el número de turnos necesarios: `⌈num_vehiculos ÷ sitios_cargue⌉`
- ✅ Genera los turnos con estructura:
  ```json
  {
    "numero_turno": 1,
    "hora_inicio": "2025-01-20T08:00:00",
    "hora_fin": "2025-01-20T09:10:00",
    "capacidad_total": 2,
    "capacidad_disponible": 2,
    "vehiculos_asignados": []
  }
  ```
- ✅ Guarda los turnos en `asignaciones_vehiculos.turnos_cargue`

#### 2. Asignación al Aceptar
Cuando un vehículo **acepta** la oferta:
- ✅ Se le asigna al **primer turno con capacidad disponible**
- ✅ El orden de asignación respeta el **orden de aceptación**
- ✅ Se decrementa la `capacidad_disponible` del turno
- ✅ Se registra en el vehículo:
  - `turno_cargue`: Número del turno asignado
  - `hora_cargue`: Hora de inicio del turno
- ✅ Se agrega a `turnos_cargue[n].vehiculos_asignados[]`

#### 3. Reglas de Asignación

**Orden estricto:**
- Los primeros `N` vehículos que aceptan → Turno 1
- Los siguientes `N` vehículos → Turno 2
- Y así sucesivamente

**Ejemplo práctico:**
```
Configuración:
- 5 vehículos totales
- 2 sitios de cargue
- 60 minutos por vehículo + 10 min holgura = 70 min/turno

Resultado:
  Turno 1 (08:00 - 09:10): Vehículos 1 y 2
  Turno 2 (09:10 - 10:20): Vehículos 3 y 4
  Turno 3 (10:20 - 11:30): Vehículo 5
```

### Beneficios

- ✅ **Organización automática**: No requiere intervención manual
- ✅ **Optimización de tiempos**: Maximiza uso de sitios de cargue
- ✅ **Transparencia**: Cada vehículo conoce su hora exacta
- ✅ **Flexibilidad**: Se adapta a cualquier configuración de sitios/tiempos
- ✅ **Equidad**: Respeta estrictamente el orden de aceptación

### Estructura de Datos

**En `asignaciones_vehiculos`:**
```json
{
  "oferta_id": "...",
  "turnos_cargue": [
    {
      "numero_turno": 1,
      "hora_inicio": "2025-01-20T08:00:00Z",
      "hora_fin": "2025-01-20T09:10:00Z",
      "capacidad_total": 2,
      "capacidad_disponible": 0,
      "vehiculos_asignados": [
        {"vehiculo_id": "v1", "placa": "ABC123", "timestamp_asignacion": "..."},
        {"vehiculo_id": "v2", "placa": "DEF456", "timestamp_asignacion": "..."}
      ]
    }
  ],
  "vehiculos_asignados": [
    {
      "vehiculo_id": "v1",
      "placa": "ABC123",
      "turno_cargue": 1,
      "hora_cargue": "2025-01-20T08:00:00Z"
    }
  ]
}
```

**En `vehiculos`:**
```json
{
  "id": "v1",
  "placa": "ABC123",
  "estado": "asignado",
  "oferta_asignada": "oferta_id",
  "turno_cargue": 1
}
```

### Próximas Funcionalidades

1. **UI de visualización**: Timeline visual de turnos
2. **Notificaciones**: Alertas 1 hora antes del turno
3. **Reasignación**: Cambio de turno si un vehículo cancela
4. **Check-in**: QR code para registro de llegada al sitio

---

## Vista de Vehículos Asignados

### Descripción
Interfaz visual que muestra en tiempo real el estado de todos los vehículos asignados a una oferta, incluyendo su turno de cargue, estado del proceso y datos de contacto.

### Acceso
Desde el módulo de **Ofertas**, en la columna de acciones, aparece el botón **"Vehículos asignados"** (icono de camión azul) para ofertas que han sido publicadas.

### Columnas de la Tabla

1. **Placa del vehículo**
   - Placa del vehículo
   - Marca y línea

2. **Nombre del conductor**
   - Nombre completo
   - Teléfono de contacto

3. **Tipo de vehículo** (con badge de color)
   - 🟢 **Flota propia**: Verde/Emerald
   - 🔵 **Tercero vinculado**: Azul/Blue
   - 🟠 **Tercero**: Naranja/Orange

4. **Estado del proceso** (con semáforo)
   - Asignado
   - En cargue
   - En ruta
   - En descargue
   - Finalizado
   - **Semáforo visual**:
     - 🟢 Verde: Dentro del tiempo estimado
     - 🔴 Rojo: Ha superado el tiempo estimado

5. **Turno de cargue asignado**
   - Número de turno
   - Hora programada de inicio

6. **Acciones**
   - 📄 **Ver documentación**: Licencia, SOAT, técnico-mecánica
   - 📍 **Ver tracking GPS**: Ubicación actual (simulado)
   - 📞 **Ver contacto**: Datos del conductor y propietario

### Lógica del Semáforo

El semáforo evalúa el tiempo transcurrido vs el tiempo estimado **según el estado actual**:

| Estado | Tiempo Estimado | Evaluación |
|--------|----------------|------------|
| En cargue | `info_cargue.tiempoEstimado` | Verde si tiempo ≤ estimado |
| En ruta | 180 minutos (simulado) | Verde si tiempo ≤ estimado |
| En descargue | 45 minutos (simulado) | Verde si tiempo ≤ estimado |

**Cálculo:**
- Tiempo transcurrido = `Ahora - fecha_cambio_estado`
- Si `tiempo_transcurrido > tiempo_estimado` → 🔴 Rojo
- Si `tiempo_transcurrido ≤ tiempo_estimado` → 🟢 Verde

### Datos Mostrados

**Información real (de la base de datos):**
- Placa, marca, línea
- Tipo de propiedad
- Estado actual
- Turno asignado y hora de cargue
- Timestamps de asignación y cambio de estado

**Información simulada (estructura lista para datos reales):**
- Nombre del conductor
- Teléfono y email del conductor
- Datos del propietario
- Documentación
- Tracking GPS
- Tiempos estimados de ruta y descargue

### Estructura de Datos

El endpoint `/api/ofertas/{id}/vehiculos-asignados` retorna:

```json
{
  "oferta_id": "...",
  "oferta_codigo": "...",
  "estado_asignacion": "COMPLETADA",
  "vehiculos": [
    {
      "vehiculo_id": "...",
      "placa": "ABC123",
      "tipo_propiedad": "flota_propia",
      "estado": "en_cargue",
      "conductor": {
        "nombre": "Juan Pérez",
        "telefono": "+57 300 123 4567",
        "email": "juan@empresa.com"
      },
      "turno": {
        "numero": 1,
        "hora_inicio": "2025-01-20T08:00:00",
        "hora_fin": "2025-01-20T09:10:00"
      },
      "timestamps": {
        "fecha_cambio_estado": "2025-01-20T08:05:00"
      },
      "tiempos_estimados": {
        "cargue": 60,
        "ruta": 180,
        "descargue": 45
      }
    }
  ]
}
```

### Modales de Información

#### 1. Modal de Documentación
Muestra documentos del vehículo:
- Licencia de conducción
- SOAT
- Revisión técnico-mecánica
- Estado de vigencia (simulado)

#### 2. Modal de Tracking GPS
Muestra ubicación del vehículo:
- Coordenadas GPS (simulado)
- Estado actual
- Última actualización
- Nota: Mapa interactivo próximamente

#### 3. Modal de Contacto
Muestra datos de contacto:
- **Conductor**: Nombre, teléfono, email
- **Propietario**: Nombre/Empresa, teléfono, email

### Próximas Mejoras

1. **GPS en tiempo real**: Integración con dispositivos GPS
2. **Documentos reales**: Upload y gestión de documentos
3. **Actualización automática**: WebSockets para refrescar estado sin recargar
4. **Notificaciones**: Alertas cuando un vehículo se retrasa
5. **Timeline visual**: Vista de línea de tiempo de turnos
6. **Exportar a PDF**: Generar reporte de vehículos asignados

---

## Sistema de Avance de Estados (Pruebas Funcionales)

### Descripción
Sistema que permite simular el progreso operativo de cada vehículo individualmente a través de los estados del proceso, facilitando pruebas funcionales completas sin necesidad de integración con sistemas reales.

### Flujo de Estados

**Secuencia obligatoria (no se puede saltar ni retroceder):**
```
asignado → en_cargue → en_ruta → en_descargue → finalizado
```

### Controles de Acceso

#### 1. Botón "Asignar Vehículos"
- **Visible solo cuando:** Estado de oferta = "SIN ASIGNAR" o "Sin Asignar"
- **Oculto cuando:** Oferta ya publicada o en cualquier otro estado
- **Función:** Evita asignaciones duplicadas y mantiene integridad del flujo

#### 2. Botón "Avanzar Estado" (por vehículo)
- **Ubicación:** Columna adicional en tabla de Vehículos Asignados
- **Icono:** Flecha derecha (ChevronRight)
- **Color:** Verde (#dcfce7 / #166534)
- **Habilitado:** Solo si estado ≠ "finalizado"
- **Función:** Avanza UN vehículo específico al siguiente estado

### Características Técnicas

#### Backend: `POST /api/vehiculos/{vehiculo_id}/avanzar-estado`

**Parámetros:**
```json
{
  "oferta_id": "uuid-de-la-oferta"
}
```

**Validaciones:**
- ✅ No permite saltar estados (valida índice en flujo)
- ✅ No permite retroceder (solo avance secuencial)
- ✅ Valida que vehículo no esté en estado "finalizado"
- ✅ Actualiza `fecha_cambio_estado` para cálculo de semáforo

**Actualización dual:**
1. Colección `vehiculos` (si es vehículo registrado)
2. Array `asignaciones_vehiculos.vehiculos_asignados`

**Registro de actividad:**
- Módulo: VEHICULOS
- Acción: CAMBIO_ESTADO
- Detalles: estado_anterior, estado_nuevo, oferta_id

#### Frontend: Interfaz de Avance

**Nueva columna en tabla:**
- Botón individual por cada vehículo
- Feedback visual durante proceso (loading state)
- Recarga automática de datos después de avanzar
- Mensajes de éxito/error

**Estado de UI:**
```javascript
const [avanzandoEstado, setAvanzandoEstado] = useState(null);
// Mantiene ID del vehículo en proceso para deshabilitar botón
```

### Estados y Sincronización con Oferta

**🔴 REGLA CRÍTICA:** El estado de la oferta se actualiza **automáticamente** basándose en el progreso de TODOS los vehículos asignados.

**Lógica de actualización:**
- La oferta avanza al siguiente estado cuando **TODOS** los vehículos han alcanzado o superado ese estado
- No es necesario que todos estén en el mismo estado simultáneamente
- Se evalúa el progreso acumulado, no el estado puntual

**Ejemplo 1: Estados mixtos**
```
Vehículos:
- V1: finalizado
- V2: en_descargue
- V3: en_ruta
- V4: en_cargue

Estado de oferta: ASIGNADA
¿Por qué? Porque V4 aún está en "en_cargue", lo que significa que 
NO TODOS han pasado por ese estado completamente.
```

**Ejemplo 2: Todos avanzados**
```
Vehículos:
- V1: finalizado
- V2: en_descargue
- V3: en_ruta
- V4: en_ruta

Estado de oferta: EN PROCESO DE CARGUE
¿Por qué? Ahora TODOS han salido de "en_cargue" (están en cargue o más avanzados).
```

**Ejemplo 3: Finalización completa**
```
Vehículos:
- V1: finalizado
- V2: finalizado
- V3: finalizado
- V4: finalizado

Estado de oferta: FINALIZADA ✅
Todos completaron el flujo operativo.
```

**Flujo de estados de oferta:**
```
SIN ASIGNAR 
    ↓ (publicar)
EN PROCESO DE ASIGNACIÓN 
    ↓ (completar asignación)
ASIGNADA 
    ↓ (todos salieron de "asignado")
EN PROCESO DE CARGUE 
    ↓ (todos salieron de "en_cargue")
EN CURSO 
    ↓ (todos salieron de "en_ruta")
EN PROCESO DE DESCARGUE 
    ↓ (todos salieron de "en_descargue")
FINALIZADA
```

**Actualización automática:**
- ✅ Se ejecuta cada vez que un vehículo cambia de estado
- ✅ El nuevo estado se persiste en la colección `ofertas`
- ✅ Se registra en `activity_logs` para auditoría
- ✅ La UI refleja el cambio inmediatamente sin refresh manual

### Avance Individual vs Grupal

**❌ No implementado:** Avance de todos los vehículos simultáneamente

**✅ Implementado:** Avance individual por vehículo

**Razón:** Permite simular escenarios realistas donde cada vehículo progresa a su propio ritmo:
- Vehículo 1 puede estar "en_ruta"
- Vehículo 2 puede estar "en_cargue"
- Vehículo 3 puede estar "finalizado"
- **La oferta reflejará el estado mínimo común alcanzado por todos**

### Persistencia de Datos

**Garantías:**
- ✅ No se eliminan ofertas
- ✅ No se eliminan vehículos
- ✅ No se reinician datos automáticamente
- ✅ Solo se actualizan estados y timestamps
- ✅ Historial completo en `activity_logs`

### Ejemplo de Flujo de Prueba

```
1. Crear Oferta
   └─ Estado: SIN ASIGNAR
   └─ Botón "Asignar vehículos" VISIBLE ✅

2. Publicar Oferta
   └─ Click en "Asignar vehículos"
   └─ Asignación automática + cálculo de turnos
   └─ Vehículos: "asignado"
   └─ Botón "Asignar vehículos" OCULTO ✅
   └─ Botón "Vehículos asignados" VISIBLE ✅

3. Ver Vehículos Asignados
   └─ Tabla con todos los vehículos en estado "asignado"
   └─ Columna "Avanzar Estado" con botón verde por vehículo

4. Simular Progreso (Vehículo 1)
   └─ Click en "Avanzar Estado"
   └─ asignado → en_cargue ✅
   └─ Semáforo inicia cálculo de tiempo
   
   └─ Click en "Avanzar Estado"
   └─ en_cargue → en_ruta ✅
   
   └─ Click en "Avanzar Estado"
   └─ en_ruta → en_descargue ✅
   
   └─ Click en "Avanzar Estado"
   └─ en_descargue → finalizado ✅
   └─ Botón se deshabilita (muestra "Finalizado")

5. Simular Progreso (Vehículo 2)
   └─ Progreso independiente de Vehículo 1
   └─ Puede estar en cualquier estado diferente
```

### Integración con Semáforo

El sistema de semáforo utiliza `fecha_cambio_estado` actualizada por este sistema:

**Cálculo:**
```javascript
tiempo_transcurrido = Ahora - fecha_cambio_estado
tiempo_estimado = tiempos_estimados[estado_actual]

if (tiempo_transcurrido <= tiempo_estimado) {
  semaforo = VERDE (dentro del tiempo)
} else {
  semaforo = ROJO (fuera del tiempo)
}
```

### Validación de Errores

**Intentar avanzar estado finalizado:**
```json
{
  "detail": "El vehículo ya finalizó el proceso"
}
```

**Estado inválido:**
```json
{
  "detail": "Estado actual no válido o no se puede avanzar más"
}
```

### Beneficios para QA/Testing

1. ✅ **Pruebas de flujo completo** sin esperar procesos reales
2. ✅ **Validación de semáforo** con diferentes tiempos
3. ✅ **Pruebas de estados mixtos** (varios vehículos en diferentes estados)
4. ✅ **Validación de UI** responsive a cambios de estado
5. ✅ **Auditoría completa** de todos los cambios
6. ✅ **Reproducibilidad** de escenarios específicos

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
| POST | `/api/ofertas/{id}/publicar` | ADMIN, OPERADOR | Publicar oferta e iniciar asignación | ✅ CAMBIO_ESTADO |
| POST | `/api/ofertas/{id}/finalizar` | ADMIN, OPERADOR | Finalizar oferta y liberar vehículos | ✅ CAMBIO_ESTADO |
| GET | `/api/ofertas/{id}/asignacion` | Todos | Obtener estado de asignación de vehículos | No |
| GET | `/api/ofertas/{id}/vehiculos-asignados` | Todos | Obtener lista detallada de vehículos asignados con turnos | No |
| POST | `/api/vehiculos/{vehiculo_id}/avanzar-estado` | ADMIN, OPERADOR | Avanzar estado de vehículo al siguiente en el flujo | ✅ CAMBIO_ESTADO |
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
| POST | `/api/vehiculos/{id}/cambiar-estado` | ADMIN, OPERADOR | Cambiar estado del vehículo | ✅ CAMBIO_ESTADO |
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
  "estado": "disponible | asignado | en_ruta | en_cargue | en_descargue | mantenimiento",
  "tiempo_disponible_desde": "ISO 8601",
  "fecha_cambio_estado": "ISO 8601",
  "oferta_asignada": "uuid | null",
  "fecha_asignacion": "ISO 8601 | null",
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

### `asignaciones_vehiculos`
```json
{
  "id": "uuid", "oferta_id": "uuid", "oferta_codigo": "2026-04-00001-0001",
  "tenant_id": "uuid",
  "estado_asignacion": "EN_PROCESO | COMPLETADA | PARCIAL | INSUFICIENTE | ERROR",
  "vehiculos_requeridos": 1, "vehiculos_objetivo": 1,
  "vehiculos_asignados": [
    {
      "vehiculo_id": "uuid", "placa": "ABC123",
      "marca": "KENWORTH", "linea": "T800",
      "tipo_propiedad": "flota_propia | tercero_vinculado | tercero_externo",
      "estado": "ASIGNADO", "distancia_km": 12.5,
      "tiempo_espera_horas": 3.5,
      "etapa": "FLOTA_PROPIA | TERCEROS_VINCULADOS | TERCEROS",
      "ciclo": 1, "timestamp": "ISO 8601"
    }
  ],
  "vehiculos_rechazados": [
    {
      "vehiculo_id": "uuid", "placa": "XYZ789",
      "tipo_propiedad": "tercero_vinculado",
      "estado": "RECHAZADO", "motivo": "Vehículo no disponible",
      "etapa": "TERCEROS_VINCULADOS", "ciclo": 1, "timestamp": "ISO 8601"
    }
  ],
  "vehiculos_contactados": ["uuid1", "uuid2", "uuid3"],
  "etapa_actual": "string", "ciclo_actual": 1, "ciclos_ejecutados": 1,
  "alertas": [], "fecha_cargue": "ISO 8601",
  "fecha_inicio_asignacion": "ISO 8601", "fecha_ultima_actualizacion": "ISO 8601",
  "porcentaje_completado": 100.0
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
12. **Asignación de vehículos**: Orden de prioridad: Flota propia → Terceros vinculados → Terceros.
13. **Radio de asignación**: Solo vehículos a menos de 20km del sitio de cargue.
14. **Tiempo de respuesta**: Vehículos tienen 5 minutos para aceptar/rechazar (simulado).
15. **Alerta de asignación**: Si faltando 5 horas no se asignó 50%, se genera alerta crítica.
16. **Prioridad por tiempo de espera**: Vehículos ordenados por `tiempo_disponible_desde` (más antiguo primero).
17. **No repetición**: Vehículo que rechaza una oferta no recibe la misma oferta en ciclos posteriores.
18. **Reinicio por nueva oferta**: Cada oferta nueva reinicia la prioridad y lista de contactados.
19. **Estados de vehículos**: 6 estados (disponible, asignado, en_ruta, en_cargue, en_descargue, mantenimiento).
20. **Cambio automático**: Al finalizar oferta, vehículos vuelven a estado "disponible" automáticamente.
21. **Tracking de tiempo**: Solo cuenta el tiempo en estado "disponible", no en otros estados.
22. **🔴 CRÍTICO - Actualización automática del estado de oferta**: El estado de la oferta se actualiza automáticamente basándose en el progreso de TODOS los vehículos asignados.
    - **Regla**: La oferta avanza al siguiente estado cuando TODOS los vehículos han alcanzado o superado ese estado.
    - **No requiere que todos estén en el mismo estado simultáneamente**, solo que todos hayan pasado por ese nivel.
    - **Flujo de estados de oferta**: SIN ASIGNAR → EN PROCESO DE ASIGNACIÓN → ASIGNADA → EN PROCESO DE CARGUE → EN CURSO → EN PROCESO DE DESCARGUE → FINALIZADA
    - **Ejemplo**: Si hay 5 vehículos donde V1 está en "finalizado", V2 en "en_descargue", V3 en "en_ruta", V4 en "en_ruta", V5 en "en_cargue" → Estado oferta = "ASIGNADA" (porque V5 aún no ha salido de "en_cargue")
    - **Ejemplo 2**: Si todos los vehículos están en "en_ruta" o más avanzados → Estado oferta = "EN CURSO"
    - **Actualización**: Se ejecuta automáticamente cada vez que un vehículo cambia de estado mediante el endpoint `POST /api/vehiculos/{id}/avanzar-estado`
    - **Persistencia**: El nuevo estado se guarda en la colección `ofertas` y se registra en `activity_logs`
23. **Límite de asignación**: No se pueden asignar más vehículos de los requeridos. El sistema bloquea asignaciones cuando `vehiculos_asignados >= vehiculos_requeridos`
24. **Estado "ASIGNADA"**: La oferta cambia automáticamente de "EN PROCESO DE ASIGNACIÓN" a "ASIGNADA" cuando se completa la cantidad de vehículos requeridos.

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

### Integraciones Reales Pendientes

1. **GPS Tracking Real**
   - Reemplazar GPS simulado con integración de proveedor (ej: Wialon, Traccar)
   - Actualización de posición en tiempo real
   - Mapa interactivo con ruta completa
   - Alertas de geofencing

2. **Documentación Digital Real**
   - Integración con repositorio de documentos (AWS S3, Google Drive)
   - Carga y validación de documentos físicos
   - Verificación de vigencia automática
   - Alertas de vencimiento

3. **Notificaciones Push**
   - Notificaciones a conductores (ofertas disponibles)
   - SMS/WhatsApp para confirmaciones
   - Email para resúmenes diarios
   - Integración con Twilio/SendGrid

4. **Gestión de Conductores**
   - Registro completo de conductores independientes
   - Asignación de conductor a vehículo
   - Validación de licencia y documentación
   - Historial de servicios

### Mejoras Operativas

5. **App Móvil para Conductores**
   - Visualización de ofertas asignadas
   - Confirmación de aceptación/rechazo
   - Actualización manual de estado
   - Navegación GPS integrada

6. **Dashboard de Analytics**
   - Gráficas de rendimiento por vehículo
   - Tiempos promedio por etapa (cargue, ruta, descargue)
   - Identificación de cuellos de botella
   - KPIs operativos

7. **Facturación Automática**
   - Cálculo de tarifas según tipo_propiedad
   - Generación de facturas PDF
   - Integración contable
   - Historial de pagos

8. **Optimización de Rutas**
   - Algoritmo de asignación por distancia real (no simulada)
   - Consideración de tráfico en tiempo real
   - Sugerencia de rutas óptimas
   - Cálculo de costos de combustible

### Seguridad y Auditoría

9. **Vista de Activity Logs en UI**
   - Panel de administración para consultar logs
   - Filtros avanzados por usuario, módulo, fecha
   - Exportación a CSV/Excel
   - Alertas de seguridad para acciones críticas

10. **Política de Retención de Datos**
    - Limpieza automática de logs antiguos (> 1 año)
    - Archivado de ofertas finalizadas
    - GDPR compliance para datos personales

### Reportes y Cumplimiento

11. **Reportes Regulatorios**
    - Reportes para Ministerio de Transporte
    - Cumplimiento normativo (Ley 1702, Decreto 1079)
    - Auditorías de seguridad vial
    - Certificaciones BASC/ISO

12. **Métricas de Sostenibilidad**
    - Cálculo de huella de carbono por servicio
    - Reportes de emisiones CO2
    - Optimización de rutas para reducción de combustible

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

#### **Sistema de Asignación Automática de Vehículos:**
- ✅ Lógica completa de asignación por etapas (Flota propia → Vinculados → Terceros)
- ✅ Validación de requisitos de vehículo (configuración, tipo, carrocería, carga)
- ✅ Simulación de proximidad (< 20km)
- ✅ Simulación de respuesta de vehículos (aceptación/rechazo)
- ✅ Sistema de reintentos (hasta 3 ciclos)
- ✅ Simulación dinámica (40%, 80%, 100% completitud)
- ✅ Sistema de alertas (5 horas antes, < 50% asignado)
- ✅ Colección `asignaciones_vehiculos` con tracking completo
- ✅ Endpoint POST `/api/ofertas/{id}/publicar`
- ✅ Endpoint POST `/api/ofertas/{id}/finalizar`
- ✅ Endpoint GET `/api/ofertas/{id}/asignacion`
- ✅ Endpoint POST `/api/vehiculos/{id}/cambiar-estado`
- ✅ Cambio de estado automático a "EN PROCESO DE ASIGNACIÓN"
- ✅ Logging de publicación y finalización de ofertas
- ✅ Proceso asíncrono en segundo plano
- ✅ **Prioridad por tiempo de espera en estado disponible**
- ✅ **Ordenamiento por `tiempo_disponible_desde` (más antiguo primero)**
- ✅ **Regla de no repetición: vehículos contactados no se reenvían**
- ✅ **Tracking de vehículos contactados por oferta (`vehiculos_contactados`)**
- ✅ **Estados de vehículos: disponible, asignado, en_ruta, en_cargue, en_descargue, mantenimiento**
- ✅ **Cambio automático a "disponible" al finalizar oferta**
- ✅ **Cambio automático a "asignado" al aceptar oferta**
- ✅ **Registro de `tiempo_disponible_desde` al cambiar a disponible**
- ✅ **Vehículos nuevos se crean con estado "disponible" por defecto**

#### **Sistema de Programación de Turnos de Cargue:**
- ✅ Cálculo automático de turnos al publicar oferta
- ✅ Algoritmo basado en: hora inicio + tiempo estimado + holgura 10 mins
- ✅ Capacidad por turno según sitios de cargue disponibles
- ✅ Asignación automática de turno al aceptar oferta
- ✅ Orden estricto: respeta orden de aceptación de vehículos
- ✅ Estructura completa de turnos guardada en `asignaciones_vehiculos.turnos_cargue`
- ✅ Cada vehículo asignado tiene: `turno_cargue` y `hora_cargue`
- ✅ Actualización dinámica de capacidad disponible por turno
- ✅ Funciones: `calcular_turnos_cargue()` y `asignar_vehiculo_a_turno()`
- ✅ Soporte para múltiples vehículos y configuraciones flexibles

#### **Vista de Vehículos Asignados:**
- ✅ Nuevo endpoint `GET /api/ofertas/{id}/vehiculos-asignados`
- ✅ Botón "Vehículos asignados" en tabla de ofertas (solo para ofertas publicadas)
- ✅ Componente `VehiculosAsignados.jsx` con tabla completa
- ✅ Columnas: Placa, Conductor, Tipo, Estado del proceso, Turno de cargue, Acciones, Avanzar Estado
- ✅ Identificación visual por tipo de vehículo con badges de colores
- ✅ Semáforo de estado por proceso (verde/rojo según tiempo estimado)
- ✅ Lógica de semáforo independiente por estado (en_cargue/en_ruta/en_descargue)
- ✅ 3 modales de acciones: Documentación, GPS tracking, Contacto
- ✅ Integración completa con datos reales de turnos y asignaciones
- ✅ Estructura preparada para datos reales de conductores y GPS
- ✅ Ruta protegida: `/ofertas/:id/vehiculos-asignados`
- ✅ Diseño consistente con el resto del sistema (usando clases compartidas)

#### **Sistema de Avance de Estados (Pruebas Funcionales):**
- ✅ Nuevo endpoint `POST /api/vehiculos/{vehiculo_id}/avanzar-estado`
- ✅ Flujo de estados: asignado → en_cargue → en_ruta → en_descargue → finalizado
- ✅ Avance individual por vehículo (no grupal)
- ✅ Validaciones: no saltar estados, no retroceder
- ✅ Actualización de `fecha_cambio_estado` para semáforo
- ✅ Botón "Asignar vehículos" solo visible para ofertas SIN ASIGNAR
- ✅ Columna "Avanzar Estado" con botón verde por vehículo
- ✅ Botón deshabilitado para vehículos en estado "finalizado"
- ✅ Feedback visual durante avance (loading state)
- ✅ Recarga automática de datos después de cambio
- ✅ Registro completo en activity_logs
- ✅ Persistencia total de datos (no se eliminan)
- ✅ **Estado de oferta se actualiza automáticamente** cuando TODOS los vehículos avanzan
- ✅ Permite simular flujo operativo completo para pruebas

#### **[BUG FIX CRÍTICO] Reactividad UI y Errores Backend (2026-04-17):**
- 🔧 **Fix React State Mutation**: Corregida reactividad en `VehiculosAsignados.jsx`
  - Problema: Tabla no se actualizaba después de `Simular Asignación` o `Avanzar Estado`
  - Solución: Forzar nuevas referencias de estado usando spread operator `{...data, vehiculos: [...data.vehiculos]}`
  - Agregado `refreshKey` como contador interno para forzar re-render
  - Cambiada `key` del map de `idx` (índice) a `vehiculo.vehiculo_id` (único y estable)
- 🔧 **Fix Backend TypeError**: Corregidas llamadas incorrectas a `registrar_actividad()`
  - Error: `TypeError: registrar_actividad() got an unexpected keyword argument 'db'`
  - Archivos afectados: `/api/vehiculos/{vehiculo_id}/avanzar-estado`, `/api/ofertas/{id}/simular-asignacion-progresiva`
  - Líneas corregidas: 1723, 1794, 1929 en `server.py`
  - Firma correcta respetada: `usuario` (dict), `accion`, `modulo`, `registro_id`, `detalles` (string), `ip_address`
- ✅ Flujo completo de pruebas funcionales ahora operativo sin errores
- ✅ UI responde instantáneamente sin requerir refresh manual del navegador

#### **Sistema de Simulación Progresiva:**
- ✅ Endpoint `POST /api/ofertas/{id}/simular-asignacion-progresiva`
- ✅ Parámetro `cantidad` (1-10 vehículos por llamada)
- ✅ Botón "Simular Asignación" (ícono +) ubicado debajo de la tabla
- ✅ Creación dinámica de vehículos simulados (marca SIMULADO)
- ✅ Badge visual "SIMULADO" con estilo destacado en amarillo
- ✅ Métricas separadas: vehículos reales vs simulados en resumen
- ✅ Asignación de turnos automática para vehículos simulados
- ✅ Variable de entorno `ENABLE_SIMULATION` para control en producción
- ✅ Integración total con flujo de avance de estados

---

## Soporte y Contacto

Para reportar problemas, solicitar funcionalidades o contribuir al proyecto:
- Revisa el archivo `/memory/PRD.md` para el roadmap completo
- Consulta `/memory/test_credentials.md` para credenciales de testing
- Todas las pruebas deben pasar antes de hacer merge

---

**Última actualización:** 2026-04-17  
**Versión:** 1.8.0  
**Estado:** ✅ Producción con Modo Pruebas
