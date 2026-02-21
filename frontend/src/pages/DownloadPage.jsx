import { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Download, Image, Film, Home } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function DownloadPage() {
  const { sessionId, shortId } = useParams();
  const location = useLocation();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [resolvedSessionId, setResolvedSessionId] = useState(null);

  useEffect(() => {
    fetchSession();
  }, [sessionId, shortId]);

  const fetchSession = async () => {
    try {
      let actualSessionId = sessionId;
      
      // If this is a short URL (/d/:shortId), resolve it first
      if (shortId || location.pathname.includes('/d/')) {
        const idToResolve = shortId || sessionId;
        try {
          const resolveRes = await axios.get(`${API}/resolve/${idToResolve}`);
          actualSessionId = resolveRes.data.session_id;
        } catch (e) {
          // If resolve fails, try using it as a regular session ID
          actualSessionId = idToResolve;
        }
      }
      
      setResolvedSessionId(actualSessionId);
      
      // Try share endpoint first (works with both session ID and short ID)
      try {
        const response = await axios.get(`${API}/share/${actualSessionId}`);
        setSession(response.data);
        if (response.data.photobooth_image_url) {
          setSelectedPhoto({ type: 'strip', url: response.data.photobooth_image_url });
        }
      } catch (e) {
        // Fall back to regular session endpoint
        const response = await axios.get(`${API}/sessions/${actualSessionId}`);
        setSession(response.data);
        if (response.data.final_image_url) {
          setSelectedPhoto({ type: 'strip', url: response.data.final_image_url });
        }
      }
    } catch (error) {
      console.error("Error fetching session:", error);
      setError("Photo session not found or has expired");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadImage = () => {
    const id = resolvedSessionId || sessionId || shortId;
    window.open(`${API.replace('/api', '')}/api/download/${id}/image`, '_blank');
  };

  const handleDownloadVideo = () => {
    const id = resolvedSessionId || sessionId || shortId;
    window.open(`${API.replace('/api', '')}/api/download/${id}/gif`, '_blank');
  };

  const handleDownloadPhoto = (index) => {
    if (session?.photos?.[index]) {
      const link = document.createElement('a');
      link.href = `${API.replace('/api', '')}${session.photos[index]}`;
      link.download = `photo_${index + 1}.jpg`;
      link.click();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center paper-bg">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-400 border-dashed rounded-full animate-spin mx-auto mb-6" />
          <p 
            className="text-2xl text-gray-600"
            style={{ fontFamily: 'var(--font-handwritten)' }}
          >
            Loading your photos...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center paper-bg">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="text-8xl mb-6">😢</div>
          <h2 
            className="text-4xl font-bold text-gray-800 mb-4"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Oops!
          </h2>
          <p 
            className="text-xl text-gray-600 mb-8"
            style={{ fontFamily: 'var(--font-handwritten)' }}
          >
            {error}
          </p>
          <Button
            onClick={() => window.location.href = '/'}
            className="btn-sketch bg-pink-400 hover:bg-pink-500 text-white text-xl px-8 py-4"
            data-testid="create-new-btn"
          >
            <Home className="w-6 h-6 mr-2" />
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen paper-bg">
      {/* Header */}
      <header className="py-4 sm:py-6 text-center">
        <h1 
          className="text-4xl sm:text-5xl font-bold text-gray-800"
          style={{ fontFamily: 'var(--font-heading)' }}
          data-testid="download-page-title"
        >
          Power of Ten
        </h1>
        <div 
          className="h-1.5 bg-pink-400 mx-auto mt-2"
          style={{ width: '150px', borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px' }}
        />
        <p 
          className="text-lg sm:text-xl text-gray-500 mt-2"
          style={{ fontFamily: 'var(--font-handwritten)' }}
        >
          Your photos are ready! ✨
        </p>
      </header>

      {/* Main Content */}
      <main className="px-4 sm:px-6 pb-8">
        <div className="max-w-md mx-auto">
          
          {/* Large Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="sketch-border bg-white p-3 sm:p-4 mb-4"
          >
            <div 
              className="w-full rounded overflow-hidden bg-gray-100"
              style={{ aspectRatio: selectedPhoto?.type === 'strip' ? '2/6' : '16/9' }}
            >
              {selectedPhoto ? (
                <img 
                  src={selectedPhoto.type === 'strip' 
                    ? `${API.replace('/api', '')}${selectedPhoto.url}`
                    : `${API.replace('/api', '')}${selectedPhoto.url}`
                  } 
                  alt="Preview" 
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Image className="w-12 h-12 text-gray-300" />
                </div>
              )}
            </div>
          </motion.div>

          {/* Photo Thumbnails */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <h3 
              className="text-xl font-bold text-gray-700 mb-3 text-center"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              📸 Your Photos
            </h3>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {/* Photo Strip Thumbnail */}
              {session?.photobooth_image_url && (
                <div
                  onClick={() => setSelectedPhoto({ type: 'strip', url: session.photobooth_image_url })}
                  className={`flex-shrink-0 cursor-pointer rounded-lg overflow-hidden border-3 transition-all ${
                    selectedPhoto?.type === 'strip' 
                      ? 'border-pink-400 ring-2 ring-pink-300' 
                      : 'border-gray-300 hover:border-pink-300'
                  }`}
                  style={{ width: '50px', height: '100px' }}
                >
                  <img 
                    src={`${API.replace('/api', '')}${session.photobooth_image_url}`}
                    alt="Photo Strip"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              {/* Individual Photos */}
              {session?.photos?.map((photo, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedPhoto({ type: 'photo', url: photo, index })}
                  className={`flex-shrink-0 cursor-pointer rounded-lg overflow-hidden border-3 transition-all ${
                    selectedPhoto?.type === 'photo' && selectedPhoto?.index === index
                      ? 'border-pink-400 ring-2 ring-pink-300' 
                      : 'border-gray-300 hover:border-pink-300'
                  }`}
                  style={{ width: '80px', height: '45px' }}
                >
                  <img 
                    src={`${API.replace('/api', '')}${photo}`}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </motion.div>

          {/* Download Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            {/* Download Photo Strip */}
            <Button
              onClick={handleDownloadImage}
              className="w-full btn-sketch py-5 text-lg bg-pink-400 hover:bg-pink-500 text-white"
              data-testid="public-download-image-btn"
            >
              <Image className="w-5 h-5 mr-2" />
              Download Photo Strip
            </Button>

            {/* Download Video */}
            <Button
              onClick={handleDownloadVideo}
              className="w-full btn-sketch py-5 text-lg bg-white hover:bg-pink-50 text-gray-700 border-2 border-gray-800"
              data-testid="public-download-gif-btn"
            >
              <Film className="w-5 h-5 mr-2" />
              Download Video
            </Button>

            {/* Download Current Photo (if individual photo selected) */}
            {selectedPhoto?.type === 'photo' && (
              <Button
                onClick={() => handleDownloadPhoto(selectedPhoto.index)}
                variant="outline"
                className="w-full btn-sketch py-4 text-base"
              >
                <Download className="w-4 h-4 mr-2" />
                Download This Photo
              </Button>
            )}
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-8 text-center"
          >
            <p 
              className="text-sm text-pink-400 font-bold"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              ✨ Power of Ten ✨
            </p>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
