import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
      // Get template info
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
      // Save stickers to backend
      await axios.post(`${API}/sessions/${sessionId}/stickers`, {
        session_id: sessionId,
        stickers: stickers
      });

      // Capture the decorated canvas as image
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: template?.background_color || "#ffffff",
        scale: 2
      });
      const imageData = canvas.toDataURL("image/png");

      // Finalize session
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <header className="py-4 px-6 flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate(`/capture/${sessionId}`)}
            data-testid="back-to-capture-btn"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 
            className="text-2xl font-bold text-slate-900"
            style={{ fontFamily: 'var(--font-heading)' }}
            data-testid="decorate-title"
          >
            Decorate Your Photos
          </h1>
        </div>
        <Button
          onClick={handleFinalize}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700"
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
              Finish & Get QR
            </span>
          )}
        </Button>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sticker Controls */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <Card className="p-4">
              <Tabs defaultValue="stickers">
                <TabsList className="w-full">
                  <TabsTrigger value="stickers" className="flex-1" data-testid="stickers-tab">Stickers</TabsTrigger>
                  <TabsTrigger value="edit" className="flex-1" data-testid="edit-tab">Edit</TabsTrigger>
                </TabsList>

                <TabsContent value="stickers" className="mt-4">
                  <div className="grid grid-cols-3 gap-2">
                    {availableStickers.map((sticker) => (
                      <motion.button
                        key={sticker.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="sticker-palette-item"
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
                </TabsContent>

                <TabsContent value="edit" className="mt-4">
                  {selectedStickerData ? (
                    <div className="space-y-6">
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          Size
                        </label>
                        <div className="flex items-center gap-2">
                          <ZoomOut className="w-4 h-4 text-slate-400" />
                          <Slider
                            value={[selectedStickerData.scale * 100]}
                            onValueChange={([val]) => updateSticker(selectedSticker, { scale: val / 100 })}
                            min={20}
                            max={200}
                            step={5}
                            className="flex-1"
                            data-testid="sticker-size-slider"
                          />
                          <ZoomIn className="w-4 h-4 text-slate-400" />
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          Rotation
                        </label>
                        <div className="flex items-center gap-2">
                          <RotateCw className="w-4 h-4 text-slate-400" />
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
                        className="w-full"
                        data-testid="remove-sticker-btn"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove Sticker
                      </Button>
                    </div>
                  ) : (
                    <p className="text-center text-slate-500 py-8">
                      Select a sticker to edit
                    </p>
                  )}
                </TabsContent>
              </Tabs>

              {/* Active Stickers List */}
              {stickers.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-200">
                  <h4 className="text-sm font-medium text-slate-700 mb-2">
                    Active Stickers ({stickers.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {stickers.map((sticker) => (
                      <button
                        key={sticker.id}
                        className={`w-10 h-10 rounded-lg p-1 transition-all ${
                          selectedSticker === sticker.id
                            ? "ring-2 ring-blue-500 bg-blue-50"
                            : "bg-slate-100 hover:bg-slate-200"
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
            </Card>
          </div>

          {/* Photo Strip Canvas */}
          <div className="lg:col-span-3 order-1 lg:order-2 flex justify-center">
            <div
              ref={canvasRef}
              className="decoration-canvas relative p-4"
              style={{
                width: "400px",
                backgroundColor: template?.background_color || "#f8fafc"
              }}
              onClick={(e) => {
                if (e.target === canvasRef.current) {
                  setSelectedSticker(null);
                }
              }}
              data-testid="decoration-canvas"
            >
              {/* Photo Frames - Square 1080x1080 layout */}
              <div className="grid grid-cols-2 gap-3">
                {photos.map((photo, index) => (
                  <div
                    key={index}
                    className="aspect-square rounded-lg overflow-hidden"
                    style={{ backgroundColor: template?.frame_color || "#ffffff" }}
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
                  className={`sticker-item ${selectedSticker === sticker.id ? "selected" : ""}`}
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
                  className="text-xs font-medium opacity-50"
                  style={{ color: template?.id === 'modern-dark' ? '#ffffff' : '#334155' }}
                >
                  Power of Ten
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur border-t border-slate-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Drag stickers to position them • Click to select • Use sliders to resize and rotate
          </p>
          <Button
            size="lg"
            onClick={handleFinalize}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
            data-testid="bottom-finalize-btn"
          >
            {loading ? "Creating..." : "Finish & Get QR Code"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
