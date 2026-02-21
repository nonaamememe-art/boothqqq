import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ResultPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [shortUrl, setShortUrl] = useState('');

  useEffect(() => {
    fetchQRCode();
    fetchShortUrl();
  }, [sessionId]);

  const fetchQRCode = async () => {
    try {
      const response = await axios.get(`${API}/qrcode/${sessionId}`, { responseType: 'blob' });
      setQrCodeUrl(URL.createObjectURL(response.data));
    } catch (error) {
      console.error("Error fetching QR code:", error);
    }
  };

  const fetchShortUrl = async () => {
    try {
      const shareRes = await axios.get(`${API}/share/${sessionId}`);
      setShortUrl(`${window.location.origin}/i/${shareRes.data.short_id}`);
    } catch (error) {
      console.error("Error fetching short URL:", error);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden paper-bg flex flex-col items-center justify-center">
      {/* Home Button */}
      <div className="absolute top-8 left-8">
        <Button
          onClick={() => navigate('/')}
          className="btn-sketch bg-white hover:bg-gray-100 text-gray-800 px-8 py-4 text-xl"
          data-testid="home-btn"
        >
          <Home className="w-6 h-6 mr-2" />
          Home
        </Button>
      </div>

      {/* QR Code */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <h1 
          className="text-6xl font-bold text-gray-800 mb-8"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          📱 Scan to Download!
        </h1>

        <div className="sketch-border bg-white p-10 inline-block">
          {qrCodeUrl ? (
            <img src={qrCodeUrl} alt="QR Code" className="w-[400px] h-[400px]" />
          ) : (
            <div className="w-[400px] h-[400px] flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-pink-400 border-dashed rounded-full animate-spin" />
            </div>
          )}
        </div>

        {shortUrl && (
          <p className="mt-8 text-2xl text-gray-500" style={{ fontFamily: 'var(--font-handwritten)' }}>
            {shortUrl}
          </p>
        )}

        <p className="mt-4 text-xl text-gray-400" style={{ fontFamily: 'var(--font-handwritten)' }}>
          Point your phone camera at the QR code ✨
        </p>
      </motion.div>
    </div>
  );
}
