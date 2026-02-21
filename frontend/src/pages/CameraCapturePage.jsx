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

    // Set canvas to 1080x1080 square for each photo
    const size = 1080;
    canvas.width = size;
    canvas.height = size;

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    const minDimension = Math.min(videoWidth, videoHeight);
    const sx = (videoWidth - minDimension) / 2;
    const sy = (videoHeight - minDimension) / 2;

    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(
      video,
      sx, sy, minDimension, minDimension,
      -size, 0, size, size
    );
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
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Main Content - Full Screen Monitor */}
      <main className="flex-1 flex">
        {/* Camera Monitor - Left Side */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div 
            className="relative w-full h-full max-w-[1920px] max-h-[1080px] rounded-lg overflow-hidden bg-black"
            style={{ aspectRatio: "16/9" }}
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
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/95">
                <div className="text-center p-8">
                  <div className="text-8xl mb-6">📷</div>
                  <p className="text-2xl text-white mb-6" style={{ fontFamily: 'var(--font-handwritten)' }}>
                    {cameraError}
                  </p>
                  <Button 
                    className="btn-sketch bg-pink-500 hover:bg-pink-600 text-white text-xl px-8 py-4"
                    onClick={initCamera}
                    data-testid="retry-camera-btn"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            )}

            {!cameraReady && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/95">
                <div className="text-center">
                  <div className="w-20 h-20 border-4 border-pink-400 border-dashed rounded-full animate-spin mx-auto mb-6" />
                  <p className="text-2xl text-white" style={{ fontFamily: 'var(--font-handwritten)' }}>
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
                  className="absolute inset-0 flex items-center justify-center bg-black/60 z-50"
                  data-testid="countdown-overlay"
                >
                  <motion.span
                    key={countdown}
                    initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 1.5, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-[20rem] font-bold text-white countdown-number-sketch"
                    data-testid="countdown-number"
                  >
                    {countdown}
                  </motion.span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Photo count badge */}
            <div 
              className="absolute top-6 left-6 px-6 py-3 bg-black/60 backdrop-blur rounded-full text-white text-2xl"
              style={{ fontFamily: 'var(--font-handwritten)' }}
            >
              {photos.length}/4 Photos
            </div>
          </div>
        </div>

        {/* Photo Strip Preview - Right Side */}
        <div className="w-80 p-4 flex flex-col">
          <div 
            className="sketch-border bg-white p-3 flex-1"
            style={{ 
              backgroundColor: template?.background_color || '#fef9f3',
              transform: 'rotate(1deg)'
            }}
          >
            <h3 
              className="text-2xl font-bold mb-3 text-center text-gray-800"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              📸 Your Strip
            </h3>
            
            {/* 2x6 aspect ratio preview - vertical strip with 4 photos */}
            <div className="flex flex-col gap-2">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className="aspect-square rounded overflow-hidden border-2 border-dashed"
                  style={{ 
                    borderColor: template?.id === 'modern-dark' ? '#374151' : '#d1d5db',
                    backgroundColor: template?.frame_color || '#ffffff',
                    transform: `rotate(${index % 2 === 0 ? -0.5 : 0.5}deg)`
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
                      <span className="text-3xl opacity-30">{index + 1}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Branding */}
            <div className="mt-3 text-center">
              <p 
                className="text-sm font-bold"
                style={{ 
                  fontFamily: 'var(--font-heading)',
                  color: template?.id === 'modern-dark' ? '#9ca3af' : '#6b7280'
                }}
              >
                ✨ Power of Ten ✨
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Controls */}
      <div className="p-6 flex justify-center gap-6">
        {photos.length < 4 ? (
          <Button
            size="lg"
            onClick={startCountdown}
            disabled={!cameraReady || isCapturing}
            className="btn-sketch px-16 py-8 text-3xl bg-pink-500 hover:bg-pink-600 text-white"
            data-testid="capture-btn"
          >
            <Camera className="w-10 h-10 mr-3" />
            {isCapturing ? "Wait..." : "Snap!"}
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={proceedToDecorate}
            className="btn-sketch px-16 py-8 text-3xl bg-green-500 hover:bg-green-600 text-white"
            data-testid="proceed-decorate-btn"
          >
            <ArrowRight className="w-10 h-10 mr-3" />
            Add Stickers!
          </Button>
        )}
      </div>
    </div>
  );
}
