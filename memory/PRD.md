# CTCARGA - Sistema de Gestión Logística

## Problema Original
Desarrollar un sistema completo de gestión logística y transporte (CTCARGA) con dashboards dinámicos, lista de Ofertas, y un wizard de 4 pasos para crear ofertas con reglas de validación, dropdowns geográficos dinámicos, configuración de vehículos en cascada, y cálculos de fletes.

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

#### Paso 1 - Información de Cargue
- Formulario de dirección con dropdowns geográficos (Departamento → Municipio)
- Autocompletado (3+ caracteres)
- Dirección construida automáticamente
- Direcciones favoritas (guardar/cargar)
- **Validación de campos obligatorios** (Tipo vía, Num. principal, Num. secundario, Letra/Bis, Departamento, Municipio)
- **Modal de confirmación** antes de avanzar

#### Paso 2 - Información de Descargue
- Multi-destino (agregar/eliminar destinos)
- Misma estructura que Paso 1 por cada destino
- **Validación por destino** con prefijo "Destino X:"
- **Modal de confirmación** mostrando todos los destinos

#### Paso 3 - Tipo de Vehículo Requerido
- Dropdowns en cascada: Configuración → Tipo vehículo → Carrocería → Tipo carga
- Auto-llenado de Ejes, PBV, Carga útil
- Tarjeta resumen de vehículo seleccionado
- **Validación de todos los campos obligatorios**

#### Paso 4 - Condiciones de la Oferta
- **Sección Remitente**: Nombre, Responsable, Identificación, Dirección (auto del Paso 1)
- Condiciones generales: Cantidad a movilizar, Unidad medida, Naturaleza carga, Empaque
- Serial ISO condicional (si se selecciona contenedor)
- **Sección por destino**:
  - Destinatario: Nombre, Identificación, Dirección (auto del Paso 2)
  - Distribución por destino (multi-destino): validación suma = cantidad total
  - **Fletes independientes por destino** con cálculos automáticos (Valor Neto, Saldo a Pagar)
- Información del Cargue: Fecha, hora, tiempo estimado, sitios, vehículos requeridos
- **Validación completa** de todos campos obligatorios (excepto Trayecto 1 y 2)
- Generación automática de código de oferta: `YYYY-MM-00001-XXXX`

## API Endpoints
- `GET /api/ofertas` - Listar ofertas
- `POST /api/ofertas` - Crear oferta
- `DELETE /api/ofertas/{id}` - Eliminar oferta
- `GET /api/direcciones-favoritas` - Listar favoritas
- `POST /api/direcciones-favoritas` - Guardar favorita
- `DELETE /api/direcciones-favoritas/{id}` - Eliminar favorita
- `GET /api/stats` - Estadísticas

## Archivos Clave
- `/app/frontend/src/pages/CreacionOfertas.js` - Wizard 4 pasos (~1200 líneas)
- `/app/frontend/src/pages/CreacionOfertas.css` - Estilos del wizard
- `/app/frontend/src/pages/Ofertas.js` - Lista de ofertas
- `/app/frontend/src/data/colombiaData.js` - Datos geográficos
- `/app/frontend/src/data/vehiculosData.js` - Configuración de vehículos
- `/app/backend/server.py` - API FastAPI

## Backlog Priorizado
- **P1**: Botón "Ver" en lista de Ofertas para mostrar detalles completos
- **P2**: Estados adicionales (Asignada, En Tránsito, Completada)
- **Refactoring**: Dividir `CreacionOfertas.js` en sub-componentes por paso
