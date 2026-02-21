import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Share2, RefreshCw, Home, QrCode, Image, Film } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const FRONTEND_URL = window.location.origin;

export default function ResultPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams();

  const [session, setSession] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSession();
    fetchQRCode();
  }, [sessionId]);

  const fetchSession = async () => {
    try {
      const response = await axios.get(`${API}/sessions/${sessionId}`);
      setSession(response.data);
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
    const shareUrl = `${FRONTEND_URL}/download/${sessionId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Power of Ten Photo Strip',
          text: 'Check out my photo strip!',
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
    toast.success("Link copied to clipboard!");
  };

  const startNewSession = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading your photos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <header className="py-6 px-6 flex items-center justify-between">
        <h1 
          className="text-2xl font-bold text-slate-900"
          style={{ fontFamily: 'var(--font-heading)' }}
          data-testid="result-title"
        >
          Power of Ten
        </h1>
        <Button
          variant="outline"
          onClick={startNewSession}
          data-testid="new-session-btn"
        >
          <Home className="w-4 h-4 mr-2" />
          New Session
        </Button>
      </header>

      {/* Main Content */}
      <main className="px-6 pb-24">
        <div className="max-w-5xl mx-auto">
          {/* Success Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              Your Photo Strip is Ready!
            </h2>
            <p className="text-slate-600">
              Scan the QR code or use the buttons below to download
            </p>
          </motion.div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* QR Code Section */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="overflow-hidden">
                <CardContent className="p-8">
                  <div className="flex items-center gap-2 mb-6">
                    <QrCode className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-slate-800">Scan to Download</h3>
                  </div>
                  
                  <div 
                    className="qr-container aspect-square max-w-xs mx-auto flex items-center justify-center"
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
                        <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                      </div>
                    )}
                  </div>

                  <p className="text-center text-sm text-slate-500 mt-4">
                    Point your phone camera at this QR code to access the download page
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Download Options */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-4"
            >
              {/* Photo Strip Download */}
              <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Image className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-slate-800">Photo Strip</h4>
                      <p className="text-sm text-slate-500 mb-3">
                        High-quality PNG image with all decorations
                      </p>
                      <Button
                        onClick={handleDownloadImage}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        data-testid="download-image-btn"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Image
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* GIF Download */}
              <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Film className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-slate-800">Animated GIF</h4>
                      <p className="text-sm text-slate-500 mb-3">
                        Your 4 photos as an animated slideshow
                      </p>
                      <Button
                        variant="outline"
                        onClick={handleDownloadGif}
                        className="w-full border-purple-300 text-purple-700 hover:bg-purple-50"
                        data-testid="download-gif-btn"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download GIF
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Share Button */}
              <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Share2 className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-slate-800">Share Link</h4>
                      <p className="text-sm text-slate-500 mb-3">
                        Copy or share the download link with friends
                      </p>
                      <Button
                        variant="outline"
                        onClick={handleShare}
                        className="w-full border-green-300 text-green-700 hover:bg-green-50"
                        data-testid="share-btn"
                      >
                        <Share2 className="w-4 h-4 mr-2" />
                        Share Link
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
              className="px-12 py-6 text-lg rounded-full bg-slate-900 hover:bg-slate-800"
              data-testid="start-new-btn"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Start New Photo Session
            </Button>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
