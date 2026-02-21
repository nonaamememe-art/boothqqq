import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ShortUrlPage() {
  const { shortId } = useParams();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [finalImageUrl, setFinalImageUrl] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);

  useEffect(() => {
    fetchSession();
  }, [shortId]);

  const fetchSession = async () => {
    try {
      // Resolve short ID to full session
      const resolveRes = await axios.get(`${API}/resolve/${shortId}`);
      const sessionId = resolveRes.data.session_id;
      
      // Get full session details
      const sessionRes = await axios.get(`${API}/sessions/${sessionId}`);
      setSession({ ...sessionRes.data, fullId: sessionId });
      setPhotos(sessionRes.data.photos || []);
      
      // Set download URLs
      if (sessionRes.data.final_image_url) {
        setFinalImageUrl(`${API.replace('/api', '')}${sessionRes.data.final_image_url}`);
      }
      if (sessionRes.data.video_url) {
        setVideoUrl(`${API.replace('/api', '')}${sessionRes.data.video_url}`);
      }
    } catch (error) {
      console.error("Error fetching session:", error);
      setError("Photo not found or has expired");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadImage = () => {
    if (session?.fullId) {
      window.open(`${API.replace('/api', '')}/api/download/${session.fullId}/image`, '_blank');
    }
  };

  const handleDownloadVideo = () => {
    if (session?.fullId) {
      window.open(`${API.replace('/api', '')}/api/download/${session.fullId}/video`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center paper-bg">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-pink-400 border-dashed rounded-full animate-spin mx-auto mb-6" />
          <p className="text-2xl" style={{ fontFamily: 'var(--font-handwritten)' }}>Loading your photos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center paper-bg">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="text-8xl mb-6">😢</div>
          <h2 className="text-4xl font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Oops!</h2>
          <p className="text-xl text-gray-600" style={{ fontFamily: 'var(--font-handwritten)' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen paper-bg py-8 px-4">
      {/* Header */}
      <header className="text-center mb-8">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-bold text-gray-800"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Power of Ten
        </motion.h1>
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          className="h-1 bg-pink-400 mx-auto mt-2"
          style={{ width: '150px', borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px' }}
        />
      </header>

      <main className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 4 Individual Photos */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <h2 
              className="text-2xl font-bold text-gray-800 mb-4 text-center"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              📸 Your Photos
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {photos.slice(0, 4).map((photo, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="aspect-square rounded-lg overflow-hidden sketch-border bg-white p-2"
                  style={{ transform: `rotate(${index % 2 === 0 ? -1 : 1}deg)` }}
                >
                  <img
                    src={photo}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover rounded"
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Photo Booth (Final Image) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-1"
          >
            <h2 
              className="text-2xl font-bold text-gray-800 mb-4 text-center"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              🎨 Photo Booth
            </h2>
            <div className="sketch-border bg-white p-3 mx-auto" style={{ maxWidth: '250px' }}>
              {finalImageUrl ? (
                <img
                  src={finalImageUrl}
                  alt="Photo Booth Strip"
                  className="w-full rounded"
                  data-testid="final-image"
                />
              ) : (
                <div className="aspect-[1/3] bg-gray-100 rounded flex items-center justify-center">
                  <span className="text-gray-400">Loading...</span>
                </div>
              )}
            </div>
            <div className="mt-4 text-center">
              <Button
                onClick={handleDownloadImage}
                className="btn-sketch bg-pink-500 hover:bg-pink-600 text-white"
                data-testid="download-image-btn"
              >
                <Download className="w-5 h-5 mr-2" />
                Download Photo
              </Button>
            </div>
          </motion.div>

          {/* Video/GIF */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-1"
          >
            <h2 
              className="text-2xl font-bold text-gray-800 mb-4 text-center"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              🎬 Video
            </h2>
            <div className="sketch-border bg-white p-3 mx-auto" style={{ maxWidth: '300px' }}>
              {session?.fullId ? (
                <video
                  src={`${API.replace('/api', '')}/api/download/${session.fullId}/video`}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full rounded"
                  style={{ aspectRatio: '16/9' }}
                  data-testid="video-preview"
                >
                  Your browser does not support video.
                </video>
              ) : (
                <div className="aspect-video bg-gray-100 rounded flex items-center justify-center">
                  <span className="text-gray-400">Loading...</span>
                </div>
              )}
            </div>
            <div className="mt-4 text-center">
              <Button
                onClick={handleDownloadVideo}
                variant="outline"
                className="btn-sketch border-purple-400 text-purple-600 hover:bg-purple-50"
                data-testid="download-video-btn"
              >
                <Download className="w-5 h-5 mr-2" />
                Download Video
              </Button>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
