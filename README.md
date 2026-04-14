# CTCARGA - Sistema de Gestión Logística y Transporte

Sistema integral para la administración de operaciones logísticas de carga terrestre en Colombia. Permite publicar ofertas de transporte, gestionar flota vehicular (vehículos y remolques), y controlar documentación regulatoria.

---

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 18, React Router, Lucide Icons, CSS Modules |
| Backend | FastAPI (Python), Motor (async MongoDB driver) |
| Base de datos | MongoDB |
| Archivos | Almacenamiento local en `/backend/uploads/` |

---

## Estructura del Proyecto

```
/app
├── backend/
│   ├── server.py                 # API FastAPI — rutas, modelos, lógica de negocio
│   ├── uploads/                  # Documentos subidos (PDF, JPG, PNG)
│   ├── requirements.txt
│   ├── tests/
│   │   └── test_flota.py         # Tests pytest del módulo Flota
│   └── .env                      # MONGO_URL, DB_NAME
├── frontend/
│   ├── src/
│   │   ├── App.js                # Enrutamiento principal
│   │   ├── pages/
│   │   │   ├── LoginPage.js      # Autenticación
│   │   │   ├── Dashboard.js      # Panel principal con estadísticas
│   │   │   ├── Ofertas.js        # Listado de ofertas publicadas
│   │   │   ├── Ofertas.css
│   │   │   ├── CreacionOfertas.js # Wizard 4 pasos para crear ofertas
│   │   │   ├── CreacionOfertas.css
│   │   │   ├── Flota.js          # Gestión de vehículos y remolques
│   │   │   └── Flota.css
│   │   └── data/
│   │       ├── colombiaData.js   # Departamentos → Municipios de Colombia
│   │       └── vehiculosData.js  # Configuraciones vehiculares en cascada
│   ├── package.json
│   └── .env                      # REACT_APP_BACKEND_URL
├── memory/
│   └── PRD.md                    # Documento de requisitos del producto
└── test_reports/                 # Reportes JSON de testing automatizado
```

---

## Módulos Funcionales

### 1. Login (`/`)
Página de inicio de sesión. Navega al Dashboard al autenticarse.

### 2. Dashboard (`/dashboard`)
Panel con métricas generales: total de ofertas, sin asignar, activas, completadas. Gráficas de tendencia mensual.

### 3. Ofertas (`/ofertas`)
Listado de ofertas publicadas con:
- Tarjetas personalizadas por oferta
- Búsqueda por texto (remitente, dirección, código)
- Filtro por estado
- Eliminación de ofertas

### 4. Creación de Ofertas (`/creacion-ofertas`)
Wizard de 4 pasos con validación progresiva:

| Paso | Contenido | Validación |
|---|---|---|
| 1 — Cargue | Dirección de origen, favoritas | Campos obligatorios + modal de confirmación |
| 2 — Descargue | Multi-destino, favoritas | Validación por destino + modal de confirmación |
| 3 — Vehículo | Config. cascada (configuración → tipo → carrocería → carga) | Todos los campos obligatorios |
| 4 — Condiciones | Remitente, destinatario/destino, distribución, fletes/destino, info cargue | Todos obligatorios excepto Trayecto 1 y 2 |

**Código de oferta**: Generado automáticamente con formato `YYYY-MM-EMPRESA-SECUENCIAL` (ej: `2026-04-00001-0001`).

### 5. Flota (`/flota`)
Gestión de vehículos y remolques con pestañas:

#### Vehículos
Campos: placa, licencia de tránsito, marca (20 opciones), línea, modelo, clase (13 tipos), carrocería, combustible, motor, VIN, propietario, identificación, fecha de matrícula.

Secciones regulatorias con fechas auto-calculadas:

| Documento | Vigencia |
|---|---|
| Tarjeta de Operaciones | 1 año desde fecha de inicio |
| SOAT | 1 año desde fecha de inicio |
| Revisión Técnico-Mecánica | 1 año desde fecha de inicio **o** 2 años desde matrícula si el vehículo tiene < 2 años |

Carga de documentos: Licencia de tránsito, SOAT, Revisión, Tarjeta de operaciones (PDF/JPG/PNG).

#### Remolques / Semirremolques
Campos: placa, tipo (13 opciones), VIN, número de ejes, capacidad de carga útil.

#### Vinculación Vehículo-Remolque
- **Regla de negocio**: Solo vehículos con clase `Tractocamión` pueden vincular remolques.
- La vinculación es editable en cualquier momento.
- Un remolque solo puede estar vinculado a un vehículo a la vez.

---

## API REST

Base URL: `/api`

### Ofertas
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/ofertas` | Listar ofertas (query: `search`, `estado`) |
| GET | `/api/ofertas/{id}` | Detalle de oferta |
| POST | `/api/ofertas` | Crear oferta |
| DELETE | `/api/ofertas/{id}` | Eliminar oferta |

### Direcciones Favoritas
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/direcciones-favoritas` | Listar favoritas |
| POST | `/api/direcciones-favoritas` | Guardar favorita |
| DELETE | `/api/direcciones-favoritas/{id}` | Eliminar favorita |

### Estadísticas
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/stats` | Conteos por estado |

### Vehículos
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/vehiculos` | Listar vehículos (query: `search`) |
| GET | `/api/vehiculos/{id}` | Detalle de vehículo |
| POST | `/api/vehiculos` | Registrar vehículo |
| PUT | `/api/vehiculos/{id}` | Actualizar vehículo |
| DELETE | `/api/vehiculos/{id}` | Eliminar vehículo |
| POST | `/api/vehiculos/{id}/vincular-remolque` | Vincular remolque (body: `{remolque_id}`) |
| POST | `/api/vehiculos/{id}/desvincular-remolque` | Desvincular remolque |

### Remolques
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/remolques` | Listar remolques (query: `search`) |
| POST | `/api/remolques` | Registrar remolque |
| PUT | `/api/remolques/{id}` | Actualizar remolque |
| DELETE | `/api/remolques/{id}` | Eliminar remolque |

### Archivos
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/upload` | Subir archivo (multipart, formatos: PDF/JPG/PNG/GIF/WEBP) |
| GET | `/api/uploads/{filename}` | Descargar archivo |

---

## Modelos de Datos (MongoDB)

### `ofertas`
```json
{
  "id": "uuid",
  "codigo_oferta": "2026-04-00001-0001",
  "remitente": "string",
  "destinatario": "string",
  "nombre_responsable": "string",
  "identificacion": "string",
  "cargue": { "tipoVia": "", "numeroPrincipal": "", "departamento": "", "municipio": "", "direccionConstruida": "", ... },
  "descargues": [
    {
      "tipoVia": "", "departamento": "", "municipio": "", "direccionConstruida": "",
      "destinatario_nombre": "", "destinatario_identificacion": "",
      "distribucion": "10",
      "fletes": { "valorTotal": "", "retencionFuente": "", "retencionICA": "", "valorAnticipo": "", ... }
    }
  ],
  "vehiculo": { "configuracion": "", "tipo_vehiculo": "", "carroceria": "", "tipo_carga": "", "ejes": "", ... },
  "condiciones": { "cantidadMovilizar": "", "unidadMedida": "", "naturalezaCarga": "", "empaqueProducto": "" },
  "fletes": { },
  "info_cargue": { "fechaInicio": "", "horaInicio": "", "tiempoEstimadoValor": "", "numSitiosCargue": "", "numVehiculosRequeridos": "" },
  "estado": "Sin Asignar",
  "created_at": "ISO 8601",
  "updated_at": "ISO 8601"
}
```

### `vehiculos`
```json
{
  "id": "uuid",
  "placa": "ABC123",
  "licencia_transito_no": "",
  "marca": "Kenworth",
  "linea": "T800",
  "modelo": "2023",
  "clase_vehiculo": "Tractocamión",
  "tipo_carroceria": "",
  "combustible": "Diésel",
  "numero_motor": "",
  "vin": "",
  "propietario": "",
  "identificacion_propietario": "",
  "fecha_matricula": "2023-06-15",
  "tarjeta_operaciones": { "numero": "", "fecha_inicio": "", "fecha_fin": "" },
  "soat": { "numero_poliza": "", "aseguradora": "", "fecha_inicio": "", "fecha_fin": "" },
  "revision_tecnicomecanica": { "numero": "", "cda": "", "fecha_inicio": "", "fecha_fin": "" },
  "documentos": { "licencia_transito": "/api/uploads/xxx.pdf", "soat": null, ... },
  "remolque_vinculado": "uuid | null",
  "created_at": "ISO 8601",
  "updated_at": "ISO 8601"
}
```

### `remolques`
```json
{
  "id": "uuid",
  "placa": "R12345",
  "tipo_remolque": "Plana",
  "vin": "",
  "numero_ejes": 3,
  "capacidad_carga_util": 35,
  "vehiculo_vinculado": "uuid | null",
  "created_at": "ISO 8601",
  "updated_at": "ISO 8601"
}
```

### `direcciones_favoritas`
```json
{
  "id": "uuid",
  "nombre_favorito": "Bodega Principal",
  "direccion": { "tipoVia": "", "numeroPrincipal": "", "departamento": "", "municipio": "", ... },
  "created_at": "ISO 8601"
}
```

---

## Reglas de Negocio

1. **Código de oferta**: Formato `YYYY-MM-EMPRESA-SEC`, secuencial auto-incremental por mes.
2. **Vinculación remolque**: Solo clase de vehículo `Tractocamión`. Un remolque ↔ un vehículo.
3. **Revisión técnico-mecánica**: Si matrícula < 2 años → vigencia = 2 años desde matrícula. Si no → 1 año desde fecha inicio.
4. **Placa única**: No se permiten placas duplicadas en vehículos ni en remolques.
5. **Distribución multi-destino**: La suma de cantidades asignadas debe igualar la cantidad total a movilizar.
6. **Fletes por destino**: Cada destino tiene su propia sección de fletes con cálculos independientes de Valor Neto y Saldo a Pagar.

---

## Ejecución Local

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001

# Frontend
cd frontend
yarn install
yarn start
```

Variables de entorno requeridas:
- `backend/.env`: `MONGO_URL`, `DB_NAME`
- `frontend/.env`: `REACT_APP_BACKEND_URL`

---

## Testing

```bash
# Backend (pytest)
cd backend && python -m pytest tests/ -v

# Reportes automatizados
cat test_reports/iteration_2.json
```

Cobertura actual: **34 tests (20 frontend + 14 backend) — 100% pass rate**.
