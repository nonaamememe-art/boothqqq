import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <header className="py-8 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h1 
              className="text-5xl md:text-6xl font-bold tracking-tight text-slate-900"
              style={{ fontFamily: 'var(--font-heading)' }}
              data-testid="app-title"
            >
              Power of Ten
            </h1>
            <p className="mt-3 text-lg text-slate-600">
              Create stunning photo strips in seconds
            </p>
          </motion.div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="max-w-6xl mx-auto px-6 mb-12">
        <div className="flex items-center justify-center gap-4">
          <div className="progress-step active" data-testid="step-template">
            <span className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center text-sm">1</span>
            <span>Choose Template</span>
          </div>
          <div className="w-12 h-px bg-slate-300"></div>
          <div className="progress-step pending" data-testid="step-capture">
            <span className="w-6 h-6 rounded-full bg-slate-300 flex items-center justify-center text-sm">2</span>
            <span>Capture</span>
          </div>
          <div className="w-12 h-px bg-slate-300"></div>
          <div className="progress-step pending" data-testid="step-decorate">
            <span className="w-6 h-6 rounded-full bg-slate-300 flex items-center justify-center text-sm">3</span>
            <span>Decorate</span>
          </div>
          <div className="w-12 h-px bg-slate-300"></div>
          <div className="progress-step pending" data-testid="step-share">
            <span className="w-6 h-6 rounded-full bg-slate-300 flex items-center justify-center text-sm">4</span>
            <span>Share</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="text-2xl font-semibold text-slate-800 mb-8 text-center">
            Select Your Photo Strip Style
          </h2>

          {/* Template Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {templates.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 * index }}
              >
                <Card
                  className={`template-card cursor-pointer overflow-hidden border-2 transition-all duration-300 ${
                    selectedTemplate?.id === template.id
                      ? "border-blue-500 shadow-lg shadow-blue-500/20"
                      : "border-transparent hover:border-slate-200"
                  }`}
                  onClick={() => setSelectedTemplate(template)}
                  data-testid={`template-${template.id}`}
                >
                  <CardContent className="p-0">
                    {/* Template Preview */}
                    <div 
                      className="relative aspect-[2/3] overflow-hidden"
                      style={{ backgroundColor: template.background_color }}
                    >
                      {/* Photo Strip Preview */}
                      <div className="absolute inset-4 flex flex-col gap-3">
                        {[1, 2, 3, 4].map((num) => (
                          <div
                            key={num}
                            className="flex-1 rounded-lg overflow-hidden"
                            style={{ backgroundColor: template.frame_color }}
                          >
                            <div 
                              className="w-full h-full bg-cover bg-center opacity-60"
                              style={{ 
                                backgroundImage: `url(https://images.unsplash.com/photo-${1500000000000 + num * 1000}?w=300&h=200&fit=crop)`,
                                backgroundColor: template.id === 'modern-dark' ? '#374151' : '#e2e8f0'
                              }}
                            />
                          </div>
                        ))}
                      </div>
                      
                      {/* Selected Indicator */}
                      {selectedTemplate?.id === template.id && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-4 right-4 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg"
                        >
                          <Check className="w-5 h-5 text-white" />
                        </motion.div>
                      )}
                    </div>

                    {/* Template Info */}
                    <div className="p-6">
                      <h3 className="text-xl font-semibold text-slate-800">
                        {template.name}
                      </h3>
                      <p className="text-slate-500 mt-1">
                        {template.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
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
            className="px-12 py-6 text-lg rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all duration-300 hover:scale-105"
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
                <Camera className="w-5 h-5" />
                Start Photo Session
              </span>
            )}
          </Button>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 py-4 bg-white/80 backdrop-blur-sm border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-center gap-2 text-sm text-slate-500">
          <Sparkles className="w-4 h-4" />
          <span>Capture 4 photos • Add stickers • Download & share</span>
        </div>
      </footer>
    </div>
  );
}
