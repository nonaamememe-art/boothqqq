import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Camera } from "lucide-react";
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
    <div className="h-screen w-screen overflow-hidden paper-bg flex flex-col">
      {/* Header */}
      <header className="py-6 text-center flex-shrink-0">
        <h1 
          className="text-7xl font-bold text-gray-800"
          style={{ fontFamily: 'var(--font-heading)' }}
          data-testid="app-title"
        >
          Power of Ten
        </h1>
        <div 
          className="h-2 bg-pink-400 mx-auto mt-3"
          style={{ width: '250px', borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px' }}
        />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center gap-16 px-16">
        {/* Template Cards */}
        {templates.map((template, index) => (
          <motion.div
            key={template.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index }}
            whileHover={{ scale: 1.03 }}
            className="cursor-pointer"
            onClick={() => setSelectedTemplate(template)}
            data-testid={`template-${template.id}`}
          >
            <div
              className={`sketch-border bg-white p-4 transition-all ${
                selectedTemplate?.id === template.id
                  ? "ring-4 ring-pink-400 ring-offset-4"
                  : ""
              }`}
              style={{ width: '320px' }}
            >
              {/* Template Preview - 2x6 vertical strip */}
              <div 
                className="relative rounded p-4"
                style={{ backgroundColor: template.background_color }}
              >
                <div className="flex flex-col gap-2">
                  {[1, 2, 3, 4].map((num) => (
                    <div
                      key={num}
                      className="rounded overflow-hidden"
                      style={{ 
                        aspectRatio: "16/9",
                        backgroundColor: template.frame_color,
                        border: '2px solid',
                        borderColor: template.id === 'modern-dark' ? '#4b5563' : '#d1d5db'
                      }}
                    >
                      <div 
                        className="w-full h-full"
                        style={{ backgroundColor: template.id === 'modern-dark' ? '#4b5563' : '#e5e7eb' }}
                      />
                    </div>
                  ))}
                </div>
                
                {selectedTemplate?.id === template.id && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-4 right-4 w-12 h-12 bg-pink-500 rounded-full flex items-center justify-center shadow-lg"
                  >
                    <Check className="w-6 h-6 text-white" />
                  </motion.div>
                )}
              </div>

              <div className="pt-4 text-center">
                <h3 
                  className="text-3xl font-bold text-gray-800"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {template.name}
                </h3>
                <p 
                  className="text-lg text-gray-500 mt-1"
                  style={{ fontFamily: 'var(--font-handwritten)' }}
                >
                  {template.description}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </main>

      {/* Start Button */}
      <div className="py-8 text-center flex-shrink-0">
        <Button
          size="lg"
          className="btn-sketch px-16 py-8 text-3xl bg-pink-400 hover:bg-pink-500 text-white"
          onClick={handleStartSession}
          disabled={!selectedTemplate || loading}
          data-testid="start-session-btn"
        >
          {loading ? (
            <span className="flex items-center gap-3">
              <span className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              Starting...
            </span>
          ) : (
            <span className="flex items-center gap-3">
              <Camera className="w-10 h-10" />
              Let's Go!
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
