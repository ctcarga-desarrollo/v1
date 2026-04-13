from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# ==================== MODELS ====================

class RutaModel(BaseModel):
    origen: str
    destino: str

class CargaModel(BaseModel):
    tipo: str
    peso: str
    volumen: str
    vehiculo: str

class ProgramacionModel(BaseModel):
    recogida: str
    entrega: str
    precio: str

class OfertaCreate(BaseModel):
    nombre: str
    categoria: str
    ruta: RutaModel
    carga: CargaModel
    programacion: ProgramacionModel
    requisitos: List[str] = []
    estado: str = "Activa"
    urgencia: str = "Media"

class OfertaUpdate(BaseModel):
    nombre: Optional[str] = None
    categoria: Optional[str] = None
    ruta: Optional[RutaModel] = None
    carga: Optional[CargaModel] = None
    programacion: Optional[ProgramacionModel] = None
    requisitos: Optional[List[str]] = None
    estado: Optional[str] = None
    urgencia: Optional[str] = None

class OfertaResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    nombre: str
    categoria: str
    ruta: RutaModel
    carga: CargaModel
    programacion: ProgramacionModel
    requisitos: List[str]
    estado: str
    urgencia: str
    created_at: str
    updated_at: str


# ==================== INDEXES ====================

async def create_indexes():
    """Create MongoDB indexes for optimized queries."""
    # Text index for search
    await db.ofertas.create_index([("nombre", "text"), ("categoria", "text"), ("ruta.origen", "text"), ("ruta.destino", "text")])
    # Index for filtering by estado
    await db.ofertas.create_index("estado")
    # Index for filtering by urgencia
    await db.ofertas.create_index("urgencia")
    # Index for sorting by creation date
    await db.ofertas.create_index([("created_at", -1)])
    # Compound index for common filter + sort
    await db.ofertas.create_index([("estado", 1), ("created_at", -1)])
    logger.info("MongoDB indexes created successfully")


# ==================== SEED DATA ====================

async def seed_ofertas():
    """Seed initial demo data if collection is empty."""
    count = await db.ofertas.count_documents({})
    if count > 0:
        return

    now = datetime.now(timezone.utc).isoformat()
    seed_data = [
        {
            "id": str(uuid.uuid4()),
            "nombre": "Alpina",
            "categoria": "Alimentos y bebidas",
            "ruta": {"origen": "Bogota, Colombia", "destino": "Medellin, Colombia"},
            "carga": {"tipo": "Maquinaria", "peso": "15,000 kg", "volumen": "45 m3", "vehiculo": "Cama baja"},
            "programacion": {"recogida": "2024-01-15", "entrega": "2024-01-17", "precio": "$2,500,000"},
            "requisitos": ["Seguro de carga", "Conductor certificado", "GPS tracking"],
            "estado": "Activa",
            "urgencia": "Alta",
            "created_at": now,
            "updated_at": now,
        },
        {
            "id": str(uuid.uuid4()),
            "nombre": "Postobon",
            "categoria": "Bebidas frias",
            "ruta": {"origen": "Cartagena, Colombia", "destino": "Bucaramanga, Colombia"},
            "carga": {"tipo": "Construccion", "peso": "8,000 kg", "volumen": "25 m3", "vehiculo": "Plataforma"},
            "programacion": {"recogida": "2024-01-18", "entrega": "2024-01-20", "precio": "$1,200,000"},
            "requisitos": ["Amarres especiales", "Lona protectora"],
            "estado": "Pendiente",
            "urgencia": "Baja",
            "created_at": now,
            "updated_at": now,
        },
        {
            "id": str(uuid.uuid4()),
            "nombre": "Cementos Argos",
            "categoria": "Materiales de construccion",
            "ruta": {"origen": "Barranquilla, Colombia", "destino": "Cali, Colombia"},
            "carga": {"tipo": "Cemento", "peso": "25,000 kg", "volumen": "60 m3", "vehiculo": "Tractomula"},
            "programacion": {"recogida": "2024-01-22", "entrega": "2024-01-25", "precio": "$3,800,000"},
            "requisitos": ["Lona impermeable", "Seguro de carga", "Pesaje certificado"],
            "estado": "Activa",
            "urgencia": "Alta",
            "created_at": now,
            "updated_at": now,
        },
    ]
    await db.ofertas.insert_many(seed_data)
    logger.info(f"Seeded {len(seed_data)} ofertas")


# ==================== ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "CTCARGA API v1.0"}


# --- OFERTAS CRUD ---

@api_router.get("/ofertas", response_model=List[OfertaResponse])
async def get_ofertas(
    search: Optional[str] = Query(None, description="Search by name, category or location"),
    estado: Optional[str] = Query(None, description="Filter by estado"),
):
    """Get all ofertas with optional search and filters."""
    query = {}

    if estado and estado != "Todos los estados":
        query["estado"] = estado

    if search and search.strip():
        query["$or"] = [
            {"nombre": {"$regex": search, "$options": "i"}},
            {"categoria": {"$regex": search, "$options": "i"}},
            {"ruta.origen": {"$regex": search, "$options": "i"}},
            {"ruta.destino": {"$regex": search, "$options": "i"}},
        ]

    ofertas = await db.ofertas.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return ofertas


@api_router.get("/ofertas/{oferta_id}", response_model=OfertaResponse)
async def get_oferta(oferta_id: str):
    """Get a single oferta by ID."""
    oferta = await db.ofertas.find_one({"id": oferta_id}, {"_id": 0})
    if not oferta:
        raise HTTPException(status_code=404, detail="Oferta no encontrada")
    return oferta


@api_router.post("/ofertas", response_model=OfertaResponse)
async def create_oferta(oferta: OfertaCreate):
    """Create a new oferta."""
    now = datetime.now(timezone.utc).isoformat()
    doc = oferta.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now
    doc["updated_at"] = now

    await db.ofertas.insert_one(doc)
    # Return without _id
    created = await db.ofertas.find_one({"id": doc["id"]}, {"_id": 0})
    return created


@api_router.put("/ofertas/{oferta_id}", response_model=OfertaResponse)
async def update_oferta(oferta_id: str, oferta: OfertaUpdate):
    """Update an existing oferta."""
    existing = await db.ofertas.find_one({"id": oferta_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Oferta no encontrada")

    update_data = {k: v for k, v in oferta.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    # Convert nested models to dicts
    for key in ["ruta", "carga", "programacion"]:
        if key in update_data and hasattr(update_data[key], "model_dump"):
            update_data[key] = update_data[key].model_dump()

    await db.ofertas.update_one({"id": oferta_id}, {"$set": update_data})
    updated = await db.ofertas.find_one({"id": oferta_id}, {"_id": 0})
    return updated


@api_router.delete("/ofertas/{oferta_id}")
async def delete_oferta(oferta_id: str):
    """Delete an oferta."""
    result = await db.ofertas.delete_one({"id": oferta_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Oferta no encontrada")
    return {"message": "Oferta eliminada exitosamente"}


# --- STATS ---

@api_router.get("/stats")
async def get_stats():
    """Get dashboard statistics."""
    total_ofertas = await db.ofertas.count_documents({})
    activas = await db.ofertas.count_documents({"estado": "Activa"})
    pendientes = await db.ofertas.count_documents({"estado": "Pendiente"})
    completadas = await db.ofertas.count_documents({"estado": "Completada"})

    return {
        "total_ofertas": total_ofertas,
        "activas": activas,
        "pendientes": pendientes,
        "completadas": completadas,
    }


# --- DIRECCIONES FAVORITAS ---

@api_router.get("/direcciones-favoritas")
async def get_favoritas():
    """Get all favorite addresses."""
    favs = await db.direcciones_favoritas.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return favs


@api_router.post("/direcciones-favoritas")
async def create_favorita(data: dict):
    """Save a favorite address."""
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
    """Delete a favorite address."""
    result = await db.direcciones_favoritas.delete_one({"id": fav_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Favorito no encontrado")
    return {"message": "Favorito eliminado"}


# --- OFERTAS BORRADOR (Draft with addresses) ---

@api_router.post("/ofertas-borrador")
async def create_borrador(data: dict):
    """Save offer draft with cargue/descargue addresses."""
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        "cargue": data.get("cargue", {}),
        "descargues": data.get("descargues", []),
        "status": "borrador",
        "created_at": now,
        "updated_at": now,
    }
    await db.ofertas_borrador.insert_one(doc)
    created = await db.ofertas_borrador.find_one({"id": doc["id"]}, {"_id": 0})
    return created


# ==================== APP SETUP ====================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup():
    await create_indexes()
    await seed_ofertas()
    logger.info("CTCARGA API started successfully")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
