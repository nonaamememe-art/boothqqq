import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Download, ImageIcon, Sparkles } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ShortUrlPage() {
  const { shortId } = useParams();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    fetchSession();
  }, [shortId]);

  const fetchSession = async () => {
    try {
      // Resolve short ID to full session
      const resolveRes = await axios.get(`${API}/resolve/${shortId}`);
      const sessionId = resolveRes.data.session_id;
      
      // Get session details
      const response = await axios.get(`${API}/share/${sessionId}`);
      setSession({ ...response.data, fullId: sessionId });
      
      // Load image preview
      if (response.data.has_image) {
        setImagePreview(`${API.replace('/api', '')}/api/download/${sessionId}/image`);
      }
    } catch (error) {
      console.error("Error fetching session:", error);
      setError("Photo not found or has expired");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (session?.fullId) {
      window.open(`${API.replace('/api', '')}/api/download/${session.fullId}/image`, '_blank');
    }
  };

  const handleDownloadGif = () => {
    if (session?.fullId) {
      window.open(`${API.replace('/api', '')}/api/download/${session.fullId}/gif`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center paper-bg">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-400 border-dashed rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg" style={{ fontFamily: 'var(--font-handwritten)' }}>Loading your photo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center paper-bg">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-24 h-24 sketch-border bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6" style={{ transform: 'rotate(-3deg)' }}>
            <span className="text-4xl">😢</span>
          </div>
          <h2 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Oops!</h2>
          <p className="text-gray-600 mb-6" style={{ fontFamily: 'var(--font-handwritten)' }}>{error}</p>
          <Button
            onClick={() => window.location.href = '/'}
            className="btn-sketch bg-pink-400 hover:bg-pink-500 text-white px-8 py-3"
            data-testid="create-new-btn"
          >
            Create Your Own!
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen paper-bg py-8 px-4">
      {/* Header */}
      <header className="text-center mb-8">
        <motion.h1 
          initial={{ opacity: 0, y: -20, rotate: -3 }}
          animate={{ opacity: 1, y: 0, rotate: -2 }}
          className="text-5xl font-bold text-gray-800 inline-block"
          style={{ fontFamily: 'var(--font-heading)' }}
          data-testid="download-page-title"
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

      {/* Main Content */}
      <main className="max-w-md mx-auto">
        {/* Photo Preview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
          animate={{ opacity: 1, scale: 1, rotate: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="photo-frame-sketch mx-auto" style={{ maxWidth: '320px' }}>
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Your photo strip"
                className="w-full rounded"
                data-testid="photo-preview"
              />
            ) : (
              <div className="aspect-square bg-gray-100 rounded flex items-center justify-center">
                <ImageIcon className="w-16 h-16 text-gray-300" />
              </div>
            )}
          </div>
          
          {/* Decorative tape */}
          <div className="flex justify-center -mt-2">
            <div 
              className="w-16 h-6 bg-yellow-200/80 border border-yellow-300/50"
              style={{ transform: 'rotate(-5deg)' }}
            />
          </div>
        </motion.div>

        {/* Download Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center space-y-4"
        >
          <Button
            onClick={handleDownload}
            className="btn-sketch bg-pink-500 hover:bg-pink-600 text-white px-6 py-2"
            data-testid="download-btn"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Photo
          </Button>

          {session?.has_gif && (
            <div>
              <Button
                variant="outline"
                onClick={handleDownloadGif}
                className="btn-sketch bg-white hover:bg-gray-50 px-6 py-2"
                data-testid="download-gif-btn"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Download GIF
              </Button>
            </div>
          )}
        </motion.div>

        {/* Create Your Own */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 text-center"
        >
          <p className="text-gray-500 mb-3" style={{ fontFamily: 'var(--font-handwritten)' }}>
            Want to create your own?
          </p>
          <Button
            variant="ghost"
            onClick={() => window.location.href = '/'}
            className="text-pink-500 hover:text-pink-600 hover:bg-pink-50"
            style={{ fontFamily: 'var(--font-handwritten)' }}
            data-testid="create-own-btn"
          >
            Start Here →
          </Button>
        </motion.div>

        {/* Footer */}
        <div className="mt-16 text-center">
          <p className="text-sm text-gray-400" style={{ fontFamily: 'var(--font-handwritten)' }}>
            ✨ Made with Power of Ten ✨
          </p>
        </div>
      </main>
    </div>
  );
}
