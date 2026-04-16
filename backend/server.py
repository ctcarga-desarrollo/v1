from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Query, UploadFile, File, Request
from fastapi.responses import FileResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import bcrypt
import jwt as pyjwt
import os
import logging
from typing import Optional
import uuid
from datetime import datetime, timezone, timedelta
import random
import asyncio

# ==================== CONFIG ====================

UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# ==================== PASSWORD HASHING ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

# ==================== JWT ====================

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(hours=12), "type": "access"}
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

# ==================== AUTH DEPENDENCY ====================

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="No autenticado")
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Token inválido")
        user = await db.usuarios.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="Usuario no encontrado")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

# ==================== ROLE CHECK ====================

ROLE_ALL = {"ADMIN", "OPERADOR", "CONSULTA", "TESORERIA"}
ROLE_WRITE = {"ADMIN", "OPERADOR"}
ROLE_ADMIN = {"ADMIN"}

def check_role(user: dict, allowed: set):
    if user.get("rol") not in allowed:
        raise HTTPException(status_code=403, detail="No tiene permisos para esta acción")

# ==================== ACTIVITY LOG ====================

async def registrar_actividad(
    usuario: dict,
    accion: str,  # 'CREAR', 'ACTUALIZAR', 'ELIMINAR', 'CAMBIO_ESTADO'
    modulo: str,  # 'ofertas', 'vehiculos', 'remolques', 'direcciones_favoritas'
    registro_id: str,
    detalles: str,
    ip_address: str,
    datos_anteriores: dict = None,
    datos_nuevos: dict = None
):
    """
    Registra una actividad en el log del sistema.
    """
    try:
        log_entry = {
            "usuario_id": usuario.get("_id"),
            "usuario_nombre": usuario.get("name", "Unknown"),
            "usuario_email": usuario.get("email", ""),
            "accion": accion,
            "modulo": modulo,
            "registro_id": registro_id,
            "detalles": detalles,
            "datos_anteriores": datos_anteriores,
            "datos_nuevos": datos_nuevos,
            "fecha_hora": datetime.now(timezone.utc),
            "ip_address": ip_address,
            "empresa_id": usuario.get("empresa_id", ""),
            "empresa_nombre": usuario.get("empresa_nombre", ""),
            "tenant_id": usuario.get("tenant_id", "")
        }
        await db.activity_logs.insert_one(log_entry)
        logger.info(f"Log registrado: {accion} en {modulo} por {usuario.get('name')}")
    except Exception as e:
        logger.error(f"Error al registrar actividad: {str(e)}")

def get_client_ip(request: Request) -> str:
    """
    Obtiene la dirección IP del cliente desde la request.
    """
    # Intenta obtener la IP real desde headers de proxy
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    # Fallback a la IP directa del cliente
    if request.client:
        return request.client.host
    
    return "unknown"


# ==================== ASIGNACIÓN DE VEHÍCULOS ====================

def vehiculo_cumple_requisitos(vehiculo: dict, oferta_vehiculo: dict) -> bool:
    """
    Verifica si un vehículo cumple con los requisitos de la oferta.
    """
    if not vehiculo or not oferta_vehiculo:
        return False
    
    # Verificar configuración
    if oferta_vehiculo.get("configuracion") and vehiculo.get("configuracion") != oferta_vehiculo.get("configuracion"):
        return False
    
    # Verificar tipo de vehículo
    if oferta_vehiculo.get("tipo_vehiculo") and vehiculo.get("tipo_vehiculo") != oferta_vehiculo.get("tipo_vehiculo"):
        return False
    
    # Verificar carrocería
    if oferta_vehiculo.get("carroceria") and vehiculo.get("carroceria") != oferta_vehiculo.get("carroceria"):
        return False
    
    # Verificar tipo de carga
    if oferta_vehiculo.get("tipo_carga") and vehiculo.get("tipo_carga") != oferta_vehiculo.get("tipo_carga"):
        return False
    
    return True

def simular_proximidad() -> tuple[bool, float]:
    """
    Simula si un vehículo está dentro del radio de 20km.
    Retorna (está_cerca, distancia_km)
    """
    distancia = random.uniform(0, 50)  # Simular distancia entre 0 y 50km
    return distancia < 20, round(distancia, 2)

def simular_respuesta_vehiculo() -> tuple[bool, str]:
    """
    Simula la respuesta de un vehículo (acepta o rechaza).
    Retorna (aceptado, motivo_rechazo)
    """
    # 70% de probabilidad de aceptación
    if random.random() < 0.7:
        return True, None
    else:
        motivos = [
            "Vehículo no disponible",
            "Conductor en descanso obligatorio",
            "Mantenimiento programado",
            "Ya asignado a otra oferta",
            "Sin respuesta (timeout)"
        ]
        return False, random.choice(motivos)

async def procesar_asignacion_vehiculo(vehiculo: dict, oferta: dict, etapa: str, ciclo: int) -> dict:
    """
    Procesa la asignación de un vehículo a una oferta.
    Simula envío, espera y respuesta.
    """
    # Simular proximidad
    esta_cerca, distancia = simular_proximidad()
    
    if not esta_cerca:
        return {
            "vehiculo_id": vehiculo["id"],
            "placa": vehiculo["placa"],
            "tipo_propiedad": vehiculo.get("tipo_propiedad", "desconocido"),
            "estado": "RECHAZADO",
            "motivo": f"Fuera del radio (a {distancia}km)",
            "etapa": etapa,
            "ciclo": ciclo,
            "timestamp": datetime.now(timezone.utc)
        }
    
    # Simular tiempo de espera (en producción serían 5 minutos reales)
    # En simulación es instantáneo
    await asyncio.sleep(0.1)  # Pequeña pausa para simular procesamiento
    
    # Simular respuesta del vehículo
    aceptado, motivo = simular_respuesta_vehiculo()
    
    if aceptado:
        return {
            "vehiculo_id": vehiculo["id"],
            "placa": vehiculo["placa"],
            "marca": vehiculo.get("marca", ""),
            "linea": vehiculo.get("linea", ""),
            "tipo_propiedad": vehiculo.get("tipo_propiedad", "desconocido"),
            "estado": "ASIGNADO",
            "distancia_km": distancia,
            "etapa": etapa,
            "ciclo": ciclo,
            "timestamp": datetime.now(timezone.utc)
        }
    else:
        return {
            "vehiculo_id": vehiculo["id"],
            "placa": vehiculo["placa"],
            "tipo_propiedad": vehiculo.get("tipo_propiedad", "desconocido"),
            "estado": "RECHAZADO",
            "motivo": motivo,
            "etapa": etapa,
            "ciclo": ciclo,
            "timestamp": datetime.now(timezone.utc)
        }

async def ejecutar_asignacion_por_etapa(oferta: dict, etapa: str, tipo_propiedad: str, vehiculos_necesarios: int, ciclo: int) -> list:
    """
    Ejecuta la asignación de vehículos para una etapa específica.
    """
    logger.info(f"Ejecutando etapa {etapa} (ciclo {ciclo}) para oferta {oferta.get('codigo_oferta')}")
    
    # Obtener vehículos del tenant que cumplan el tipo de propiedad
    vehiculos = await db.vehiculos.find({
        "tenant_id": oferta["tenant_id"],
        "tipo_propiedad": tipo_propiedad
    }).to_list(length=100)
    
    # Filtrar vehículos que cumplan requisitos
    vehiculos_validos = [v for v in vehiculos if vehiculo_cumple_requisitos(v, oferta.get("vehiculo", {}))]
    
    logger.info(f"Vehículos válidos en etapa {etapa}: {len(vehiculos_validos)}")
    
    # Si no hay vehículos válidos, retornar lista vacía
    if not vehiculos_validos:
        return []
    
    # Limitar la cantidad de vehículos a procesar
    vehiculos_a_procesar = vehiculos_validos[:vehiculos_necesarios]
    
    # Procesar cada vehículo
    resultados = []
    for vehiculo in vehiculos_a_procesar:
        resultado = await procesar_asignacion_vehiculo(vehiculo, oferta, etapa, ciclo)
        resultados.append(resultado)
        
        # Si ya tenemos suficientes asignados, detener
        asignados = [r for r in resultados if r["estado"] == "ASIGNADO"]
        if len(asignados) >= vehiculos_necesarios:
            break
    
    return resultados

def determinar_completitud_objetivo() -> float:
    """
    Determina aleatoriamente el porcentaje objetivo de completitud.
    40%, 80% o 100%
    """
    opciones = [0.4, 0.8, 1.0]
    pesos = [0.2, 0.3, 0.5]  # 20% prob de 40%, 30% de 80%, 50% de 100%
    return random.choices(opciones, weights=pesos)[0]

async def proceso_asignacion_vehiculos(oferta_id: str, tenant_id: str):
    """
    Proceso completo de asignación de vehículos a una oferta.
    Ejecuta las 3 etapas: Flota propia → Terceros vinculados → Terceros
    """
    try:
        # Obtener la oferta
        oferta = await db.ofertas.find_one({"id": oferta_id, "tenant_id": tenant_id})
        if not oferta:
            logger.error(f"Oferta {oferta_id} no encontrada")
            return
        
        # Determinar objetivo de completitud (simulación variable)
        completitud_objetivo = determinar_completitud_objetivo()
        logger.info(f"Objetivo de completitud: {completitud_objetivo * 100}% para oferta {oferta.get('codigo_oferta')}")
        
        # Determinar cantidad de vehículos necesarios
        # Por ahora usar 1, luego se puede extender
        vehiculos_necesarios = 1
        vehiculos_objetivo = max(1, int(vehiculos_necesarios * completitud_objetivo))
        
        # Crear registro de asignación
        asignacion = {
            "id": str(uuid.uuid4()),
            "oferta_id": oferta_id,
            "oferta_codigo": oferta.get("codigo_oferta", ""),
            "tenant_id": tenant_id,
            "estado_asignacion": "EN_PROCESO",
            "vehiculos_requeridos": vehiculos_necesarios,
            "vehiculos_objetivo": vehiculos_objetivo,
            "vehiculos_asignados": [],
            "vehiculos_rechazados": [],
            "etapa_actual": "FLOTA_PROPIA",
            "ciclo_actual": 1,
            "alertas": [],
            "fecha_cargue": oferta.get("info_cargue", {}).get("fechaInicio"),
            "fecha_inicio_asignacion": datetime.now(timezone.utc),
            "fecha_ultima_actualizacion": datetime.now(timezone.utc),
            "porcentaje_completado": 0
        }
        
        await db.asignaciones_vehiculos.insert_one(asignacion)
        
        # Ejecutar ciclos de asignación
        max_ciclos = 3
        asignados = []
        rechazados = []
        
        for ciclo in range(1, max_ciclos + 1):
            logger.info(f"Iniciando ciclo {ciclo} para oferta {oferta.get('codigo_oferta')}")
            
            # Si ya alcanzamos el objetivo, detener
            if len(asignados) >= vehiculos_objetivo:
                logger.info(f"Objetivo alcanzado: {len(asignados)}/{vehiculos_objetivo}")
                break
            
            vehiculos_restantes = vehiculos_objetivo - len(asignados)
            
            # ETAPA 1: Flota propia
            resultados_propia = await ejecutar_asignacion_por_etapa(
                oferta, "FLOTA_PROPIA", "flota_propia", vehiculos_restantes, ciclo
            )
            for res in resultados_propia:
                if res["estado"] == "ASIGNADO":
                    asignados.append(res)
                else:
                    rechazados.append(res)
            
            if len(asignados) >= vehiculos_objetivo:
                break
            
            vehiculos_restantes = vehiculos_objetivo - len(asignados)
            
            # ETAPA 2: Terceros vinculados
            resultados_vinculados = await ejecutar_asignacion_por_etapa(
                oferta, "TERCEROS_VINCULADOS", "tercero_vinculado", vehiculos_restantes, ciclo
            )
            for res in resultados_vinculados:
                if res["estado"] == "ASIGNADO":
                    asignados.append(res)
                else:
                    rechazados.append(res)
            
            if len(asignados) >= vehiculos_objetivo:
                break
            
            vehiculos_restantes = vehiculos_objetivo - len(asignados)
            
            # ETAPA 3: Terceros (simulados - sin registros reales)
            # Solo se ejecuta si no se completó con flota propia y vinculados
            if vehiculos_restantes > 0:
                logger.info(f"Simulando terceros externos para {vehiculos_restantes} vehículos")
                # Simular algunos vehículos de terceros
                for i in range(vehiculos_restantes):
                    if random.random() < 0.5:  # 50% de éxito con terceros
                        asignados.append({
                            "vehiculo_id": f"TERCERO_{uuid.uuid4()}",
                            "placa": f"EXT{random.randint(100, 999)}",
                            "marca": "TERCERO",
                            "linea": "Externo",
                            "tipo_propiedad": "tercero_externo",
                            "estado": "ASIGNADO",
                            "distancia_km": round(random.uniform(5, 18), 2),
                            "etapa": "TERCEROS",
                            "ciclo": ciclo,
                            "timestamp": datetime.now(timezone.utc)
                        })
        
        # Calcular porcentaje completado
        porcentaje = (len(asignados) / vehiculos_necesarios) * 100 if vehiculos_necesarios > 0 else 0
        
        # Determinar estado final
        if len(asignados) >= vehiculos_necesarios:
            estado_final = "COMPLETADA"
        elif len(asignados) >= vehiculos_necesarios * 0.5:
            estado_final = "PARCIAL"
        else:
            estado_final = "INSUFICIENTE"
        
        # Verificar alerta (5 horas antes del cargue, menos del 50% asignado)
        alertas = []
        if oferta.get("info_cargue", {}).get("fechaInicio"):
            try:
                fecha_cargue = datetime.fromisoformat(oferta["info_cargue"]["fechaInicio"].replace('Z', '+00:00'))
                tiempo_restante = fecha_cargue - datetime.now(timezone.utc)
                horas_restantes = tiempo_restante.total_seconds() / 3600
                
                if horas_restantes <= 5 and porcentaje < 50:
                    alertas.append({
                        "tipo": "ASIGNACION_INSUFICIENTE",
                        "mensaje": f"Alerta: Solo se ha asignado el {porcentaje:.1f}% de los vehículos y faltan {horas_restantes:.1f} horas para el cargue",
                        "timestamp": datetime.now(timezone.utc),
                        "criticidad": "ALTA"
                    })
            except Exception as e:
                logger.error(f"Error al calcular alerta: {str(e)}")
        
        # Actualizar asignación
        await db.asignaciones_vehiculos.update_one(
            {"id": asignacion["id"]},
            {"$set": {
                "estado_asignacion": estado_final,
                "vehiculos_asignados": asignados,
                "vehiculos_rechazados": rechazados,
                "porcentaje_completado": porcentaje,
                "alertas": alertas,
                "fecha_ultima_actualizacion": datetime.now(timezone.utc),
                "ciclos_ejecutados": ciclo
            }}
        )
        
        # Actualizar estado de la oferta
        if len(asignados) > 0:
            await db.ofertas.update_one(
                {"id": oferta_id},
                {"$set": {
                    "estado": "ASIGNADO" if estado_final == "COMPLETADA" else "EN PROCESO DE ASIGNACIÓN",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        
        logger.info(f"Asignación completada: {len(asignados)}/{vehiculos_necesarios} vehículos asignados ({porcentaje:.1f}%)")
        logger.info(f"Flota propia: {len([a for a in asignados if a['tipo_propiedad'] == 'flota_propia'])}")
        logger.info(f"Terceros vinculados: {len([a for a in asignados if a['tipo_propiedad'] == 'tercero_vinculado'])}")
        logger.info(f"Terceros externos: {len([a for a in asignados if a['tipo_propiedad'] == 'tercero_externo'])}")
        
    except Exception as e:
        logger.error(f"Error en proceso de asignación: {str(e)}")
        # Actualizar estado de error
        try:
            await db.asignaciones_vehiculos.update_one(
                {"oferta_id": oferta_id},
                {"$set": {
                    "estado_asignacion": "ERROR",
                    "error_mensaje": str(e),
                    "fecha_ultima_actualizacion": datetime.now(timezone.utc)
                }}
            )
        except Exception:
            pass


# ==================== INDEXES ====================

async def create_indexes():
    try:
        await db.ofertas.drop_index("nombre_text_categoria_text_ruta.origen_text_ruta.destino_text")
    except Exception:
        pass
    await db.ofertas.create_index([("remitente", "text"), ("cargue.direccionConstruida", "text"), ("descargues.direccionConstruida", "text")])
    await db.ofertas.create_index("estado")
    await db.ofertas.create_index([("created_at", -1)])
    await db.ofertas.create_index("codigo_oferta")
    await db.ofertas.create_index("tenant_id")
    await db.vehiculos.create_index("tenant_id")
    await db.remolques.create_index("tenant_id")
    await db.direcciones_favoritas.create_index("tenant_id")
    await db.usuarios.create_index("email", unique=True)
    await db.vehiculos.create_index([("placa", 1), ("tenant_id", 1)], unique=True)
    await db.remolques.create_index([("placa", 1), ("tenant_id", 1)], unique=True)
    
    # Índices para Activity Logs
    await db.activity_logs.create_index([("fecha_hora", -1)])
    await db.activity_logs.create_index([("usuario_id", 1)])
    await db.activity_logs.create_index([("modulo", 1)])
    await db.activity_logs.create_index([("accion", 1)])
    await db.activity_logs.create_index([("empresa_id", 1)])
    await db.activity_logs.create_index([("tenant_id", 1)])
    
    # Índices para Asignaciones de Vehículos
    await db.asignaciones_vehiculos.create_index([("oferta_id", 1)])
    await db.asignaciones_vehiculos.create_index([("tenant_id", 1)])
    await db.asignaciones_vehiculos.create_index([("estado_asignacion", 1)])
    await db.asignaciones_vehiculos.create_index([("fecha_inicio_asignacion", -1)])
    
    logger.info("MongoDB indexes created")

# ==================== OFFER ID GENERATOR ====================

async def generate_offer_id(tenant_id: str):
    now = datetime.now(timezone.utc)
    year = now.strftime("%Y")
    month = now.strftime("%m")
    empresa = await db.empresas.find_one({"id": tenant_id}, {"_id": 0})
    empresa_code = empresa.get("codigo", "00001") if empresa else "00001"
    prefix = f"{year}-{month}-{empresa_code}"
    last = await db.ofertas.find_one(
        {"codigo_oferta": {"$regex": f"^{prefix}"}, "tenant_id": tenant_id},
        sort=[("codigo_oferta", -1)],
        projection={"codigo_oferta": 1, "_id": 0}
    )
    new_seq = (int(last["codigo_oferta"].split("-")[-1]) + 1) if (last and last.get("codigo_oferta")) else 1
    return f"{prefix}-{str(new_seq).zfill(4)}"

# ==================== SEED ====================

DEFAULT_TENANT_ID = None  # Set during startup

async def seed_data():
    global DEFAULT_TENANT_ID
    # Empresa
    empresa = await db.empresas.find_one({"nombre": "Sueña"})
    if not empresa:
        tid = str(uuid.uuid4())
        await db.empresas.insert_one({
            "id": tid, "nombre": "Sueña", "codigo": "00001",
            "estado": "activa", "created_at": datetime.now(timezone.utc).isoformat()
        })
        DEFAULT_TENANT_ID = tid
        logger.info(f"Empresa 'Sueña' creada con id {tid}")
    else:
        DEFAULT_TENANT_ID = empresa.get("id") or str(empresa["_id"])

    # Admin user
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@ctcarga.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.usuarios.find_one({"email": admin_email})
    if not existing:
        await db.usuarios.insert_one({
            "email": admin_email, "password_hash": hash_password(admin_password),
            "name": "Administrador", "rol": "ADMIN", "tenant_id": DEFAULT_TENANT_ID,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Admin user '{admin_email}' creado")
    else:
        if not verify_password(admin_password, existing["password_hash"]):
            await db.usuarios.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        if not existing.get("tenant_id"):
            await db.usuarios.update_one({"_id": existing["_id"]}, {"$set": {"tenant_id": DEFAULT_TENANT_ID}})

    # Migrate existing data without tenant_id
    for col_name in ["ofertas", "vehiculos", "remolques", "direcciones_favoritas"]:
        result = await db[col_name].update_many(
            {"tenant_id": {"$exists": False}},
            {"$set": {"tenant_id": DEFAULT_TENANT_ID}}
        )
        if result.modified_count > 0:
            logger.info(f"Migrated {result.modified_count} {col_name} to tenant {DEFAULT_TENANT_ID}")

    # Write credentials
    creds_path = Path("/app/memory/test_credentials.md")
    creds_path.parent.mkdir(parents=True, exist_ok=True)
    creds_path.write_text(
        f"# Test Credentials\n\n"
        f"## Admin\n- Email: {admin_email}\n- Password: {admin_password}\n- Rol: ADMIN\n- Empresa: Sueña\n\n"
        f"## Auth Endpoints\n- POST /api/auth/login\n- POST /api/auth/logout\n- GET /api/auth/me\n- POST /api/auth/refresh\n"
    )

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/login")
async def login(request: Request, data: dict):
    email = data.get("email", "").lower().strip()
    password = data.get("password", "")
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email y contraseña son requeridos")
    user = await db.usuarios.find_one({"email": email})
    if not user or not verify_password(password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    empresa = await db.empresas.find_one({"id": user.get("tenant_id")}, {"_id": 0})
    from starlette.responses import JSONResponse
    response = JSONResponse({
        "id": user_id, "email": user["email"], "name": user.get("name", ""),
        "rol": user.get("rol", ""), "tenant_id": user.get("tenant_id", ""),
        "empresa": empresa.get("nombre", "") if empresa else "",
    })
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=43200, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    return response

@api_router.post("/auth/logout")
async def logout():
    from starlette.responses import JSONResponse
    response = JSONResponse({"message": "Sesión cerrada"})
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return response

@api_router.get("/auth/me")
async def auth_me(request: Request):
    user = await get_current_user(request)
    empresa = await db.empresas.find_one({"id": user.get("tenant_id")}, {"_id": 0})
    return {
        "id": user["_id"], "email": user["email"], "name": user.get("name", ""),
        "rol": user.get("rol", ""), "tenant_id": user.get("tenant_id", ""),
        "empresa": empresa.get("nombre", "") if empresa else "",
    }

@api_router.post("/auth/refresh")
async def refresh_token(request: Request):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.usuarios.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        new_access = create_access_token(str(user["_id"]), user["email"])
        from starlette.responses import JSONResponse
        response = JSONResponse({"message": "Token refreshed"})
        response.set_cookie(key="access_token", value=new_access, httponly=True, secure=False, samesite="lax", max_age=43200, path="/")
        return response
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

# ==================== PUBLIC ROUTE ====================

@api_router.get("/")
async def root():
    return {"message": "CTCARGA API v1.0"}

# ==================== OFERTAS (PROTECTED) ====================

@api_router.get("/ofertas")
async def get_ofertas(request: Request, search: Optional[str] = Query(None), estado: Optional[str] = Query(None)):
    user = await get_current_user(request)
    check_role(user, ROLE_ALL)
    query = {"tenant_id": user["tenant_id"]}
    if estado and estado != "Todos los estados":
        query["estado"] = estado
    if search and search.strip():
        query["$or"] = [
            {"remitente": {"$regex": search, "$options": "i"}},
            {"cargue.direccionConstruida": {"$regex": search, "$options": "i"}},
            {"codigo_oferta": {"$regex": search, "$options": "i"}},
        ]
    ofertas = await db.ofertas.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return ofertas

@api_router.get("/ofertas/{oferta_id}")
async def get_oferta(request: Request, oferta_id: str):
    user = await get_current_user(request)
    check_role(user, ROLE_ALL)
    oferta = await db.ofertas.find_one({"id": oferta_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not oferta:
        raise HTTPException(status_code=404, detail="Oferta no encontrada")
    return oferta

@api_router.post("/ofertas")
async def create_oferta(request: Request, data: dict):
    user = await get_current_user(request)
    check_role(user, ROLE_WRITE)
    now = datetime.now(timezone.utc).isoformat()
    codigo = await generate_offer_id(user["tenant_id"])
    doc = {
        "id": str(uuid.uuid4()), "codigo_oferta": codigo, "tenant_id": user["tenant_id"],
        "remitente": data.get("remitente", ""), "destinatario": data.get("destinatario", ""),
        "nombre_responsable": data.get("nombre_responsable", ""),
        "identificacion": data.get("identificacion", ""),
        "cargue": data.get("cargue", {}), "descargues": data.get("descargues", []),
        "vehiculo": data.get("vehiculo", {}), "condiciones": data.get("condiciones", {}),
        "fletes": data.get("fletes", {}), "info_cargue": data.get("info_cargue", {}),
        "estado": "SIN ASIGNAR", "created_at": now, "updated_at": now,
    }
    await db.ofertas.insert_one(doc)
    
    # Registrar actividad
    await registrar_actividad(
        usuario=user,
        accion="CREAR",
        modulo="ofertas",
        registro_id=doc["id"],
        detalles=f"Creación de oferta {codigo} - Remitente: {data.get('remitente', 'N/A')}",
        ip_address=get_client_ip(request),
        datos_nuevos={"codigo_oferta": codigo, "remitente": data.get("remitente", ""), "estado": "SIN ASIGNAR"}
    )
    
    return await db.ofertas.find_one({"id": doc["id"]}, {"_id": 0})

@api_router.delete("/ofertas/{oferta_id}")
async def delete_oferta(request: Request, oferta_id: str):
    user = await get_current_user(request)
    check_role(user, ROLE_WRITE)
    
    # Obtener datos de la oferta antes de eliminar
    oferta = await db.ofertas.find_one({"id": oferta_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not oferta:
        raise HTTPException(status_code=404, detail="Oferta no encontrada")
    
    await db.ofertas.delete_one({"id": oferta_id, "tenant_id": user["tenant_id"]})
    
    # Registrar actividad
    await registrar_actividad(
        usuario=user,
        accion="ELIMINAR",
        modulo="ofertas",
        registro_id=oferta_id,
        detalles=f"Eliminación de oferta {oferta.get('codigo_oferta', 'N/A')} - Remitente: {oferta.get('remitente', 'N/A')}",
        ip_address=get_client_ip(request),
        datos_anteriores={"codigo_oferta": oferta.get("codigo_oferta"), "remitente": oferta.get("remitente"), "estado": oferta.get("estado")}
    )
    
    return {"message": "Oferta eliminada exitosamente"}

# ==================== STATS ====================

@api_router.get("/stats")
async def get_stats(request: Request):
    user = await get_current_user(request)
    check_role(user, ROLE_ALL)
    tid = user["tenant_id"]
    total = await db.ofertas.count_documents({"tenant_id": tid})
    sin_asignar = await db.ofertas.count_documents({"tenant_id": tid, "estado": {"$in": ["Sin Asignar", "SIN ASIGNAR"]}})
    activas = await db.ofertas.count_documents({"tenant_id": tid, "estado": {"$in": ["Activa", "ASIGNADO", "EN PROCESO DE CARGUE", "EN RUTA", "EN PROCESO DE DESCARGUE"]}})
    completadas = await db.ofertas.count_documents({"tenant_id": tid, "estado": {"$in": ["Completada", "FINALIZADA"]}})
    return {"total_ofertas": total, "sin_asignar": sin_asignar, "activas": activas, "completadas": completadas}

# ==================== DIRECCIONES FAVORITAS ====================

@api_router.get("/direcciones-favoritas")
async def get_favoritas(request: Request):
    user = await get_current_user(request)
    check_role(user, ROLE_ALL)
    favs = await db.direcciones_favoritas.find({"tenant_id": user["tenant_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return favs

@api_router.post("/direcciones-favoritas")
async def create_favorita(request: Request, data: dict):
    user = await get_current_user(request)
    check_role(user, ROLE_WRITE)
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid.uuid4()), "tenant_id": user["tenant_id"],
        "nombre_favorito": data.get("nombre_favorito", ""),
        "direccion": data.get("direccion", {}), "created_at": now,
    }
    await db.direcciones_favoritas.insert_one(doc)
    
    # Registrar actividad
    await registrar_actividad(
        usuario=user,
        accion="CREAR",
        modulo="direcciones_favoritas",
        registro_id=doc["id"],
        detalles=f"Creación de dirección favorita: {data.get('nombre_favorito', 'N/A')}",
        ip_address=get_client_ip(request),
        datos_nuevos={"nombre_favorito": data.get("nombre_favorito"), "direccion": data.get("direccion", {}).get("direccionConstruida", "")}
    )
    
    return await db.direcciones_favoritas.find_one({"id": doc["id"]}, {"_id": 0})

@api_router.delete("/direcciones-favoritas/{fav_id}")
async def delete_favorita(request: Request, fav_id: str):
    user = await get_current_user(request)
    check_role(user, ROLE_WRITE)
    
    # Obtener datos antes de eliminar
    favorita = await db.direcciones_favoritas.find_one({"id": fav_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not favorita:
        raise HTTPException(status_code=404, detail="Favorito no encontrado")
    
    await db.direcciones_favoritas.delete_one({"id": fav_id, "tenant_id": user["tenant_id"]})
    
    # Registrar actividad
    await registrar_actividad(
        usuario=user,
        accion="ELIMINAR",
        modulo="direcciones_favoritas",
        registro_id=fav_id,
        detalles=f"Eliminación de dirección favorita: {favorita.get('nombre_favorito', 'N/A')}",
        ip_address=get_client_ip(request),
        datos_anteriores={"nombre_favorito": favorita.get("nombre_favorito"), "direccion": favorita.get("direccion", {}).get("direccionConstruida", "")}
    )
    
    return {"message": "Favorito eliminado"}

# ==================== VEHICULOS ====================

@api_router.get("/vehiculos")
async def get_vehiculos(request: Request, search: Optional[str] = Query(None)):
    user = await get_current_user(request)
    check_role(user, ROLE_ALL)
    query = {"tenant_id": user["tenant_id"]}
    if search and search.strip():
        query["$or"] = [
            {"placa": {"$regex": search, "$options": "i"}},
            {"propietario": {"$regex": search, "$options": "i"}},
            {"marca": {"$regex": search, "$options": "i"}},
        ]
    return await db.vehiculos.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)

@api_router.get("/vehiculos/{vehiculo_id}")
async def get_vehiculo(request: Request, vehiculo_id: str):
    user = await get_current_user(request)
    check_role(user, ROLE_ALL)
    v = await db.vehiculos.find_one({"id": vehiculo_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not v:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    return v

@api_router.post("/vehiculos")
async def create_vehiculo(request: Request, data: dict):
    user = await get_current_user(request)
    check_role(user, ROLE_WRITE)
    now = datetime.now(timezone.utc).isoformat()
    placa = data.get("placa", "").upper()
    existing = await db.vehiculos.find_one({"placa": placa, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un vehículo con esta placa")
    doc = {**data, "id": str(uuid.uuid4()), "placa": placa, "tenant_id": user["tenant_id"], "created_at": now, "updated_at": now}
    await db.vehiculos.insert_one(doc)
    
    # Registrar actividad
    await registrar_actividad(
        usuario=user,
        accion="CREAR",
        modulo="vehiculos",
        registro_id=doc["id"],
        detalles=f"Creación de vehículo {placa} - Marca: {data.get('marca', 'N/A')} {data.get('linea', '')}",
        ip_address=get_client_ip(request),
        datos_nuevos={"placa": placa, "marca": data.get("marca"), "tipo_propiedad": data.get("tipo_propiedad")}
    )
    
    return await db.vehiculos.find_one({"id": doc["id"]}, {"_id": 0})

@api_router.put("/vehiculos/{vehiculo_id}")
async def update_vehiculo(request: Request, vehiculo_id: str, data: dict):
    user = await get_current_user(request)
    check_role(user, ROLE_WRITE)
    
    # Obtener datos anteriores
    vehiculo_anterior = await db.vehiculos.find_one({"id": vehiculo_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not vehiculo_anterior:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    
    now = datetime.now(timezone.utc).isoformat()
    data.pop("id", None)
    data.pop("_id", None)
    data.pop("tenant_id", None)
    data["updated_at"] = now
    if "placa" in data:
        data["placa"] = data["placa"].upper()
        dup = await db.vehiculos.find_one({"placa": data["placa"], "id": {"$ne": vehiculo_id}, "tenant_id": user["tenant_id"]}, {"_id": 0})
        if dup:
            raise HTTPException(status_code=400, detail="Ya existe otro vehículo con esta placa")
    result = await db.vehiculos.find_one_and_update(
        {"id": vehiculo_id, "tenant_id": user["tenant_id"]}, {"$set": data}, return_document=True, projection={"_id": 0}
    )
    
    # Registrar actividad
    await registrar_actividad(
        usuario=user,
        accion="ACTUALIZAR",
        modulo="vehiculos",
        registro_id=vehiculo_id,
        detalles=f"Actualización de vehículo {vehiculo_anterior.get('placa', 'N/A')}",
        ip_address=get_client_ip(request),
        datos_anteriores={"placa": vehiculo_anterior.get("placa"), "marca": vehiculo_anterior.get("marca")},
        datos_nuevos={"placa": data.get("placa", vehiculo_anterior.get("placa")), "marca": data.get("marca", vehiculo_anterior.get("marca"))}
    )
    
    return result

@api_router.delete("/vehiculos/{vehiculo_id}")
async def delete_vehiculo(request: Request, vehiculo_id: str):
    user = await get_current_user(request)
    check_role(user, ROLE_WRITE)
    
    # Obtener datos antes de eliminar
    vehiculo = await db.vehiculos.find_one({"id": vehiculo_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not vehiculo:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    
    await db.remolques.update_many({"vehiculo_vinculado": vehiculo_id, "tenant_id": user["tenant_id"]}, {"$set": {"vehiculo_vinculado": None}})
    await db.vehiculos.delete_one({"id": vehiculo_id, "tenant_id": user["tenant_id"]})
    
    # Registrar actividad
    await registrar_actividad(
        usuario=user,
        accion="ELIMINAR",
        modulo="vehiculos",
        registro_id=vehiculo_id,
        detalles=f"Eliminación de vehículo {vehiculo.get('placa', 'N/A')} - {vehiculo.get('marca', '')} {vehiculo.get('linea', '')}",
        ip_address=get_client_ip(request),
        datos_anteriores={"placa": vehiculo.get("placa"), "marca": vehiculo.get("marca"), "tipo_propiedad": vehiculo.get("tipo_propiedad")}
    )
    
    return {"message": "Vehículo eliminado"}

# ==================== REMOLQUES ====================

@api_router.get("/remolques")
async def get_remolques(request: Request, search: Optional[str] = Query(None)):
    user = await get_current_user(request)
    check_role(user, ROLE_ALL)
    query = {"tenant_id": user["tenant_id"]}
    if search and search.strip():
        query["$or"] = [
            {"placa": {"$regex": search, "$options": "i"}},
            {"tipo_remolque": {"$regex": search, "$options": "i"}},
        ]
    return await db.remolques.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)

@api_router.post("/remolques")
async def create_remolque(request: Request, data: dict):
    user = await get_current_user(request)
    check_role(user, ROLE_WRITE)
    now = datetime.now(timezone.utc).isoformat()
    placa = data.get("placa", "").upper()
    existing = await db.remolques.find_one({"placa": placa, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un remolque con esta placa")
    doc = {**data, "id": str(uuid.uuid4()), "placa": placa, "tenant_id": user["tenant_id"], "vehiculo_vinculado": None, "created_at": now, "updated_at": now}
    await db.remolques.insert_one(doc)
    
    # Registrar actividad
    await registrar_actividad(
        usuario=user,
        accion="CREAR",
        modulo="remolques",
        registro_id=doc["id"],
        detalles=f"Creación de remolque {placa} - Marca: {data.get('marca', 'N/A')}",
        ip_address=get_client_ip(request),
        datos_nuevos={"placa": placa, "marca": data.get("marca")}
    )
    
    return await db.remolques.find_one({"id": doc["id"]}, {"_id": 0})

@api_router.put("/remolques/{remolque_id}")
async def update_remolque(request: Request, remolque_id: str, data: dict):
    user = await get_current_user(request)
    check_role(user, ROLE_WRITE)
    
    # Obtener datos anteriores
    remolque_anterior = await db.remolques.find_one({"id": remolque_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not remolque_anterior:
        raise HTTPException(status_code=404, detail="Remolque no encontrado")
    
    now = datetime.now(timezone.utc).isoformat()
    data.pop("id", None)
    data.pop("_id", None)
    data.pop("tenant_id", None)
    data["updated_at"] = now
    if "placa" in data:
        data["placa"] = data["placa"].upper()
    result = await db.remolques.find_one_and_update(
        {"id": remolque_id, "tenant_id": user["tenant_id"]}, {"$set": data}, return_document=True, projection={"_id": 0}
    )
    
    # Registrar actividad
    await registrar_actividad(
        usuario=user,
        accion="ACTUALIZAR",
        modulo="remolques",
        registro_id=remolque_id,
        detalles=f"Actualización de remolque {remolque_anterior.get('placa', 'N/A')}",
        ip_address=get_client_ip(request),
        datos_anteriores={"placa": remolque_anterior.get("placa"), "marca": remolque_anterior.get("marca")},
        datos_nuevos={"placa": data.get("placa", remolque_anterior.get("placa")), "marca": data.get("marca", remolque_anterior.get("marca"))}
    )
    
    return result

@api_router.delete("/remolques/{remolque_id}")
async def delete_remolque(request: Request, remolque_id: str):
    user = await get_current_user(request)
    check_role(user, ROLE_WRITE)
    
    # Obtener datos antes de eliminar
    remolque = await db.remolques.find_one({"id": remolque_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not remolque:
        raise HTTPException(status_code=404, detail="Remolque no encontrado")
    
    await db.remolques.delete_one({"id": remolque_id, "tenant_id": user["tenant_id"]})
    
    # Registrar actividad
    await registrar_actividad(
        usuario=user,
        accion="ELIMINAR",
        modulo="remolques",
        registro_id=remolque_id,
        detalles=f"Eliminación de remolque {remolque.get('placa', 'N/A')} - {remolque.get('marca', '')}",
        ip_address=get_client_ip(request),
        datos_anteriores={"placa": remolque.get("placa"), "marca": remolque.get("marca")}
    )
    
    return {"message": "Remolque eliminado"}

# ==================== VINCULACION ====================

@api_router.post("/vehiculos/{vehiculo_id}/vincular-remolque")
async def vincular_remolque(request: Request, vehiculo_id: str, data: dict):
    user = await get_current_user(request)
    check_role(user, ROLE_WRITE)
    tid = user["tenant_id"]
    vehiculo = await db.vehiculos.find_one({"id": vehiculo_id, "tenant_id": tid}, {"_id": 0})
    if not vehiculo:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    if vehiculo.get("clase_vehiculo") != "Tractocamión":
        raise HTTPException(status_code=400, detail="Solo se permite vincular remolques a Tractocamiones")
    remolque_id = data.get("remolque_id")
    remolque = await db.remolques.find_one({"id": remolque_id, "tenant_id": tid}, {"_id": 0})
    if not remolque:
        raise HTTPException(status_code=404, detail="Remolque no encontrado")
    if remolque.get("vehiculo_vinculado") and remolque["vehiculo_vinculado"] != vehiculo_id:
        raise HTTPException(status_code=400, detail="Este remolque ya está vinculado a otro vehículo")
    await db.remolques.update_one({"id": remolque_id}, {"$set": {"vehiculo_vinculado": vehiculo_id}})
    await db.vehiculos.update_one({"id": vehiculo_id}, {"$set": {"remolque_vinculado": remolque_id}})
    
    # Registrar actividad
    await registrar_actividad(
        usuario=user,
        accion="CAMBIO_ESTADO",
        modulo="vehiculos",
        registro_id=vehiculo_id,
        detalles=f"Vinculación de remolque {remolque.get('placa', 'N/A')} al vehículo {vehiculo.get('placa', 'N/A')}",
        ip_address=get_client_ip(request),
        datos_nuevos={"vehiculo_placa": vehiculo.get("placa"), "remolque_placa": remolque.get("placa"), "accion": "vincular"}
    )
    
    return {"message": "Remolque vinculado exitosamente"}

@api_router.post("/vehiculos/{vehiculo_id}/desvincular-remolque")
async def desvincular_remolque(request: Request, vehiculo_id: str):
    user = await get_current_user(request)
    check_role(user, ROLE_WRITE)
    vehiculo = await db.vehiculos.find_one({"id": vehiculo_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not vehiculo:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    remolque_id = vehiculo.get("remolque_vinculado")
    
    remolque_placa = "N/A"
    if remolque_id:
        remolque = await db.remolques.find_one({"id": remolque_id}, {"_id": 0, "placa": 1})
        if remolque:
            remolque_placa = remolque.get("placa", "N/A")
        await db.remolques.update_one({"id": remolque_id}, {"$set": {"vehiculo_vinculado": None}})
    
    await db.vehiculos.update_one({"id": vehiculo_id}, {"$set": {"remolque_vinculado": None}})
    
    # Registrar actividad
    await registrar_actividad(
        usuario=user,
        accion="CAMBIO_ESTADO",
        modulo="vehiculos",
        registro_id=vehiculo_id,
        detalles=f"Desvinculación de remolque {remolque_placa} del vehículo {vehiculo.get('placa', 'N/A')}",
        ip_address=get_client_ip(request),
        datos_anteriores={"vehiculo_placa": vehiculo.get("placa"), "remolque_placa": remolque_placa, "accion": "desvincular"}
    )
    
    return {"message": "Remolque desvinculado"}

# ==================== FILE UPLOAD ====================

@api_router.post("/upload")
async def upload_file(request: Request, file: UploadFile = File(...)):
    user = await get_current_user(request)
    check_role(user, ROLE_WRITE)
    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else 'bin'
    allowed = {'pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'bmp', 'tiff'}
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"Formato no permitido: {ext}")
    unique_name = f"{uuid.uuid4().hex}.{ext}"
    file_path = UPLOAD_DIR / unique_name
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    return {"filename": unique_name, "original_name": file.filename, "url": f"/api/uploads/{unique_name}"}

@api_router.get("/uploads/{filename}")
async def get_upload(filename: str):
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    return FileResponse(str(file_path))



# ==================== ACTIVITY LOGS ====================



# ==================== PUBLICACIÓN Y ASIGNACIÓN DE OFERTAS ====================

@api_router.post("/ofertas/{oferta_id}/publicar")
async def publicar_oferta(request: Request, oferta_id: str):
    """
    Publica una oferta y activa el proceso de asignación de vehículos.
    """
    user = await get_current_user(request)
    check_role(user, ROLE_WRITE)
    
    # Verificar que la oferta existe
    oferta = await db.ofertas.find_one({"id": oferta_id, "tenant_id": user["tenant_id"]})
    if not oferta:
        raise HTTPException(status_code=404, detail="Oferta no encontrada")
    
    # Cambiar estado a "EN PROCESO DE ASIGNACIÓN"
    await db.ofertas.update_one(
        {"id": oferta_id},
        {"$set": {
            "estado": "EN PROCESO DE ASIGNACIÓN",
            "fecha_publicacion": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Registrar actividad
    await registrar_actividad(
        usuario=user,
        accion="CAMBIO_ESTADO",
        modulo="ofertas",
        registro_id=oferta_id,
        detalles=f"Publicación de oferta {oferta.get('codigo_oferta', 'N/A')} - Iniciando proceso de asignación",
        ip_address=get_client_ip(request),
        datos_nuevos={"estado": "EN PROCESO DE ASIGNACIÓN", "accion": "publicar"}
    )
    
    # Iniciar proceso de asignación en background
    asyncio.create_task(proceso_asignacion_vehiculos(oferta_id, user["tenant_id"]))
    
    logger.info(f"Oferta {oferta.get('codigo_oferta')} publicada. Iniciando asignación de vehículos.")
    
    return {
        "message": "Oferta publicada exitosamente. La asignación de vehículos ha iniciado.",
        "oferta_id": oferta_id,
        "estado": "EN PROCESO DE ASIGNACIÓN"
    }

@api_router.get("/ofertas/{oferta_id}/asignacion")
async def get_estado_asignacion(request: Request, oferta_id: str):
    """
    Obtiene el estado actual de la asignación de vehículos de una oferta.
    """
    user = await get_current_user(request)
    check_role(user, ROLE_ALL)
    
    asignacion = await db.asignaciones_vehiculos.find_one(
        {"oferta_id": oferta_id, "tenant_id": user["tenant_id"]},
        {"_id": 0}
    )
    
    if not asignacion:
        raise HTTPException(status_code=404, detail="No se encontró proceso de asignación para esta oferta")
    
    return asignacion

@api_router.get("/activity-logs")
async def get_activity_logs(
    request: Request,
    modulo: Optional[str] = Query(None),
    accion: Optional[str] = Query(None),
    usuario_id: Optional[str] = Query(None),
    fecha_desde: Optional[str] = Query(None),
    fecha_hasta: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    skip: int = Query(0, ge=0)
):
    """
    Obtiene el historial de actividad del sistema con filtros opcionales.
    """
    user = await get_current_user(request)
    check_role(user, ROLE_ALL)
    
    query = {"tenant_id": user["tenant_id"]}
    
    if modulo:
        query["modulo"] = modulo
    
    if accion:
        query["accion"] = accion
    
    if usuario_id:
        query["usuario_id"] = usuario_id
    
    if fecha_desde or fecha_hasta:
        query["fecha_hora"] = {}
        if fecha_desde:
            try:
                fecha_desde_dt = datetime.fromisoformat(fecha_desde.replace('Z', '+00:00'))
                query["fecha_hora"]["$gte"] = fecha_desde_dt
            except (ValueError, AttributeError):
                pass
        if fecha_hasta:
            try:
                fecha_hasta_dt = datetime.fromisoformat(fecha_hasta.replace('Z', '+00:00'))
                query["fecha_hora"]["$lte"] = fecha_hasta_dt
            except (ValueError, AttributeError):
                pass
    
    logs = await db.activity_logs.find(query, {"_id": 0}) \
        .sort("fecha_hora", -1) \
        .skip(skip) \
        .limit(limit) \
        .to_list(length=limit)
    
    total = await db.activity_logs.count_documents(query)
    
    return {
        "logs": logs,
        "total": total,
        "limit": limit,
        "skip": skip
    }

# ==================== BORRADOR (legacy, no auth needed but keep working) ====================

@api_router.post("/ofertas-borrador")
async def create_borrador(data: dict):
    return {"message": "Borrador guardado"}

# ==================== APP SETUP ====================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    await create_indexes()
    await seed_data()
    logger.info("CTCARGA API started successfully")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
