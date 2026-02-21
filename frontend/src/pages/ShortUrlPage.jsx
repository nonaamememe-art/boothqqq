import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Download, Share2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ShortUrlPage() {
  const { shortId } = useParams();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allMedia, setAllMedia] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetchSession();
  }, [shortId]);

  const fetchSession = async () => {
    try {
      const resolveRes = await axios.get(`${API}/resolve/${shortId}`);
      const sessionId = resolveRes.data.session_id;
      const sessionRes = await axios.get(`${API}/sessions/${sessionId}`);
      setSession({ ...sessionRes.data, fullId: sessionId });
      
      const sessionPhotos = sessionRes.data.photos || [];
      const mediaItems = [];
      
      sessionPhotos.forEach((photo, idx) => {
        mediaItems.push({ type: 'photo', src: photo, label: `Photo ${idx + 1}` });
      });
      
      if (sessionRes.data.final_image_url) {
        mediaItems.push({ type: 'strip', src: `${API.replace('/api', '')}${sessionRes.data.final_image_url}`, label: 'Photo Strip' });
      }
      
      if (sessionRes.data.video_url) {
        mediaItems.push({ type: 'video', src: `${API.replace('/api', '')}${sessionRes.data.video_url}`, label: 'Video' });
      }
      
      setAllMedia(mediaItems);
    } catch (error) {
      setError("Photo not found");
    } finally {
      setLoading(false);
    }
  };

  const handlePrev = () => setCurrentIndex(prev => (prev > 0 ? prev - 1 : allMedia.length - 1));
  const handleNext = () => setCurrentIndex(prev => (prev < allMedia.length - 1 ? prev + 1 : 0));

  const handleDownload = () => {
    const currentMedia = allMedia[currentIndex];
    if (!currentMedia || !session?.fullId) return;
    
    if (currentMedia.type === 'video') {
      window.open(`${API.replace('/api', '')}/api/download/${session.fullId}/video`, '_blank');
    } else if (currentMedia.type === 'strip') {
      window.open(`${API.replace('/api', '')}/api/download/${session.fullId}/image`, '_blank');
    } else {
      const link = document.createElement('a');
      link.href = currentMedia.src;
      link.download = `photo-${currentIndex + 1}.jpg`;
      link.click();
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Power of Ten', url: window.location.href });
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-pink-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <p className="text-xl text-gray-600">{error}</p>
      </div>
    );
  }

  const currentMedia = allMedia[currentIndex];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Mobile Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b safe-area-top">
        <h1 className="text-lg font-bold text-gray-800" style={{ fontFamily: 'var(--font-heading)' }}>
          Power of Ten
        </h1>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={handleDownload} className="p-2">
            <Download className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleShare} className="p-2">
            <Share2 className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main Preview */}
      <main className="flex-1 flex items-center justify-center relative bg-black">
        {allMedia.length > 1 && (
          <button onClick={handlePrev} className="absolute left-2 z-10 p-2 text-white/70 active:text-white">
            <ChevronLeft className="w-8 h-8" />
          </button>
        )}

        <AnimatePresence mode="wait">
          {currentMedia && (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full flex items-center justify-center p-2"
            >
              {currentMedia.type === 'video' ? (
                <video
                  src={currentMedia.src}
                  autoPlay
                  loop
                  muted
                  playsInline
                  controls
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              ) : (
                <img
                  src={currentMedia.src}
                  alt={currentMedia.label}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {allMedia.length > 1 && (
          <button onClick={handleNext} className="absolute right-2 z-10 p-2 text-white/70 active:text-white">
            <ChevronRight className="w-8 h-8" />
          </button>
        )}

        {/* Counter */}
        <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 rounded-full text-white text-xs">
          {currentIndex + 1}/{allMedia.length}
        </div>
      </main>

      {/* Thumbnail Gallery */}
      <div className="bg-white border-t py-3 px-2 safe-area-bottom">
        <div className="flex items-center justify-start gap-2 overflow-x-auto pb-1">
          {allMedia.map((media, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                index === currentIndex ? 'border-pink-400' : 'border-transparent opacity-60'
              }`}
              style={{ width: media.type === 'strip' ? '32px' : '56px', height: '56px' }}
            >
              {media.type === 'video' ? (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center text-lg">🎬</div>
              ) : (
                <img src={media.src} alt={media.label} className="w-full h-full object-cover" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
