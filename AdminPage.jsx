import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Plus, Trash2, Upload, Layout, Smile, Save, Maximize, ImageIcon, Edit2 
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("templates");
  const [templates, setTemplates] = useState([]);
  const [stickers, setStickers] = useState([]);
  
  const [newTemplate, setNewTemplate] = useState({
    id: "", name: "", description: "",
    background_color: "#ffffff", frame_color: "#f3f4f6",
    template_image_url: "",
    photo_slots: [
      { id: 1, x: 50, y: 50, w: 200, h: 112 },
      { id: 2, x: 50, y: 200, w: 200, h: 112 },
      { id: 3, x: 50, y: 350, w: 200, h: 112 },
      { id: 4, x: 50, y: 500, w: 200, h: 112 },
    ]
  });

  const containerRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const [resizing, setResizing] = useState(null);
  const [canvasScale, setCanvasScale] = useState(1);
  const [imgSize, setImgSize] = useState({ w: 1200, h: 1800 });

  useEffect(() => {
    fetchTemplates();
    fetchStickers();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await axios.get(`${API}/admin/templates`);
      setTemplates(res.data);
    } catch (e) { toast.error("Failed to fetch templates"); }
  };

  const fetchStickers = async () => {
    try {
      const res = await axios.get(`${API}/admin/stickers`);
      setStickers(res.data);
    } catch (e) { toast.error("Failed to fetch stickers"); }
  };

  const handleImageLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.target;
    setImgSize({ w: naturalWidth, h: naturalHeight });
    if (containerRef.current) {
        setCanvasScale(containerRef.current.offsetWidth / naturalWidth);
    }
  };

  const handleUploadTemplateImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await axios.post(`${API}/admin/templates/upload-image`, formData);
      setNewTemplate({ ...newTemplate, template_image_url: res.data.url });
      toast.success("Image uploaded");
    } catch (e) { toast.error("Upload failed"); }
  };

  // --- ระบบจัดการสติกเกอร์ (แบบเดิมคืนมา) ---
  const handleUploadSticker = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      await axios.post(`${API}/admin/stickers`, formData);
      fetchStickers();
      toast.success("Sticker uploaded!");
    } catch (e) { toast.error("Upload failed"); }
  };

  const deleteSticker = async (id) => {
    if (!window.confirm("Delete this sticker?")) return;
    try {
      await axios.delete(`${API}/admin/stickers/${id}`);
      fetchStickers();
      toast.success("Sticker deleted");
    } catch (e) { toast.error("Delete failed"); }
  };

  // --- ระบบ Edit Template ---
  const editTemplate = (template) => {
    setNewTemplate(template);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteTemplate = async (id) => {
    if (!window.confirm("Delete this template?")) return;
    try {
      await axios.delete(`${API}/admin/templates/${id}`);
      fetchTemplates();
      toast.success("Deleted");
    } catch (e) { toast.error("Delete failed"); }
  };

  // --- Logic พิกเซล (Drag & Resize) ---
  const onMouseDown = (id, e, type) => {
    e.preventDefault();
    if (type === "drag") setDragging({ id, startX: e.clientX, startY: e.clientY });
    else setResizing({ id, startX: e.clientX, startY: e.clientY });
  };

  const onMouseMove = (e) => {
    if (!dragging && !resizing) return;
    const newSlots = [...newTemplate.photo_slots];
    const idx = newSlots.findIndex(s => s.id === (dragging?.id || resizing?.id));
    const deltaX = (e.clientX - (dragging?.startX || resizing?.startX)) / canvasScale;
    const deltaY = (e.clientY - (dragging?.startY || resizing?.startY)) / canvasScale;

    if (dragging) {
      newSlots[idx].x += deltaX; newSlots[idx].y += deltaY;
      setDragging({ ...dragging, startX: e.clientX, startY: e.clientY });
    } else if (resizing) {
      newSlots[idx].w = Math.max(20, newSlots[idx].w + deltaX);
      newSlots[idx].h = Math.max(20, newSlots[idx].h + deltaY);
      setResizing({ ...resizing, startX: e.clientX, startY: e.clientY });
    }
    setNewTemplate({ ...newTemplate, photo_slots: newSlots });
  };

  const updateSlotManual = (idx, field, value) => {
    const newSlots = [...newTemplate.photo_slots];
    newSlots[idx][field] = parseInt(value) || 0;
    setNewTemplate({ ...newTemplate, photo_slots: newSlots });
  };

  const handleSaveTemplate = async () => {
    try {
      await axios.post(`${API}/admin/templates`, newTemplate);
      toast.success("Template saved!");
      fetchTemplates();
    } catch (e) { toast.error("Save failed"); }
  };

  return (
    <div className="min-h-screen bg-slate-50" onMouseMove={onMouseMove} onMouseUp={() => {setDragging(null); setResizing(null)}}>
      <nav className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2 font-bold text-xl italic text-slate-800">🎨 Admin Panel</div>
        <Button variant="outline" size="sm" onClick={() => navigate('/')}>Logout</Button>
      </nav>

      <div className="max-w-6xl mx-auto p-8">
        {/* Tab Switcher */}
        <div className="flex justify-center mb-8">
          <div className="bg-slate-200 p-1 rounded-xl flex gap-1">
            <button onClick={() => setActiveTab("templates")} className={`px-8 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'templates' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>
               <Layout className="inline w-4 h-4 mr-2" /> Templates
            </button>
            <button onClick={() => setActiveTab("stickers")} className={`px-8 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'stickers' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>
               <Smile className="inline w-4 h-4 mr-2" /> Stickers
            </button>
          </div>
        </div>

        {/* --- Tab: Templates --- */}
        {activeTab === "templates" && (
          <div className="space-y-8">
            <Card className="p-8 bg-white border-none shadow-md">
              <div className="flex items-center gap-2 mb-6 text-indigo-600 font-bold text-lg"><Plus /> New Template</div>
              <div className="grid grid-cols-3 gap-6 mb-6">
                <Input placeholder="Template ID" value={newTemplate.id} onChange={e => setNewTemplate({...newTemplate, id: e.target.value})} />
                <Input placeholder="Template Name" value={newTemplate.name} onChange={e => setNewTemplate({...newTemplate, name: e.target.value})} />
                <Input placeholder="Description" value={newTemplate.description} onChange={e => setNewTemplate({...newTemplate, description: e.target.value})} />
              </div>

              {/* Editor ลากวาง */}
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 bg-slate-50">
                <div className="flex justify-between mb-4 text-sm font-bold text-slate-600">
                  <span className="flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Template Image</span>
                  <label className="bg-pink-400 hover:bg-pink-500 text-white px-4 py-1.5 rounded-full text-xs cursor-pointer transition-colors">
                    Choose File <input type="file" className="hidden" onChange={handleUploadTemplateImage} />
                  </label>
                </div>
                <div className="flex justify-center bg-white p-4 rounded-xl border border-slate-100">
                  <div ref={containerRef} className="relative bg-slate-200 shadow-sm"
                    style={{ width: '100%', maxWidth: '400px', aspectRatio: `${imgSize.w}/${imgSize.h}`, backgroundImage: `url(${newTemplate.template_image_url})`, backgroundSize: '100% 100%' }}>
                    {newTemplate.template_image_url && <img src={newTemplate.template_image_url} onLoad={handleImageLoad} className="hidden" />}
                    {newTemplate.photo_slots.map((slot) => (
                      <div key={slot.id} onMouseDown={(e) => onMouseDown(slot.id, e, "drag")} className="absolute border-2 border-pink-500 bg-pink-500/20"
                        style={{ left: `${slot.x * canvasScale}px`, top: `${slot.y * canvasScale}px`, width: `${slot.w * canvasScale}px`, height: `${slot.h * canvasScale}px`, cursor: 'move' }}>
                        <div className="absolute -top-5 left-0 bg-pink-500 text-white text-[9px] px-1 font-bold">Photo {slot.id}</div>
                        <div onMouseDown={(e) => { e.stopPropagation(); onMouseDown(slot.id, e, "resize"); }} className="absolute bottom-0 right-0 w-4 h-4 bg-pink-500 cursor-nwse-resize flex items-center justify-center"><Maximize className="w-2 h-2 text-white" /></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Coordinate Cards (Manual) */}
              <div className="grid grid-cols-4 gap-4 mt-6">
                {[
                  { id: 1, bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600' },
                  { id: 2, bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600' },
                  { id: 3, bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600' },
                  { id: 4, bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600' },
                ].map((color, idx) => (
                  <div key={color.id} className={`${color.bg} ${color.border} border p-3 rounded-xl`}>
                    <p className={`${color.text} font-bold text-xs mb-2`}>Photo {color.id}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {['x', 'y', 'w', 'h'].map(field => (
                        <div key={field}>
                          <label className="text-[9px] text-slate-400 uppercase font-bold">{field}</label>
                          <input type="number" className="w-full bg-white border rounded px-1 py-0.5 text-[10px]" 
                            value={Math.round(newTemplate.photo_slots[idx][field])} 
                            onChange={e => updateSlotManual(idx, field, e.target.value)} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <Button onClick={handleSaveTemplate} className="mt-8 bg-pink-400 hover:bg-pink-500 text-white font-bold rounded-full px-12 h-12 shadow-md">Save Template</Button>
            </Card>

            {/* Existing Templates Grid */}
            <div className="grid grid-cols-4 gap-6">
              {templates.map(t => (
                <Card key={t.id} className="p-4 bg-white border-none shadow-sm group">
                  <div className="aspect-[2/3] bg-slate-100 rounded-lg mb-4 overflow-hidden border border-slate-50 relative">
                    <img src={t.template_image_url} className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                        <Button size="sm" onClick={() => editTemplate(t)} className="bg-white text-black hover:bg-slate-200 font-bold"><Edit2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-center text-slate-700 truncate">{t.name}</div>
                  <Button variant="ghost" size="sm" onClick={() => deleteTemplate(t.id)} className="w-full mt-2 text-red-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></Button>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* --- Tab: Stickers (แก้ไขส่วนที่หายไป) --- */}
        {activeTab === "stickers" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <Card className="p-8 bg-white border-none shadow-md">
              <div className="flex items-center gap-2 mb-6 text-indigo-600 font-bold text-lg"><Plus /> Add New Sticker</div>
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-12 bg-slate-50">
                  <label className="flex flex-col items-center cursor-pointer">
                      <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center text-pink-500 mb-4">
                          <Upload className="w-8 h-8" />
                      </div>
                      <span className="text-sm font-bold text-slate-600">Choose PNG Sticker</span>
                      <input type="file" className="hidden" accept="image/png" onChange={handleUploadSticker} />
                  </label>
              </div>
            </Card>

            <div className="grid grid-cols-6 gap-6">
              {stickers.map(s => (
                <div key={s.id} className="relative aspect-square bg-white rounded-2xl shadow-sm p-4 flex items-center justify-center border-2 border-transparent hover:border-pink-200 transition-all group">
                  <img src={s.url} className="max-w-full max-h-full object-contain" alt="sticker" />
                  <button 
                    onClick={() => deleteSticker(s.id)}
                    className="absolute -top-2 -right-2 bg-red-400 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all shadow-md"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}