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
      x: 100,
      y: 100,
      scale: 1.5,
      rotation: 0
    };
    setStickers(prev => [...prev, newSticker]);
    setSelectedSticker(newSticker.id);
  };

  const updateSticker = (id, updates) => {
    setStickers(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const removeSticker = (id) => {
    setStickers(prev => prev.filter(s => s.id !== id));
    if (selectedSticker === id) setSelectedSticker(null);
  };

  const handleMouseDown = (e, sticker) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    setDragging(sticker.id);
    setDragOffset({ x: e.clientX - rect.left - sticker.x, y: e.clientY - rect.top - sticker.y });
    setSelectedSticker(sticker.id);
  };

  const handleMouseMove = useCallback((e) => {
    if (!dragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    updateSticker(dragging, { x: e.clientX - rect.left - dragOffset.x, y: e.clientY - rect.top - dragOffset.y });
  }, [dragging, dragOffset]);

  const handleMouseUp = () => setDragging(null);

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
      await axios.post(`${API}/sessions/${sessionId}/stickers`, { session_id: sessionId, stickers });
      const canvas = await html2canvas(canvasRef.current, { backgroundColor: template?.background_color || "#fef9f3", scale: 2 });
      const imageData = canvas.toDataURL("image/png");
      await axios.post(`${API}/sessions/${sessionId}/finalize`, { session_id: sessionId, final_image_data: imageData });
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
    <div className="h-screen w-screen overflow-hidden paper-bg flex">
      {/* Sticker Panel */}
      <div className="w-96 flex flex-col p-6 overflow-y-auto">
        <div className="sketch-border bg-white p-4 flex-1">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center" style={{ fontFamily: 'var(--font-heading)' }}>
            🎨 Stickers
          </h2>
          
          <div className="grid grid-cols-3 gap-3 mb-6">
            {availableStickers.map((sticker) => (
              <motion.button
                key={sticker.id}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-3 rounded-xl bg-gray-50 hover:bg-pink-50 border-2 border-dashed border-gray-200 hover:border-pink-300 aspect-square"
                onClick={() => addSticker(sticker)}
              >
                <img src={sticker.url} alt={sticker.name} className="w-full h-full object-contain" />
              </motion.button>
            ))}
          </div>

          {selectedStickerData && (
            <div className="space-y-4 p-4 bg-pink-50 rounded-xl border-2 border-dashed border-pink-200">
              <h3 className="text-lg font-bold text-gray-700 text-center" style={{ fontFamily: 'var(--font-handwritten)' }}>Edit Sticker</h3>
              <div>
                <label className="text-sm text-gray-600 mb-2 block flex items-center gap-2">
                  <ZoomOut className="w-4 h-4" /> Size <ZoomIn className="w-4 h-4 ml-auto" />
                </label>
                <Slider value={[selectedStickerData.scale * 100]} onValueChange={([val]) => updateSticker(selectedSticker, { scale: val / 100 })} min={50} max={300} step={10} />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-2 block flex items-center gap-2">
                  <RotateCw className="w-4 h-4" /> Rotation
                </label>
                <Slider value={[selectedStickerData.rotation]} onValueChange={([val]) => updateSticker(selectedSticker, { rotation: val })} min={-180} max={180} step={5} />
              </div>
              <Button variant="destructive" onClick={() => removeSticker(selectedSticker)} className="w-full">
                <Trash2 className="w-4 h-4 mr-2" /> Remove
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Photo Strip Canvas - BIGGER */}
      <div className="flex-1 flex items-center justify-center">
        <div
          ref={canvasRef}
          className="relative"
          style={{ 
            width: template?.template_image_url ? "auto" : "400px",
            backgroundColor: template?.template_image_url ? "transparent" : (template?.background_color || "#fef9f3"),
            padding: template?.template_image_url ? "0" : "20px"
          }}
          onClick={(e) => { if (e.target === canvasRef.current) setSelectedSticker(null); }}
        >
          {/* Custom Template Image */}
          {template?.template_image_url ? (
            <div className="relative">
              <img 
                src={template.template_image_url.startsWith('http') ? template.template_image_url : `${API.replace('/api', '')}${template.template_image_url}`}
                alt="Template"
                className="max-h-[700px]"
                style={{ display: 'block' }}
              />
              {/* Photos positioned on template */}
              {photos.map((photo, index) => {
                const slot = template.photo_slots?.[index] || { x: 20, y: 20 + index * 167, width: 280, height: 157 };
                return (
                  <div
                    key={index}
                    className="absolute overflow-hidden"
                    style={{
                      left: `${slot.x}px`,
                      top: `${slot.y}px`,
                      width: `${slot.width}px`,
                      height: `${slot.height}px`,
                      transform: slot.rotation ? `rotate(${slot.rotation}deg)` : undefined
                    }}
                  >
                    <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                  </div>
                );
              })}
            </div>
          ) : (
            /* Default Layout */
            <div className="sketch-border p-5" style={{ backgroundColor: template?.background_color || "#fef9f3" }}>
              <div className="flex flex-col gap-4">
                {photos.map((photo, index) => (
                  <div
                    key={index}
                    className="rounded overflow-hidden border-2"
                    style={{ aspectRatio: "16/9", backgroundColor: template?.frame_color || "#ffffff", borderColor: template?.id === 'modern-dark' ? '#374151' : '#d1d5db' }}
                  >
                    <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
                <div className="text-center py-2">
                  <p className="text-sm font-bold" style={{ fontFamily: 'var(--font-heading)', color: template?.id === 'modern-dark' ? '#9ca3af' : '#6b7280' }}>
                    ✨ Power of Ten ✨
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Stickers overlay */}
          {stickers.map((sticker) => (
            <motion.div
              key={sticker.id}
              className={`absolute cursor-move ${selectedSticker === sticker.id ? "ring-2 ring-pink-400 ring-offset-2" : ""}`}
              style={{ left: sticker.x, top: sticker.y, transform: `scale(${sticker.scale}) rotate(${sticker.rotation}deg)`, zIndex: selectedSticker === sticker.id ? 100 : 10 }}
              onMouseDown={(e) => handleMouseDown(e, sticker)}
            >
              <img src={sticker.url} alt={sticker.name} className="w-16 h-16 object-contain pointer-events-none" draggable={false} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Print Button */}
      <div className="w-64 flex items-center justify-center p-6">
        <Button
          size="lg"
          onClick={handlePrint}
          disabled={loading}
          className="btn-sketch px-12 py-12 text-2xl bg-pink-400 hover:bg-pink-500 text-white flex-col h-auto"
        >
          {loading ? (
            <>
              <span className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-3" />
              <span>Creating...</span>
            </>
          ) : (
            <>
              <Printer className="w-16 h-16 mb-3" />
              <span>Print!</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
