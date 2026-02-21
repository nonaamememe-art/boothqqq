import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ResultPage() {
  const { sessionId } = useParams();
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [shortUrl, setShortUrl] = useState('');

  useEffect(() => {
    fetchQRCode();
    fetchShortUrl();
  }, [sessionId]);

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

  const fetchShortUrl = async () => {
    try {
      const shareRes = await axios.get(`${API}/share/${sessionId}`);
      const baseUrl = window.location.origin;
      setShortUrl(`${baseUrl}/i/${shareRes.data.short_id}`);
    } catch (error) {
      console.error("Error fetching short URL:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      {/* QR Code Only - Full Screen Center */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <h1 
          className="text-5xl font-bold text-white mb-8"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          📱 Scan to Download!
        </h1>

        {/* Large QR Code */}
        <div 
          className="bg-white p-8 rounded-2xl shadow-2xl inline-block"
          data-testid="qr-code-container"
        >
          {qrCodeUrl ? (
            <img
              src={qrCodeUrl}
              alt="QR Code"
              className="w-96 h-96"
              data-testid="qr-code-image"
            />
          ) : (
            <div className="w-96 h-96 flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-pink-400 border-dashed rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Short URL Display */}
        {shortUrl && (
          <p 
            className="mt-6 text-2xl text-gray-400"
            style={{ fontFamily: 'var(--font-handwritten)' }}
          >
            {shortUrl}
          </p>
        )}

        <p 
          className="mt-4 text-xl text-gray-500"
          style={{ fontFamily: 'var(--font-handwritten)' }}
        >
          Point your phone camera at the QR code
        </p>
      </motion.div>
    </div>
  );
}
