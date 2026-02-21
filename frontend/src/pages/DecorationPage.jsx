import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Check, Trash2, RotateCw, ZoomIn, ZoomOut, ArrowRight, ArrowLeft } from "lucide-react";
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
      x: 120,
      y: 120,
      scale: 1,
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

  const handleFinalize = async () => {
    if (!canvasRef.current) return;
    
    setLoading(true);
    try {
      await axios.post(`${API}/sessions/${sessionId}/stickers`, {
        session_id: sessionId,
        stickers: stickers
      });

      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: template?.background_color || "#fef9f3",
        scale: 2
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
    <div className="min-h-screen paper-bg">
      {/* Header */}
      <header className="py-4 px-6 flex items-center justify-between border-b-2 border-dashed border-gray-300">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate(`/capture/${sessionId}`)}
            className="hover:bg-pink-50"
            data-testid="back-to-capture-btn"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 
            className="text-3xl font-bold text-gray-800"
            style={{ fontFamily: 'var(--font-heading)' }}
            data-testid="decorate-title"
          >
            🎨 Add Some Fun!
          </h1>
        </div>
        <Button
          onClick={handleFinalize}
          disabled={loading}
          className="btn-sketch bg-green-500 hover:bg-green-600 text-white"
          data-testid="finalize-btn"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creating...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              Done! Get QR
            </span>
          )}
        </Button>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sticker Controls */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="sketch-border bg-white p-4" style={{ transform: 'rotate(-1deg)' }}>
              <Tabs defaultValue="stickers">
                <TabsList className="w-full bg-gray-100">
                  <TabsTrigger value="stickers" className="flex-1" data-testid="stickers-tab">
                    Stickers ✨
                  </TabsTrigger>
                  <TabsTrigger value="edit" className="flex-1" data-testid="edit-tab">
                    Edit 🎛️
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="stickers" className="mt-4">
                  <div className="grid grid-cols-3 gap-2">
                    {availableStickers.map((sticker) => (
                      <motion.button
                        key={sticker.id}
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-2 rounded-lg bg-gray-50 hover:bg-pink-50 border-2 border-dashed border-gray-200 hover:border-pink-300 transition-colors"
                        onClick={() => addSticker(sticker)}
                        data-testid={`add-sticker-${sticker.id}`}
                      >
                        <img
                          src={sticker.url}
                          alt={sticker.name}
                          className="w-full h-12 object-contain"
                        />
                      </motion.button>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="edit" className="mt-4">
                  {selectedStickerData ? (
                    <div className="space-y-6">
                      <div>
                        <label 
                          className="text-sm font-medium text-gray-700 mb-2 block"
                          style={{ fontFamily: 'var(--font-handwritten)' }}
                        >
                          Size
                        </label>
                        <div className="flex items-center gap-2">
                          <ZoomOut className="w-4 h-4 text-gray-400" />
                          <Slider
                            value={[selectedStickerData.scale * 100]}
                            onValueChange={([val]) => updateSticker(selectedSticker, { scale: val / 100 })}
                            min={20}
                            max={200}
                            step={5}
                            className="flex-1"
                            data-testid="sticker-size-slider"
                          />
                          <ZoomIn className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>

                      <div>
                        <label 
                          className="text-sm font-medium text-gray-700 mb-2 block"
                          style={{ fontFamily: 'var(--font-handwritten)' }}
                        >
                          Rotation
                        </label>
                        <div className="flex items-center gap-2">
                          <RotateCw className="w-4 h-4 text-gray-400" />
                          <Slider
                            value={[selectedStickerData.rotation]}
                            onValueChange={([val]) => updateSticker(selectedSticker, { rotation: val })}
                            min={-180}
                            max={180}
                            step={5}
                            className="flex-1"
                            data-testid="sticker-rotation-slider"
                          />
                        </div>
                      </div>

                      <Button
                        variant="destructive"
                        onClick={() => removeSticker(selectedSticker)}
                        className="w-full btn-sketch"
                        data-testid="remove-sticker-btn"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <p 
                      className="text-center text-gray-500 py-8"
                      style={{ fontFamily: 'var(--font-handwritten)' }}
                    >
                      Tap a sticker to edit it! ☝️
                    </p>
                  )}
                </TabsContent>
              </Tabs>

              {stickers.length > 0 && (
                <div className="mt-4 pt-4 border-t-2 border-dashed border-gray-200">
                  <h4 
                    className="text-sm font-medium text-gray-700 mb-2"
                    style={{ fontFamily: 'var(--font-handwritten)' }}
                  >
                    Active Stickers ({stickers.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {stickers.map((sticker) => (
                      <button
                        key={sticker.id}
                        className={`w-10 h-10 rounded-lg p-1 transition-all border-2 ${
                          selectedSticker === sticker.id
                            ? "border-pink-500 bg-pink-50"
                            : "border-gray-200 bg-gray-50 hover:border-pink-300"
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
          </div>

          {/* Photo Strip Canvas */}
          <div className="lg:col-span-3 order-1 lg:order-2 flex justify-center">
            <div
              ref={canvasRef}
              className="photo-frame-sketch relative p-4"
              style={{
                width: "400px",
                backgroundColor: template?.background_color || "#fef9f3"
              }}
              onClick={(e) => {
                if (e.target === canvasRef.current) {
                  setSelectedSticker(null);
                }
              }}
              data-testid="decoration-canvas"
            >
              {/* Photo Frames */}
              <div className="grid grid-cols-2 gap-3">
                {photos.map((photo, index) => (
                  <div
                    key={index}
                    className="aspect-square rounded overflow-hidden border-2 border-gray-300"
                    style={{ 
                      backgroundColor: template?.frame_color || "#ffffff",
                      transform: `rotate(${index % 2 === 0 ? -1 : 1}deg)`
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
                    className="w-16 h-16 object-contain pointer-events-none"
                    draggable={false}
                  />
                </motion.div>
              ))}

              {/* Branding */}
              <div className="mt-4 text-center">
                <p 
                  className="text-sm font-bold text-gray-400"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  ✨ Power of Ten ✨
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur border-t-2 border-dashed border-gray-200">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <p 
            className="text-sm text-gray-500"
            style={{ fontFamily: 'var(--font-handwritten)' }}
          >
            Drag stickers around • Tap to select • Resize & rotate!
          </p>
          <Button
            size="lg"
            onClick={handleFinalize}
            disabled={loading}
            className="btn-sketch bg-green-500 hover:bg-green-600 text-white"
            data-testid="bottom-finalize-btn"
          >
            {loading ? "Creating..." : "Done! Get QR →"}
          </Button>
        </div>
      </div>
    </div>
  );
}
