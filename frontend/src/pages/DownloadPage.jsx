import { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Download, Share2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function DownloadPage() {
  const { sessionId, shortId } = useParams();
  const location = useLocation();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allMedia, setAllMedia] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
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
          actualSessionId = idToResolve;
        }
      }
      
      setResolvedSessionId(actualSessionId);
      
      // Get full session data with photos
      const response = await axios.get(`${API}/sessions/${actualSessionId}`);
      const sessionData = response.data;
      
      setSession(sessionData);
      
      // Build media array
      const mediaItems = [];
      
      // Add individual photos first (they could be base64 or file paths)
      const photos = sessionData.photos || [];
      photos.forEach((photo, idx) => {
        // Check if it's already a full URL/base64
        const photoUrl = photo.startsWith('data:') || photo.startsWith('http') 
          ? photo 
          : `${API.replace('/api', '')}${photo}`;
        mediaItems.push({ 
          type: 'photo', 
          src: photoUrl, 
          label: `Photo ${idx + 1}` 
        });
      });
      
      // Add photo strip
      const stripUrl = sessionData.photobooth_image_url || sessionData.final_image_url;
      if (stripUrl) {
        const fullStripUrl = stripUrl.startsWith('data:') || stripUrl.startsWith('http')
          ? stripUrl
          : `${API.replace('/api', '')}${stripUrl}`;
        mediaItems.push({ 
          type: 'strip', 
          src: fullStripUrl, 
          label: 'Photo Strip' 
        });
      }
      
      // Add video if available
      if (sessionData.video_url) {
        mediaItems.push({ 
          type: 'video', 
          src: `${API.replace('/api', '')}${sessionData.video_url}`, 
          label: 'Video' 
        });
      }
      
      setAllMedia(mediaItems);
      
    } catch (error) {
      console.error("Error fetching session:", error);
      setError("Photo session not found or has expired");
    } finally {
      setLoading(false);
    }
  };

  const handlePrev = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : allMedia.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev < allMedia.length - 1 ? prev + 1 : 0));
  };

  const handleDownload = () => {
    const currentMedia = allMedia[currentIndex];
    if (!currentMedia || !resolvedSessionId) return;
    
    if (currentMedia.type === 'video') {
      window.open(`${API.replace('/api', '')}/api/download/${resolvedSessionId}/video`, '_blank');
    } else if (currentMedia.type === 'strip') {
      window.open(`${API.replace('/api', '')}/api/download/${resolvedSessionId}/image`, '_blank');
    } else {
      // Download individual photo
      const link = document.createElement('a');
      link.href = currentMedia.src;
      link.download = `photo-${currentIndex + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ 
          title: 'Power of Ten Photos', 
          text: 'Check out my photos!',
          url: window.location.href 
        });
      } catch (e) {
        if (e.name !== 'AbortError') {
          navigator.clipboard.writeText(window.location.href);
          toast.success("Link copied!");
        }
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-pink-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600" style={{ fontFamily: 'var(--font-handwritten)' }}>
            Loading your photos...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">😢</div>
          <p className="text-xl text-gray-600 mb-6">{error}</p>
          <Button
            onClick={() => window.location.href = '/'}
            className="bg-pink-400 hover:bg-pink-500 text-white"
          >
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  const currentMedia = allMedia[currentIndex];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b">
        <h1 
          className="text-xl font-bold text-gray-800" 
          style={{ fontFamily: 'var(--font-heading)' }}
          data-testid="download-page-title"
        >
          Power of Ten
        </h1>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleDownload} 
            className="p-2 hover:bg-gray-100"
            data-testid="header-download-btn"
          >
            <Download className="w-6 h-6 text-gray-700" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleShare} 
            className="p-2 hover:bg-gray-100"
            data-testid="header-share-btn"
          >
            <Share2 className="w-6 h-6 text-gray-700" />
          </Button>
        </div>
      </header>

      {/* Main Preview Area */}
      <main className="flex-1 flex items-center justify-center relative bg-white">
        {/* Left Arrow */}
        {allMedia.length > 1 && (
          <button 
            onClick={handlePrev} 
            className="absolute left-2 z-10 p-2 text-gray-400 hover:text-gray-700 transition-colors"
            data-testid="prev-btn"
          >
            <ChevronLeft className="w-10 h-10" strokeWidth={2} />
          </button>
        )}

        {/* Image/Video Preview */}
        <AnimatePresence mode="wait">
          {currentMedia && (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full flex items-center justify-center p-4"
              style={{ maxHeight: 'calc(100vh - 200px)' }}
            >
              {currentMedia.type === 'video' ? (
                <video
                  src={currentMedia.src}
                  autoPlay
                  loop
                  muted
                  playsInline
                  controls
                  className="max-w-full max-h-full object-contain"
                  style={{ maxHeight: 'calc(100vh - 220px)' }}
                />
              ) : (
                <img
                  src={currentMedia.src}
                  alt={currentMedia.label}
                  className="max-w-full max-h-full object-contain"
                  style={{ maxHeight: 'calc(100vh - 220px)' }}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right Arrow */}
        {allMedia.length > 1 && (
          <button 
            onClick={handleNext} 
            className="absolute right-2 z-10 p-2 text-gray-400 hover:text-gray-700 transition-colors"
            data-testid="next-btn"
          >
            <ChevronRight className="w-10 h-10" strokeWidth={2} />
          </button>
        )}

        {/* Counter Badge */}
        {allMedia.length > 0 && (
          <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/60 rounded-full text-white text-sm font-medium">
            {currentIndex + 1}/{allMedia.length}
          </div>
        )}
      </main>

      {/* Thumbnail Gallery - Smaller with frames */}
      <div className="bg-gray-100 py-3 px-2 border-t">
        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2 px-2">
          {allMedia.map((media, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`flex-shrink-0 rounded-lg overflow-hidden transition-all p-1 bg-white ${
                index === currentIndex 
                  ? 'ring-2 ring-gray-800 shadow-md' 
                  : 'opacity-70 hover:opacity-100 shadow'
              }`}
              style={{ 
                width: media.type === 'strip' ? '40px' : '70px', 
                height: media.type === 'strip' ? '80px' : '52px' 
              }}
              data-testid={`thumbnail-${index}`}
            >
              {media.type === 'video' ? (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded">
                  <span className="text-lg">🎬</span>
                </div>
              ) : (
                <img 
                  src={media.src} 
                  alt={media.label} 
                  className="w-full h-full object-cover rounded"
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
