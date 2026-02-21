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
      setCameraError("Camera access denied");
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

    canvas.width = 1920;
    canvas.height = 1080;

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
    <div className="h-screen w-screen overflow-hidden paper-bg flex flex-col lg:flex-row">
      {/* Camera Monitor - Main Area */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
        <div 
          className="relative bg-white overflow-hidden rounded-lg shadow-lg border-4 border-gray-800"
          style={{ 
            width: "100%",
            maxWidth: "960px",
            aspectRatio: "16/9"
          }}
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
              <div className="text-center">
                <div className="text-6xl lg:text-8xl mb-4 lg:mb-6">📷</div>
                <p className="text-xl lg:text-2xl text-gray-600 mb-4 lg:mb-6" style={{ fontFamily: 'var(--font-handwritten)' }}>
                  {cameraError}
                </p>
                <Button 
                  className="btn-sketch bg-pink-400 hover:bg-pink-500 text-white text-lg lg:text-xl px-6 lg:px-8 py-3 lg:py-4"
                  onClick={initCamera}
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {!cameraReady && !cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <div className="w-12 h-12 lg:w-16 lg:h-16 border-4 border-pink-400 border-dashed rounded-full animate-spin mx-auto mb-4 lg:mb-6" />
                <p className="text-xl lg:text-2xl text-gray-500" style={{ fontFamily: 'var(--font-handwritten)' }}>
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
              >
                <motion.span
                  key={countdown}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.5, opacity: 0 }}
                  className="text-[10rem] lg:text-[16rem] font-bold text-white"
                  style={{ textShadow: '0 0 80px rgba(255,255,255,0.5)' }}
                >
                  {countdown}
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Photo count */}
          <div className="absolute top-4 left-4 lg:top-6 lg:left-6 px-4 py-2 lg:px-6 lg:py-3 bg-white/90 backdrop-blur rounded-full text-lg lg:text-xl font-bold text-gray-800">
            {photos.length}/4 Photos
          </div>
        </div>
      </div>

      {/* Right Panel - Preview & Button */}
      <div className="lg:w-[320px] flex flex-row lg:flex-col p-4 lg:p-6 gap-4 lg:gap-6 bg-[#fef9f3] lg:bg-transparent">
        {/* Photo Strip Preview */}
        <div 
          className="sketch-border flex-1 lg:flex-1 p-3 lg:p-4 bg-white"
          style={{ 
            backgroundColor: template?.background_color || '#ffffff',
            transform: 'rotate(0deg)'
          }}
        >
          <h3 
            className="text-xl lg:text-2xl font-bold text-center text-gray-800 mb-3 lg:mb-4"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            📸 Your Strip
          </h3>
          
          <div className="flex flex-row lg:flex-col gap-2 lg:gap-3">
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className="flex-1 lg:flex-none rounded overflow-hidden border-2 border-dashed"
                style={{ 
                  aspectRatio: "16/9",
                  borderColor: template?.id === 'modern-dark' ? '#374151' : '#d1d5db',
                  backgroundColor: template?.frame_color || '#f3f4f6',
                }}
                data-testid={`photo-preview-${index}`}
              >
                {photos[index] ? (
                  <img src={photos[index]} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-lg lg:text-2xl text-gray-300" style={{ fontFamily: 'var(--font-handwritten)' }}>{index + 1}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-3 lg:mt-4 text-center">
            <p className="text-xs lg:text-sm font-bold text-pink-400" style={{ fontFamily: 'var(--font-heading)' }}>
              ✨ Power of Ten ✨
            </p>
          </div>
        </div>

        {/* Action Button */}
        {photos.length < 4 ? (
          <Button
            size="lg"
            onClick={startCountdown}
            disabled={!cameraReady || isCapturing}
            className="btn-sketch py-6 lg:py-8 text-xl lg:text-2xl bg-pink-400 hover:bg-pink-500 text-white w-auto lg:w-full"
            data-testid="capture-btn"
          >
            <Camera className="w-6 h-6 lg:w-8 lg:h-8 mr-2 lg:mr-3" />
            {isCapturing ? "Wait..." : "Snap!"}
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={proceedToDecorate}
            className="btn-sketch py-6 lg:py-8 text-xl lg:text-2xl bg-pink-400 hover:bg-pink-500 text-white w-auto lg:w-full"
            data-testid="proceed-decorate-btn"
          >
            <ArrowRight className="w-6 h-6 lg:w-8 lg:h-8 mr-2 lg:mr-3" />
            Decorate!
          </Button>
        )}
      </div>
    </div>
  );
}
