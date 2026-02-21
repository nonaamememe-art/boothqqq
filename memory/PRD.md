# Power of Ten - Photobooth Application

## Product Overview
An interactive photobooth web application for capturing, decorating, and sharing photo strips.

## Core Requirements

### Pages & Flow
1. **Template Selection Page** - Choose between photo strip templates (Classic White, Modern Dark)
2. **Camera Page** - 1920x1080 display with 3-second countdown, captures 4 photos (16:9 aspect ratio)
3. **Decoration Page** - Add stickers to captured photos
4. **Result Page** - Display QR code for sharing
5. **QR Download Page** - Mobile-friendly gallery with download/share options

### Design System
- **Art Style**: Drawing/sketchy aesthetic
- **Colors**: Cream (#fef9f3) and pink (#f9a8d4) palette
- **Fonts**: Handwritten style (Gochi Hand)
- **Borders**: Sketch-style with slight rotation effect

### Technical Specs
- Photo aspect ratio: 16:9
- Photo strip layout: 2x6 vertical format
- Output format: MP4 video (not GIF)
- Short URL format: domain.com/d/short_id

## Architecture

```
/app/
├── backend/
│   ├── server.py        # FastAPI - sessions, uploads, video generation
│   └── requirements.txt
└── frontend/
    └── src/
        ├── pages/
        │   ├── TemplateSelectionPage.jsx
        │   ├── CameraCapturePage.jsx
        │   ├── DecorationPage.jsx
        │   ├── ResultPage.jsx
        │   ├── DownloadPage.jsx      # /d/:shortId route
        │   └── ShortUrlPage.jsx      # /i/:shortId route
        └── index.css    # Global styles, theme
```

## Key API Endpoints
- `POST /api/sessions` - Create session
- `POST /api/sessions/{id}/finalize` - Create photo strip + MP4
- `GET /api/sessions/{id}` - Get session with photos
- `GET /api/resolve/{shortId}` - Resolve short ID to session ID
- `GET /api/download/{id}/image` - Download photo strip
- `GET /api/download/{id}/video` - Download MP4 video

## Database Schema (MongoDB)
**Collection: sessions**
- `id`: string (UUID)
- `short_id`: string (7 char)
- `photos`: array of base64 data URLs
- `final_image_url`: string (path to photo strip)
- `video_url`: string (path to MP4)
- `template_id`: string
- `status`: string

## What's Implemented ✅

### Session 1 (Initial Build)
- Full-stack app structure (React + FastAPI + MongoDB)
- Complete user flow: Template → Camera → Decorate → QR → Download
- 16:9 photo aspect ratio
- 2x6 vertical photo strip layout
- MP4 video generation (using imageio + ffmpeg)
- Short URL sharing system
- Drawing/sketch theme with cream/pink colors

### Session 2 (Bug Fixes - Feb 21, 2026)
- Fixed Camera page layout - monitor now bigger (maxWidth: 1100px)
- Fixed "Your Strip" preview panel display
- Moved Snap button under camera monitor
- Fixed QR/Download page:
  - Photos now loading correctly (base64 URL handling)
  - Gallery-style layout with arrows and counter
  - Smaller thumbnails with white frame
- Made Decoration page preview bigger (400px)
- Both /d/ and /i/ routes working for short URLs

## Pending Tasks

### P1 - High Priority
- **Real Camera Integration**: Replace mock with react-webcam
- **User-Provided Assets**: Accept custom templates/stickers

### P2 - Future
- **Print Functionality**: Browser print API integration

## 3rd Party Dependencies
- `imageio[ffmpeg]` - MP4 video generation
- `Pillow` - Image manipulation
- `shortuuid` - Short ID generation
- `framer-motion` - Animations
- `html2canvas` - Photo strip capture
