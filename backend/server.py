from fastapi import FastAPI, APIRouter, HTTPException, Query, UploadFile, File
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import List, Optional
import uuid
from datetime import datetime, timezone

UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ==================== INDEXES ====================

async def create_indexes():
    # Drop old text index if exists
    try:
        await db.ofertas.drop_index("nombre_text_categoria_text_ruta.origen_text_ruta.destino_text")
    except Exception:
        pass
    await db.ofertas.create_index([("remitente", "text"), ("cargue.direccionConstruida", "text"), ("descargues.direccionConstruida", "text")])
    await db.ofertas.create_index("estado")
    await db.ofertas.create_index([("created_at", -1)])
    await db.ofertas.create_index("codigo_oferta")
    logger.info("MongoDB indexes created successfully")


# ==================== OFFER ID GENERATOR ====================

async def generate_offer_id():
    """Generate offer ID: YYYY-MM-EMPRESA-SECUENCIAL"""
    now = datetime.now(timezone.utc)
    year = now.strftime("%Y")
    month = now.strftime("%m")
    empresa_code = "00001"
    prefix = f"{year}-{month}-{empresa_code}"

    # Find last offer of this month
    last = await db.ofertas.find_one(
        {"codigo_oferta": {"$regex": f"^{prefix}"}},
        sort=[("codigo_oferta", -1)],
        projection={"codigo_oferta": 1, "_id": 0}
    )

    if last and last.get("codigo_oferta"):
        last_seq = int(last["codigo_oferta"].split("-")[-1])
        new_seq = last_seq + 1
    else:
        new_seq = 1

    return f"{prefix}-{str(new_seq).zfill(4)}"


# ==================== ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "CTCARGA API v1.0"}


# --- OFERTAS CRUD ---

@api_router.get("/ofertas")
async def get_ofertas(
    search: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
):
    query = {}
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
async def get_oferta(oferta_id: str):
    oferta = await db.ofertas.find_one({"id": oferta_id}, {"_id": 0})
    if not oferta:
        raise HTTPException(status_code=404, detail="Oferta no encontrada")
    return oferta


@api_router.post("/ofertas")
async def create_oferta(data: dict):
    now = datetime.now(timezone.utc).isoformat()
    codigo = await generate_offer_id()

    doc = {
        "id": str(uuid.uuid4()),
        "codigo_oferta": codigo,
        "remitente": data.get("remitente", ""),
        "destinatario": data.get("destinatario", ""),
        "nombre_responsable": data.get("nombre_responsable", ""),
        "identificacion": data.get("identificacion", ""),
        "cargue": data.get("cargue", {}),
        "descargues": data.get("descargues", []),
        "vehiculo": data.get("vehiculo", {}),
        "condiciones": data.get("condiciones", {}),
        "fletes": data.get("fletes", {}),
        "info_cargue": data.get("info_cargue", {}),
        "estado": "Sin Asignar",
        "created_at": now,
        "updated_at": now,
    }

    await db.ofertas.insert_one(doc)
    created = await db.ofertas.find_one({"id": doc["id"]}, {"_id": 0})
    return created


@api_router.delete("/ofertas/{oferta_id}")
async def delete_oferta(oferta_id: str):
    result = await db.ofertas.delete_one({"id": oferta_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Oferta no encontrada")
    return {"message": "Oferta eliminada exitosamente"}


# --- STATS ---

@api_router.get("/stats")
async def get_stats():
    total = await db.ofertas.count_documents({})
    sin_asignar = await db.ofertas.count_documents({"estado": "Sin Asignar"})
    activas = await db.ofertas.count_documents({"estado": "Activa"})
    completadas = await db.ofertas.count_documents({"estado": "Completada"})
    return {"total_ofertas": total, "sin_asignar": sin_asignar, "activas": activas, "completadas": completadas}


# --- DIRECCIONES FAVORITAS ---

@api_router.get("/direcciones-favoritas")
async def get_favoritas():
    favs = await db.direcciones_favoritas.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return favs


@api_router.post("/direcciones-favoritas")
async def create_favorita(data: dict):
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        "nombre_favorito": data.get("nombre_favorito", ""),
        "direccion": data.get("direccion", {}),
        "created_at": now,
    }
    await db.direcciones_favoritas.insert_one(doc)
    created = await db.direcciones_favoritas.find_one({"id": doc["id"]}, {"_id": 0})
    return created


@api_router.delete("/direcciones-favoritas/{fav_id}")
async def delete_favorita(fav_id: str):
    result = await db.direcciones_favoritas.delete_one({"id": fav_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Favorito no encontrado")
    return {"message": "Favorito eliminado"}


# --- VEHICULOS CRUD ---

@api_router.get("/vehiculos")
async def get_vehiculos(search: Optional[str] = Query(None)):
    query = {}
    if search and search.strip():
        query["$or"] = [
            {"placa": {"$regex": search, "$options": "i"}},
            {"propietario": {"$regex": search, "$options": "i"}},
            {"marca": {"$regex": search, "$options": "i"}},
        ]
    vehiculos = await db.vehiculos.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return vehiculos


@api_router.get("/vehiculos/{vehiculo_id}")
async def get_vehiculo(vehiculo_id: str):
    v = await db.vehiculos.find_one({"id": vehiculo_id}, {"_id": 0})
    if not v:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    return v


@api_router.post("/vehiculos")
async def create_vehiculo(data: dict):
    now = datetime.now(timezone.utc).isoformat()
    existing = await db.vehiculos.find_one({"placa": data.get("placa", "").upper()}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un vehículo con esta placa")
    doc = {**data, "id": str(uuid.uuid4()), "placa": data.get("placa", "").upper(), "created_at": now, "updated_at": now}
    await db.vehiculos.insert_one(doc)
    return await db.vehiculos.find_one({"id": doc["id"]}, {"_id": 0})


@api_router.put("/vehiculos/{vehiculo_id}")
async def update_vehiculo(vehiculo_id: str, data: dict):
    now = datetime.now(timezone.utc).isoformat()
    data.pop("id", None)
    data.pop("_id", None)
    data["updated_at"] = now
    if "placa" in data:
        data["placa"] = data["placa"].upper()
        dup = await db.vehiculos.find_one({"placa": data["placa"], "id": {"$ne": vehiculo_id}}, {"_id": 0})
        if dup:
            raise HTTPException(status_code=400, detail="Ya existe otro vehículo con esta placa")
    result = await db.vehiculos.find_one_and_update(
        {"id": vehiculo_id}, {"$set": data}, return_document=True, projection={"_id": 0}
    )
    if not result:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    return result


@api_router.delete("/vehiculos/{vehiculo_id}")
async def delete_vehiculo(vehiculo_id: str):
    await db.remolques.update_many({"vehiculo_vinculado": vehiculo_id}, {"$set": {"vehiculo_vinculado": None}})
    result = await db.vehiculos.delete_one({"id": vehiculo_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    return {"message": "Vehículo eliminado"}


# --- REMOLQUES CRUD ---

@api_router.get("/remolques")
async def get_remolques(search: Optional[str] = Query(None)):
    query = {}
    if search and search.strip():
        query["$or"] = [
            {"placa": {"$regex": search, "$options": "i"}},
            {"tipo_remolque": {"$regex": search, "$options": "i"}},
        ]
    remolques = await db.remolques.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return remolques


@api_router.post("/remolques")
async def create_remolque(data: dict):
    now = datetime.now(timezone.utc).isoformat()
    existing = await db.remolques.find_one({"placa": data.get("placa", "").upper()}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un remolque con esta placa")
    doc = {**data, "id": str(uuid.uuid4()), "placa": data.get("placa", "").upper(), "vehiculo_vinculado": None, "created_at": now, "updated_at": now}
    await db.remolques.insert_one(doc)
    return await db.remolques.find_one({"id": doc["id"]}, {"_id": 0})


@api_router.put("/remolques/{remolque_id}")
async def update_remolque(remolque_id: str, data: dict):
    now = datetime.now(timezone.utc).isoformat()
    data.pop("id", None)
    data.pop("_id", None)
    data["updated_at"] = now
    if "placa" in data:
        data["placa"] = data["placa"].upper()
    result = await db.remolques.find_one_and_update(
        {"id": remolque_id}, {"$set": data}, return_document=True, projection={"_id": 0}
    )
    if not result:
        raise HTTPException(status_code=404, detail="Remolque no encontrado")
    return result


@api_router.delete("/remolques/{remolque_id}")
async def delete_remolque(remolque_id: str):
    result = await db.remolques.delete_one({"id": remolque_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Remolque no encontrado")
    return {"message": "Remolque eliminado"}


# --- VINCULACION VEHICULO-REMOLQUE ---

@api_router.post("/vehiculos/{vehiculo_id}/vincular-remolque")
async def vincular_remolque(vehiculo_id: str, data: dict):
    vehiculo = await db.vehiculos.find_one({"id": vehiculo_id}, {"_id": 0})
    if not vehiculo:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    if vehiculo.get("clase_vehiculo") != "Tractocamión":
        raise HTTPException(status_code=400, detail="Solo se permite vincular remolques a Tractocamiones")
    remolque_id = data.get("remolque_id")
    remolque = await db.remolques.find_one({"id": remolque_id}, {"_id": 0})
    if not remolque:
        raise HTTPException(status_code=404, detail="Remolque no encontrado")
    if remolque.get("vehiculo_vinculado") and remolque["vehiculo_vinculado"] != vehiculo_id:
        raise HTTPException(status_code=400, detail="Este remolque ya está vinculado a otro vehículo")
    await db.remolques.update_one({"id": remolque_id}, {"$set": {"vehiculo_vinculado": vehiculo_id}})
    await db.vehiculos.update_one({"id": vehiculo_id}, {"$set": {"remolque_vinculado": remolque_id}})
    return {"message": "Remolque vinculado exitosamente"}


@api_router.post("/vehiculos/{vehiculo_id}/desvincular-remolque")
async def desvincular_remolque(vehiculo_id: str):
    vehiculo = await db.vehiculos.find_one({"id": vehiculo_id}, {"_id": 0})
    if not vehiculo:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    remolque_id = vehiculo.get("remolque_vinculado")
    if remolque_id:
        await db.remolques.update_one({"id": remolque_id}, {"$set": {"vehiculo_vinculado": None}})
    await db.vehiculos.update_one({"id": vehiculo_id}, {"$set": {"remolque_vinculado": None}})
    return {"message": "Remolque desvinculado"}


# --- FILE UPLOAD ---

@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
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


# ==================== APP SETUP ====================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup():
    await create_indexes()
    await db.vehiculos.create_index("placa", unique=True)
    await db.remolques.create_index("placa", unique=True)
    logger.info("CTCARGA API started successfully")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
