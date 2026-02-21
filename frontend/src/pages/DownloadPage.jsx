import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Image, Film, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function DownloadPage() {
  const { sessionId } = useParams();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSession();
  }, [sessionId]);

  const fetchSession = async () => {
    try {
      const response = await axios.get(`${API}/share/${sessionId}`);
      setSession(response.data);
    } catch (error) {
      console.error("Error fetching session:", error);
      setError("Photo session not found or has expired");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadImage = () => {
    window.open(`${API.replace('/api', '')}/api/download/${sessionId}/image`, '_blank');
  };

  const handleDownloadGif = () => {
    window.open(`${API.replace('/api', '')}/api/download/${sessionId}/gif`, '_blank');
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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Oops!</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <Button
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="create-new-btn"
          >
            Create Your Own Photo Strip
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <header className="py-6 px-6 text-center">
        <h1 
          className="text-3xl font-bold text-slate-900"
          style={{ fontFamily: 'var(--font-heading)' }}
          data-testid="download-page-title"
        >
          Power of Ten
        </h1>
        <p className="text-slate-600 mt-1">Photo Booth</p>
      </header>

      {/* Main Content */}
      <main className="px-6 pb-12">
        <div className="max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Image className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Your Photos Are Ready!
            </h2>
            <p className="text-slate-600">
              Download your photo strip and animated GIF below
            </p>
          </motion.div>

          {/* Download Cards */}
          <div className="space-y-4">
            {/* Photo Strip Download */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Image className="w-7 h-7 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-800">Photo Strip</h3>
                      <p className="text-sm text-slate-500">High-quality decorated image</p>
                    </div>
                  </div>
                  <Button
                    onClick={handleDownloadImage}
                    className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
                    size="lg"
                    data-testid="public-download-image-btn"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download Photo Strip
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* GIF Download */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Film className="w-7 h-7 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-800">Animated GIF</h3>
                      <p className="text-sm text-slate-500">4 photos in a slideshow</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleDownloadGif}
                    className="w-full mt-4 border-purple-300 text-purple-700 hover:bg-purple-50"
                    size="lg"
                    data-testid="public-download-gif-btn"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download GIF
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Create Your Own */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-12 text-center"
          >
            <p className="text-slate-500 mb-4">Want to create your own photo strip?</p>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/'}
              className="px-8"
              data-testid="create-own-btn"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Create Your Own
            </Button>
          </motion.div>

          {/* Footer */}
          <div className="mt-12 text-center text-sm text-slate-400">
            <p>Powered by Power of Ten</p>
          </div>
        </div>
      </main>
    </div>
  );
}
