import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Printer, Trash2, RotateCw, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import html2canvas from "html2canvas";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function DecorationPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const location = useLocation();
  const canvasRef = useRef(null);

  const [photos, setPhotos] = useState(location.state?.photos || []);
  const [stickers, setStickers] = useState([]);
  const [availableStickers, setAvailableStickers] = useState([]);
  const [selectedSticker, setSelectedSticker] = useState(null);
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    fetchSessionData();
    fetchStickers();
  }, [sessionId]);

  const fetchSessionData = async () => {
    try {
      const response = await axios.get(`${API}/sessions/${sessionId}`);
      if (response.data.photos && response.data.photos.length > 0) {
        setPhotos(response.data.photos);
      }
      const templatesRes = await axios.get(`${API}/templates`);
      const currentTemplate = templatesRes.data.find(t => t.id === response.data.template_id);
      setTemplate(currentTemplate);
    } catch (error) {
      console.error("Error fetching session:", error);
    }
  };

  const fetchStickers = async () => {
    try {
      const response = await axios.get(`${API}/stickers`);
      setAvailableStickers(response.data);
    } catch (error) {
      console.error("Error fetching stickers:", error);
    }
  };

  const addSticker = (stickerData) => {
    const newSticker = {
      id: `sticker-${Date.now()}`,
      ...stickerData,
      x: 150,
      y: 150,
      scale: 1.5,
      rotation: 0
    };
    setStickers(prev => [...prev, newSticker]);
    setSelectedSticker(newSticker.id);
  };

  const updateSticker = (id, updates) => {
    setStickers(prev => prev.map(s => 
      s.id === id ? { ...s, ...updates } : s
    ));
  };

  const removeSticker = (id) => {
    setStickers(prev => prev.filter(s => s.id !== id));
    if (selectedSticker === id) {
      setSelectedSticker(null);
    }
  };

  const handleMouseDown = (e, sticker) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    setDragging(sticker.id);
    setDragOffset({
      x: e.clientX - rect.left - sticker.x,
      y: e.clientY - rect.top - sticker.y
    });
    setSelectedSticker(sticker.id);
  };

  const handleMouseMove = useCallback((e) => {
    if (!dragging || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - dragOffset.x;
    const y = e.clientY - rect.top - dragOffset.y;
    
    updateSticker(dragging, { x, y });
  }, [dragging, dragOffset]);

  const handleMouseUp = () => {
    setDragging(null);
  };

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove]);

  const handlePrint = async () => {
    if (!canvasRef.current) return;
    
    setLoading(true);
    try {
      await axios.post(`${API}/sessions/${sessionId}/stickers`, {
        session_id: sessionId,
        stickers: stickers
      });

      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: template?.background_color || "#fef9f3",
        scale: 2,
        width: 640,
        height: 1920
      });
      const imageData = canvas.toDataURL("image/png");

      await axios.post(`${API}/sessions/${sessionId}/finalize`, {
        session_id: sessionId,
        final_image_data: imageData
      });

      toast.success("Photo strip created!");
      navigate(`/result/${sessionId}`);
    } catch (error) {
      console.error("Error finalizing:", error);
      toast.error("Failed to create photo strip");
    } finally {
      setLoading(false);
    }
  };

  const selectedStickerData = stickers.find(s => s.id === selectedSticker);

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Sticker Panel - Left Side */}
      <div className="w-96 p-6 bg-gray-800 overflow-y-auto">
        <h2 
          className="text-3xl font-bold text-white mb-6 text-center"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          🎨 Stickers
        </h2>
        
        {/* Sticker Grid - Bigger stickers */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {availableStickers.map((sticker) => (
            <motion.button
              key={sticker.id}
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
              className="p-4 rounded-xl bg-gray-700 hover:bg-gray-600 border-2 border-dashed border-gray-500 hover:border-pink-400 transition-colors aspect-square"
              onClick={() => addSticker(sticker)}
              data-testid={`add-sticker-${sticker.id}`}
            >
              <img
                src={sticker.url}
                alt={sticker.name}
                className="w-full h-full object-contain"
              />
            </motion.button>
          ))}
        </div>

        {/* Edit Controls */}
        {selectedStickerData && (
          <div className="space-y-6 p-4 bg-gray-700 rounded-xl">
            <h3 
              className="text-xl font-bold text-white text-center"
              style={{ fontFamily: 'var(--font-handwritten)' }}
            >
              Edit Sticker
            </h3>
            
            <div>
              <label className="text-sm text-gray-300 mb-2 block flex items-center gap-2">
                <ZoomOut className="w-4 h-4" /> Size <ZoomIn className="w-4 h-4 ml-auto" />
              </label>
              <Slider
                value={[selectedStickerData.scale * 100]}
                onValueChange={([val]) => updateSticker(selectedSticker, { scale: val / 100 })}
                min={50}
                max={300}
                step={10}
                className="w-full"
                data-testid="sticker-size-slider"
              />
            </div>

            <div>
              <label className="text-sm text-gray-300 mb-2 block flex items-center gap-2">
                <RotateCw className="w-4 h-4" /> Rotation
              </label>
              <Slider
                value={[selectedStickerData.rotation]}
                onValueChange={([val]) => updateSticker(selectedSticker, { rotation: val })}
                min={-180}
                max={180}
                step={5}
                className="w-full"
                data-testid="sticker-rotation-slider"
              />
            </div>

            <Button
              variant="destructive"
              onClick={() => removeSticker(selectedSticker)}
              className="w-full"
              data-testid="remove-sticker-btn"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remove
            </Button>
          </div>
        )}

        {/* Active Stickers */}
        {stickers.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm text-gray-400 mb-3" style={{ fontFamily: 'var(--font-handwritten)' }}>
              Active Stickers ({stickers.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {stickers.map((sticker) => (
                <button
                  key={sticker.id}
                  className={`w-14 h-14 rounded-lg p-2 transition-all ${
                    selectedSticker === sticker.id
                      ? "ring-2 ring-pink-500 bg-gray-600"
                      : "bg-gray-700 hover:bg-gray-600"
                  }`}
                  onClick={() => setSelectedSticker(sticker.id)}
                >
                  <img
                    src={sticker.url}
                    alt={sticker.name}
                    className="w-full h-full object-contain"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Photo Strip Canvas - Center (BIGGER) */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div
          ref={canvasRef}
          className="relative rounded-lg shadow-2xl"
          style={{
            width: "320px",
            height: "960px",
            backgroundColor: template?.background_color || "#fef9f3",
            padding: "16px"
          }}
          onClick={(e) => {
            if (e.target === canvasRef.current) {
              setSelectedSticker(null);
            }
          }}
          data-testid="decoration-canvas"
        >
          {/* Photo Frames - 2x6 vertical strip */}
          <div className="flex flex-col gap-3 h-full">
            {photos.map((photo, index) => (
              <div
                key={index}
                className="flex-1 rounded overflow-hidden border-2"
                style={{ 
                  backgroundColor: template?.frame_color || "#ffffff",
                  borderColor: template?.id === 'modern-dark' ? '#374151' : '#d1d5db',
                }}
                data-testid={`decorated-photo-${index}`}
              >
                <img
                  src={photo}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
            
            {/* Branding at bottom */}
            <div className="text-center py-2">
              <p 
                className="text-lg font-bold"
                style={{ 
                  fontFamily: 'var(--font-heading)',
                  color: template?.id === 'modern-dark' ? '#9ca3af' : '#6b7280'
                }}
              >
                ✨ Power of Ten ✨
              </p>
            </div>
          </div>

          {/* Stickers Layer */}
          {stickers.map((sticker) => (
            <motion.div
              key={sticker.id}
              className={`absolute cursor-move ${selectedSticker === sticker.id ? "ring-2 ring-pink-500 ring-offset-2" : ""}`}
              style={{
                left: sticker.x,
                top: sticker.y,
                transform: `scale(${sticker.scale}) rotate(${sticker.rotation}deg)`,
                zIndex: selectedSticker === sticker.id ? 100 : 10
              }}
              onMouseDown={(e) => handleMouseDown(e, sticker)}
              data-testid={`placed-sticker-${sticker.id}`}
            >
              <img
                src={sticker.url}
                alt={sticker.name}
                className="w-20 h-20 object-contain pointer-events-none"
                draggable={false}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Print Button - Right Side */}
      <div className="w-64 p-6 flex items-center justify-center">
        <Button
          size="lg"
          onClick={handlePrint}
          disabled={loading}
          className="btn-sketch px-12 py-10 text-2xl bg-green-500 hover:bg-green-600 text-white flex-col h-auto"
          data-testid="print-btn"
        >
          {loading ? (
            <>
              <span className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin mb-2" />
              <span>Creating...</span>
            </>
          ) : (
            <>
              <Printer className="w-16 h-16 mb-2" />
              <span>Print!</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
