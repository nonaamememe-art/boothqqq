import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Printer, Home, X, RotateCw, ZoomIn, ZoomOut, Trash2 } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function DecorationPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const containerRef = useRef(null);

  // States
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrValue, setQrValue] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);
  const [session, setSession] = useState(null);
  const [template, setTemplate] = useState(null);
  const [availableStickers, setAvailableStickers] = useState([]);
  const [placedStickers, setPlacedStickers] = useState([]);
  const [selectedStickerId, setSelectedStickerId] = useState(null);
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(false);

  // Load Data
  useEffect(() => {
    const init = async () => {
      try {
        const sRes = await axios.get(`${API}/sessions/${sessionId}`);
        setSession(sRes.data);

        const tRes = await axios.get(`${API}/templates`);
        const foundTemplate = tRes.data.find(t => t.id === sRes.data.template_id) || tRes.data[0];
        
        if (foundTemplate) {
          const tW = foundTemplate.width || 1200;
          const tH = foundTemplate.height || 3600;
          setTemplate({ ...foundTemplate, width: tW, height: tH });

          // คำนวณ Scale สำหรับแสดงผล (ล็อคความกว้างที่ 280px สำหรับจอแต่งรูป)
          const displayWidth = 360; 
          setScale(displayWidth / tW);
        }

        const stRes = await axios.get(`${API}/stickers`);
        setAvailableStickers(stRes.data);
      } catch (e) {
        toast.error("Error loading decoration data");
      }
    };
    init();
  }, [sessionId]);

  // Sticker Logic
  const addSticker = (sticker) => {
    const newSticker = {
      ...sticker,
      instanceId: `stk-${Date.now()}`,
      x: 50,
      y: 100,
      size: 100, // ขนาดพื้นฐาน
      rotation: 0,
      scale: 2 // ตัวคูณขนาด
    };
    setPlacedStickers([...placedStickers, newSticker]);
    setSelectedStickerId(newSticker.instanceId);
  };

  const updateSticker = (id, updates) => {
    setPlacedStickers(prev => prev.map(s => s.instanceId === id ? { ...s, ...updates } : s));
  };

  const removeSticker = (id) => {
    setPlacedStickers(prev => prev.filter(s => s.instanceId !== id));
    if (selectedStickerId === id) setSelectedStickerId(null);
  };

  const selectedStickerData = placedStickers.find(s => s.instanceId === selectedStickerId);

const handlePrint = async () => {
    if (isPrinting) return;
    setIsPrinting(true);
    const tid = toast.loading("กำลังประมวลผลและส่งไฟล์ไปยังเครื่องปริ้น...");

    try {
      // 1. แปลง Canvas เป็นรูปภาพ (เหมือนขั้นตอน finalize)
      const stage = stageRef.current;
      const dataURL = stage.toDataURL({ pixelRatio: 3 });

      // 2. บันทึกรูปภาพลง Server ก่อน (เพื่อให้มีไฟล์ไปปริ้น)
      await axios.post(`${API}/sessions/${sessionId}/finalize`, {
        session_id: sessionId,
        final_image_data: dataURL
      });

      // 3. สั่งปริ้นเบื้องหลัง และดึง Short URL สำหรับ QR Code
      const res = await axios.post(`${API}/sessions/${sessionId}/print-and-qr`);
      
      if (res.data.success) {
        setQrValue(res.data.short_url);
        setShowQRCode(true); // เปิด Modal โชว์ QR Code
        toast.success("ส่งคำสั่งปริ้นเรียบร้อยแล้ว!", { id: tid });
      }
    } catch (error) {
      console.error(error);
      toast.error("เกิดข้อผิดพลาดในการปริ้น", { id: tid });
    } finally {
      setIsPrinting(false);
    }
  };

if (!session || !template) return null;

  return (
    <div className="h-screen w-screen bg-[#fdfaf5] flex items-center justify-between px-10 lg:px-20 overflow-hidden font-sans">
      
      {/* ฝั่งซ้าย: Sticker Panel & Edit Controls */}
      <div className="w-72 lg:w-80 flex flex-col gap-4 h-[90vh]">
        {/* รายการสติกเกอร์ */}
        <div className="bg-white border-2 border-black rounded-[40px] p-6 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] flex-1 overflow-hidden flex flex-col">
          <h3 className="text-xl font-black mb-4 border-b-4 border-black pb-2 italic flex items-center gap-2">
            🎨 STICKERS
          </h3>
          <div className="grid grid-cols-2 gap-3 overflow-y-auto pr-2 custom-scrollbar">
            {availableStickers.map(s => (
              <button 
                key={s.id} 
                onClick={() => addSticker(s)} 
                className="hover:scale-105 transition-all p-2 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50 flex items-center justify-center group"
              >
                <img src={s.url} className="w-full h-16 object-contain" alt="stk" />
              </button>
            ))}
          </div>
        </div>

        {/* เครื่องมือแก้ไขสติกเกอร์ (แสดงเมื่อเลือกชิ้นงาน) */}
        <AnimatePresence>
          {selectedStickerData && (
            <motion.div 
              initial={{ y: 20, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: 20, opacity: 0 }}
              className="bg-white border-4 border-black rounded-[30px] p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
            >
              <div className="flex justify-between items-center mb-4">
                <span className="font-black text-sm uppercase italic">Edit Selected</span>
                <button onClick={() => setSelectedStickerId(null)}><X size={16}/></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase mb-1 flex justify-between">
                    <ZoomOut size={12}/> Size <ZoomIn size={12}/>
                  </label>
                  <Slider 
                    value={[selectedStickerData.scale * 100]} 
                    onValueChange={([v]) => updateSticker(selectedStickerId, { scale: v / 100 })} 
                    min={50} max={250} step={5} 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase mb-1 flex gap-2 items-center">
                    <RotateCw size={12}/> Rotation
                  </label>
                  <Slider 
                    value={[selectedStickerData.rotation]} 
                    onValueChange={([v]) => updateSticker(selectedStickerId, { rotation: v })} 
                    min={-180} max={180} step={1} 
                  />
                </div>
                <Button 
                  variant="destructive" 
                  onClick={() => removeSticker(selectedStickerId)}
                  className="w-full h-8 bg-red-500 hover:bg-red-600 border-2 border-black font-bold text-xs"
                >
                  <Trash2 size={14} className="mr-2"/> REMOVE
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ฝั่งกลาง: 2x6 Inch Photo Strip (จุดรวมร่างพิกเซลแม่นยำ) */}
      <div className="flex-1 flex justify-center items-center h-full relative">
        <div 
          ref={containerRef}
          className="relative bg-white shadow-[20px_20px_0px_0px_rgba(0,0,0,0.1)] border-2 border-gray-100 cursor-crosshair"
          onClick={() => setSelectedStickerId(null)}
          style={{ 
            width: `${template.width * scale}px`, 
            height: `${template.height * scale}px`,
            backgroundImage: `url(${template.template_image_url})`,
            backgroundSize: '100% 100%',
            backgroundColor: template.background_color || '#fff'
          }}
        >
          {/* Photo Slots */}
          {template.photo_slots?.map((slot, i) => (
            <div 
              key={slot.id || i} 
              className="absolute bg-zinc-800 overflow-hidden"
              style={{ 
                left: `${slot.x * scale}px`, 
                top: `${slot.y * scale}px`, 
                width: `${slot.w * scale}px`, 
                height: `${slot.h * scale}px`,
                transform: slot.rotation ? `rotate(${slot.rotation}deg)` : 'none'
              }}
            >
              {session.photos && session.photos[i] && (
                <img src={session.photos[i]} className="w-full h-full object-cover" alt="snap" />
              )}
            </div>
          ))}

          {/* Draggable & Editable Stickers */}
          {placedStickers.map((stk) => (
            <motion.div
              key={stk.instanceId}
              drag
              dragMomentum={false}
              dragConstraints={containerRef}
              onDragStart={() => setSelectedStickerId(stk.instanceId)}
              className={`absolute cursor-grab active:cursor-grabbing z-50 ${selectedStickerId === stk.instanceId ? "outline-2 outline-dashed outline-pink-500 outline-offset-4" : ""}`}
              style={{ 
                width: stk.size * scale, 
                height: stk.size * scale, 
                left: stk.x, // หมายเหตุ: framer-motion drag ใช้ x/y transform
                top: stk.y,
                rotate: `${stk.rotation}deg`,
                scale: stk.scale
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedStickerId(stk.instanceId);
              }}
            >
              <img src={stk.url} className="w-full h-full object-contain pointer-events-none" alt="stk" />
            </motion.div>
          ))}
        </div>
      </div>

      {/* ฝั่งขวา: Action Buttons */}
      <div className="flex flex-col gap-6 z-20">
        <Button 
          disabled={isPrinting}
          onClick={handlePrint}
          className="w-40 h-40 lg:w-44 lg:h-44 bg-[#ff4b91] hover:bg-[#ff1f75] text-white border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] rounded-[50px] flex flex-col gap-4 transition-all active:translate-x-1 active:translate-y-1 active:shadow-none"
        >
          {isPrinting ? (
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Printer size={50} className="lg:w-16 lg:h-16" strokeWidth={3} />
              <span className="text-2xl lg:text-3xl font-black italic uppercase tracking-tighter">PRINT!</span>
            </>
          )}
        </Button>

      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #000; border-radius: 10px; }
      `}</style>
    </div>
  );
}

<AnimatePresence>
  {showQRCode && (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-md"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="bg-white p-8 rounded-[40px] max-w-sm w-full text-center shadow-[0_0_50px_rgba(255,71,133,0.3)]"
      >
        <div className="w-20 h-20 bg-[#FF4785] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-pink-200">
          <Printer className="text-white w-10 h-10 animate-pulse" />
        </div>
        
        <h2 className="text-2xl font-black text-[#FF4785] mb-2 uppercase italic">Printing Started!</h2>
        <p className="text-gray-500 mb-8 font-medium">สแกนเพื่อรับรูปภาพของคุณที่นี่</p>
        
        <div className="bg-white p-4 rounded-3xl border-4 border-[#FF4785] inline-block shadow-inner mb-8">
           {/* ถ้าใช้ qrcode.react */}
           <QRCodeSVG value={qrValue} size={200} />
        </div>

        <button 
          onClick={() => window.location.href = '/'} // หรือปิด Modal แล้วไปหน้าแรก
          className="w-full py-4 bg-[#FF4785] text-white rounded-2xl font-bold text-lg shadow-lg hover:bg-[#e63e77] transition-all"
        >
          กลับหน้าหลัก
        </button>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
