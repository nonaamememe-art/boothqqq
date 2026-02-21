from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse, Response
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
import base64
import qrcode
from io import BytesIO
import imageio
from PIL import Image
import json
import random
import string

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create uploads directory
UPLOADS_DIR = ROOT_DIR / 'uploads'
UPLOADS_DIR.mkdir(exist_ok=True)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models
def generate_short_id(length=7):
    """Generate a short alphanumeric ID like '26454n5'"""
    chars = string.ascii_lowercase + string.digits
    return ''.join(random.choice(chars) for _ in range(length))

class PhotoSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    short_id: str = Field(default_factory=lambda: generate_short_id())
    template_id: str
    photos: List[str] = []  # Base64 encoded photos
    stickers: List[dict] = []  # Sticker positions and data
    gif_url: Optional[str] = None
    final_image_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "in_progress"

class CreateSessionRequest(BaseModel):
    template_id: str

class AddPhotoRequest(BaseModel):
    session_id: str
    photo_data: str  # Base64 encoded photo

class UpdateStickersRequest(BaseModel):
    session_id: str
    stickers: List[dict]

class FinalizeSessionRequest(BaseModel):
    session_id: str
    final_image_data: str  # Base64 encoded final decorated image

class Template(BaseModel):
    id: str
    name: str
    description: str
    preview_url: str
    frame_color: str
    background_color: str

class Sticker(BaseModel):
    id: str
    name: str
    url: str
    category: str

# Default templates
TEMPLATES = [
    {
        "id": "classic-white",
        "name": "Classic White",
        "description": "Clean white frames with elegant spacing",
        "preview_url": "https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=400&h=600&fit=crop",
        "frame_color": "#ffffff",
        "background_color": "#f8fafc"
    },
    {
        "id": "modern-dark",
        "name": "Modern Dark",
        "description": "Sleek dark theme with subtle shadows",
        "preview_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=600&fit=crop",
        "frame_color": "#1e293b",
        "background_color": "#0f172a"
    }
]

# Default placeholder stickers
DEFAULT_STICKERS = [
    {"id": "star-1", "name": "Star", "url": "https://cdn-icons-png.flaticon.com/512/1828/1828884.png", "category": "shapes"},
    {"id": "heart-1", "name": "Heart", "url": "https://cdn-icons-png.flaticon.com/512/833/833472.png", "category": "shapes"},
    {"id": "crown-1", "name": "Crown", "url": "https://cdn-icons-png.flaticon.com/512/2867/2867988.png", "category": "accessories"},
    {"id": "glasses-1", "name": "Glasses", "url": "https://cdn-icons-png.flaticon.com/512/497/497796.png", "category": "accessories"},
    {"id": "party-1", "name": "Party Hat", "url": "https://cdn-icons-png.flaticon.com/512/3468/3468377.png", "category": "party"},
    {"id": "balloon-1", "name": "Balloon", "url": "https://cdn-icons-png.flaticon.com/512/5765/5765106.png", "category": "party"},
    {"id": "sparkle-1", "name": "Sparkle", "url": "https://cdn-icons-png.flaticon.com/512/3141/3141810.png", "category": "effects"},
    {"id": "rainbow-1", "name": "Rainbow", "url": "https://cdn-icons-png.flaticon.com/512/3222/3222789.png", "category": "effects"},
]

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Power of Ten Photobooth API"}

@api_router.get("/templates", response_model=List[dict])
async def get_templates():
    """Get available photo strip templates"""
    # Get custom templates from database
    custom_templates = await db.templates.find({}, {"_id": 0}).to_list(100)
    
    # If there are custom templates, return them
    if custom_templates:
        return custom_templates
    
    # Otherwise return default templates
    return TEMPLATES

@api_router.get("/stickers", response_model=List[dict])
async def get_stickers():
    """Get available stickers"""
    # Check for custom stickers in database
    custom_stickers = await db.stickers.find({}, {"_id": 0}).to_list(100)
    if custom_stickers:
        return custom_stickers
    return DEFAULT_STICKERS

@api_router.post("/sessions", response_model=dict)
async def create_session(request: CreateSessionRequest):
    """Create a new photo session"""
    session = PhotoSession(template_id=request.template_id)
    doc = session.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.sessions.insert_one(doc)
    return {"session_id": session.id, "short_id": session.short_id, "template_id": session.template_id}

@api_router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    """Get session details"""
    session = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@api_router.post("/sessions/{session_id}/photos")
async def add_photo(session_id: str, request: AddPhotoRequest):
    """Add a photo to the session"""
    session = await db.sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    photos = session.get("photos", [])
    if len(photos) >= 4:
        raise HTTPException(status_code=400, detail="Maximum 4 photos allowed")
    
    photos.append(request.photo_data)
    await db.sessions.update_one(
        {"id": session_id},
        {"$set": {"photos": photos}}
    )
    return {"photo_count": len(photos), "session_id": session_id}

@api_router.post("/sessions/{session_id}/stickers")
async def update_stickers(session_id: str, request: UpdateStickersRequest):
    """Update stickers for a session"""
    session = await db.sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    await db.sessions.update_one(
        {"id": session_id},
        {"$set": {"stickers": request.stickers}}
    )
    return {"success": True}

@api_router.post("/sessions/{session_id}/finalize")
async def finalize_session(session_id: str, request: FinalizeSessionRequest):
    """Finalize session with decorated image and generate video"""
    session = await db.sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Save final image
    final_image_path = UPLOADS_DIR / f"{session_id}_final.png"
    try:
        image_data = base64.b64decode(request.final_image_data.split(",")[1] if "," in request.final_image_data else request.final_image_data)
        with open(final_image_path, "wb") as f:
            f.write(image_data)
    except Exception as e:
        logging.error(f"Error saving final image: {e}")
        raise HTTPException(status_code=400, detail="Invalid image data")
    
    # Generate video from photos at 1920x1080
    video_path = UPLOADS_DIR / f"{session_id}.mp4"
    photos = session.get("photos", [])
    
    if photos:
        try:
            frames = []
            for photo_data in photos:
                img_data = base64.b64decode(photo_data.split(",")[1] if "," in photo_data else photo_data)
                img = Image.open(BytesIO(img_data))
                img = img.convert("RGB")
                
                # Resize photo to 1920x1080 (16:9)
                img_resized = img.resize((1920, 1080), Image.Resampling.LANCZOS)
                
                # Add frame multiple times for duration (1 second per photo at 30fps)
                import numpy as np
                frame_array = np.array(img_resized)
                for _ in range(30):  # 30 frames = 1 second
                    frames.append(frame_array)
            
            # Save as MP4 video
            if frames:
                imageio.mimsave(str(video_path), frames, fps=30, codec='libx264')
        except Exception as e:
            logging.error(f"Error generating video: {e}")
    
    # Update session
    await db.sessions.update_one(
        {"id": session_id},
        {"$set": {
            "status": "completed",
            "final_image_url": f"/api/download/{session_id}/image",
            "video_url": f"/api/download/{session_id}/video"
        }}
    )
    
    return {
        "success": True,
        "session_id": session_id,
        "download_url": f"/api/download/{session_id}/image",
        "video_url": f"/api/download/{session_id}/video"
    }

@api_router.get("/download/{session_id}/image")
async def download_image(session_id: str):
    """Download the final photo strip image"""
    file_path = UPLOADS_DIR / f"{session_id}_final.png"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(file_path, media_type="image/png", filename=f"power-of-ten-{session_id}.png")

@api_router.get("/download/{session_id}/video")
async def download_video(session_id: str):
    """Download the video"""
    file_path = UPLOADS_DIR / f"{session_id}.mp4"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Video not found")
    return FileResponse(file_path, media_type="video/mp4", filename=f"power-of-ten-{session_id}.mp4")

@api_router.get("/qrcode/{session_id}")
async def generate_qrcode(session_id: str):
    """Generate QR code for download page"""
    session = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get share URL from environment - configurable for custom domain
    # Format: https://fotoshare.co/d/26454n5
    share_base_url = os.environ.get('SHARE_BASE_URL', 'https://power-of-ten.preview.emergentagent.com/d')
    short_id = session.get('short_id', session_id[:7])
    download_url = f"{share_base_url}/{short_id}"
    
    # Generate QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(download_url)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    
    return Response(content=buffer.getvalue(), media_type="image/png")

@api_router.get("/share/{session_id}")
async def get_share_data(session_id: str):
    """Get shareable data for a session - supports both full ID and short ID"""
    # Try full ID first
    session = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    
    # If not found, try short_id
    if not session:
        session = await db.sessions.find_one({"short_id": session_id}, {"_id": 0})
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "session_id": session.get("id"),
        "short_id": session.get("short_id"),
        "status": session.get("status"),
        "template_id": session.get("template_id"),
        "photo_count": len(session.get("photos", [])),
        "has_gif": session.get("gif_url") is not None,
        "has_image": session.get("final_image_url") is not None
    }

@api_router.get("/resolve/{short_id}")
async def resolve_short_id(short_id: str):
    """Resolve short ID to full session ID"""
    session = await db.sessions.find_one({"short_id": short_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"session_id": session.get("id"), "short_id": session.get("short_id")}

# ============== ADMIN ENDPOINTS ==============

ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')

# Create directories for admin uploads
STICKERS_DIR = ROOT_DIR / 'static' / 'stickers'
FRAMES_DIR = ROOT_DIR / 'static' / 'frames'
STICKERS_DIR.mkdir(parents=True, exist_ok=True)
FRAMES_DIR.mkdir(parents=True, exist_ok=True)

class AdminLoginRequest(BaseModel):
    password: str

class TemplateCreate(BaseModel):
    id: str
    name: str
    description: str
    background_color: str = "#ffffff"
    frame_color: str = "#f3f4f6"
    text_color: str = "#6b7280"
    template_image_url: Optional[str] = None  # Custom template image
    photo_slots: Optional[List[dict]] = None  # [{x, y, width, height, rotation}]

class StickerCreate(BaseModel):
    name: str
    category: str = "general"

@api_router.post("/admin/login")
async def admin_login(request: AdminLoginRequest):
    """Verify admin password"""
    if request.password == ADMIN_PASSWORD:
        return {"success": True, "message": "Login successful"}
    raise HTTPException(status_code=401, detail="Invalid password")

@api_router.get("/admin/templates")
async def get_admin_templates():
    """Get all templates for admin"""
    templates = await db.templates.find({}, {"_id": 0}).to_list(100)
    if not templates:
        # Return default templates
        return [
            {
                "id": "classic-white",
                "name": "Classic White",
                "description": "Clean white frames with elegant spacing",
                "background_color": "#ffffff",
                "frame_color": "#f3f4f6",
                "text_color": "#6b7280",
                "template_image_url": None,
                "photo_slots": [
                    {"x": 20, "y": 20, "width": 280, "height": 157, "rotation": 0},
                    {"x": 20, "y": 187, "width": 280, "height": 157, "rotation": 0},
                    {"x": 20, "y": 354, "width": 280, "height": 157, "rotation": 0},
                    {"x": 20, "y": 521, "width": 280, "height": 157, "rotation": 0}
                ]
            },
            {
                "id": "modern-dark",
                "name": "Modern Dark",
                "description": "Sleek dark theme with subtle shadows",
                "background_color": "#1f2937",
                "frame_color": "#374151",
                "text_color": "#9ca3af",
                "template_image_url": None,
                "photo_slots": [
                    {"x": 20, "y": 20, "width": 280, "height": 157, "rotation": 0},
                    {"x": 20, "y": 187, "width": 280, "height": 157, "rotation": 0},
                    {"x": 20, "y": 354, "width": 280, "height": 157, "rotation": 0},
                    {"x": 20, "y": 521, "width": 280, "height": 157, "rotation": 0}
                ]
            }
        ]
    return templates

@api_router.post("/admin/templates")
async def create_template(template: TemplateCreate):
    """Create or update a template"""
    template_dict = template.model_dump()
    await db.templates.update_one(
        {"id": template.id},
        {"$set": template_dict},
        upsert=True
    )
    return {"success": True, "template": template_dict}

@api_router.post("/admin/templates/upload-image")
async def upload_template_image(file: UploadFile = File(...)):
    """Upload a template background image"""
    # Generate unique filename
    file_id = f"template_{uuid.uuid4().hex[:8]}"
    file_ext = Path(file.filename).suffix or ".png"
    file_path = FRAMES_DIR / f"{file_id}{file_ext}"
    
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    url = f"/api/static/frames/{file_id}{file_ext}"
    return {"success": True, "url": url}

@api_router.delete("/admin/templates/{template_id}")
async def delete_template(template_id: str):
    """Delete a template"""
    result = await db.templates.delete_one({"id": template_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"success": True}

@api_router.get("/admin/stickers")
async def get_stickers():
    """Get all stickers"""
    stickers = await db.stickers.find({}, {"_id": 0}).to_list(100)
    if not stickers:
        # Return default stickers
        return [
            {"id": "heart", "name": "Heart", "url": "https://cdn-icons-png.flaticon.com/128/833/833472.png", "category": "love"},
            {"id": "star", "name": "Star", "url": "https://cdn-icons-png.flaticon.com/128/1828/1828884.png", "category": "general"},
            {"id": "smile", "name": "Smile", "url": "https://cdn-icons-png.flaticon.com/128/166/166538.png", "category": "emoji"},
            {"id": "party", "name": "Party", "url": "https://cdn-icons-png.flaticon.com/128/3656/3656951.png", "category": "celebration"},
            {"id": "crown", "name": "Crown", "url": "https://cdn-icons-png.flaticon.com/128/3157/3157124.png", "category": "general"},
            {"id": "flower", "name": "Flower", "url": "https://cdn-icons-png.flaticon.com/128/2990/2990818.png", "category": "nature"}
        ]
    return stickers

@api_router.post("/admin/stickers")
async def upload_sticker(
    name: str = "",
    category: str = "general",
    file: UploadFile = File(...)
):
    """Upload a new sticker"""
    # Generate unique ID
    sticker_id = f"sticker_{uuid.uuid4().hex[:8]}"
    
    # Save file
    file_ext = Path(file.filename).suffix or ".png"
    file_path = STICKERS_DIR / f"{sticker_id}{file_ext}"
    
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Create sticker record
    sticker = {
        "id": sticker_id,
        "name": name or file.filename,
        "url": f"/api/static/stickers/{sticker_id}{file_ext}",
        "category": category
    }
    
    await db.stickers.insert_one(sticker)
    
    return {"success": True, "sticker": {k: v for k, v in sticker.items() if k != "_id"}}

@api_router.delete("/admin/stickers/{sticker_id}")
async def delete_sticker(sticker_id: str):
    """Delete a sticker"""
    sticker = await db.stickers.find_one({"id": sticker_id})
    if sticker:
        # Try to delete file
        try:
            url = sticker.get("url", "")
            if "/api/static/stickers/" in url:
                filename = url.split("/")[-1]
                file_path = STICKERS_DIR / filename
                if file_path.exists():
                    file_path.unlink()
        except:
            pass
    
    result = await db.stickers.delete_one({"id": sticker_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sticker not found")
    return {"success": True}

@api_router.post("/admin/stickers/url")
async def add_sticker_url(name: str, url: str, category: str = "general"):
    """Add a sticker from URL"""
    sticker_id = f"sticker_{uuid.uuid4().hex[:8]}"
    sticker = {
        "id": sticker_id,
        "name": name,
        "url": url,
        "category": category
    }
    await db.stickers.insert_one(sticker)
    return {"success": True, "sticker": {k: v for k, v in sticker.items() if k != "_id"}}

# Serve static files for uploaded stickers/frames
from fastapi.staticfiles import StaticFiles

# Mount static directory
@api_router.get("/static/stickers/{filename}")
async def serve_sticker(filename: str):
    file_path = STICKERS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)

@api_router.get("/static/frames/{filename}")
async def serve_frame(filename: str):
    file_path = FRAMES_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)

# Include the router in the main app
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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
