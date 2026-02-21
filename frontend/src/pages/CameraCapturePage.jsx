import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Camera, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function CameraCapturePage() {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const isCapturingRef = useRef(false);

  const [photos, setPhotos] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [template, setTemplate] = useState(null);

  useEffect(() => {
    initCamera();
    fetchTemplate();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const fetchTemplate = async () => {
    try {
      const sessionRes = await axios.get(`${API}/sessions/${sessionId}`);
      const templatesRes = await axios.get(`${API}/templates`);
      const currentTemplate = templatesRes.data.find(t => t.id === sessionRes.data.template_id);
      setTemplate(currentTemplate);
    } catch (error) {
      console.error("Error fetching template:", error);
    }
  };

  const initCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: "user"
        },
        audio: false
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setCameraReady(true);
        };
      }
    } catch (error) {
      console.error("Camera error:", error);
      setCameraError("Camera access denied. Please allow camera access and refresh.");
      toast.error("Camera access denied");
    }
  };

  const capturePhoto = useCallback(async () => {
    if (isCapturingRef.current) return null;
    if (!videoRef.current || !canvasRef.current || photos.length >= 4) return null;

    isCapturingRef.current = true;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Capture at 16:9 aspect ratio (1920x1080)
    canvas.width = 1920;
    canvas.height = 1080;

    // Draw video frame (mirrored)
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -1920, 0, 1920, 1080);
    ctx.restore();

    const photoData = canvas.toDataURL("image/jpeg", 0.9);
    
    const newPhotos = [...photos, photoData];
    setPhotos(newPhotos);

    try {
      await axios.post(`${API}/sessions/${sessionId}/photos`, {
        session_id: sessionId,
        photo_data: photoData
      });
    } catch (error) {
      console.error("Error saving photo:", error);
    }

    isCapturingRef.current = false;
    return photoData;
  }, [photos, sessionId]);

  const startCountdown = useCallback(() => {
    if (isCapturing || photos.length >= 4) return;
    
    setIsCapturing(true);
    setCountdown(3);

    let count = 3;
    const countdownInterval = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(countdownInterval);
        setCountdown(null);
        capturePhoto().then(() => {
          setIsCapturing(false);
        });
      } else {
        setCountdown(count);
      }
    }, 1000);
  }, [isCapturing, photos.length, capturePhoto]);

  const proceedToDecorate = () => {
    if (photos.length === 0) {
      toast.error("Please capture at least one photo");
      return;
    }
    navigate(`/decorate/${sessionId}`, { state: { photos } });
  };

  return (
    <div className="min-h-screen paper-bg flex flex-col">
      {/* Header */}
      <header className="py-4 px-6 text-center">
        <h1 
          className="text-4xl font-bold text-gray-800"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          📸 Say Cheese!
        </h1>
        <p 
          className="text-gray-500 mt-1"
          style={{ fontFamily: 'var(--font-handwritten)' }}
        >
          Photo {Math.min(photos.length + 1, 4)} of 4
        </p>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center gap-8 px-6 pb-6">
        {/* Camera Monitor - 16:9 aspect ratio */}
        <div className="flex-shrink-0">
          <div 
            className="relative rounded-2xl overflow-hidden sketch-border bg-white"
            style={{ width: "640px", aspectRatio: "16/9" }}
            data-testid="camera-view"
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
            <canvas ref={canvasRef} className="hidden" />

            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="text-center p-6">
                  <div className="text-6xl mb-4">📷</div>
                  <p className="text-lg text-gray-600 mb-4" style={{ fontFamily: 'var(--font-handwritten)' }}>
                    {cameraError}
                  </p>
                  <Button 
                    className="btn-sketch bg-pink-400 hover:bg-pink-500 text-white"
                    onClick={initCamera}
                    data-testid="retry-camera-btn"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            )}

            {!cameraReady && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-pink-400 border-dashed rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-500" style={{ fontFamily: 'var(--font-handwritten)' }}>
                    Getting camera ready...
                  </p>
                </div>
              </div>
            )}

            <AnimatePresence>
              {countdown !== null && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 z-50"
                  data-testid="countdown-overlay"
                >
                  <motion.span
                    key={countdown}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.5, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-[12rem] font-bold text-white countdown-number-sketch"
                    data-testid="countdown-number"
                  >
                    {countdown}
                  </motion.span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Photo count badge */}
            <div 
              className="absolute top-4 left-4 px-4 py-2 bg-white/90 backdrop-blur rounded-full text-gray-800 sketch-border-light"
              style={{ fontFamily: 'var(--font-handwritten)' }}
            >
              {photos.length}/4 Photos
            </div>
          </div>
        </div>

        {/* Photo Strip Preview - 2x6 vertical with 4 photos stacked */}
        <div className="flex-shrink-0">
          <div 
            className="sketch-border bg-white p-3"
            style={{ 
              backgroundColor: template?.background_color || '#fef9f3',
              width: '160px',
              transform: 'rotate(1deg)'
            }}
          >
            <h3 
              className="text-lg font-bold mb-2 text-center text-gray-800"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Your Strip 📸
            </h3>
            
            {/* 4 photos stacked vertically - 16:9 aspect ratio each */}
            <div className="flex flex-col gap-2">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className="rounded overflow-hidden border-2 border-dashed"
                  style={{ 
                    aspectRatio: "16/9",
                    borderColor: template?.id === 'modern-dark' ? '#374151' : '#d1d5db',
                    backgroundColor: template?.frame_color || '#ffffff',
                  }}
                  data-testid={`photo-preview-${index}`}
                >
                  {photos[index] ? (
                    <img
                      src={photos[index]}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <span className="text-lg text-gray-300">{index + 1}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Branding */}
            <div className="mt-2 text-center">
              <p 
                className="text-xs font-bold text-gray-400"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                ✨ Power of Ten ✨
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Controls */}
      <div className="py-6 flex justify-center">
        {photos.length < 4 ? (
          <Button
            size="lg"
            onClick={startCountdown}
            disabled={!cameraReady || isCapturing}
            className="btn-sketch px-12 py-6 text-2xl bg-pink-400 hover:bg-pink-500 text-white"
            data-testid="capture-btn"
          >
            <Camera className="w-8 h-8 mr-3" />
            {isCapturing ? "Wait..." : "Snap!"}
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={proceedToDecorate}
            className="btn-sketch px-12 py-6 text-2xl bg-pink-400 hover:bg-pink-500 text-white"
            data-testid="proceed-decorate-btn"
          >
            <ArrowRight className="w-8 h-8 mr-3" />
            Add Stickers!
          </Button>
        )}
      </div>
    </div>
  );
}
