import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Camera, Sparkles } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function TemplateSelectionPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${API}/templates`);
      setTemplates(response.data);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to load templates");
    }
  };

  const handleStartSession = async () => {
    if (!selectedTemplate) {
      toast.error("Please select a template first");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/sessions`, {
        template_id: selectedTemplate.id
      });
      navigate(`/capture/${response.data.session_id}`);
    } catch (error) {
      console.error("Error creating session:", error);
      toast.error("Failed to start session");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen paper-bg">
      {/* Header */}
      <header className="py-8 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20, rotate: -2 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h1 
              className="text-6xl md:text-7xl font-bold text-gray-800 inline-block"
              style={{ fontFamily: 'var(--font-heading)' }}
              data-testid="app-title"
            >
              Power of Ten
            </h1>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.3 }}
              className="h-1.5 bg-pink-400 mx-auto mt-2"
              style={{ width: '200px', borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px' }}
            />
            <p className="mt-4 text-xl text-gray-600" style={{ fontFamily: 'var(--font-handwritten)' }}>
              Create stunning photo strips in seconds ✨
            </p>
          </motion.div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="max-w-4xl mx-auto px-6 mb-12">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {['Choose Style', 'Take Photos', 'Decorate', 'Share!'].map((step, index) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                index === 0 
                  ? 'bg-pink-400 text-white sketch-border-light' 
                  : 'bg-white/80 text-gray-500 sketch-border-light'
              }`}
              style={{ fontFamily: 'var(--font-handwritten)', transform: `rotate(${index % 2 === 0 ? -1 : 1}deg)` }}
              data-testid={`step-${index}`}
            >
              <span className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center text-sm font-bold">
                {index + 1}
              </span>
              <span>{step}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 
            className="text-3xl font-bold text-gray-800 mb-8 text-center"
            style={{ fontFamily: 'var(--font-heading)', transform: 'rotate(-1deg)' }}
          >
            Pick Your Style! 🎨
          </h2>

          {/* Template Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {templates.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20, rotate: index % 2 === 0 ? -2 : 2 }}
                animate={{ opacity: 1, y: 0, rotate: index % 2 === 0 ? -1 : 1 }}
                transition={{ duration: 0.4, delay: 0.1 * index }}
                whileHover={{ scale: 1.02, rotate: 0 }}
                className="cursor-pointer"
                onClick={() => setSelectedTemplate(template)}
                data-testid={`template-${template.id}`}
              >
                <div
                  className={`sketch-border overflow-hidden bg-white p-3 transition-all duration-200 ${
                    selectedTemplate?.id === template.id
                      ? "ring-4 ring-pink-400 ring-offset-4"
                      : ""
                  }`}
                >
                  {/* Template Preview */}
                  <div 
                    className="relative aspect-square overflow-hidden rounded"
                    style={{ backgroundColor: template.background_color }}
                  >
                    {/* Photo Strip Preview */}
                    <div className="absolute inset-3 grid grid-cols-2 gap-2">
                      {[1, 2, 3, 4].map((num) => (
                        <div
                          key={num}
                          className="rounded overflow-hidden"
                          style={{ 
                            backgroundColor: template.frame_color,
                            border: '2px solid #ddd'
                          }}
                        >
                          <div 
                            className="w-full h-full"
                            style={{ 
                              backgroundColor: template.id === 'modern-dark' ? '#4b5563' : '#e5e7eb'
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    
                    {/* Selected Indicator */}
                    {selectedTemplate?.id === template.id && (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className="absolute top-3 right-3 w-12 h-12 bg-pink-500 rounded-full flex items-center justify-center shadow-lg"
                        style={{ border: '3px solid white' }}
                      >
                        <Check className="w-6 h-6 text-white" />
                      </motion.div>
                    )}
                  </div>

                  {/* Template Info */}
                  <div className="p-4 text-center">
                    <h3 
                      className="text-2xl font-bold text-gray-800"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      {template.name}
                    </h3>
                    <p 
                      className="text-gray-500 mt-1"
                      style={{ fontFamily: 'var(--font-handwritten)' }}
                    >
                      {template.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Start Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <Button
            size="lg"
            className="btn-sketch px-12 py-6 text-xl bg-pink-500 hover:bg-pink-600 text-white"
            onClick={handleStartSession}
            disabled={!selectedTemplate || loading}
            data-testid="start-session-btn"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Starting...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Camera className="w-6 h-6" />
                Let's Go!
              </span>
            )}
          </Button>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 py-4 bg-white/90 backdrop-blur-sm border-t-2 border-dashed border-gray-200">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-center gap-2 text-gray-500">
          <Sparkles className="w-4 h-4 text-pink-400" />
          <span style={{ fontFamily: 'var(--font-handwritten)' }}>
            Take 4 photos • Add fun stickers • Share with friends!
          </span>
          <Sparkles className="w-4 h-4 text-pink-400" />
        </div>
      </footer>
    </div>
  );
}
