# CTCARGA - Sistema de Gestión Logística y Transporte

Sistema integral para la administración de operaciones logísticas de carga terrestre en Colombia. Permite publicar ofertas de transporte, gestionar flota vehicular (vehículos y remolques), y controlar documentación regulatoria.

---

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 18, React Router, Lucide Icons, CSS Modules |
| Backend | FastAPI (Python), Motor (async MongoDB driver) |
| Base de datos | MongoDB |
| Autenticación | JWT (httpOnly cookies) + bcrypt |
| Archivos | Almacenamiento local en `/backend/uploads/` |

---

## Arquitectura Multitenant

El sistema implementa aislamiento por empresa (tenant):

- **Colección `empresas`**: Registro de cada empresa con id, nombre, estado, código.
- **Campo `tenant_id`**: Presente en `ofertas`, `vehiculos`, `remolques`, `direcciones_favoritas`, `usuarios`.
- **Filtrado obligatorio**: Todas las consultas (GET/POST/PUT/DELETE) filtran por `tenant_id` del usuario autenticado.
- **Aislamiento total**: Un tenant nunca puede acceder a datos de otro tenant.
- **Empresa semilla**: "Sueña" (código 00001), creada automáticamente en el primer arranque.

### Roles de Usuario

| Rol | Lectura | Escritura (ofertas, flota) | Gestión usuarios |
|---|---|---|---|
| ADMIN | Completa | Completa | Completa |
| OPERADOR | Completa | Completa | No |
| CONSULTA | Completa | No | No |
| TESORERIA | Completa | No (solo pagos futuros) | No |

Los permisos se validan en el backend; el frontend no decide el acceso.

---

## Estructura del Proyecto

```
/app
├── backend/
│   ├── server.py                 # API FastAPI — auth, multitenant, CRUD
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
│   │   │   ├── Ofertas.js        # Listado de ofertas
│   │   │   ├── CreacionOfertas.js # Wizard 4 pasos
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
Listado filtrado por tenant. Búsqueda, filtro por estado, eliminación.

### 4. Creación de Ofertas (`/creacion-ofertas`)
Wizard de 4 pasos con validaciones, modales de confirmación, multi-destino, fletes independientes por destino.

### 5. Flota (`/flota`)
Registro/edición de vehículos (13+ campos, documentos regulatorios, fechas auto-calculadas) y remolques. Vinculación vehículo-remolque (solo Tractocamiones).

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
| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| GET | `/api/ofertas` | Todos | Listar ofertas del tenant |
| GET | `/api/ofertas/{id}` | Todos | Detalle de oferta |
| POST | `/api/ofertas` | ADMIN, OPERADOR | Crear oferta |
| DELETE | `/api/ofertas/{id}` | ADMIN, OPERADOR | Eliminar oferta |

### Estadísticas
| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| GET | `/api/stats` | Todos | Conteos por estado (filtrado por tenant) |

### Direcciones Favoritas
| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| GET | `/api/direcciones-favoritas` | Todos | Listar favoritas del tenant |
| POST | `/api/direcciones-favoritas` | ADMIN, OPERADOR | Guardar favorita |
| DELETE | `/api/direcciones-favoritas/{id}` | ADMIN, OPERADOR | Eliminar favorita |

### Vehículos
| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| GET | `/api/vehiculos` | Todos | Listar vehículos del tenant |
| POST | `/api/vehiculos` | ADMIN, OPERADOR | Registrar vehículo |
| PUT | `/api/vehiculos/{id}` | ADMIN, OPERADOR | Actualizar vehículo |
| DELETE | `/api/vehiculos/{id}` | ADMIN, OPERADOR | Eliminar vehículo |
| POST | `/api/vehiculos/{id}/vincular-remolque` | ADMIN, OPERADOR | Vincular remolque |
| POST | `/api/vehiculos/{id}/desvincular-remolque` | ADMIN, OPERADOR | Desvincular |

### Remolques
| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| GET | `/api/remolques` | Todos | Listar remolques del tenant |
| POST | `/api/remolques` | ADMIN, OPERADOR | Registrar remolque |
| PUT | `/api/remolques/{id}` | ADMIN, OPERADOR | Actualizar remolque |
| DELETE | `/api/remolques/{id}` | ADMIN, OPERADOR | Eliminar remolque |

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
  "remitente": "", "destinatario": "", "cargue": {}, "descargues": [],
  "vehiculo": {}, "condiciones": {}, "fletes": {}, "info_cargue": {},
  "estado": "Sin Asignar",
  "created_at": "ISO 8601", "updated_at": "ISO 8601"
}
```

### `vehiculos`
```json
{
  "id": "uuid", "tenant_id": "uuid",
  "placa": "ABC123", "marca": "Kenworth", "clase_vehiculo": "Tractocamión",
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

---

## Reglas de Negocio

1. **Multitenant**: Todos los datos filtrados por `tenant_id`. Nunca se accede a datos de otro tenant.
2. **Roles**: Validados en backend. ADMIN/OPERADOR pueden escribir; CONSULTA/TESORERIA solo lectura.
3. **Código de oferta**: `YYYY-MM-CODIGO_EMPRESA-SEC` auto-incremental por mes y tenant.
4. **Vinculación remolque**: Solo `Tractocamión`. Un remolque ↔ un vehículo.
5. **Revisión técnico-mecánica**: Si matrícula < 2 años → vigencia 2 años desde matrícula.
6. **Placa única**: Por tenant (dos tenants pueden tener la misma placa).
7. **Distribución multi-destino**: Suma de cantidades = cantidad total a movilizar.

---

## Testing

```bash
# Backend
cd backend && python -m pytest tests/ -v

# Reportes
cat test_reports/iteration_3.json
```

Cobertura: **26 backend + 8 frontend tests** — 100% backend, 95% frontend (bug menor en mensaje de error de login).

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
