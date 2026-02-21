import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Download, Share2, RefreshCw, Home, ImageIcon, Sparkles } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ResultPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams();

  const [session, setSession] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shortUrl, setShortUrl] = useState('');

  useEffect(() => {
    fetchSession();
    fetchQRCode();
  }, [sessionId]);

  const fetchSession = async () => {
    try {
      const response = await axios.get(`${API}/sessions/${sessionId}`);
      setSession(response.data);
      
      // Get the short URL
      const shareRes = await axios.get(`${API}/share/${sessionId}`);
      const baseUrl = window.location.origin;
      setShortUrl(`${baseUrl}/i/${shareRes.data.short_id}`);
    } catch (error) {
      console.error("Error fetching session:", error);
      toast.error("Failed to load session");
    } finally {
      setLoading(false);
    }
  };

  const fetchQRCode = async () => {
    try {
      const response = await axios.get(`${API}/qrcode/${sessionId}`, {
        responseType: 'blob'
      });
      const url = URL.createObjectURL(response.data);
      setQrCodeUrl(url);
    } catch (error) {
      console.error("Error fetching QR code:", error);
    }
  };

  const handleDownloadImage = () => {
    if (session?.final_image_url) {
      window.open(`${API.replace('/api', '')}${session.final_image_url}`, '_blank');
    }
  };

  const handleDownloadGif = () => {
    if (session?.gif_url) {
      window.open(`${API.replace('/api', '')}${session.gif_url}`, '_blank');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Power of Ten Photo Strip',
          text: 'Check out my photo strip!',
          url: shortUrl
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          copyToClipboard(shortUrl);
        }
      }
    } else {
      copyToClipboard(shortUrl);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Link copied!");
  };

  const startNewSession = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center paper-bg">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-400 border-dashed rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg" style={{ fontFamily: 'var(--font-handwritten)' }}>Loading your masterpiece...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen paper-bg">
      {/* Header */}
      <header className="py-6 px-6 flex items-center justify-between">
        <h1 
          className="text-3xl font-bold text-gray-800"
          style={{ fontFamily: 'var(--font-heading)' }}
          data-testid="result-title"
        >
          🎉 All Done!
        </h1>
        <Button
          variant="outline"
          onClick={startNewSession}
          className="btn-sketch bg-white hover:bg-gray-50"
          data-testid="new-session-btn"
        >
          <Home className="w-4 h-4 mr-2" />
          New Photos
        </Button>
      </header>

      {/* Main Content */}
      <main className="px-6 pb-24">
        <div className="max-w-4xl mx-auto">
          {/* Success Message */}
          <motion.div
            initial={{ opacity: 0, y: 20, rotate: -2 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            className="text-center mb-8"
          >
            <div 
              className="w-24 h-24 sketch-border bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ transform: 'rotate(-3deg)' }}
            >
              <span className="text-5xl">✨</span>
            </div>
            <h2 
              className="text-4xl font-bold text-gray-800 mb-2"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Your Photo Strip is Ready!
            </h2>
            <p 
              className="text-gray-600"
              style={{ fontFamily: 'var(--font-handwritten)' }}
            >
              Scan the QR code or tap to download
            </p>
          </motion.div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* QR Code Section */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="sketch-border bg-white p-6" style={{ transform: 'rotate(-1deg)' }}>
                <h3 
                  className="text-xl font-bold text-center mb-4 text-gray-800"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  📱 Scan Me!
                </h3>
                
                <div 
                  className="aspect-square max-w-xs mx-auto bg-white p-4 border-2 border-dashed border-gray-300 rounded-lg"
                  data-testid="qr-code-container"
                >
                  {qrCodeUrl ? (
                    <img
                      src={qrCodeUrl}
                      alt="QR Code"
                      className="w-full h-full"
                      data-testid="qr-code-image"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-8 h-8 border-4 border-pink-400 border-dashed rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                <p 
                  className="text-center text-sm text-gray-500 mt-4"
                  style={{ fontFamily: 'var(--font-handwritten)' }}
                >
                  Point your camera at this QR code!
                </p>
                
                {/* Short URL display */}
                {shortUrl && (
                  <div className="mt-4 p-2 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <p className="text-xs text-gray-500 text-center break-all" style={{ fontFamily: 'var(--font-handwritten)' }}>
                      {shortUrl}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Download Options */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-4"
            >
              {/* Photo Strip Download */}
              <div className="sketch-border bg-white p-4" style={{ transform: 'rotate(1deg)' }}>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-pink-100 rounded-lg flex items-center justify-center border-2 border-dashed border-pink-300">
                    <ImageIcon className="w-7 h-7 text-pink-500" />
                  </div>
                  <div className="flex-1">
                    <h4 
                      className="text-lg font-bold text-gray-800"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      Photo Strip
                    </h4>
                    <p 
                      className="text-sm text-gray-500"
                      style={{ fontFamily: 'var(--font-handwritten)' }}
                    >
                      High quality PNG image
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleDownloadImage}
                  className="w-full mt-3 btn-sketch bg-pink-500 hover:bg-pink-600 text-white"
                  data-testid="download-image-btn"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>

              {/* GIF Download */}
              <div className="sketch-border bg-white p-4" style={{ transform: 'rotate(-1deg)' }}>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-purple-100 rounded-lg flex items-center justify-center border-2 border-dashed border-purple-300">
                    <Sparkles className="w-7 h-7 text-purple-500" />
                  </div>
                  <div className="flex-1">
                    <h4 
                      className="text-lg font-bold text-gray-800"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      Animated GIF
                    </h4>
                    <p 
                      className="text-sm text-gray-500"
                      style={{ fontFamily: 'var(--font-handwritten)' }}
                    >
                      Your photos as a slideshow
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={handleDownloadGif}
                  className="w-full mt-3 btn-sketch border-purple-300 text-purple-600 hover:bg-purple-50"
                  data-testid="download-gif-btn"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download GIF
                </Button>
              </div>

              {/* Share Button */}
              <div className="sketch-border bg-white p-4" style={{ transform: 'rotate(0.5deg)' }}>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-green-100 rounded-lg flex items-center justify-center border-2 border-dashed border-green-300">
                    <Share2 className="w-7 h-7 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <h4 
                      className="text-lg font-bold text-gray-800"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      Share Link
                    </h4>
                    <p 
                      className="text-sm text-gray-500"
                      style={{ fontFamily: 'var(--font-handwritten)' }}
                    >
                      Send to friends!
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={handleShare}
                  className="w-full mt-3 btn-sketch border-green-300 text-green-600 hover:bg-green-50"
                  data-testid="share-btn"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Copy Link
                </Button>
              </div>
            </motion.div>
          </div>

          {/* Start New Session */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12 text-center"
          >
            <Button
              size="lg"
              onClick={startNewSession}
              className="btn-sketch px-10 py-6 text-xl bg-gray-800 hover:bg-gray-700 text-white"
              data-testid="start-new-btn"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Take More Photos!
            </Button>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
