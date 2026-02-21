# Power of Ten - Photobooth Application

## Product Overview
An interactive photobooth web application for capturing, decorating, and sharing photo strips.

## Core Requirements

### Pages & Flow
1. **Template Selection Page** - Choose between photo strip templates
2. **Camera Page** - 1920x1080 display with 3-second countdown, captures 4 photos (16:9)
3. **Decoration Page** - Add stickers to captured photos
4. **Result Page** - Display QR code for sharing
5. **QR Download Page** - Mobile-friendly gallery with download/share
6. **Admin Panel** (`/admin`) - Manage templates and stickers

### Design System
- **Art Style**: Drawing/sketchy aesthetic
- **Colors**: Cream (#fef9f3) and pink (#f9a8d4) palette
- **Fonts**: Handwritten style (Gochi Hand)

### Technical Specs
- Photo aspect ratio: 16:9
- Photo strip layout: 2x6 vertical format
- Output format: MP4 video
- Short URL format: domain.com/d/short_id

## Architecture

```
/app/
├── backend/
│   ├── server.py        # FastAPI - sessions, uploads, video, admin APIs
│   ├── static/
│   │   ├── stickers/    # Uploaded sticker files
│   │   └── frames/      # Uploaded frame files
│   └── .env             # ADMIN_PASSWORD, SHARE_BASE_URL, etc.
└── frontend/
    └── src/
        ├── pages/
        │   ├── TemplateSelectionPage.jsx
        │   ├── CameraCapturePage.jsx
        │   ├── DecorationPage.jsx
        │   ├── ResultPage.jsx
        │   ├── DownloadPage.jsx
        │   ├── ShortUrlPage.jsx
        │   └── AdminPage.jsx        # NEW - Admin panel
        └── index.css
```

## Admin Panel Features

### Access
- URL: `/admin`
- Password: Set via `ADMIN_PASSWORD` in backend `.env` (default: `admin123`)

### Templates Management
- Create new templates with custom ID, name, description
- Set background color and frame color with color pickers
- Edit existing templates
- Delete templates

### Stickers Management
- Upload PNG/JPG image files directly
- Add stickers from external URLs
- Delete stickers
- Stickers automatically available in decoration page

## Key API Endpoints

### Public APIs
- `POST /api/sessions` - Create session
- `GET /api/templates` - Get templates (checks DB first)
- `GET /api/stickers` - Get stickers (checks DB first)
- `GET /api/sessions/{id}` - Get session with photos
- `GET /api/download/{id}/image` - Download photo strip
- `GET /api/download/{id}/video` - Download MP4 video

### Admin APIs
- `POST /api/admin/login` - Verify admin password
- `GET /api/admin/templates` - List templates
- `POST /api/admin/templates` - Create/update template
- `DELETE /api/admin/templates/{id}` - Delete template
- `GET /api/admin/stickers` - List stickers
- `POST /api/admin/stickers` - Upload sticker file
- `POST /api/admin/stickers/url` - Add sticker from URL
- `DELETE /api/admin/stickers/{id}` - Delete sticker

## Deployment to Custom Domain

### Environment Variables
```env
# backend/.env
ADMIN_PASSWORD=your_secure_password
SHARE_BASE_URL=https://yourdomain.com/d

# frontend/.env
REACT_APP_BACKEND_URL=https://yourdomain.com
```

### Steps
1. Download code from Emergent
2. Deploy backend (FastAPI) and frontend (React) to your hosting
3. Set up MongoDB database
4. Configure environment variables
5. Point your domain DNS to your server

## What's Implemented ✅

### Core Features
- Full photobooth flow: Template → Camera → Decorate → QR → Download
- 16:9 photos, 2x6 vertical strip, MP4 video generation
- Short URL sharing system
- Drawing/sketch theme with cream/pink colors

### Admin Panel (Feb 21, 2026)
- Password-protected admin panel at `/admin`
- Templates management (CRUD)
- Stickers management (upload files, add URLs, delete)
- Templates/stickers stored in MongoDB
- Auto-loaded in main app pages

### Bug Fixes (Feb 21, 2026)
- Fixed QR page photos not loading (base64 URL handling)
- Fixed camera monitor size (bigger)
- Fixed decoration preview size (bigger)
- Fixed gallery thumbnails (smaller with frames)

## Pending Tasks

### P1 - High Priority
- **Real Camera Integration**: Replace mock with react-webcam

### P2 - Future
- **Print Functionality**: Browser print API integration

## Database Collections

### sessions
- `id`, `short_id`, `template_id`, `photos`, `final_image_url`, `video_url`, `status`

### templates
- `id`, `name`, `description`, `background_color`, `frame_color`, `text_color`

### stickers
- `id`, `name`, `url`, `category`
