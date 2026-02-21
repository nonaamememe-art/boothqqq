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
                
                # Create 1920x1080 frame with photo centered
                frame = Image.new("RGB", (1920, 1080), (20, 20, 20))
                # Resize photo to fit in frame (centered square)
                photo_size = 1000
                img_resized = img.resize((photo_size, photo_size), Image.Resampling.LANCZOS)
                x_offset = (1920 - photo_size) // 2
                y_offset = (1080 - photo_size) // 2
                frame.paste(img_resized, (x_offset, y_offset))
                
                # Add frame multiple times for duration (1 second per photo at 30fps)
                import numpy as np
                frame_array = np.array(frame)
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
    # Format: https://fotoshare.co/i/26454n5
    share_base_url = os.environ.get('SHARE_BASE_URL', 'https://filter-frame-lab.preview.emergentagent.com/i')
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
