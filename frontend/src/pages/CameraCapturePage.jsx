import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, RotateCcw, ArrowRight, Image } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function CameraCapturePage() {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [photos, setPhotos] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [autoCapture, setAutoCapture] = useState(false);

  // Initialize camera
  useEffect(() => {
    initCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

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
    if (!videoRef.current || !canvasRef.current || photos.length >= 4) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas (mirrored)
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    // Get base64 image
    const photoData = canvas.toDataURL("image/jpeg", 0.9);
    
    // Add to local state
    setPhotos(prev => [...prev, photoData]);

    // Save to backend
    try {
      await axios.post(`${API}/sessions/${sessionId}/photos`, {
        session_id: sessionId,
        photo_data: photoData
      });
    } catch (error) {
      console.error("Error saving photo:", error);
    }

    return photoData;
  }, [photos.length, sessionId]);

  const startCountdown = useCallback(() => {
    if (isCapturing || photos.length >= 4) return;
    
    setIsCapturing(true);
    setCountdown(3);

    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          capturePhoto().then(() => {
            setIsCapturing(false);
            setCountdown(null);
            
            // Auto-capture next if enabled and not at max
            if (autoCapture && photos.length < 3) {
              setTimeout(() => startCountdown(), 1000);
            }
          });
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, [isCapturing, photos.length, capturePhoto, autoCapture]);

  const startAutoCapture = () => {
    setAutoCapture(true);
    startCountdown();
  };

  const resetPhotos = () => {
    setPhotos([]);
    setAutoCapture(false);
  };

  const proceedToDecorate = () => {
    if (photos.length === 0) {
      toast.error("Please capture at least one photo");
      return;
    }
    navigate(`/decorate/${sessionId}`, { state: { photos } });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="py-4 px-6 flex items-center justify-between">
        <h1 
          className="text-2xl font-bold"
          style={{ fontFamily: 'var(--font-heading)' }}
          data-testid="capture-title"
        >
          Power of Ten
        </h1>
        <div className="flex items-center gap-2 text-slate-400">
          <span className="text-sm">Photo {Math.min(photos.length + 1, 4)} of 4</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 pb-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Camera View */}
          <div className="lg:col-span-3">
            <div 
              className="camera-container relative rounded-2xl overflow-hidden bg-slate-800"
              data-testid="camera-view"
            >
              {/* Video Feed */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Camera Error Overlay */}
              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90">
                  <div className="text-center p-8">
                    <Camera className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                    <p className="text-lg text-slate-300">{cameraError}</p>
                    <Button 
                      className="mt-4"
                      onClick={initCamera}
                      data-testid="retry-camera-btn"
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              )}

              {/* Loading Overlay */}
              {!cameraReady && !cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-400">Initializing camera...</p>
                  </div>
                </div>
              )}

              {/* Countdown Overlay */}
              <AnimatePresence>
                {countdown !== null && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="countdown-overlay"
                    data-testid="countdown-overlay"
                  >
                    <motion.span
                      key={countdown}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 1.5, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="countdown-text"
                      data-testid="countdown-number"
                    >
                      {countdown}
                    </motion.span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Photo Count Badge */}
              <div className="absolute top-4 left-4 px-4 py-2 bg-black/50 backdrop-blur rounded-full">
                <span className="text-white font-medium">{photos.length}/4 Photos</span>
              </div>
            </div>

            {/* Capture Controls */}
            <div className="mt-6 flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="lg"
                onClick={resetPhotos}
                disabled={photos.length === 0}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                data-testid="reset-photos-btn"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                Reset
              </Button>

              {photos.length < 4 ? (
                <>
                  <Button
                    size="lg"
                    onClick={startCountdown}
                    disabled={!cameraReady || isCapturing}
                    className="px-12 py-6 text-lg rounded-full bg-blue-600 hover:bg-blue-700"
                    data-testid="capture-btn"
                  >
                    <Camera className="w-6 h-6 mr-2" />
                    {isCapturing ? "Capturing..." : "Capture Photo"}
                  </Button>

                  <Button
                    size="lg"
                    variant="secondary"
                    onClick={startAutoCapture}
                    disabled={!cameraReady || isCapturing || autoCapture}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    data-testid="auto-capture-btn"
                  >
                    Auto Capture 4
                  </Button>
                </>
              ) : (
                <Button
                  size="lg"
                  onClick={proceedToDecorate}
                  className="px-12 py-6 text-lg rounded-full bg-green-600 hover:bg-green-700"
                  data-testid="proceed-decorate-btn"
                >
                  <ArrowRight className="w-6 h-6 mr-2" />
                  Decorate Photos
                </Button>
              )}
            </div>
          </div>

          {/* Photo Strip Preview */}
          <div className="lg:col-span-1">
            <Card className="bg-slate-800 border-slate-700 p-4">
              <h3 className="text-lg font-semibold mb-4 text-center">Your Photos</h3>
              <div className="photo-strip-preview mx-auto" style={{ backgroundColor: '#1e293b' }}>
                {[0, 1, 2, 3].map((index) => (
                  <div
                    key={index}
                    className="photo-frame"
                    data-testid={`photo-preview-${index}`}
                  >
                    {photos[index] ? (
                      <img
                        src={photos[index]}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-700">
                        <Image className="w-8 h-8 text-slate-500" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {photos.length > 0 && photos.length < 4 && (
                <p className="text-center text-sm text-slate-400 mt-4">
                  {4 - photos.length} more photo{4 - photos.length !== 1 ? 's' : ''} needed
                </p>
              )}

              {photos.length === 4 && (
                <Button
                  onClick={proceedToDecorate}
                  className="w-full mt-4 bg-green-600 hover:bg-green-700"
                  data-testid="sidebar-proceed-btn"
                >
                  Continue to Decorate
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
