import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lock, Upload, Trash2, Plus, Palette, Image, Save, X, Move, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const defaultPhotoSlots = [
  { x: 20, y: 20, width: 280, height: 157, rotation: 0 },
  { x: 20, y: 187, width: 280, height: 157, rotation: 0 },
  { x: 20, y: 354, width: 280, height: 157, rotation: 0 },
  { x: 20, y: 521, width: 280, height: 157, rotation: 0 }
];

const slotColors = ['#ef4444', '#f97316', '#22c55e', '#3b82f6'];

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Templates state
  const [templates, setTemplates] = useState([]);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [newTemplate, setNewTemplate] = useState({
    id: "",
    name: "",
    description: "",
    background_color: "#ffffff",
    frame_color: "#f3f4f6",
    text_color: "#6b7280",
    template_image_url: null,
    photo_slots: [...defaultPhotoSlots]
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);

  // Drag state
  const [draggingSlot, setDraggingSlot] = useState(null);
  const [resizingSlot, setResizingSlot] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const previewRef = useRef(null);

  // Stickers state
  const [stickers, setStickers] = useState([]);
  const [stickerUrl, setStickerUrl] = useState("");
  const [stickerName, setStickerName] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      fetchTemplates();
      fetchStickers();
    }
  }, [isAuthenticated]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/admin/login`, { password });
      setIsAuthenticated(true);
      toast.success("Login successful!");
    } catch (error) {
      toast.error("Invalid password");
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await axios.get(`${API}/admin/templates`);
      setTemplates(res.data);
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  };

  const fetchStickers = async () => {
    try {
      const res = await axios.get(`${API}/admin/stickers`);
      setStickers(res.data);
    } catch (error) {
      console.error("Error fetching stickers:", error);
    }
  };

  const uploadTemplateImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(`${API}/admin/templates/upload-image`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      if (editingTemplate) {
        setEditingTemplate({ ...editingTemplate, template_image_url: res.data.url });
      } else {
        setNewTemplate({ ...newTemplate, template_image_url: res.data.url });
      }
      toast.success("Image uploaded!");
    } catch (error) {
      toast.error("Failed to upload");
    } finally {
      setUploadingImage(false);
    }
  };

  const currentTemplate = editingTemplate || newTemplate;
  const setCurrentTemplate = editingTemplate ? setEditingTemplate : setNewTemplate;

  // Drag handlers
  const handleMouseDown = (e, index, isResize = false) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDragStart({
      x: e.clientX,
      y: e.clientY,
      slotX: currentTemplate.photo_slots[index].x,
      slotY: currentTemplate.photo_slots[index].y,
      slotW: currentTemplate.photo_slots[index].width,
      slotH: currentTemplate.photo_slots[index].height
    });

    if (isResize) {
      setResizingSlot(index);
    } else {
      setDraggingSlot(index);
    }
  };

  const handleMouseMove = (e) => {
    if (draggingSlot === null && resizingSlot === null) return;

    const dx = (e.clientX - dragStart.x) / previewScale;
    const dy = (e.clientY - dragStart.y) / previewScale;

    const slots = [...currentTemplate.photo_slots];
    
    if (draggingSlot !== null) {
      slots[draggingSlot] = {
        ...slots[draggingSlot],
        x: Math.max(0, Math.round(dragStart.slotX + dx)),
        y: Math.max(0, Math.round(dragStart.slotY + dy))
      };
    } else if (resizingSlot !== null) {
      slots[resizingSlot] = {
        ...slots[resizingSlot],
        width: Math.max(50, Math.round(dragStart.slotW + dx)),
        height: Math.max(30, Math.round(dragStart.slotH + dy))
      };
    }

    setCurrentTemplate({ ...currentTemplate, photo_slots: slots });
  };

  const handleMouseUp = () => {
    setDraggingSlot(null);
    setResizingSlot(null);
  };

  useEffect(() => {
    if (draggingSlot !== null || resizingSlot !== null) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingSlot, resizingSlot, dragStart]);

  const saveTemplate = async (template) => {
    try {
      await axios.post(`${API}/admin/templates`, template);
      toast.success("Template saved!");
      fetchTemplates();
      setEditingTemplate(null);
      setNewTemplate({
        id: "", name: "", description: "",
        background_color: "#ffffff", frame_color: "#f3f4f6", text_color: "#6b7280",
        template_image_url: null, photo_slots: [...defaultPhotoSlots]
      });
    } catch (error) {
      toast.error("Failed to save");
    }
  };

  const deleteTemplate = async (templateId) => {
    if (!confirm("Delete this template?")) return;
    try {
      await axios.delete(`${API}/admin/templates/${templateId}`);
      toast.success("Deleted!");
      fetchTemplates();
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const uploadSticker = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", file.name.replace(/\.[^.]+$/, ""));
    formData.append("category", "general");

    try {
      await axios.post(`${API}/admin/stickers`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      toast.success("Sticker uploaded!");
      fetchStickers();
    } catch (error) {
      toast.error("Failed to upload");
    }
  };

  const addStickerFromUrl = async () => {
    if (!stickerUrl || !stickerName) {
      toast.error("Enter name and URL");
      return;
    }
    try {
      await axios.post(`${API}/admin/stickers/url?name=${encodeURIComponent(stickerName)}&url=${encodeURIComponent(stickerUrl)}&category=general`);
      toast.success("Added!");
      fetchStickers();
      setStickerUrl("");
      setStickerName("");
    } catch (error) {
      toast.error("Failed");
    }
  };

  const deleteSticker = async (stickerId) => {
    if (!confirm("Delete?")) return;
    try {
      await axios.delete(`${API}/admin/stickers/${stickerId}`);
      toast.success("Deleted!");
      fetchStickers();
    } catch (error) {
      toast.error("Failed");
    }
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${API.replace('/api', '')}${url}`;
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-pink-500" />
            </div>
            <CardTitle className="text-2xl font-bold">Admin Panel</CardTitle>
            <p className="text-gray-500 text-sm">Enter password to continue</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="text-center text-lg"
                data-testid="admin-password-input"
              />
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-pink-500 hover:bg-pink-600 text-white font-medium"
                data-testid="admin-login-btn"
              >
                {loading ? "Checking..." : "Login"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin Dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800">
          🎨 Admin Panel
        </h1>
        <Button variant="outline" onClick={() => setIsAuthenticated(false)}>
          Logout
        </Button>
      </header>

      {/* Main Content */}
      <main className="p-6 max-w-7xl mx-auto">
        <Tabs defaultValue="templates" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="templates" className="flex items-center gap-2 font-medium">
              <Palette className="w-4 h-4" /> Templates
            </TabsTrigger>
            <TabsTrigger value="stickers" className="flex items-center gap-2 font-medium">
              <Image className="w-4 h-4" /> Stickers
            </TabsTrigger>
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  {editingTemplate ? "✏️ Edit Template" : "➕ New Template"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Template ID</label>
                    <Input
                      placeholder="e.g., my-template"
                      value={currentTemplate.id}
                      onChange={(e) => setCurrentTemplate({ ...currentTemplate, id: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                      disabled={!!editingTemplate}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                    <Input
                      placeholder="My Custom Template"
                      value={currentTemplate.name}
                      onChange={(e) => setCurrentTemplate({ ...currentTemplate, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <Input
                      placeholder="Brief description"
                      value={currentTemplate.description}
                      onChange={(e) => setCurrentTemplate({ ...currentTemplate, description: e.target.value })}
                    />
                  </div>
                </div>

                {/* Template Image & Visual Editor */}
                <div className="border rounded-lg p-6 bg-gray-50">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Upload className="w-5 h-5" /> Template Image
                  </h3>
                  
                  <div className="mb-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={uploadTemplateImage}
                      className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-medium file:bg-pink-100 file:text-pink-700 hover:file:bg-pink-200 cursor-pointer"
                    />
                    {uploadingImage && <p className="text-sm text-pink-500 mt-2">Uploading...</p>}
                  </div>

                  {/* Visual Editor */}
                  {currentTemplate.template_image_url && (
                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-gray-700">
                          📐 Drag photo slots to position them
                        </h4>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => setPreviewScale(s => Math.max(0.5, s - 0.1))}>
                            <ZoomOut className="w-4 h-4" />
                          </Button>
                          <span className="text-sm font-medium w-16 text-center">{Math.round(previewScale * 100)}%</span>
                          <Button size="sm" variant="outline" onClick={() => setPreviewScale(s => Math.min(2, s + 0.1))}>
                            <ZoomIn className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="border rounded-lg p-4 bg-white overflow-auto" style={{ maxHeight: '600px' }}>
                        <div
                          ref={previewRef}
                          className="relative inline-block"
                          style={{ transform: `scale(${previewScale})`, transformOrigin: 'top left' }}
                        >
                          <img
                            src={getImageUrl(currentTemplate.template_image_url)}
                            alt="Template"
                            className="block"
                            draggable={false}
                          />
                          
                          {/* Photo Slots */}
                          {(currentTemplate.photo_slots || defaultPhotoSlots).map((slot, index) => (
                            <div
                              key={index}
                              className="absolute border-2 cursor-move flex items-center justify-center"
                              style={{
                                left: slot.x,
                                top: slot.y,
                                width: slot.width,
                                height: slot.height,
                                borderColor: slotColors[index],
                                backgroundColor: `${slotColors[index]}33`,
                              }}
                              onMouseDown={(e) => handleMouseDown(e, index, false)}
                            >
                              <span 
                                className="font-bold text-white px-2 py-1 rounded text-sm"
                                style={{ backgroundColor: slotColors[index] }}
                              >
                                Photo {index + 1}
                              </span>
                              
                              {/* Resize Handle */}
                              <div
                                className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
                                style={{ backgroundColor: slotColors[index] }}
                                onMouseDown={(e) => handleMouseDown(e, index, true)}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Slot Values Display */}
                      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                        {(currentTemplate.photo_slots || defaultPhotoSlots).map((slot, index) => (
                          <div 
                            key={index} 
                            className="p-3 rounded-lg text-sm"
                            style={{ backgroundColor: `${slotColors[index]}15`, borderLeft: `4px solid ${slotColors[index]}` }}
                          >
                            <div className="font-bold mb-1" style={{ color: slotColors[index] }}>Photo {index + 1}</div>
                            <div className="text-gray-600 grid grid-cols-2 gap-1 text-xs">
                              <span>X: {slot.x}</span>
                              <span>Y: {slot.y}</span>
                              <span>W: {slot.width}</span>
                              <span>H: {slot.height}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!currentTemplate.template_image_url && (
                    <div className="text-center py-12 text-gray-400">
                      <Image className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>Upload a template image to start positioning photo slots</p>
                    </div>
                  )}
                </div>

                {/* Fallback Colors */}
                <div className="border rounded-lg p-6 bg-gray-50">
                  <h3 className="font-bold text-lg mb-4">🎨 Fallback Colors (if no image)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium text-gray-700 w-28">Background:</label>
                      <input
                        type="color"
                        value={currentTemplate.background_color}
                        onChange={(e) => setCurrentTemplate({ ...currentTemplate, background_color: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer border"
                      />
                      <Input
                        value={currentTemplate.background_color}
                        onChange={(e) => setCurrentTemplate({ ...currentTemplate, background_color: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium text-gray-700 w-28">Frame:</label>
                      <input
                        type="color"
                        value={currentTemplate.frame_color}
                        onChange={(e) => setCurrentTemplate({ ...currentTemplate, frame_color: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer border"
                      />
                      <Input
                        value={currentTemplate.frame_color}
                        onChange={(e) => setCurrentTemplate({ ...currentTemplate, frame_color: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    onClick={() => saveTemplate(currentTemplate)}
                    disabled={!currentTemplate.id || !currentTemplate.name}
                    className="bg-pink-500 hover:bg-pink-600 text-white font-medium"
                  >
                    <Save className="w-4 h-4 mr-2" /> Save Template
                  </Button>
                  {editingTemplate && (
                    <Button variant="outline" onClick={() => setEditingTemplate(null)}>
                      Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Existing Templates */}
            <h3 className="text-xl font-bold text-gray-700">Existing Templates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <Card key={template.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div
                    className="h-40 flex items-center justify-center relative"
                    style={{ backgroundColor: template.background_color || '#f3f4f6' }}
                  >
                    {template.template_image_url ? (
                      <img
                        src={getImageUrl(template.template_image_url)}
                        alt={template.name}
                        className="h-full object-contain"
                      />
                    ) : (
                      <div className="text-gray-400 text-center">
                        <Palette className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <span className="text-sm">Color Only</span>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-bold text-lg">{template.name}</h3>
                    <p className="text-sm text-gray-500">{template.description}</p>
                    <p className="text-xs text-gray-400 mt-1">ID: {template.id}</p>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingTemplate({
                          ...template,
                          photo_slots: template.photo_slots || defaultPhotoSlots
                        })}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteTemplate(template.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Stickers Tab */}
          <TabsContent value="stickers" className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Upload className="w-5 h-5" /> Add Stickers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Upload Image File</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={uploadSticker}
                    className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-medium file:bg-pink-100 file:text-pink-700 hover:file:bg-pink-200 cursor-pointer"
                  />
                </div>

                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Or Add from URL</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input
                      placeholder="Sticker Name"
                      value={stickerName}
                      onChange={(e) => setStickerName(e.target.value)}
                    />
                    <Input
                      placeholder="Image URL"
                      value={stickerUrl}
                      onChange={(e) => setStickerUrl(e.target.value)}
                    />
                    <Button onClick={addStickerFromUrl} className="bg-pink-500 hover:bg-pink-600 text-white">
                      <Plus className="w-4 h-4 mr-2" /> Add
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stickers Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {stickers.map((sticker) => (
                <Card key={sticker.id} className="overflow-hidden group shadow-sm hover:shadow-md transition-shadow">
                  <div className="aspect-square bg-gray-50 flex items-center justify-center p-4 relative">
                    <img
                      src={getImageUrl(sticker.url)}
                      alt={sticker.name}
                      className="max-w-full max-h-full object-contain"
                    />
                    <button
                      onClick={() => deleteSticker(sticker.id)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <CardContent className="p-2 text-center">
                    <p className="text-sm font-medium truncate">{sticker.name}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
