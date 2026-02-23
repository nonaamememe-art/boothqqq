import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Download, 
  Share2, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  PlayCircle,
  Heart
} from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ShortUrlPage() {
  const { shortId } = useParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mediaItems, setMediaItems] = useState([]);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const resolveRes = await axios.get(`${API}/resolve/${shortId}`);
        const sessionId = resolveRes.data.session_id;
        const sessionRes = await axios.get(`${API}/sessions/${sessionId}`);
        const data = sessionRes.data;
        setSession(data);

        const items = [];
        if (data.photos) {
          data.photos.forEach((p, i) => items.push({ type: 'image', url: p, isFinal: false }));
        }
        items.push({ type: 'image', url: `${API}/download/${sessionId}/image`, isFinal: true });
        items.push({ type: 'video', url: `${API}/download/${sessionId}/video`, isFinal: false });

        setMediaItems(items);
      } catch (error) {
        toast.error("Failed to load your memories");
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, [shortId]);

  const handleDownload = async () => {
    const item = mediaItems[currentIndex];
    const tid = toast.loading("Downloading...");
    try {
      const response = await fetch(item.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `photobooth-${shortId}.${item.type === 'video' ? 'mp4' : 'png'}`;
      document.body.appendChild(a);
      a.click(); a.remove();
      toast.success("Saved!", { id: tid });
    } catch (e) {
      window.open(item.url, '_blank');
      toast.dismiss(tid);
    }
  };

  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-[#FAF7F0]">
      <Loader2 className="w-10 h-10 animate-spin text-[#FF9494]" />
    </div>
  );

  return (
    <div className="h-screen w-screen bg-[#FAF7F0] flex flex-col overflow-hidden font-mali text-[#4A403A]">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Mali:wght@400;700&display=swap');
        .font-mali { font-family: 'Mali', cursive; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}} />

      {/* --- 1. Header (คงที่) --- */}
      <header className="h-16 md:h-20 shrink-0 flex items-center justify-between px-6 bg-white/40 backdrop-blur-sm z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-[#FF9494] rounded-full flex items-center justify-center shadow-sm">
            <Heart className="text-white w-4 h-4 md:w-6 md:h-6 fill-current" />
          </div>
          <span className="text-xl md:text-2xl font-bold text-[#FF9494] uppercase tracking-tighter italic">
            KKW Photobooth
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleDownload} className="p-2 text-[#FF9494] hover:scale-110 transition-all">
            <Download className="w-6 h-6 md:w-7 md:h-7" />
          </button>
          <button onClick={() => navigator.share?.({url: window.location.href})} className="p-2 text-[#FF9494] hover:scale-110 transition-all">
            <Share2 className="w-6 h-6 md:w-7 md:h-7" />
          </button>
        </div>
      </header>

      {/* --- 2. Main Gallery Area (ปรับรูปให้พอดีเมื่อ Footer สูงขึ้น) --- */}
      <main className="flex-grow min-h-0 relative flex items-center justify-center">
        
        {/* Navigation Arrows */}
        <div className="absolute inset-x-2 md:inset-x-10 top-1/2 -translate-y-1/2 flex justify-between z-50 pointer-events-none">
          <button 
            onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
            className={`w-12 h-12 md:w-16 md:h-16 flex items-center justify-center rounded-full bg-white/90 text-[#FF9494] shadow-xl border border-[#FFE3E1] pointer-events-auto transition-all hover:scale-110 ${currentIndex === 0 ? 'opacity-0' : 'opacity-100'}`}
          >
            <ChevronLeft className="w-8 h-8 md:w-10 md:h-10" />
          </button>
          <button 
            onClick={() => setCurrentIndex(prev => Math.min(mediaItems.length - 1, prev + 1))}
            className={`w-12 h-12 md:w-16 md:h-16 flex items-center justify-center rounded-full bg-white/90 text-[#FF9494] shadow-xl border border-[#FFE3E1] pointer-events-auto transition-all hover:scale-110 ${currentIndex === mediaItems.length - 1 ? 'opacity-0' : 'opacity-100'}`}
          >
            <ChevronRight className="w-8 h-8 md:w-10 md:h-10" />
          </button>
        </div>

        {/* รูปหลัก: จำกัดความสูง max-h-[45vh] บนมือถือ เพื่อกันไม่ให้ทับกับ Thumbnail ที่ยกสูงขึ้น */}
        <div className="w-full h-full flex items-center justify-center relative p-4 md:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.2 }}
              className="relative max-w-full h-full flex items-center justify-center"
            >
              <div className="absolute top-2 right-2 md:top-4 md:right-4 z-[60] bg-black/40 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold">
                {currentIndex + 1} / {mediaItems.length}
              </div>

              {mediaItems[currentIndex].type === 'image' ? (
                <img 
                  src={mediaItems[currentIndex].url} 
                  className="max-w-full max-h-[45vh] md:max-h-full object-contain rounded-2xl shadow-2xl border-[6px] md:border-[12px] border-white ring-1 ring-[#EADBC8]/20"
                  alt="Gallery"
                />
              ) : (
                <video 
                  src={mediaItems[currentIndex].url} 
                  controls autoPlay loop playsInline
                  className="max-w-full max-h-[45vh] md:max-h-full object-contain rounded-2xl shadow-2xl border-[6px] md:border-[12px] border-white"
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* --- 3. Footer: ยก Thumbnail ขึ้นสูง (เยอะเลย) ในโทรศัพท์ --- */}
      <footer className="h-48 md:h-44 shrink-0 bg-white/20 backdrop-blur-md flex items-center justify-center border-t border-[#EADBC8]/10 pb-16 md:pb-8">
        <div className="flex gap-4 md:gap-6 px-8 overflow-x-auto no-scrollbar items-center max-w-full">
          {mediaItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`relative flex-shrink-0 w-20 h-20 md:w-28 md:h-28 rounded-2xl overflow-hidden border-[3px] transition-all duration-300 shadow-md ${
                currentIndex === idx 
                  ? 'border-[#FF9494] scale-110 shadow-pink-200/50 ring-4 ring-[#FF9494]/20' 
                  : 'border-white opacity-40 hover:opacity-100 grayscale-[0.3]'
              }`}
            >
              {item.type === 'image' ? (
                <img src={item.url} className="w-full h-full object-cover" alt="thumb" />
              ) : (
                <div className="w-full h-full bg-[#4A403A] flex items-center justify-center">
                  <PlayCircle className="text-white w-10 h-10" />
                </div>
              )}
            </button>
          ))}
        </div>
      </footer>
    </div>
  );
}