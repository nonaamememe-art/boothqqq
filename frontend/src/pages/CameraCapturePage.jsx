import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Camera, RotateCcw, ArrowRight, ImageIcon } from "lucide-react";
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
  const [autoCapture, setAutoCapture] = useState(false);

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
          width: { ideal: 1080 },
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

  const startAutoCapture = () => {
    if (photos.length >= 4) return;
    setAutoCapture(true);
    captureSequence(0);
  };

  const captureSequence = (index) => {
    if (index >= 4) {
      setAutoCapture(false);
      return;
    }

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
          if (index < 3) {
            setTimeout(() => captureSequence(index + 1), 1000);
          } else {
            setAutoCapture(false);
          }
        });
      } else {
        setCountdown(count);
      }
    }, 1000);
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
    <div className="min-h-screen bg-gray-800">
      {/* Header */}
      <header className="py-4 px-6 flex items-center justify-between">
        <h1 
          className="text-3xl font-bold text-white"
          style={{ fontFamily: 'var(--font-heading)' }}
          data-testid="capture-title"
        >
          📸 Say Cheese!
        </h1>
        <div 
          className="px-4 py-2 bg-white/10 rounded-full text-white"
          style={{ fontFamily: 'var(--font-handwritten)' }}
        >
          Photo {Math.min(photos.length + 1, 4)} of 4
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 pb-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Camera View */}
          <div className="lg:col-span-3">
            <div 
              className="relative rounded-lg overflow-hidden bg-gray-900 mx-auto sketch-border"
              style={{ width: "100%", maxWidth: "600px", aspectRatio: "1/1", borderColor: '#fff' }}
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
                    <div className="text-6xl mb-4">📷</div>
                    <p className="text-lg text-white mb-4" style={{ fontFamily: 'var(--font-handwritten)' }}>
                      {cameraError}
                    </p>
                    <Button 
                      className="btn-sketch bg-pink-500 hover:bg-pink-600 text-white"
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
                    <div className="w-16 h-16 border-4 border-pink-400 border-dashed rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-white" style={{ fontFamily: 'var(--font-handwritten)' }}>
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
                      className="text-[10rem] font-bold text-white countdown-number-sketch"
                      data-testid="countdown-number"
                    >
                      {countdown}
                    </motion.span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div 
                className="absolute top-4 left-4 px-4 py-2 bg-black/50 backdrop-blur rounded-full text-white"
                style={{ fontFamily: 'var(--font-handwritten)' }}
              >
                {photos.length}/4 ✓
              </div>
            </div>

            {/* Capture Controls */}
            <div className="mt-6 flex items-center justify-center gap-4 flex-wrap">
              <Button
                variant="outline"
                size="lg"
                onClick={resetPhotos}
                disabled={photos.length === 0}
                className="btn-sketch bg-white hover:bg-gray-100"
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
                    className="btn-sketch px-10 py-6 text-xl bg-pink-500 hover:bg-pink-600 text-white"
                    data-testid="capture-btn"
                  >
                    <Camera className="w-6 h-6 mr-2" />
                    {isCapturing ? "Wait..." : "Snap!"}
                  </Button>

                  <Button
                    size="lg"
                    variant="secondary"
                    onClick={startAutoCapture}
                    disabled={!cameraReady || isCapturing || autoCapture}
                    className="btn-sketch bg-yellow-400 hover:bg-yellow-500 text-gray-800"
                    data-testid="auto-capture-btn"
                  >
                    Auto x4 ⚡
                  </Button>
                </>
              ) : (
                <Button
                  size="lg"
                  onClick={proceedToDecorate}
                  className="btn-sketch px-10 py-6 text-xl bg-green-500 hover:bg-green-600 text-white"
                  data-testid="proceed-decorate-btn"
                >
                  <ArrowRight className="w-6 h-6 mr-2" />
                  Add Stickers!
                </Button>
              )}
            </div>
          </div>

          {/* Photo Strip Preview */}
          <div className="lg:col-span-1">
            <div className="sketch-border bg-white p-4" style={{ transform: 'rotate(1deg)' }}>
              <h3 
                className="text-xl font-bold mb-4 text-center text-gray-800"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Your Photos 📸
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[0, 1, 2, 3].map((index) => (
                  <div
                    key={index}
                    className="aspect-square rounded overflow-hidden bg-gray-100 border-2 border-dashed border-gray-300"
                    style={{ transform: `rotate(${index % 2 === 0 ? -1 : 1}deg)` }}
                    data-testid={`photo-preview-${index}`}
                  >
                    {photos[index] ? (
                      <img
                        src={photos[index]}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-gray-300" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {photos.length > 0 && photos.length < 4 && (
                <p 
                  className="text-center text-sm text-gray-500 mt-4"
                  style={{ fontFamily: 'var(--font-handwritten)' }}
                >
                  {4 - photos.length} more to go!
                </p>
              )}

              {photos.length === 4 && (
                <Button
                  onClick={proceedToDecorate}
                  className="w-full mt-4 btn-sketch bg-green-500 hover:bg-green-600 text-white"
                  data-testid="sidebar-proceed-btn"
                >
                  Decorate! →
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
