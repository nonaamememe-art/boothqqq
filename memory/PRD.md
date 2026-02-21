# Power of Ten - Photobooth App PRD

## Original Problem Statement
Build an interactive photobooth app with filters, decorative stickers, and print-ready photo strips. The app needs:
1. Template selection page (2 templates, 4-picture 2x6 paper format)
2. Camera/monitor page (1920x1080) with 3-second countdown and auto-capture
3. Decoration page with stickers
4. QR code generation for download page
5. GIF creation from 4 photos arranged together

App name: **Power of Ten**

## User Personas
- **Event Attendees**: People at parties, weddings, corporate events who want fun photo memories
- **Event Organizers**: Those setting up photobooth stations at venues
- **Social Media Users**: People who want shareable photo content

## Core Requirements (Static)
- [x] 2 photo strip templates (Classic White, Modern Dark)
- [x] 4-picture vertical layout (2x6 paper aspect ratio)
- [x] 3-second countdown timer for photo capture
- [x] 8 placeholder stickers for decoration
- [x] Drag-and-drop sticker placement
- [x] Sticker resize and rotation controls
- [x] QR code generation linking to download page
- [x] GIF creation from 4 photos
- [x] Public download page

## What's Been Implemented (February 21, 2026)

### Phase 1 - MVP Complete
- **Template Selection Page**: Choose between Classic White and Modern Dark themes
- **Camera Capture Page**: Webcam integration with 3-sec countdown, auto-capture mode
- **Decoration Page**: Add/edit stickers with size and rotation controls
- **Result Page**: QR code display, download buttons for image and GIF
- **Download Page**: Public shareable page for downloading photos

### Technical Implementation
- **Backend**: FastAPI with MongoDB storage
- **Frontend**: React with Framer Motion animations
- **APIs**: 
  - GET /api/templates - Returns 2 templates
  - GET /api/stickers - Returns 8 placeholder stickers
  - POST /api/sessions - Create photo session
  - GET /api/sessions/{id} - Get session details
  - POST /api/sessions/{id}/photos - Add photo to session
  - POST /api/sessions/{id}/stickers - Update stickers
  - POST /api/sessions/{id}/finalize - Generate final image and GIF
  - GET /api/qrcode/{id} - Generate QR code
  - GET /api/download/{id}/image - Download photo strip
  - GET /api/download/{id}/gif - Download animated GIF

## Prioritized Backlog

### P0 - Critical (User requested for later)
- [ ] Upload custom templates
- [ ] Upload custom stickers
- [ ] Real camera hardware integration

### P1 - High Priority
- [ ] Print functionality for physical photo strips
- [ ] Multiple photo strip layouts (horizontal, grid)
- [ ] Undo/redo for sticker placement

### P2 - Nice to Have
- [ ] Photo filters (brightness, contrast, vintage)
- [ ] Text overlay on photos
- [ ] Email sharing option
- [ ] Social media direct sharing

## Next Tasks
1. User to upload custom templates
2. User to upload custom stickers
3. Add camera hardware integration for production photobooth
4. Consider adding print functionality
