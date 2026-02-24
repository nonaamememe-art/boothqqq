import { useState, useEffect, useRef } from "react";
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
  
  const scrollRef = useRef(null);

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
          data.photos.forEach((p) => items.push({ type: 'image', url: p, isFinal: false }));
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

  // ระบบ Auto Scroll เลื่อน Thumbnail ตามรูปที่เลือก
  useEffect(() => {
    if (scrollRef.current) {
      const activeElement = scrollRef.current.children[currentIndex];
      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center"
        });
      }
    }
  }, [currentIndex]);

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

  const nextImage = () => setCurrentIndex((prev) => (prev + 1) % mediaItems.length);
  const prevImage = () => setCurrentIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length);

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

      {/* --- 1. Header --- */}
      <header className="h-16 shrink-0 flex items-center justify-between px-6 bg-white/40 backdrop-blur-sm z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#FF9494] rounded-full flex items-center justify-center">
            <Heart className="text-white w-4 h-4 fill-current" />
          </div>
          <span className="text-xl font-bold text-[#FF9494] italic tracking-tighter">Poweroftenkkw</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleDownload} className="p-2 text-[#FF9494] active:scale-90 transition-transform"><Download className="w-6 h-6" /></button>
          <button onClick={() => navigator.share?.({url: window.location.href})} className="p-2 text-[#FF9494] active:scale-90 transition-transform"><Share2 className="w-6 h-6" /></button>
        </div>
      </header>

      {/* --- 2. Main Gallery Area (ปรับตำแหน่งภาพ Preview ลงมาอีกนิด) --- */}
      <main className="flex-grow min-h-0 relative flex items-center justify-center">
        {/* Navigation Arrows (ลูกศรชมพูเปล่าๆ) */}
        <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex justify-between z-50 pointer-events-none">
          <button onClick={prevImage} className="p-4 flex items-center justify-center text-[#FF9494]/70 hover:text-[#FF9494] pointer-events-auto active:scale-90 transition-all">
            <ChevronLeft className="w-12 h-12 md:w-16 md:h-16" />
          </button>
          <button onClick={nextImage} className="p-4 flex items-center justify-center text-[#FF9494]/70 hover:text-[#FF9494] pointer-events-auto active:scale-90 transition-all">
            <ChevronRight className="w-12 h-12 md:w-16 md:h-16" />
          </button>
        </div>

        {/* ปรับระยะ pt-16 (ขยับลงมา) และ pb-16 (ให้พื้นที่ล่าง) */}
        <div className="w-full h-full flex items-center justify-center p-6 pt-16 pb-16">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full w-full flex items-center justify-center relative"
            >
              {/* ลำดับภาพ (Badge) */}
              <div className="absolute -top-10 -right-4 bg-black/50 text-white px-3 py-1 rounded-full text-[10px] md:text-xs font-bold z-50">
                {currentIndex + 1} / {mediaItems.length}
              </div>

              {mediaItems[currentIndex].type === 'image' ? (
                <img 
                  src={mediaItems[currentIndex].url} 
                  // ปรับ max-h และลดระยะการ translate-y ลง เพื่อให้ภาพขยับลงมาตามที่ต้องการ
                  className={`max-w-full shadow-2xl object-contain transition-transform duration-300 ${mediaItems[currentIndex].isFinal ? 'max-h-[55vh] -translate-y-[5px]' : 'max-h-[45vh]'}`}
                  alt="Gallery"
                />
              ) : (
                <video src={mediaItems[currentIndex].url} controls autoPlay loop playsInline className="max-h-[45vh] max-w-full shadow-2xl" />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* --- 3. Footer (Thumbnails w-24 h-24 + Auto Scroll + Glow) --- */}
      <footer className="h-64 shrink-0 bg-white/30 backdrop-blur-md flex items-center border-t border-gray-100/50">
        <div 
          ref={scrollRef}
          className="flex gap-4 px-10 pt-4 pb-12 overflow-x-auto no-scrollbar items-center w-full md:justify-center"
        >
          {mediaItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`relative flex-shrink-0 w-24 h-24 transition-all duration-300 rounded-xl overflow-hidden
                ${currentIndex === idx 
                  ? 'border-[5px] border-[#FF91A4] scale-110 z-10 shadow-[0_0_20px_rgba(255,145,164,0.7)]' 
                  : 'border-[2px] border-white opacity-40 grayscale-[0.2]'
                }
              `}
            >
              {item.type === 'image' ? (
                <img src={item.url} className="w-full h-full object-cover" alt={`thumb-${idx}`} />
              ) : (
                <div className="w-full h-full bg-[#333] flex items-center justify-center">
                  <PlayCircle className="text-white w-10 h-10 opacity-70" />
                </div>
              )}
            </button>
          ))}
        </div>
      </footer>
    </div>
  );
}