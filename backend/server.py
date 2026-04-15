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
    return await db.ofertas.find_one({"id": doc["id"]}, {"_id": 0})

@api_router.delete("/ofertas/{oferta_id}")
async def delete_oferta(request: Request, oferta_id: str):
    user = await get_current_user(request)
    check_role(user, ROLE_WRITE)
    result = await db.ofertas.delete_one({"id": oferta_id, "tenant_id": user["tenant_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Oferta no encontrada")
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
    return await db.direcciones_favoritas.find_one({"id": doc["id"]}, {"_id": 0})

@api_router.delete("/direcciones-favoritas/{fav_id}")
async def delete_favorita(request: Request, fav_id: str):
    user = await get_current_user(request)
    check_role(user, ROLE_WRITE)
    result = await db.direcciones_favoritas.delete_one({"id": fav_id, "tenant_id": user["tenant_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Favorito no encontrado")
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
    return await db.vehiculos.find_one({"id": doc["id"]}, {"_id": 0})

@api_router.put("/vehiculos/{vehiculo_id}")
async def update_vehiculo(request: Request, vehiculo_id: str, data: dict):
    user = await get_current_user(request)
    check_role(user, ROLE_WRITE)
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
    if not result:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    return result

@api_router.delete("/vehiculos/{vehiculo_id}")
async def delete_vehiculo(request: Request, vehiculo_id: str):
    user = await get_current_user(request)
    check_role(user, ROLE_WRITE)
    await db.remolques.update_many({"vehiculo_vinculado": vehiculo_id, "tenant_id": user["tenant_id"]}, {"$set": {"vehiculo_vinculado": None}})
    result = await db.vehiculos.delete_one({"id": vehiculo_id, "tenant_id": user["tenant_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
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
    return await db.remolques.find_one({"id": doc["id"]}, {"_id": 0})

@api_router.put("/remolques/{remolque_id}")
async def update_remolque(request: Request, remolque_id: str, data: dict):
    user = await get_current_user(request)
    check_role(user, ROLE_WRITE)
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
    if not result:
        raise HTTPException(status_code=404, detail="Remolque no encontrado")
    return result

@api_router.delete("/remolques/{remolque_id}")
async def delete_remolque(request: Request, remolque_id: str):
    user = await get_current_user(request)
    check_role(user, ROLE_WRITE)
    result = await db.remolques.delete_one({"id": remolque_id, "tenant_id": user["tenant_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Remolque no encontrado")
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
    return {"message": "Remolque vinculado exitosamente"}

@api_router.post("/vehiculos/{vehiculo_id}/desvincular-remolque")
async def desvincular_remolque(request: Request, vehiculo_id: str):
    user = await get_current_user(request)
    check_role(user, ROLE_WRITE)
    vehiculo = await db.vehiculos.find_one({"id": vehiculo_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not vehiculo:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    remolque_id = vehiculo.get("remolque_vinculado")
    if remolque_id:
        await db.remolques.update_one({"id": remolque_id}, {"$set": {"vehiculo_vinculado": None}})
    await db.vehiculos.update_one({"id": vehiculo_id}, {"$set": {"remolque_vinculado": None}})
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
