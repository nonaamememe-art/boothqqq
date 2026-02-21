import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lock, Upload, Trash2, Plus, Palette, Image, Save, X, Move } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const defaultPhotoSlots = [
  { x: 20, y: 20, width: 280, height: 157, rotation: 0 },
  { x: 20, y: 187, width: 280, height: 157, rotation: 0 },
  { x: 20, y: 354, width: 280, height: 157, rotation: 0 },
  { x: 20, y: 521, width: 280, height: 157, rotation: 0 }
];

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

  // Stickers state
  const [stickers, setStickers] = useState([]);
  const [stickerUrl, setStickerUrl] = useState("");
  const [stickerName, setStickerName] = useState("");
  const [stickerCategory, setStickerCategory] = useState("general");

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
      toast.success("Template image uploaded!");
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const updatePhotoSlot = (index, field, value) => {
    const target = editingTemplate || newTemplate;
    const setTarget = editingTemplate ? setEditingTemplate : setNewTemplate;
    
    const slots = [...(target.photo_slots || defaultPhotoSlots)];
    slots[index] = { ...slots[index], [field]: parseInt(value) || 0 };
    setTarget({ ...target, photo_slots: slots });
  };

  const saveTemplate = async (template) => {
    try {
      await axios.post(`${API}/admin/templates`, template);
      toast.success("Template saved!");
      fetchTemplates();
      setEditingTemplate(null);
      setNewTemplate({
        id: "",
        name: "",
        description: "",
        background_color: "#ffffff",
        frame_color: "#f3f4f6",
        text_color: "#6b7280",
        template_image_url: null,
        photo_slots: [...defaultPhotoSlots]
      });
    } catch (error) {
      toast.error("Failed to save template");
    }
  };

  const deleteTemplate = async (templateId) => {
    if (!confirm("Delete this template?")) return;
    try {
      await axios.delete(`${API}/admin/templates/${templateId}`);
      toast.success("Template deleted!");
      fetchTemplates();
    } catch (error) {
      toast.error("Failed to delete template");
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
      toast.error("Failed to upload sticker");
    }
  };

  const addStickerFromUrl = async () => {
    if (!stickerUrl || !stickerName) {
      toast.error("Please enter name and URL");
      return;
    }
    try {
      await axios.post(`${API}/admin/stickers/url?name=${encodeURIComponent(stickerName)}&url=${encodeURIComponent(stickerUrl)}&category=${stickerCategory}`);
      toast.success("Sticker added!");
      fetchStickers();
      setStickerUrl("");
      setStickerName("");
    } catch (error) {
      toast.error("Failed to add sticker");
    }
  };

  const deleteSticker = async (stickerId) => {
    if (!confirm("Delete this sticker?")) return;
    try {
      await axios.delete(`${API}/admin/stickers/${stickerId}`);
      toast.success("Sticker deleted!");
      fetchStickers();
    } catch (error) {
      toast.error("Failed to delete sticker");
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
      <div className="min-h-screen flex items-center justify-center paper-bg">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md px-6"
        >
          <Card className="sketch-border">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-pink-500" />
              </div>
              <CardTitle className="text-2xl" style={{ fontFamily: 'var(--font-heading)' }}>
                Admin Panel
              </CardTitle>
              <p className="text-gray-500" style={{ fontFamily: 'var(--font-handwritten)' }}>
                Enter password to continue
              </p>
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
                  className="w-full btn-sketch bg-pink-400 hover:bg-pink-500 text-white"
                  data-testid="admin-login-btn"
                >
                  {loading ? "Checking..." : "Login"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  const currentTemplate = editingTemplate || newTemplate;
  const setCurrentTemplate = editingTemplate ? setEditingTemplate : setNewTemplate;

  // Admin Dashboard
  return (
    <div className="min-h-screen paper-bg">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800" style={{ fontFamily: 'var(--font-heading)' }}>
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
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Palette className="w-4 h-4" /> Templates
            </TabsTrigger>
            <TabsTrigger value="stickers" className="flex items-center gap-2">
              <Image className="w-4 h-4" /> Stickers
            </TabsTrigger>
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            {/* Template Editor */}
            <Card className="sketch-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {editingTemplate ? "✏️ Edit Template" : "➕ Add New Template"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    placeholder="Template ID (e.g., my-template)"
                    value={currentTemplate.id}
                    onChange={(e) => setCurrentTemplate({ ...currentTemplate, id: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    disabled={!!editingTemplate}
                  />
                  <Input
                    placeholder="Template Name"
                    value={currentTemplate.name}
                    onChange={(e) => setCurrentTemplate({ ...currentTemplate, name: e.target.value })}
                  />
                  <Input
                    placeholder="Description"
                    value={currentTemplate.description}
                    onChange={(e) => setCurrentTemplate({ ...currentTemplate, description: e.target.value })}
                  />
                </div>

                {/* Template Image Upload */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Upload className="w-5 h-5" /> Template Image (from Photoshop)
                  </h3>
                  
                  <div className="flex items-start gap-6">
                    {/* Upload Area */}
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={uploadTemplateImage}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Upload your PSD export (PNG/JPG). Recommended size: 320x700px for 2x6 strip
                      </p>
                      {uploadingImage && <p className="text-sm text-pink-500 mt-2">Uploading...</p>}
                    </div>

                    {/* Preview */}
                    {currentTemplate.template_image_url && (
                      <div className="relative">
                        <img
                          src={getImageUrl(currentTemplate.template_image_url)}
                          alt="Template preview"
                          className="h-48 object-contain border rounded"
                        />
                        <button
                          onClick={() => setCurrentTemplate({ ...currentTemplate, template_image_url: null })}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Photo Slots Configuration */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Move className="w-5 h-5" /> Photo Slot Positions (4 photos)
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Set X, Y position and Width, Height for each photo slot on your template
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(currentTemplate.photo_slots || defaultPhotoSlots).map((slot, index) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-sm mb-3 text-pink-600">📷 Photo {index + 1}</h4>
                        <div className="grid grid-cols-4 gap-2">
                          <div>
                            <label className="text-xs text-gray-500">X</label>
                            <Input
                              type="number"
                              value={slot.x}
                              onChange={(e) => updatePhotoSlot(index, 'x', e.target.value)}
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Y</label>
                            <Input
                              type="number"
                              value={slot.y}
                              onChange={(e) => updatePhotoSlot(index, 'y', e.target.value)}
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Width</label>
                            <Input
                              type="number"
                              value={slot.width}
                              onChange={(e) => updatePhotoSlot(index, 'width', e.target.value)}
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Height</label>
                            <Input
                              type="number"
                              value={slot.height}
                              onChange={(e) => updatePhotoSlot(index, 'height', e.target.value)}
                              className="text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fallback Colors (if no image) */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <h3 className="font-bold text-lg mb-4">🎨 Fallback Colors (used if no image)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600 w-32">Background:</label>
                      <input
                        type="color"
                        value={currentTemplate.background_color}
                        onChange={(e) => setCurrentTemplate({ ...currentTemplate, background_color: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <Input
                        value={currentTemplate.background_color}
                        onChange={(e) => setCurrentTemplate({ ...currentTemplate, background_color: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600 w-32">Frame Color:</label>
                      <input
                        type="color"
                        value={currentTemplate.frame_color}
                        onChange={(e) => setCurrentTemplate({ ...currentTemplate, frame_color: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <Input
                        value={currentTemplate.frame_color}
                        onChange={(e) => setCurrentTemplate({ ...currentTemplate, frame_color: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={() => saveTemplate(currentTemplate)}
                    disabled={!currentTemplate.id || !currentTemplate.name}
                    className="btn-sketch bg-pink-400 hover:bg-pink-500 text-white"
                  >
                    <Save className="w-4 h-4 mr-2" /> Save Template
                  </Button>
                  {editingTemplate && (
                    <Button
                      variant="outline"
                      onClick={() => setEditingTemplate(null)}
                    >
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
                <Card key={template.id} className="sketch-border overflow-hidden">
                  <div
                    className="h-40 flex items-center justify-center relative"
                    style={{ backgroundColor: template.background_color }}
                  >
                    {template.template_image_url ? (
                      <img
                        src={getImageUrl(template.template_image_url)}
                        alt={template.name}
                        className="h-full object-contain"
                      />
                    ) : (
                      <div
                        className="w-24 h-16 rounded"
                        style={{ backgroundColor: template.frame_color }}
                      />
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
            {/* Upload Sticker */}
            <Card className="sketch-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" /> Add Stickers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Image File
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={uploadSticker}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100"
                  />
                </div>

                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Or Add from URL
                  </label>
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
                    <Button
                      onClick={addStickerFromUrl}
                      className="btn-sketch bg-pink-400 hover:bg-pink-500 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Add
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Existing Stickers */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {stickers.map((sticker) => (
                <Card key={sticker.id} className="sketch-border overflow-hidden group">
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
                    <p className="text-xs text-gray-400">{sticker.category}</p>
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
