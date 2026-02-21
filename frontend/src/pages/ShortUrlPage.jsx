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
  const [photos, setPhotos] = useState([]);
  const [allMedia, setAllMedia] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [eventTitle, setEventTitle] = useState("Power of Ten");

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
      setPhotos(sessionPhotos);
      
      // Build media array
      const mediaItems = [];
      
      sessionPhotos.forEach((photo, idx) => {
        mediaItems.push({
          type: 'photo',
          src: photo,
          label: `Photo ${idx + 1}`
        });
      });
      
      if (sessionRes.data.final_image_url) {
        mediaItems.push({
          type: 'strip',
          src: `${API.replace('/api', '')}${sessionRes.data.final_image_url}`,
          label: 'Photo Strip'
        });
      }
      
      if (sessionRes.data.video_url) {
        mediaItems.push({
          type: 'video',
          src: `${API.replace('/api', '')}${sessionRes.data.video_url}`,
          label: 'Video'
        });
      }
      
      setAllMedia(mediaItems);
    } catch (error) {
      console.error("Error fetching session:", error);
      setError("Photo not found or has expired");
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

  const handleThumbnailClick = (index) => {
    setCurrentIndex(index);
  };

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
    const shareUrl = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: eventTitle,
          text: 'Check out my photos!',
          url: shareUrl
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          copyToClipboard(shareUrl);
        }
      }
    } else {
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Link copied!");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center paper-bg">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-400 border-dashed rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xl text-gray-600" style={{ fontFamily: 'var(--font-handwritten)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center paper-bg">
        <div className="text-center">
          <p className="text-2xl text-gray-600 mb-4" style={{ fontFamily: 'var(--font-handwritten)' }}>{error}</p>
        </div>
      </div>
    );
  }

  const currentMedia = allMedia[currentIndex];

  return (
    <div className="min-h-screen paper-bg flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b-2 border-dashed border-gray-300">
        <h1 
          className="text-2xl font-bold text-gray-800"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {eventTitle}
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            className="text-gray-600 hover:bg-pink-50 hover:text-pink-500"
            data-testid="download-btn"
          >
            <Download className="w-6 h-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleShare}
            className="text-gray-600 hover:bg-pink-50 hover:text-pink-500"
            data-testid="share-btn"
          >
            <Share2 className="w-6 h-6" />
          </Button>
        </div>
      </header>

      {/* Main Preview Area */}
      <main className="flex-1 flex items-center justify-center relative px-4">
        {/* Previous Button */}
        <button
          onClick={handlePrev}
          className="absolute left-4 z-10 p-2 text-gray-400 hover:text-pink-500 transition-colors"
          data-testid="prev-btn"
        >
          <ChevronLeft className="w-12 h-12" />
        </button>

        {/* Current Media Display */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative max-w-4xl max-h-[65vh] flex items-center justify-center"
          >
            <div className="sketch-border bg-white p-3">
              {currentMedia?.type === 'video' ? (
                <video
                  src={currentMedia.src}
                  autoPlay
                  loop
                  muted
                  playsInline
                  controls
                  className="max-w-full max-h-[60vh] rounded"
                  data-testid="video-preview"
                />
              ) : (
                <img
                  src={currentMedia?.src}
                  alt={currentMedia?.label}
                  className="max-w-full max-h-[60vh] object-contain rounded"
                  data-testid="image-preview"
                />
              )}
            </div>

            {/* Photo Counter */}
            <div 
              className="absolute top-6 right-6 px-3 py-1 bg-white/90 backdrop-blur rounded-full text-gray-600 text-sm sketch-border-light"
              style={{ fontFamily: 'var(--font-handwritten)' }}
            >
              {currentIndex + 1}/{allMedia.length}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Next Button */}
        <button
          onClick={handleNext}
          className="absolute right-4 z-10 p-2 text-gray-400 hover:text-pink-500 transition-colors"
          data-testid="next-btn"
        >
          <ChevronRight className="w-12 h-12" />
        </button>
      </main>

      {/* Thumbnail Gallery */}
      <div className="py-6 px-4 border-t-2 border-dashed border-gray-300">
        <div className="flex items-center justify-center gap-3 overflow-x-auto">
          {allMedia.map((media, index) => (
            <motion.button
              key={index}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleThumbnailClick(index)}
              className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                index === currentIndex
                  ? 'border-pink-400 shadow-lg'
                  : 'border-gray-200 opacity-60 hover:opacity-100 hover:border-pink-300'
              }`}
              data-testid={`thumbnail-${index}`}
            >
              {media.type === 'video' ? (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <span className="text-2xl">🎬</span>
                </div>
              ) : (
                <img
                  src={media.src}
                  alt={media.label}
                  className="w-full h-full object-cover"
                />
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
