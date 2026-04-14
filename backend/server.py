from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import List, Optional
import uuid
from datetime import datetime, timezone

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
    # Drop old seed data
    await db.ofertas.delete_many({})
    await create_indexes()
    logger.info("CTCARGA API started successfully")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
